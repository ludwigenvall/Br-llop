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

    var STILAR = [
        { id: "klassisk", namn: "Klassisk", text: "Tidlös och elegant", font: "'Cormorant Garamond', serif", vikt: 500 },
        { id: "romantisk", namn: "Romantisk", text: "Handskrivna namn och hjärtan", font: "'Great Vibes', cursive", vikt: 400, storlek: 1.35 },
        { id: "modern", namn: "Modern", text: "Stram, luftig och vänsterställd", font: "'DM Serif Display', serif", vikt: 400 },
        { id: "botanisk", namn: "Botanisk", text: "Med små lövkvistar", font: "'Playfair Display', serif", vikt: 500, kursiv: true },
        { id: "artdeco", namn: "Art deco", text: "Ramar, versaler och romber", font: "'Marcellus', serif", vikt: 400, versaler: true, storlek: 0.8 },
        { id: "lekfull", namn: "Lekfull", text: "Mjuka former och vågor", font: "'Fraunces', serif", vikt: 600, kursiv: true }
    ];

    var TEMAN = [
        { id: "klassisk", namn: "Klassisk", bakgrund: "#f5f0e8", accent: "#9c7c4c", text: "#2b2825" },
        { id: "champagne", namn: "Champagne", bakgrund: "#faf6ee", accent: "#8a6d2f", text: "#2d2a24" },
        { id: "sand", namn: "Sand", bakgrund: "#f4efe6", accent: "#7a6649", text: "#3b352c" },
        { id: "salvia", namn: "Salvia", bakgrund: "#eef1e9", accent: "#5f7350", text: "#2f342a" },
        { id: "ros", namn: "Ros", bakgrund: "#f7ecec", accent: "#a8646a", text: "#3a2b2b" },
        { id: "lavendel", namn: "Lavendel", bakgrund: "#f3f0f7", accent: "#6f5a94", text: "#2e2a38" },
        { id: "terrakotta", namn: "Terrakotta", bakgrund: "#f7ede3", accent: "#b05a33", text: "#3a2a1f" },
        { id: "bordeaux", namn: "Bordeaux", bakgrund: "#f8f1ee", accent: "#7d2934", text: "#33201f" },
        { id: "hav", namn: "Hav", bakgrund: "#eaf2f2", accent: "#3a7f80", text: "#223333" },
        { id: "himmel", namn: "Himmel", bakgrund: "#eef3f9", accent: "#3a5c8f", text: "#1f2a3a" },
        { id: "svartvit", namn: "Svartvit", bakgrund: "#ffffff", accent: "#111111", text: "#111111" },
        { id: "natt", namn: "Natt", bakgrund: "#171d2b", accent: "#d4af6a", text: "#f2eee4" },
        { id: "skog", namn: "Skog", bakgrund: "#1e2a23", accent: "#cbb27a", text: "#eef0e8" }
    ];

    var FORSLAG = [
        { namn: "Klassisk elegans", stil: "klassisk", tema: "klassisk" },
        { namn: "Sommaräng", stil: "botanisk", tema: "salvia" },
        { namn: "Romantisk ros", stil: "romantisk", tema: "ros" },
        { namn: "Slottsbröllop", stil: "artdeco", tema: "natt" },
        { namn: "Skärgård", stil: "modern", tema: "hav" },
        { namn: "Höstfest", stil: "klassisk", tema: "terrakotta" },
        { namn: "Skogsbröllop", stil: "botanisk", tema: "skog" },
        { namn: "Champagne", stil: "artdeco", tema: "champagne" },
        { namn: "Avskalat", stil: "modern", tema: "svartvit" },
        { namn: "Lavendelfält", stil: "romantisk", tema: "lavendel" },
        { namn: "Trädgårdsfest", stil: "lekfull", tema: "sand" },
        { namn: "Vinkällare", stil: "klassisk", tema: "bordeaux" }
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
            autoHojd();
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
        tolkaText(tillstand.text);
        visaDelar();
        $$("[data-falt]").forEach(function (input) { input.value = hamtaInst(input.dataset.falt); });
        visaUtseende();
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

    function scrollaForhandsvisning(rubrik) {
        if (!forhandsvisningRedo) return;
        $("#forhandsvisning").contentWindow.postMessage({ typ: "scrolla", id: skapaId(rubrik) }, location.origin);
    }

    function forhandsvisningKlar() {
        if (forhandsvisningRedo) return;
        forhandsvisningRedo = true;
        uppdateraForhandsvisning();
    }

    window.addEventListener("message", function (h) {
        if (h.origin === location.origin && h.data && h.data.typ === "forhandsvisning-redo") forhandsvisningKlar();
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

    // ---------- Delarna (en ruta per "## Rubrik") ----------

    var delar = [];  // [{ raw, rubrik, text, bilder: [{ alt, src }], andrad }]
    var fore = "";   // ev. text före första rubriken (syns inte på sidan)

    var BILDRAD = /^[ \t]*(?:!\[[^\]]*\]\([^)\s]+(?:[ \t]+"[^"]*")?\)[ \t]*)+$/;
    var BILD = /!\[([^\]]*)\]\(([^)\s]+)(?:[ \t]+"[^"]*")?\)/g;

    function skapaId(rubrik) {
        return rubrik.toLowerCase()
            .replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "del";
    }

    function tolkaText(text) {
        var bitar = text.split(/(?=^##(?!#))/m);
        fore = bitar.length && !/^##(?!#)/.test(bitar[0]) ? bitar.shift() : "";
        delar = bitar.map(tolkaDel);
    }

    function tolkaDel(raw) {
        var radbryt = raw.indexOf("\n");
        var rubrik = (radbryt === -1 ? raw : raw.slice(0, radbryt)).replace(/^##[ \t]*/, "").trim();
        var kropp = radbryt === -1 ? "" : raw.slice(radbryt + 1);
        var bilder = [];
        var rader = kropp.split("\n").filter(function (rad) {
            if (!BILDRAD.test(rad)) return true;
            rad.replace(BILD, function (_, alt, src) { bilder.push({ alt: alt, src: src }); });
            return false;
        });
        return {
            raw: raw,
            rubrik: rubrik,
            text: rader.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
            bilder: bilder,
            andrad: false
        };
    }

    function delTillText(d) {
        if (!d.andrad) return d.raw.replace(/\s*$/, "\n\n");
        var ut = "## " + d.rubrik.replace(/[\r\n]+/g, " ").trim() + "\n\n";
        if (d.text.trim()) ut += d.text.trim() + "\n\n";
        if (d.bilder.length) {
            ut += d.bilder.map(function (b) { return "![" + b.alt + "](" + b.src + ")"; }).join("\n") + "\n\n";
        }
        return ut;
    }

    function byggTextFranDelar() {
        var f = fore.trim() ? fore.replace(/\s*$/, "\n\n") : "";
        tillstand.text = (f + delar.map(delTillText).join("")).replace(/\s*$/, "\n");
        $("#text").value = tillstand.text;
        andrat();
    }

    // Visar en bild från repot. Om hemsidan inte hunnit publicera den än hämtas den direkt från GitHub.
    function sattBild(img, sokvag, reserv) {
        img.onerror = function () {
            img.onerror = null;
            img.src = reserv || ("https://raw.githubusercontent.com/" + KONFIG.agare + "/" + KONFIG.repo + "/" +
                KONFIG.gren + "/" + sokvag.split("/").map(encodeURIComponent).join("/"));
        };
        img.src = tillstand.lokalaBilder[sokvag] || sokvag;
    }

    function skapa(tagg, klass, html) {
        var e = document.createElement(tagg);
        if (klass) e.className = klass;
        if (html) e.innerHTML = html;
        return e;
    }

    var VERKTYG_HTML =
        '<button type="button" data-gor="fet" title="Fetstil"><b>F</b></button>' +
        '<button type="button" data-gor="kursiv" title="Kursiv"><i>K</i></button>' +
        '<button type="button" data-gor="lista" title="Punktlista">• Lista</button>' +
        '<button type="button" data-gor="kort" title="Underrubrik i ett eget kort">Underrubrik</button>' +
        '<button type="button" data-gor="lank" title="Länk">Länk</button>' +
        '<button type="button" data-gor="knapp" title="Knapp (länk på egen rad)">Knapp</button>';

    function visaDelar(fokusIndex, fokusKnapp) {
        var behallare = $("#delar");
        behallare.innerHTML = "";
        if (!delar.length) behallare.innerHTML = '<p class="mjuk liten">Inga delar än. Lägg till en nedan.</p>';
        delar.forEach(function (d, i) { behallare.appendChild(byggDelKort(d, i)); });
        autoHojd();
        if (fokusIndex !== undefined) {
            var kort = behallare.children[fokusIndex];
            var mal = kort && (kort.querySelector('[data-gor="' + fokusKnapp + '"]:not(:disabled)') || kort.querySelector(".del-rubrik"));
            if (mal) { mal.focus(); kort.scrollIntoView({ block: "nearest" }); }
        }
    }

    function byggDelKort(d, i) {
        var kort = skapa("article", "del",
            '<div class="del-huvud">' +
            '<input class="del-rubrik" aria-label="Rubrik" placeholder="Rubrik">' +
            '<div class="del-knappar">' +
            '<button type="button" data-gor="upp" title="Flytta upp" aria-label="Flytta upp">↑</button>' +
            '<button type="button" data-gor="ned" title="Flytta ned" aria-label="Flytta ned">↓</button>' +
            '<button type="button" data-gor="ta-bort" title="Ta bort delen" aria-label="Ta bort delen">✕</button>' +
            "</div></div>" +
            '<div class="verktyg liten-verktyg">' + VERKTYG_HTML + "</div>" +
            '<textarea class="del-text" rows="3" aria-label="Text" placeholder="Skriv text här…"></textarea>' +
            '<p class="osa-info liten" hidden>Under texten visas OSA-formuläret. Det ställs in under fliken <strong>OSA</strong>.</p>' +
            '<div class="del-bilder"></div>' +
            '<p class="liten del-status" role="status"></p>');

        var rubrik = kort.querySelector(".del-rubrik");
        var text = kort.querySelector(".del-text");
        var osaInfo = kort.querySelector(".osa-info");
        rubrik.value = d.rubrik;
        text.value = d.text;
        osaInfo.hidden = skapaId(d.rubrik) !== "osa";
        kort.querySelector('[data-gor="upp"]').disabled = i === 0;
        kort.querySelector('[data-gor="ned"]').disabled = i === delar.length - 1;

        rubrik.addEventListener("input", function () {
            d.rubrik = rubrik.value;
            d.andrad = true;
            osaInfo.hidden = skapaId(d.rubrik) !== "osa";
            byggTextFranDelar();
        });
        text.addEventListener("input", function () {
            d.text = text.value;
            d.andrad = true;
            autoHojd(text);
            byggTextFranDelar();
        });
        kort.addEventListener("focusin", function () { scrollaForhandsvisning(d.rubrik); });

        kort.addEventListener("click", function (h) {
            var knapp = h.target.closest("button[data-gor]");
            if (!knapp) return;
            var gor = knapp.dataset.gor;
            var index = delar.indexOf(d);
            if (gor === "upp" || gor === "ned") {
                var ny = index + (gor === "upp" ? -1 : 1);
                delar.splice(index, 1);
                delar.splice(ny, 0, d);
                visaDelar(ny, gor);
                byggTextFranDelar();
                scrollaForhandsvisning(d.rubrik);
            } else if (gor === "ta-bort") {
                if (!confirm("Ta bort delen ”" + (d.rubrik || "utan rubrik") + "” från hemsidan?")) return;
                delar.splice(index, 1);
                visaDelar();
                byggTextFranDelar();
            } else if (VERKTYG[gor]) {
                VERKTYG[gor](text);
            }
        });

        // Dra och släpp bilder direkt på rutan.
        slappbar(kort, function (filer) { laggTillBilderIDel(d, filer, kort); });

        visaDelBilder(kort, d);
        return kort;
    }

    function visaDelBilder(kort, d) {
        var yta = kort.querySelector(".del-bilder");
        yta.innerHTML = "";
        d.bilder.forEach(function (b, j) {
            var fig = skapa("figure", "tumnagel");
            var img = document.createElement("img");
            sattBild(img, b.src);
            img.alt = "";
            fig.appendChild(img);
            var knappar = skapa("div", "tumnagel-knappar");
            [["‹", "Flytta åt vänster", j > 0, function () { flytta(j, j - 1); }],
             ["›", "Flytta åt höger", j < d.bilder.length - 1, function () { flytta(j, j + 1); }],
             ["✕", "Ta bort bilden från den här delen", true, function () {
                 d.bilder.splice(j, 1);
                 klar();
             }]].forEach(function (k) {
                if (!k[2]) return;
                var knapp = skapa("button");
                knapp.type = "button";
                knapp.textContent = k[0];
                knapp.title = k[1];
                knapp.setAttribute("aria-label", k[1]);
                knapp.addEventListener("click", k[3]);
                knappar.appendChild(knapp);
            });
            fig.appendChild(knappar);
            yta.appendChild(fig);
        });
        var lagg = skapa("button", "lagg-till-bild", d.bilder.length ? "+ Fler bilder" : "+ Lägg till bilder");
        lagg.type = "button";
        lagg.addEventListener("click", function () {
            valjBilder(function (filer) { laggTillBilderIDel(d, filer, kort); });
        });
        yta.appendChild(lagg);

        function flytta(fran, till) {
            var b = d.bilder.splice(fran, 1)[0];
            d.bilder.splice(till, 0, b);
            klar();
        }
        function klar() {
            d.andrad = true;
            visaDelBilder(kort, d);
            byggTextFranDelar();
        }
    }

    function laggTillBilderIDel(d, filer, kort) {
        var status = kort.querySelector(".del-status");
        laddaUppFiler(filer, status).then(function (sokvagar) {
            if (!sokvagar.length) return;
            sokvagar.forEach(function (s) { d.bilder.push({ alt: "", src: s }); });
            d.andrad = true;
            visaDelBilder(kort, d);
            byggTextFranDelar();
            scrollaForhandsvisning(d.rubrik);
        });
    }

    function nyDel() {
        delar.push({ raw: "", rubrik: "Ny del", text: "", bilder: [], andrad: true });
        visaDelar();
        byggTextFranDelar();
        var sista = $("#delar").lastElementChild;
        var rubrik = sista.querySelector(".del-rubrik");
        sista.scrollIntoView({ behavior: "smooth", block: "center" });
        rubrik.focus();
        rubrik.select();
    }

    function autoHojd(ta) {
        (ta ? [ta] : $$(".del-text")).forEach(function (t) {
            t.style.height = "auto";
            t.style.height = Math.max(t.scrollHeight + 2, 72) + "px";
        });
    }

    function visaAvancerat(ja) {
        if (ja) {
            $("#text").value = tillstand.text;
        } else {
            tolkaText(tillstand.text);
            visaDelar();
        }
        $("#enkel-vy").hidden = ja;
        $("#avancerad-vy").hidden = !ja;
    }

    // ---------- Flikar ----------

    function bytFlik(namn) {
        $$(".flikar [role=tab]").forEach(function (f) { f.setAttribute("aria-selected", f.dataset.flik === namn); });
        $$(".panel").forEach(function (p) { p.hidden = p.dataset.panel !== namn; });
        $("#arbetsyta").dataset.aktiv = namn;
        $(".panel-yta").scrollTop = 0;
        if (namn === "innehall") autoHojd();
        if (namn === "bilder") visaBildgalleri();
        if (namn === "utseende") visaOmslagsval();
        if (namn === "forhandsvisa") uppdateraForhandsvisning();
    }

    // ---------- Textverktyg ----------

    function infoga(ta, fore, efter, standard, egenRad) {
        var start = ta.selectionStart, slut = ta.selectionEnd;
        var vald = ta.value.slice(start, slut) || standard;
        var innan = ta.value.slice(0, start);
        // egenRad: "rad" = börja på ny rad, "stycke" = börja efter en tom rad
        if (egenRad && innan) {
            if (!/\n$/.test(innan)) fore = (egenRad === "rad" ? "\n" : "\n\n") + fore;
            else if (egenRad === "stycke" && !/\n\n$/.test(innan)) fore = "\n" + fore;
        }
        ta.focus();
        ta.setRangeText(fore + vald + efter, start, slut, "end");
        var valStart = start + fore.length;
        ta.setSelectionRange(valStart, valStart + vald.length);
        ta.dispatchEvent(new Event("input"));
    }

    function fragaAdress(fraga) {
        var adress = prompt(fraga, "https://");
        return adress && adress.trim() !== "https://" ? adress.trim() : null;
    }

    var VERKTYG = {
        rubrik: function (ta) { infoga(ta, "## ", "\n\n", "Ny rubrik", "stycke"); },
        kort: function (ta) { infoga(ta, "### ", "\n", "Underrubrik", "stycke"); },
        fet: function (ta) { infoga(ta, "**", "**", "fet text"); },
        kursiv: function (ta) { infoga(ta, "*", "*", "kursiv text"); },
        lista: function (ta) { infoga(ta, "- ", "\n", "punkt", "rad"); },
        lank: function (ta) {
            var adress = fragaAdress("Vilken adress ska länken gå till?");
            if (adress) infoga(ta, "[", "](" + adress + ")", "länktext");
        },
        knapp: function (ta) {
            var adress = fragaAdress("Vilken adress ska knappen gå till?");
            if (adress) infoga(ta, "[", "](" + adress + ")\n", "Knappens text", "stycke");
        },
        bild: function (ta) {
            valjBilder(function (filer) {
                laddaUppFiler(filer, $("#sparstatus")).then(function (sokvagar) {
                    sokvagar.forEach(function (s) { infoga(ta, "![](", ")\n", s, "stycke"); });
                });
            });
        }
    };

    // ---------- Utseende ----------

    function hittaTema(id) { return TEMAN.filter(function (t) { return t.id === id; })[0] || TEMAN[0]; }
    function hittaStil(id) { return STILAR.filter(function (s) { return s.id === id; })[0] || STILAR[0]; }

    function namnProv(stil, storlek) {
        var span = skapa("span", "namn-prov");
        span.textContent = hamtaInst("namn") || "Ebba & Axel";
        span.style.fontFamily = stil.font;
        span.style.fontWeight = stil.vikt;
        span.style.fontStyle = stil.kursiv ? "italic" : "normal";
        span.style.fontSize = (storlek * (stil.storlek || 1)) + "rem";
        if (stil.versaler) { span.style.textTransform = "uppercase"; span.style.letterSpacing = "0.06em"; }
        return span;
    }

    function valKnapp(vald, onClick) {
        var b = skapa("button", "valkort");
        b.type = "button";
        b.setAttribute("aria-pressed", vald ? "true" : "false");
        b.addEventListener("click", onClick);
        return b;
    }

    function visaUtseende() {
        var aktivStil = hamtaInst("stil") || "klassisk";
        var aktivtTema = hamtaInst("tema") || "klassisk";

        var forslag = $("#forslag");
        forslag.innerHTML = "";
        FORSLAG.forEach(function (f) {
            var tema = hittaTema(f.tema), stil = hittaStil(f.stil);
            var b = valKnapp(f.stil === aktivStil && f.tema === aktivtTema, function () {
                sattInst("stil", f.stil);
                sattInst("tema", f.tema);
                visaUtseende();
            });
            var prov = skapa("span", "forslag-prov");
            prov.style.background = tema.bakgrund;
            prov.style.color = tema.text;
            prov.appendChild(namnProv(stil, 1.05));
            var linje = skapa("span", "prov-linje");
            linje.style.background = tema.accent;
            prov.appendChild(linje);
            var knapp = skapa("span", "prov-knapp");
            knapp.style.background = tema.accent;
            prov.appendChild(knapp);
            b.appendChild(prov);
            b.appendChild(skapa("span", "valkort-namn", f.namn));
            forslag.appendChild(b);
        });

        var stilar = $("#stilar");
        stilar.innerHTML = "";
        STILAR.forEach(function (s) {
            var b = valKnapp(s.id === aktivStil, function () { sattInst("stil", s.id); visaUtseende(); });
            var prov = skapa("span", "stil-prov");
            prov.appendChild(namnProv(s, 1.3));
            b.appendChild(prov);
            b.appendChild(skapa("span", "valkort-namn", s.namn));
            b.appendChild(skapa("span", "valkort-text", s.text));
            stilar.appendChild(b);
        });

        var teman = $("#teman");
        teman.innerHTML = "";
        TEMAN.forEach(function (t) {
            var b = valKnapp(t.id === aktivtTema, function () { sattInst("tema", t.id); visaUtseende(); });
            b.classList.add("tema");
            var prov = skapa("span", "prov");
            prov.style.background = t.bakgrund;
            var prick = skapa("span");
            prick.style.background = t.accent;
            prov.appendChild(prick);
            b.appendChild(prov);
            b.appendChild(skapa("span", "valkort-namn", t.namn));
            teman.appendChild(b);
        });
    }

    function visaOmslag() {
        var bild = hamtaInst("bild");
        var ruta = $("#omslag");
        ruta.innerHTML = "";
        if (bild) {
            var img = document.createElement("img");
            sattBild(img, bild);
            img.alt = "Omslagsbild";
            ruta.appendChild(img);
        } else {
            ruta.innerHTML = '<p class="mjuk liten">Ingen omslagsbild vald.</p>';
        }
        $("#ta-bort-omslag").hidden = !bild;
    }

    function visaOmslagsval() {
        hamtaBildlista().then(function (lista) {
            var yta = $("#omslag-val");
            yta.innerHTML = "";
            $("#omslag-val-yta").hidden = !lista.length;
            lista.forEach(function (f) {
                var b = valKnapp(hamtaInst("bild") === f.path, function () {
                    sattInst("bild", f.path);
                    visaOmslag();
                    visaOmslagsval();
                });
                b.classList.add("omslag-alternativ");
                b.setAttribute("aria-label", "Använd " + f.name + " som omslagsbild");
                var img = document.createElement("img");
                img.loading = "lazy";
                img.alt = "";
                sattBild(img, f.path, f.download_url);
                b.appendChild(img);
                yta.appendChild(b);
            });
        }).catch(function () { $("#omslag-val-yta").hidden = true; });
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
        tolkaText(tillstand.text);
        visaDelar();
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

    // Öppnar bildväljaren. "klar" får de valda filerna.
    function valjBilder(klar) {
        valjBilderKlar = klar;
        var filval = $("#filval");
        filval.value = "";
        filval.click();
    }

    // Gör att man kan dra och släppa bilder på ett element.
    function slappbar(el, klar) {
        var raknare = 0;
        el.addEventListener("dragenter", function (h) {
            if (!harFiler(h)) return;
            h.preventDefault();
            raknare++;
            el.classList.add("slapp-over");
        });
        el.addEventListener("dragover", function (h) { if (harFiler(h)) h.preventDefault(); });
        el.addEventListener("dragleave", function () {
            if (--raknare <= 0) { raknare = 0; el.classList.remove("slapp-over"); }
        });
        el.addEventListener("drop", function (h) {
            if (!harFiler(h)) return;
            h.preventDefault();
            h.stopPropagation();
            raknare = 0;
            el.classList.remove("slapp-over");
            var filer = Array.prototype.filter.call(h.dataTransfer.files, function (f) { return /^image\//.test(f.type); });
            if (filer.length) klar(filer);
        });
    }
    function harFiler(h) {
        return h.dataTransfer && Array.prototype.indexOf.call(h.dataTransfer.types || [], "Files") !== -1;
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

    // Förminskar och laddar upp bilderna. Returnerar sökvägarna, t.ex. ["bilder/strand-abc.jpg"].
    function laddaUppFiler(filer, statusEl) {
        var status = statusEl || $("#uppladdning-status");
        var sokvagar = [];
        var kedja = Promise.resolve();
        filer.forEach(function (fil, i) {
            kedja = kedja.then(function () {
                status.textContent = filer.length === 1 ? "Laddar upp bilden…" : "Laddar upp bild " + (i + 1) + " av " + filer.length + "…";
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
            setTimeout(function () { if (/✓$/.test(status.textContent)) status.textContent = ""; }, 4000);
            return sokvagar;
        }).catch(function (fel) {
            console.error(fel);
            status.textContent = "Uppladdningen misslyckades: " + fel.message;
            return sokvagar;
        });
    }

    var bildlista = null;

    function hamtaBildlista() {
        if (bildlista) return Promise.resolve(bildlista);
        return gh(filSokvag(KONFIG.bildmapp) + "?ref=" + encodeURIComponent(KONFIG.gren))
            .catch(function (fel) { if (fel.status === 404) return []; throw fel; })
            .then(function (lista) {
                bildlista = lista.filter(function (f) {
                    return f.type === "file" && /\.(jpe?g|png|gif|webp|svg)$/i.test(f.name);
                }).reverse();
                return bildlista;
            });
    }

    function bildAnvands(sokvag) {
        return hamtaInst("bild") === sokvag || delar.some(function (d) {
            return d.bilder.some(function (b) { return b.src === sokvag; });
        }) || tillstand.text.indexOf("(" + sokvag + ")") !== -1;
    }

    function visaBildgalleri() {
        var galleri = $("#bildgalleri");
        hamtaBildlista().then(function (lista) {
            galleri.innerHTML = "";
            if (!lista.length) {
                galleri.innerHTML = '<p class="mjuk liten">Inga bilder uppladdade än.</p>';
                return;
            }
            lista.forEach(function (f) {
                var kort = skapa("figure", "bildkort");
                var img = document.createElement("img");
                img.loading = "lazy";
                img.alt = f.name;
                sattBild(img, f.path, f.download_url);
                kort.appendChild(img);
                var under = skapa("figcaption");

                var val = skapa("select", "lagg-i-del");
                val.setAttribute("aria-label", "Lägg till bilden i en del");
                val.innerHTML = '<option value="">Visa i en del…</option>';
                delar.forEach(function (d, i) {
                    var o = document.createElement("option");
                    o.value = i;
                    o.textContent = d.rubrik || "(utan rubrik)";
                    val.appendChild(o);
                });
                val.addEventListener("change", function () {
                    var d = delar[val.value];
                    if (!d) return;
                    d.bilder.push({ alt: "", src: f.path });
                    d.andrad = true;
                    visaDelar();
                    byggTextFranDelar();
                    scrollaForhandsvisning(d.rubrik);
                    $("#uppladdning-status").textContent = "Bilden visas nu i ”" + d.rubrik + "” ✓";
                    val.value = "";
                });
                under.appendChild(val);

                [["Använd som omslag", function () {
                    sattInst("bild", f.path);
                    visaOmslag();
                    $("#uppladdning-status").textContent = "Bilden är nu omslagsbild ✓";
                }], ["Ta bort", function () {
                    var anvands = bildAnvands(f.path);
                    if (!confirm(anvands
                        ? "Bilden används på hemsidan. Ta bort den helt? Den försvinner då också från sidan."
                        : "Ta bort bilden?")) return;
                    gh(filSokvag(f.path), { method: "DELETE", body: { message: "Ta bort bild " + f.path, sha: f.sha, branch: KONFIG.gren } })
                        .then(function () {
                            if (anvands) {
                                delar.forEach(function (d) {
                                    var fore = d.bilder.length;
                                    d.bilder = d.bilder.filter(function (b) { return b.src !== f.path; });
                                    if (d.bilder.length !== fore) d.andrad = true;
                                });
                                byggTextFranDelar();
                                visaDelar();
                                if (hamtaInst("bild") === f.path) { sattInst("bild", ""); visaOmslag(); }
                                $("#uppladdning-status").textContent = "Bilden är borttagen. Tryck Spara så försvinner den från sidan.";
                            }
                            bildlista = null;
                            visaBildgalleri();
                        })
                        .catch(function (fel) { alert("Kunde inte ta bort bilden: " + fel.message); });
                }]].forEach(function (k) {
                    var b = skapa("button", "lank");
                    b.type = "button";
                    b.textContent = k[0];
                    b.addEventListener("click", k[1]);
                    under.appendChild(b);
                });
                kort.appendChild(under);
                galleri.appendChild(kort);
            });
        }).catch(function (fel) {
            galleri.innerHTML = "";
            $("#uppladdning-status").textContent = "Kunde inte hämta bilderna: " + fel.message;
        });
    }

    // ---------- Koppla ihop knappar ----------

    document.addEventListener("DOMContentLoaded", function () {
        // Förhandsvisningen kan ha laddats klart innan det här skriptet startade.
        var ram = $("#forhandsvisning");
        ram.addEventListener("load", forhandsvisningKlar);
        try { if (ram.contentDocument && ram.contentDocument.readyState === "complete" && ram.contentWindow.location.search) forhandsvisningKlar(); } catch (e) { }

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

        // Innehåll
        $("#ny-del").addEventListener("click", nyDel);
        $("#till-avancerat").addEventListener("click", function () { visaAvancerat(true); });
        $("#till-enkel").addEventListener("click", function () { visaAvancerat(false); });
        $("#text").addEventListener("input", function () {
            tillstand.text = $("#text").value;
            andrat();
        });
        $("[data-verktyg-for=text]").addEventListener("click", function (h) {
            var b = h.target.closest("button[data-gor]");
            if (b) VERKTYG[b.dataset.gor]($("#text"));
        });
        window.addEventListener("resize", function () { autoHojd(); });

        // Grundinfo
        $$("[data-falt]").forEach(function (input) {
            input.addEventListener("input", function () {
                sattInst(input.dataset.falt, input.value);
                if (input.dataset.falt === "namn") visaUtseende();
            });
        });

        // Omslag
        $("#valj-omslag").addEventListener("click", function () {
            valjBilder(function (filer) {
                laddaUppFiler(filer.slice(0, 1), $("#sparstatus")).then(function (s) {
                    if (s[0]) { sattInst("bild", s[0]); visaOmslag(); visaOmslagsval(); }
                });
            });
        });
        $("#ta-bort-omslag").addEventListener("click", function () { sattInst("bild", ""); visaOmslag(); visaOmslagsval(); });

        // OSA
        $$("input[name=osa-typ]").forEach(function (r) {
            r.addEventListener("change", function () { visaOsaDetalj(); sparaOsaVal(); });
        });
        $$("[data-osa-falt]").forEach(function (f) { f.addEventListener("input", sparaOsaVal); });
        $("#testa-osa").addEventListener("click", testaOsa);
        $("#kopiera-skript").addEventListener("click", kopieraSkript);
        $("#lagg-till-osa-del").addEventListener("click", laggTillOsaDel);

        // Bilder
        $("#ladda-upp").addEventListener("click", function () {
            valjBilder(function (filer) { laddaUppFiler(filer).then(visaBildgalleri); });
        });
        slappbar($("#slappyta"), function (filer) { laddaUppFiler(filer).then(visaBildgalleri); });
        $("#filval").addEventListener("change", function () {
            var filer = Array.prototype.slice.call(this.files || []);
            var klar = valjBilderKlar;
            valjBilderKlar = null;
            if (filer.length && klar) klar(filer);
        });
        // Släpper man en bild utanför en ruta ska webbläsaren inte öppna den.
        document.addEventListener("dragover", function (h) { if (harFiler(h)) h.preventDefault(); });
        document.addEventListener("drop", function (h) { if (harFiler(h)) h.preventDefault(); });

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
