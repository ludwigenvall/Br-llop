// Redigeringssidan: logga in med lösenord, ändra texten och spara direkt till GitHub.
//
// Så fungerar inloggningen: en GitHub-nyckel (fine-grained token som bara får ändra
// filer i det här repot) krypteras med lösenordet och sparas i assets/nyckel.json.
// Vid inloggning dekrypteras nyckeln i webbläsaren och används för att spara ändringar.

(function () {
    "use strict";

    // ---------- Inställningar ----------
    var KONFIG = {
        agare: "ludwigenvall",   // GitHub-användaren som äger repot
        repo: "Br-llop",         // repots namn
        gren: "main",            // grenen som GitHub Pages publicerar
        innehall: "innehall.md",
        nyckelfil: "assets/nyckel.json",
        bildmapp: "bilder",
        iterationer: 600000
    };

    var TEMAN = [
        { id: "klassisk", namn: "Klassisk", farger: ["#f5f0e8", "#9c7c4c"] },
        { id: "salvia", namn: "Salvia", farger: ["#eef1e9", "#5f7350"] },
        { id: "ros", namn: "Ros", farger: ["#f7ecec", "#a8646a"] },
        { id: "natt", namn: "Natt", farger: ["#171d2b", "#d4af6a"] },
        { id: "terrakotta", namn: "Terrakotta", farger: ["#f7ede3", "#b05a33"] },
        { id: "hav", namn: "Hav", farger: ["#eaf2f2", "#3a7f80"] }
    ];

    var TOKEN_NYCKEL = "brollop-redigera-token";
    var API = "https://api.github.com/repos/" + KONFIG.agare + "/" + KONFIG.repo;

    var $ = function (s) { return document.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

    var token = null;
    var tillstand = {
        sha: null,          // versionen av innehall.md vi utgår från
        installningar: [],  // [[nyckel, värde], …] i ordning
        text: "",           // allt efter inställningarna
        sparad: "",         // senast sparade hela filen
        lokalaBilder: {}    // nyuppladdade bilder (för förhandsvisningen)
    };

    // ---------- Hjälpfunktioner ----------

    function visaSkarm(id) {
        $$(".skarm").forEach(function (s) { s.hidden = s.id !== id; });
    }

    function visaFel(el, text) {
        el.textContent = text;
        el.hidden = !text;
    }

    function bytesTillB64(bytes) {
        var s = "";
        for (var i = 0; i < bytes.length; i += 0x8000) {
            s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return btoa(s);
    }
    function b64TillBytes(b64) {
        var bin = atob(b64.replace(/\s/g, ""));
        var bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
    }
    function textTillB64(text) { return bytesTillB64(new TextEncoder().encode(text)); }
    function b64TillText(b64) { return new TextDecoder().decode(b64TillBytes(b64)); }

    function sparaToken(t, kommIhag) {
        token = t;
        try {
            sessionStorage.setItem(TOKEN_NYCKEL, t);
            if (kommIhag) localStorage.setItem(TOKEN_NYCKEL, t);
        } catch (e) { /* privat läge – då får man logga in varje gång */ }
    }
    function hamtaSparadToken() {
        try { return sessionStorage.getItem(TOKEN_NYCKEL) || localStorage.getItem(TOKEN_NYCKEL); }
        catch (e) { return null; }
    }
    function glomToken() {
        token = null;
        try { sessionStorage.removeItem(TOKEN_NYCKEL); localStorage.removeItem(TOKEN_NYCKEL); } catch (e) { }
    }

    // ---------- GitHub ----------

    function gh(sokvag, alternativ, medToken) {
        alternativ = alternativ || {};
        var headers = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
        var t = medToken === undefined ? token : medToken;
        if (t) headers.Authorization = "Bearer " + t;
        if (alternativ.body) headers["Content-Type"] = "application/json";
        return fetch(API + sokvag, {
            method: alternativ.method || "GET",
            headers: headers,
            body: alternativ.body ? JSON.stringify(alternativ.body) : undefined,
            cache: "no-store"
        }).then(function (svar) {
            if (svar.status === 204) return null;
            return svar.json().catch(function () { return {}; }).then(function (data) {
                if (!svar.ok) {
                    var fel = new Error((data && data.message) || ("HTTP " + svar.status));
                    fel.status = svar.status;
                    throw fel;
                }
                return data;
            });
        });
    }

    function filSokvag(sokvag) {
        return "/contents/" + sokvag.split("/").map(encodeURIComponent).join("/");
    }

    function hamtaFil(sokvag, medToken) {
        return gh(filSokvag(sokvag) + "?ref=" + encodeURIComponent(KONFIG.gren), null, medToken)
            .then(function (data) { return { text: b64TillText(data.content), sha: data.sha }; });
    }

    function sparaFil(sokvag, base64, sha, meddelande, medToken) {
        var body = { message: meddelande, content: base64, branch: KONFIG.gren };
        if (sha) body.sha = sha;
        return gh(filSokvag(sokvag), { method: "PUT", body: body }, medToken);
    }

    function kontrolleraToken(t) {
        return gh("", null, t).then(function (repo) {
            if (!repo.permissions || !repo.permissions.push) {
                var fel = new Error("Nyckeln saknar skrivbehörighet");
                fel.status = 403;
                throw fel;
            }
            return repo;
        });
    }

    // ---------- Kryptering ----------

    function harledNyckel(losenord, salt, iterationer) {
        return crypto.subtle.importKey("raw", new TextEncoder().encode(losenord), "PBKDF2", false, ["deriveKey"])
            .then(function (bas) {
                return crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt: salt, iterations: iterationer, hash: "SHA-256" },
                    bas, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
            });
    }

    function kryptera(text, losenord) {
        var salt = crypto.getRandomValues(new Uint8Array(16));
        var iv = crypto.getRandomValues(new Uint8Array(12));
        return harledNyckel(losenord, salt, KONFIG.iterationer).then(function (nyckel) {
            return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, nyckel, new TextEncoder().encode(text));
        }).then(function (krypterat) {
            return {
                version: 1,
                iterationer: KONFIG.iterationer,
                salt: bytesTillB64(salt),
                iv: bytesTillB64(iv),
                data: bytesTillB64(new Uint8Array(krypterat))
            };
        });
    }

    function dekryptera(paket, losenord) {
        return harledNyckel(losenord, b64TillBytes(paket.salt), paket.iterationer).then(function (nyckel) {
            return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64TillBytes(paket.iv) }, nyckel, b64TillBytes(paket.data));
        }).then(function (klartext) {
            return new TextDecoder().decode(klartext);
        });
    }

    function hamtaNyckelfil() {
        // Hämtas via GitHubs API (inte från hemsidan) så att en nyss sparad nyckel hittas direkt.
        return hamtaFil(KONFIG.nyckelfil, null)
            .then(function (fil) { return JSON.parse(fil.text); })
            .catch(function (fel) {
                if (fel.status === 404) return null;
                // T.ex. för många anrop – försök med kopian på hemsidan istället.
                return fetch(KONFIG.nyckelfil, { cache: "no-cache" }).then(function (svar) {
                    if (svar.status === 404) return null;
                    if (!svar.ok) throw fel;
                    return svar.json();
                });
            });
    }

    // ---------- Start ----------

    function start() {
        $("#repo-namn").textContent = KONFIG.agare + "/" + KONFIG.repo;
        var sparad = hamtaSparadToken();
        if (sparad) {
            kontrolleraToken(sparad)
                .then(function () { token = sparad; oppnaRedigering(); })
                .catch(function (fel) {
                    if (fel.status === 401 || fel.status === 403 || fel.status === 404) glomToken();
                    visaInloggning();
                });
        } else {
            visaInloggning();
        }
    }

    function visaInloggning() {
        visaSkarm("skarm-laddar");
        hamtaNyckelfil().then(function (paket) {
            if (paket) {
                visaSkarm("skarm-logga-in");
                $("#losenord").focus();
                $("#form-logga-in").onsubmit = function (h) {
                    h.preventDefault();
                    loggaIn(paket);
                };
            } else {
                visaSkarm("skarm-installera");
            }
        }).catch(function (fel) {
            console.error(fel);
            visaSkarm("skarm-logga-in");
            visaFel($("#fel-logga-in"), "Kunde inte nå GitHub. Kontrollera internetanslutningen och ladda om sidan.");
        });
    }

    function loggaIn(paket) {
        var felEl = $("#fel-logga-in");
        var knapp = $("#form-logga-in button");
        visaFel(felEl, "");
        knapp.disabled = true;
        knapp.textContent = "Loggar in…";
        dekryptera(paket, $("#losenord").value)
            .catch(function () { throw new Error("Fel lösenord. Försök igen."); })
            .then(function (t) {
                return kontrolleraToken(t).then(function () { return t; }).catch(function (fel) {
                    if (fel.status === 401) throw new Error("Lösenordet stämmer, men nyckeln har gått ut eller tagits bort. Den som äger repot behöver ställa in en ny.");
                    if (fel.status === 403 || fel.status === 404) throw new Error("Nyckeln saknar behörighet till repot. Den som äger repot behöver ställa in en ny.");
                    throw new Error("Kunde inte nå GitHub. Försök igen om en stund.");
                });
            })
            .then(function (t) {
                sparaToken(t, $("#kom-ihag").checked);
                $("#losenord").value = "";
                oppnaRedigering();
            })
            .catch(function (fel) {
                visaFel(felEl, fel.message);
                $("#losenord").select();
            })
            .then(function () {
                knapp.disabled = false;
                knapp.textContent = "Logga in";
            });
    }

    // ---------- Installation ----------

    var ORD = ("abborre ananas apelsin backe bagare ballong banan bastu berg bjork blabar blomma bokhylla "
        + "bris brygga bulle cykel dalgang dimma dragspel ekorre elefant enbuske fackla fjader fjall flagga "
        + "fluga fyrtorn gaffel galosch gitarr glass gran groda gurka hammare harpa hatt havre hjort honung "
        + "hylla igelkott iskall jordgubbe kaffe kakel kanel kanot karusell katt kikare klocka knapp kompass "
        + "korg krona kudde kvarn lakan lampa lavendel lejon linjal lykta lingon mandel marmor midsommar "
        + "mossa motor nyckel oliv orgel paraply penna pepparkaka pilbage planet potatis pumpa regnbage rosett "
        + "sadel sandal segelbat sirap skata skeppare skog skorsten sladd snigel solros spegel stjarna strumpa "
        + "svamp tallrik tavla tekopp timjan tofflor tomte trappa trumpet tulpan uggla vagga valross vante "
        + "vattenkanna vimpel vinbar violin visselpipa zebra aprikos bergsget blomkal citron dagbok ekollon "
        + "flamingo fyrverkeri giraff hallon hummer isbjorn jordglob kamel kastanj kompott lingonsylt madrass "
        + "morot narhval papegoja pingvin plommon rabarber sjostjarna smultron sparris tornado vulkan").split(" ");

    function foreslaLosenord() {
        var slump = new Uint32Array(5);
        crypto.getRandomValues(slump);
        var ord = [];
        for (var i = 0; i < 4; i++) ord.push(ORD[slump[i] % ORD.length]);
        return ord.join("-") + "-" + (10 + slump[4] % 90);
    }

    function installera(h) {
        h.preventDefault();
        var felEl = $("#fel-installera");
        var knapp = $("#form-installera button[type=submit]");
        var nyToken = $("#ny-token").value.trim();
        var losenord = $("#nytt-losenord").value;
        visaFel(felEl, "");

        if (losenord.length < 12) return visaFel(felEl, "Lösenordet måste vara minst 12 tecken.");

        knapp.disabled = true;
        knapp.textContent = "Sparar…";
        kontrolleraToken(nyToken)
            .catch(function (fel) {
                if (fel.status === 401) throw new Error("GitHub känner inte igen nyckeln. Kontrollera att hela nyckeln kom med.");
                if (fel.status === 403 || fel.status === 404) throw new Error("Nyckeln saknar behörighet. Kontrollera att repot " + KONFIG.agare + "/" + KONFIG.repo + " är valt och att Contents är ”Read and write”.");
                throw fel;
            })
            .then(function () { return kryptera(nyToken, losenord); })
            .then(function (paket) {
                return hamtaFil(KONFIG.nyckelfil, nyToken)
                    .then(function (f) { return f.sha; })
                    .catch(function (fel) { if (fel.status === 404) return null; throw fel; })
                    .then(function (sha) {
                        return sparaFil(KONFIG.nyckelfil, textTillB64(JSON.stringify(paket, null, 2) + "\n"),
                            sha, "Ställ in lösenord för redigeringssidan", nyToken);
                    });
            })
            .then(function () {
                sparaToken(nyToken, true);
                $("#ny-token").value = "";
                oppnaRedigering();
                alert("Klart! Spara lösenordet på ett säkert ställe och ge det till Ebba & Axel:\n\n" + losenord);
                $("#nytt-losenord").value = "";
            })
            .catch(function (fel) {
                console.error(fel);
                visaFel(felEl, fel.message || "Något gick fel.");
            })
            .then(function () {
                knapp.disabled = false;
                knapp.textContent = "Spara och logga in";
            });
    }

    // ---------- Redigering ----------

    function delaFil(hel) {
        var match = hel.match(/^﻿?\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(\n|$)/);
        if (!match) return { installningar: [], text: hel };
        var lista = [];
        match[1].split("\n").forEach(function (rad) {
            var i = rad.indexOf(":");
            if (i > 0) lista.push([rad.slice(0, i).trim().toLowerCase(), rad.slice(i + 1).trim()]);
        });
        return { installningar: lista, text: hel.slice(match[0].length) };
    }

    function byggFil() {
        var rader = tillstand.installningar.map(function (p) { return p[0] + ": " + p[1]; });
        var text = tillstand.text;
        if (text && text.charAt(0) !== "\n") text = "\n" + text;
        return "---\n" + rader.join("\n") + "\n---\n" + text;
    }

    function hamtaInst(nyckel) {
        for (var i = 0; i < tillstand.installningar.length; i++) {
            if (tillstand.installningar[i][0] === nyckel) return tillstand.installningar[i][1];
        }
        return "";
    }
    function sattInst(nyckel, varde) {
        varde = String(varde || "").replace(/[\r\n]+/g, " ").trim();
        for (var i = 0; i < tillstand.installningar.length; i++) {
            if (tillstand.installningar[i][0] === nyckel) {
                tillstand.installningar[i][1] = varde;
                return andrat();
            }
        }
        tillstand.installningar.push([nyckel, varde]);
        andrat();
    }

    function oppnaRedigering() {
        visaSkarm("skarm-laddar");
        hamtaFil(KONFIG.innehall).then(function (fil) {
            laddaIn(fil);
            visaSkarm("skarm-redigera");
            uppdateraForhandsvisning();
        }).catch(function (fel) {
            console.error(fel);
            if (fel.status === 401) { glomToken(); return visaInloggning(); }
            visaSkarm("skarm-logga-in");
            visaFel($("#fel-logga-in"), "Kunde inte hämta texten från GitHub (" + fel.message + "). Ladda om sidan och försök igen.");
        });
    }

    function laddaIn(fil) {
        var delat = delaFil(fil.text.replace(/\r\n/g, "\n"));
        tillstand.sha = fil.sha;
        tillstand.installningar = delat.installningar;
        tillstand.text = delat.text.replace(/^\n/, "");
        tillstand.sparad = byggFil();

        $("#text").value = tillstand.text;
        $$("[data-falt]").forEach(function (input) { input.value = hamtaInst(input.dataset.falt); });
        visaTeman();
        visaOmslag();
        visaOsa();
        andrat();
    }

    var forhandsvisningsTimer = null;
    var forhandsvisningRedo = false;

    function andrat() {
        var hel = byggFil();
        var osparat = hel !== tillstand.sparad;
        $("#spara").disabled = !osparat;
        if (osparat) $("#sparstatus").textContent = "Osparade ändringar";
        else if ($("#sparstatus").textContent === "Osparade ändringar") $("#sparstatus").textContent = "Inga ändringar";
        kontrolleraOsaDel();
        clearTimeout(forhandsvisningsTimer);
        forhandsvisningsTimer = setTimeout(uppdateraForhandsvisning, 250);
    }

    function uppdateraForhandsvisning() {
        if (!forhandsvisningRedo) return;
        $("#forhandsvisning").contentWindow.postMessage(
            { typ: "forhandsvisa", text: byggFil(), bilder: tillstand.lokalaBilder }, location.origin);
    }

    window.addEventListener("message", function (h) {
        if (h.origin === location.origin && h.data && h.data.typ === "forhandsvisning-redo") {
            forhandsvisningRedo = true;
            uppdateraForhandsvisning();
        }
    });

    function spara() {
        var knapp = $("#spara");
        var hel = byggFil();
        knapp.disabled = true;
        $("#sparstatus").textContent = "Sparar…";
        sparaFil(KONFIG.innehall, textTillB64(hel), tillstand.sha, "Uppdatera hemsidans text")
            .then(function (svar) {
                tillstand.sha = svar.content.sha;
                tillstand.sparad = hel;
                $("#sparstatus").textContent = "Sparat ✓ Syns på hemsidan om ungefär en minut.";
                andrat();
            })
            .catch(function (fel) {
                console.error(fel);
                knapp.disabled = false;
                if (fel.status === 409 || fel.status === 422) {
                    $("#sparstatus").textContent = "Texten har ändrats någon annanstans sedan du öppnade den. Kopiera dina ändringar och ladda om sidan.";
                } else if (fel.status === 401) {
                    $("#sparstatus").textContent = "Inloggningen har gått ut. Kopiera dina ändringar, logga ut och in igen.";
                } else {
                    $("#sparstatus").textContent = "Kunde inte spara (" + fel.message + "). Försök igen.";
                }
            });
    }

    // ---------- Flikar ----------

    function bytFlik(namn) {
        $$(".flikar [role=tab]").forEach(function (f) { f.setAttribute("aria-selected", f.dataset.flik === namn); });
        $$(".panel").forEach(function (p) { p.hidden = p.dataset.panel !== namn; });
        $("#arbetsyta").dataset.aktiv = namn;
        if (namn === "bilder") visaBildgalleri();
        if (namn === "forhandsvisa") uppdateraForhandsvisning();
    }

    // ---------- Textverktyg ----------

    function infoga(fore, efter, standard, egenRad) {
        var ta = $("#text");
        var start = ta.selectionStart, slut = ta.selectionEnd;
        var vald = ta.value.slice(start, slut) || standard;
        var innan = ta.value.slice(0, start);
        // egenRad: "rad" = börja på ny rad, "stycke" = börja efter en tom rad
        if (egenRad && innan) {
            if (!/\n$/.test(innan)) fore = (egenRad === "rad" ? "\n" : "\n\n") + fore;
            else if (egenRad === "stycke" && !/\n\n$/.test(innan)) fore = "\n" + fore;
        }
        var ny = fore + vald + efter;
        ta.focus();
        ta.setRangeText(ny, start, slut, "end");
        var valStart = start + fore.length;
        ta.setSelectionRange(valStart, valStart + vald.length);
        ta.dispatchEvent(new Event("input"));
    }

    var VERKTYG = {
        rubrik: function () { infoga("## ", "\n\n", "Ny rubrik", "stycke"); },
        kort: function () { infoga("### ", "\n", "Kortets rubrik", "stycke"); },
        fet: function () { infoga("**", "**", "fet text"); },
        kursiv: function () { infoga("*", "*", "kursiv text"); },
        lista: function () { infoga("- ", "\n", "punkt", "rad"); },
        lank: function () {
            var adress = prompt("Vilken adress ska länken gå till?", "https://");
            if (adress && adress !== "https://") infoga("[", "](" + adress.trim() + ")", "länktext");
        },
        knapp: function () {
            var adress = prompt("Vilken adress ska knappen gå till?", "https://");
            if (adress && adress !== "https://") infoga("[", "](" + adress.trim() + ")\n", "Knappens text", "stycke");
        },
        bild: function () {
            valjBilder(function (sokvagar) {
                sokvagar.forEach(function (s) { infoga("![", "](" + s + ")\n", "Bild", "stycke"); });
            });
        }
    };

    // ---------- Grundinfo ----------

    function visaTeman() {
        var aktivt = hamtaInst("tema") || "klassisk";
        var behallare = $("#teman");
        behallare.innerHTML = "";
        TEMAN.forEach(function (t) {
            var etikett = document.createElement("label");
            etikett.className = "tema";
            etikett.innerHTML = '<input type="radio" name="tema"><span class="prov" style="background:' + t.farger[0] +
                '"><span style="background:' + t.farger[1] + '"></span></span><span>' + t.namn + "</span>";
            var radio = etikett.querySelector("input");
            radio.value = t.id;
            radio.checked = t.id === aktivt;
            radio.addEventListener("change", function () { sattInst("tema", t.id); });
            behallare.appendChild(etikett);
        });
    }

    function visaOmslag() {
        var bild = hamtaInst("bild");
        var ruta = $("#omslag");
        ruta.innerHTML = "";
        if (bild) {
            var img = document.createElement("img");
            img.src = tillstand.lokalaBilder[bild] || bild;
            img.alt = "Omslagsbild";
            ruta.appendChild(img);
        } else {
            ruta.innerHTML = '<p class="mjuk liten">Ingen bild vald.</p>';
        }
        $("#ta-bort-omslag").hidden = !bild;
    }

    // ---------- OSA ----------

    function osaTyp(varde) {
        if (!varde) return "inget";
        if (/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(varde)) return "kalkylark";
        if (/^(mailto:)?[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(varde)) return "mejl";
        if (/^https?:\/\//i.test(varde)) return "lank";
        return "inget";
    }

    function visaOsa() {
        var varde = hamtaInst("osa");
        var typ = osaTyp(varde);
        $$("input[name=osa-typ]").forEach(function (r) { r.checked = r.value === typ; });
        $$("[data-osa-falt]").forEach(function (f) {
            f.value = f.dataset.osaFalt === typ ? varde.replace(/^mailto:/i, "") : "";
        });
        visaOsaDetalj();
    }

    function visaOsaDetalj() {
        var vald = $("input[name=osa-typ]:checked");
        var typ = vald ? vald.value : "inget";
        $$(".osa-detalj").forEach(function (d) { d.hidden = d.dataset.osa !== typ; });
    }

    function sparaOsaVal() {
        var vald = $("input[name=osa-typ]:checked");
        var typ = vald ? vald.value : "inget";
        var falt = $("[data-osa-falt=" + typ + "]");
        sattInst("osa", falt ? falt.value.trim() : "");
        $("#osa-test-resultat").textContent = "";
    }

    function kontrolleraOsaDel() {
        var harDel = /^##(?!#)[ \t]*OSA[ \t]*$/im.test(tillstand.text);
        $("#osa-saknar-del").hidden = harDel || !hamtaInst("osa");
    }

    function laggTillOsaDel() {
        var del = "## OSA\n\nVi hoppas att ni vill fira med oss! Svara senast **[DATUM]**.\n\n";
        var text = tillstand.text;
        var andraDel = text.search(/\n##(?!#)/);
        var forstaDel = text.search(/^##(?!#)/m);
        var pos = andraDel > forstaDel && forstaDel !== -1 ? andraDel + 1 : text.length;
        if (pos === text.length && text && !/\n\n$/.test(text)) del = (/\n$/.test(text) ? "\n" : "\n\n") + del;
        tillstand.text = text.slice(0, pos) + del + text.slice(pos);
        $("#text").value = tillstand.text;
        andrat();
    }

    function testaOsa() {
        var adress = $("[data-osa-falt=kalkylark]").value.trim();
        var resultat = $("#osa-test-resultat");
        if (osaTyp(adress) !== "kalkylark") {
            resultat.textContent = "Adressen ska börja med https://script.google.com/macros/s/ och sluta med /exec.";
            return;
        }
        resultat.textContent = "Testar…";
        fetch(adress).then(function (s) { return s.json(); }).then(function (data) {
            resultat.textContent = data && data.ok
                ? "✓ Anslutningen fungerar! Glöm inte att trycka Spara."
                : "Fick ett oväntat svar. Kontrollera att rätt skript är inklistrat.";
        }).catch(function () {
            resultat.textContent = "Kunde inte nå skriptet. Kontrollera att ”Vem har åtkomst” är satt till ”Alla” och att adressen slutar på /exec.";
        });
    }

    function kopieraSkript() {
        var knapp = $("#kopiera-skript");
        fetch("assets/osa-google-kalkylark.gs", { cache: "no-cache" })
            .then(function (s) { if (!s.ok) throw new Error(s.status); return s.text(); })
            .then(function (skript) { return navigator.clipboard.writeText(skript); })
            .then(function () { knapp.textContent = "Kopierat ✓"; })
            .catch(function () {
                window.open("assets/osa-google-kalkylark.gs", "_blank");
                knapp.textContent = "Kopiera skriptet";
            });
    }

    // ---------- Bilder ----------

    var valjBilderKlar = null;

    function valjBilder(klar) {
        valjBilderKlar = klar;
        var filval = $("#filval");
        filval.value = "";
        filval.click();
    }

    function forminska(fil) {
        return new Promise(function (ok, fel) {
            var url = URL.createObjectURL(fil);
            var img = new Image();
            img.onload = function () {
                var max = 2000;
                var skala = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
                var canvas = document.createElement("canvas");
                canvas.width = Math.round(img.naturalWidth * skala);
                canvas.height = Math.round(img.naturalHeight * skala);
                var ctx = canvas.getContext("2d");
                ctx.fillStyle = "#fff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                URL.revokeObjectURL(url);
                ok(canvas.toDataURL("image/jpeg", 0.85));
            };
            img.onerror = function () { URL.revokeObjectURL(url); fel(new Error("Kunde inte läsa bilden " + fil.name)); };
            img.src = url;
        });
    }

    function filnamn(namn) {
        var bas = namn.replace(/\.[^.]+$/, "").toLowerCase()
            .replace(/[åä]/g, "a").replace(/ö/g, "o")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "bild";
        return bas + "-" + Date.now().toString(36) + ".jpg";
    }

    function laddaUppFiler(filer) {
        var status = $("#uppladdning-status");
        var sokvagar = [];
        var kedja = Promise.resolve();
        filer.forEach(function (fil, i) {
            kedja = kedja.then(function () {
                status.textContent = "Laddar upp bild " + (i + 1) + " av " + filer.length + "…";
                return forminska(fil).then(function (dataUrl) {
                    var sokvag = KONFIG.bildmapp + "/" + filnamn(fil.name);
                    return sparaFil(sokvag, dataUrl.split(",")[1], null, "Ladda upp bild " + sokvag).then(function () {
                        tillstand.lokalaBilder[sokvag] = dataUrl;
                        bildlista = null;
                        sokvagar.push(sokvag);
                    });
                });
            });
        });
        return kedja.then(function () {
            status.textContent = filer.length === 1 ? "Bilden är uppladdad ✓" : "Bilderna är uppladdade ✓";
            return sokvagar;
        }).catch(function (fel) {
            console.error(fel);
            status.textContent = "Uppladdningen misslyckades: " + fel.message;
            return sokvagar;
        });
    }

    var bildlista = null;

    function visaBildgalleri() {
        var galleri = $("#bildgalleri");
        var hamta = bildlista ? Promise.resolve(bildlista) :
            gh(filSokvag(KONFIG.bildmapp) + "?ref=" + encodeURIComponent(KONFIG.gren))
                .catch(function (fel) { if (fel.status === 404) return []; throw fel; })
                .then(function (lista) {
                    bildlista = lista.filter(function (f) { return f.type === "file" && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name); });
                    return bildlista;
                });
        hamta.then(function (lista) {
            galleri.innerHTML = "";
            if (!lista.length) {
                galleri.innerHTML = '<p class="mjuk liten">Inga bilder uppladdade än.</p>';
                return;
            }
            lista.slice().reverse().forEach(function (f) {
                var kort = document.createElement("figure");
                kort.className = "bildkort";
                var img = document.createElement("img");
                img.loading = "lazy";
                img.alt = f.name;
                img.src = tillstand.lokalaBilder[f.path] || f.download_url;
                kort.appendChild(img);
                var knappar = document.createElement("figcaption");
                [["Infoga i texten", function () {
                    bytFlik("text");
                    infoga("![", "](" + f.path + ")\n", "Bild", "stycke");
                }], ["Använd som omslag", function () {
                    sattInst("bild", f.path);
                    visaOmslag();
                    bytFlik("grundinfo");
                }], ["Ta bort", function () {
                    if (!confirm("Ta bort " + f.name + "? Om bilden används på sidan försvinner den där.")) return;
                    gh(filSokvag(f.path), { method: "DELETE", body: { message: "Ta bort bild " + f.path, sha: f.sha, branch: KONFIG.gren } })
                        .then(function () { bildlista = null; visaBildgalleri(); })
                        .catch(function (fel) { alert("Kunde inte ta bort bilden: " + fel.message); });
                }]].forEach(function (k) {
                    var b = document.createElement("button");
                    b.type = "button";
                    b.className = "lank";
                    b.textContent = k[0];
                    b.addEventListener("click", k[1]);
                    knappar.appendChild(b);
                });
                kort.appendChild(knappar);
                galleri.appendChild(kort);
            });
        }).catch(function (fel) {
            galleri.innerHTML = "";
            $("#uppladdning-status").textContent = "Kunde inte hämta bilderna: " + fel.message;
        });
    }

    // ---------- Koppla ihop knappar ----------

    document.addEventListener("DOMContentLoaded", function () {
        $("#form-installera").addEventListener("submit", installera);
        $("#foresla-losenord").addEventListener("click", function () { $("#nytt-losenord").value = foreslaLosenord(); });
        $("#till-installation").addEventListener("click", function (h) { h.preventDefault(); visaSkarm("skarm-installera"); });

        $("#logga-ut").addEventListener("click", function () {
            if (!$("#spara").disabled && !confirm("Du har osparade ändringar. Logga ut ändå?")) return;
            tillstand.sparad = byggFil();
            glomToken();
            location.reload();
        });

        $$(".flikar [role=tab]").forEach(function (f) {
            f.addEventListener("click", function () { bytFlik(f.dataset.flik); });
        });

        $("#text").addEventListener("input", function () {
            tillstand.text = $("#text").value;
            andrat();
        });

        $("#verktyg").addEventListener("click", function (h) {
            var b = h.target.closest("button[data-gor]");
            if (b) VERKTYG[b.dataset.gor]();
        });

        $$("[data-falt]").forEach(function (input) {
            input.addEventListener("input", function () { sattInst(input.dataset.falt, input.value); });
        });

        $("#valj-omslag").addEventListener("click", function () {
            valjBilder(function (s) { if (s[0]) { sattInst("bild", s[0]); visaOmslag(); } });
        });
        $("#ta-bort-omslag").addEventListener("click", function () { sattInst("bild", ""); visaOmslag(); });

        $$("input[name=osa-typ]").forEach(function (r) {
            r.addEventListener("change", function () { visaOsaDetalj(); sparaOsaVal(); });
        });
        $$("[data-osa-falt]").forEach(function (f) { f.addEventListener("input", sparaOsaVal); });
        $("#testa-osa").addEventListener("click", testaOsa);
        $("#kopiera-skript").addEventListener("click", kopieraSkript);
        $("#lagg-till-osa-del").addEventListener("click", laggTillOsaDel);

        $("#ladda-upp").addEventListener("click", function () {
            valjBilder(null);
        });
        $("#filval").addEventListener("change", function () {
            var filer = Array.prototype.slice.call(this.files || []);
            var klar = valjBilderKlar;
            valjBilderKlar = null;
            if (!filer.length) return;
            if ($("#arbetsyta").dataset.aktiv !== "bilder") {
                $("#sparstatus").textContent = "Laddar upp bild…";
            }
            laddaUppFiler(filer).then(function (sokvagar) {
                if ($("#sparstatus").textContent === "Laddar upp bild…") $("#sparstatus").textContent = "Bild uppladdad ✓";
                if (klar) klar(sokvagar);
                if ($("#arbetsyta").dataset.aktiv === "bilder") visaBildgalleri();
            });
        });

        $("#spara").addEventListener("click", spara);
        document.addEventListener("keydown", function (h) {
            if ((h.metaKey || h.ctrlKey) && h.key === "s") {
                h.preventDefault();
                if (!$("#spara").disabled) spara();
            }
        });

        window.addEventListener("beforeunload", function (h) {
            if (token && tillstand.sha && byggFil() !== tillstand.sparad) { h.preventDefault(); h.returnValue = ""; }
        });

        start();
    });
})();
