// Läser innehall.md och bygger upp hela sidan utifrån den.
// Ebba & Axel behöver aldrig röra den här filen.

(function () {
    "use strict";

    var MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli",
        "augusti", "september", "oktober", "november", "december"];

    // Typsnitt för varje stil (hämtas från Google Fonts när stilen används).
    var TYPSNITT = {
        klassisk: "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500",
        romantisk: "family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500",
        modern: "family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500",
        botanisk: "family=Playfair+Display:ital,wght@0,500;0,600;1,500&family=Lato:wght@300;400;700",
        artdeco: "family=Marcellus&family=Josefin+Sans:wght@300;400;600",
        lekfull: "family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500;1,9..144,600&family=Nunito:wght@300;400;600"
    };
    // Typsnitt som kan väljas separat för namnen ("namn_typsnitt:").
    var NAMNTYPSNITT = {
        greatvibes: { font: "'Great Vibes', cursive", q: "family=Great+Vibes", vikt: 400, skala: 1.3 },
        parisienne: { font: "'Parisienne', cursive", q: "family=Parisienne", vikt: 400, skala: 1.15 },
        pinyon: { font: "'Pinyon Script', cursive", q: "family=Pinyon+Script", vikt: 400, skala: 1.05 },
        allura: { font: "'Allura', cursive", q: "family=Allura", vikt: 400, skala: 1.35 },
        cormorant: { font: "'Cormorant Garamond', serif", q: "family=Cormorant+Garamond:ital,wght@0,500;1,500", vikt: 500, skala: 1 },
        playfair: { font: "'Playfair Display', serif", q: "family=Playfair+Display:ital,wght@0,500;1,500", vikt: 500, skala: 0.95 },
        bodoni: { font: "'Bodoni Moda', serif", q: "family=Bodoni+Moda:ital,wght@0,500;1,500", vikt: 500, skala: 0.95 },
        dmserif: { font: "'DM Serif Display', serif", q: "family=DM+Serif+Display:ital@0;1", vikt: 400, skala: 1 },
        fraunces: { font: "'Fraunces', serif", q: "family=Fraunces:ital,opsz,wght@1,9..144,600", vikt: 600, skala: 0.95, kursiv: true },
        marcellus: { font: "'Marcellus', serif", q: "family=Marcellus", vikt: 400, skala: 0.82, versaler: true },
        josefin: { font: "'Josefin Sans', sans-serif", q: "family=Josefin+Sans:wght@300;400", vikt: 300, skala: 0.72, versaler: true }
    };

    var LAYOUTER = ["bakom", "ovanfor", "under", "bredvid"];
    var DEKORER = ["ingen", "blomster", "eukalyptus", "olivkvist", "vildblommor", "palmer", "hjartan", "stjarnor", "monogram"];
    var RAMAR = ["ingen", "tunn", "dubbel", "rundad", "bage", "oval", "horn", "kort"];
    var MONSTER = ["ingen", "prickar", "ranter", "rutor", "romber", "vagor", "blommor", "linne"];

    var laddadeTypsnitt = {};
    laddadeTypsnitt[TYPSNITT.klassisk] = true; // laddas redan i index.html

    function laddaTypsnitt(stilEllerFraga) {
        var fraga = TYPSNITT[stilEllerFraga] || stilEllerFraga;
        if (!fraga || laddadeTypsnitt[fraga]) return;
        laddadeTypsnitt[fraga] = true;
        var lank = document.createElement("link");
        lank.rel = "stylesheet";
        lank.href = "https://fonts.googleapis.com/css2?" + fraga + "&display=swap";
        document.head.appendChild(lank);
    }

    function sattAttribut(namn, varde, tillatna) {
        var html = document.documentElement;
        if (varde && (!tillatna || tillatna.indexOf(varde) !== -1)) html.setAttribute(namn, varde);
        else html.removeAttribute(namn);
    }

    // "#rrggbb" -> ljusstyrka 0–1
    function ljusstyrka(hex) {
        var m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
        if (!m) return null;
        var n = parseInt(m[1], 16);
        var kanal = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        return 0.2126 * kanal(n >> 16 & 255) + 0.7152 * kanal(n >> 8 & 255) + 0.0722 * kanal(n & 255);
    }

    function visaNamn(el, namn) {
        el.innerHTML = "";
        var delar = namn.split(/\s+(&|och|\+)\s+/i);
        if (delar.length !== 3) { el.textContent = namn; return; }
        [["namn", delar[0]], ["och", delar[1]], ["namn", delar[2]]].forEach(function (d, i) {
            if (i) el.appendChild(document.createTextNode(" "));
            el.appendChild(Object.assign(document.createElement("span"), { className: d[0], textContent: d[1] }));
        });
        el.setAttribute("aria-label", namn);
    }

    function initialer(namn) {
        var delar = namn.split(/\s+(?:&|och|\+)\s+/i);
        if (delar.length !== 2) return namn.charAt(0);
        return delar[0].trim().charAt(0) + "&" + delar[1].trim().charAt(0);
    }

    var forhandsvisning = /[?&]forhandsvisning\b/.test(location.search);
    var nedrakningTimer = null;
    var menyObserver = null;
    var lokalaBilder = {}; // används bara i förhandsvisningen i redigeringsläget

    // ---------- Hjälpfunktioner ----------

    // Delar upp filen i inställningar (mellan --- högst upp) och själva texten.
    function lasInstallningar(text) {
        var installningar = {};
        var match = text.match(/^﻿?\s*---[ \t]*\n([\s\S]*?)\n---[ \t]*(\n|$)/);
        if (!match) return { installningar: installningar, text: text };
        match[1].split("\n").forEach(function (rad) {
            var i = rad.indexOf(":");
            if (i > 0) {
                installningar[rad.slice(0, i).trim().toLowerCase()] = rad.slice(i + 1).trim();
            }
        });
        return { installningar: installningar, text: text.slice(match[0].length) };
    }

    // "Frågor & svar" -> "fragor-svar" (används i länkar som #osa)
    function skapaId(rubrik) {
        return rubrik.toLowerCase()
            .replace(/[åä]/g, "a").replace(/ö/g, "o").replace(/é/g, "e")
            .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "del";
    }

    function tolkaDatum(datum, tid) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || "")) return null;
        var d = datum.split("-").map(Number);
        var t = /^\d{1,2}[:.]\d{2}$/.test(tid || "") ? tid.split(/[:.]/).map(Number) : [0, 0];
        return new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
    }

    function el(tagg, attribut, barn) {
        var e = document.createElement(tagg);
        Object.keys(attribut || {}).forEach(function (k) {
            if (k === "text") e.textContent = attribut[k];
            else if (k === "html") e.innerHTML = attribut[k];
            else e.setAttribute(k, attribut[k]);
        });
        (barn || []).forEach(function (b) { if (b) e.appendChild(b); });
        return e;
    }

    function bildAdress(src) {
        return lokalaBilder[src] || src;
    }

    // ---------- Toppen ----------

    function fyllHero(inst) {
        var namn = inst.namn || "Bröllop";
        var datum = tolkaDatum(inst.datum, inst.tid);
        var datumText = inst.datum_text ||
            (datum ? datum.getDate() + " " + MANADER[datum.getMonth()] + " " + datum.getFullYear() : "");

        visaNamn(document.getElementById("hero-namn"), namn);
        document.getElementById("hero-datum").textContent = datumText;
        document.getElementById("hero-plats").textContent = inst.plats || "";
        document.getElementById("sidfot-text").textContent = namn + (datumText ? " · " + datumText : "");
        document.title = namn + " – Bröllop";

        var html = document.documentElement;
        var hero = document.querySelector(".hero");
        var foto = hero.querySelector(".hero-foto");
        var layout = LAYOUTER.indexOf(inst.layout) !== -1 ? inst.layout : "bakom";
        hero.className = "hero";
        if (inst.bild) {
            foto.style.backgroundImage = "url('" + bildAdress(inst.bild).replace(/'/g, "%27") + "')";
            hero.classList.add("med-bild", "bild-" + layout);
        } else {
            foto.style.backgroundImage = "";
        }

        // Färg: ett färdigt tema, eller egna färger
        var bakgrund = inst.farg_bakgrund, accent = inst.farg_accent;
        var ljusBg = ljusstyrka(bakgrund), ljusAccent = ljusstyrka(accent);
        ["--bakgrund", "--accent", "--text", "--accent-text", "--yta"].forEach(function (v) { html.style.removeProperty(v); });
        html.removeAttribute("data-morkt");
        if (ljusBg !== null && ljusAccent !== null) {
            html.setAttribute("data-tema", "egen");
            html.style.setProperty("--bakgrund", bakgrund);
            html.style.setProperty("--accent", accent);
            html.style.setProperty("--accent-text", ljusAccent > 0.45 ? "#1d1b18" : "#ffffff");
            if (ljusBg < 0.2) {
                html.setAttribute("data-morkt", "");
                html.style.setProperty("--text", "#f3efe6");
            } else {
                html.style.setProperty("--text", "#2b2825");
                html.style.setProperty("--yta", "#ffffff");
            }
        } else {
            var tema = (inst.tema || "").toLowerCase();
            sattAttribut("data-tema", tema !== "klassisk" ? tema : "");
        }

        sattAttribut("data-dekor", inst.dekor, DEKORER);
        sattAttribut("data-ram", inst.ram, RAMAR);
        sattAttribut("data-monster", inst.monster, MONSTER);
        sattAttribut("data-namn", inst.namn_layout === "staplad" ? "staplad" : "");
        hero.querySelector(".hero-inner").setAttribute("data-initialer", initialer(namn));

        // Eget typsnitt för namnen
        var nt = NAMNTYPSNITT[inst.namn_typsnitt];
        ["--font-namn", "--namn-vikt", "--namn-stil", "--namn-storlek"].forEach(function (v) { html.style.removeProperty(v); });
        html.removeAttribute("data-namn-versaler");
        if (nt) {
            laddaTypsnitt(nt.q);
            html.style.setProperty("--font-namn", nt.font);
            html.style.setProperty("--namn-vikt", nt.vikt);
            html.style.setProperty("--namn-stil", nt.kursiv ? "italic" : "normal");
            html.style.setProperty("--namn-storlek", "calc(clamp(3rem, 13vw, 6rem) * " + nt.skala + ")");
            if (nt.versaler) html.setAttribute("data-namn-versaler", "");
        }

        var stil = (inst.stil || "").toLowerCase();
        if (!TYPSNITT[stil]) stil = "klassisk";
        if (stil !== "klassisk") document.documentElement.setAttribute("data-stil", stil);
        else document.documentElement.removeAttribute("data-stil");
        laddaTypsnitt(stil);

        startaNedrakning(datum);
    }

    function startaNedrakning(datum) {
        var ruta = document.getElementById("nedrakning");
        clearTimeout(nedrakningTimer);
        ruta.hidden = !datum;
        if (!datum) return;

        function cell(tal, etikett) {
            return '<div class="cd"><span>' + tal + "</span><small>" + etikett + "</small></div>";
        }
        function uppdatera() {
            var kvar = datum.getTime() - Date.now();
            if (kvar <= 0) {
                var dagenEfter = kvar < -24 * 3600 * 1000;
                ruta.innerHTML = '<p class="cd-klar">' +
                    (dagenEfter ? "Tack för en fantastisk dag! 💛" : "Idag är dagen! 🎉") + "</p>";
                return;
            }
            var dagar = Math.floor(kvar / 864e5);
            var timmar = Math.floor(kvar % 864e5 / 36e5);
            var minuter = Math.floor(kvar % 36e5 / 6e4);
            ruta.innerHTML = cell(dagar, dagar === 1 ? "dag" : "dagar") +
                cell(timmar, "timmar") + cell(minuter, "minuter");
            nedrakningTimer = setTimeout(uppdatera, 30 * 1000);
        }
        uppdatera();
    }

    // ---------- Innehållet ----------

    function byggSektioner(markdown, inst) {
        var main = document.getElementById("innehall");
        var meny = document.getElementById("meny");
        main.innerHTML = "";
        meny.innerHTML = "";

        // Allt före första "## " hoppas över.
        var delar = markdown.split(/^##(?!#)[ \t]*/m).slice(1);
        var anvandaId = {};

        delar.forEach(function (del) {
            var radbryt = del.indexOf("\n");
            var rubrik = (radbryt === -1 ? del : del.slice(0, radbryt)).trim();
            var kropp = radbryt === -1 ? "" : del.slice(radbryt + 1);
            if (!rubrik) return;

            var id = skapaId(rubrik);
            while (anvandaId[id]) id += "-2";
            anvandaId[id] = true;

            var innehall = el("div", { "class": "sektion-text", html: marked.parse(kropp, { breaks: true }) });
            formatera(innehall);

            var sektion = el("section", { "class": "sektion", id: id }, [el("h2", { text: rubrik }), innehall]);
            if (id === "osa") {
                var osa = byggOsa(inst.osa, inst.namn);
                if (osa) sektion.appendChild(osa);
            }
            main.appendChild(sektion);

            meny.appendChild(el("a", { href: "#" + id, text: rubrik }));
        });

        if (!delar.length) main.innerHTML = '<p class="laddar">Här kommer snart mer information.</p>';
        document.getElementById("hero-osa").hidden = !anvandaId.osa;
        markeraAktivMenyrad();
    }

    function formatera(rot) {
        // En länk som står ensam på en rad blir en knapp.
        rot.querySelectorAll("p").forEach(function (p) {
            var a = p.querySelector("a");
            if (a && p.children.length === 1 && p.textContent.trim() === a.textContent.trim()) {
                a.classList.add("knapp");
                p.classList.add("knapp-rad");
            }
        });

        // Externa länkar öppnas i ny flik.
        rot.querySelectorAll("a[href^='http']").forEach(function (a) {
            a.target = "_blank";
            a.rel = "noopener";
        });

        rot.querySelectorAll("img").forEach(function (img) {
            img.loading = "lazy";
            var src = img.getAttribute("src");
            if (lokalaBilder[src]) img.src = lokalaBilder[src];
        });

        // Ett stycke med bara bilder blir en stor bild, eller ett galleri om det är flera.
        rot.querySelectorAll("p").forEach(function (p) {
            var bilder = p.querySelectorAll("img");
            if (!bilder.length || p.textContent.trim() !== "") return;
            var annat = Array.prototype.some.call(p.children, function (c) { return c.tagName !== "IMG" && c.tagName !== "BR"; });
            if (annat) return;
            var ruta = el("div", { "class": bilder.length > 1 ? "bildgalleri antal-" + Math.min(bilder.length, 4) : "bildgalleri en-bild" });
            Array.prototype.forEach.call(bilder, function (img) {
                ruta.appendChild(el("button", { type: "button", "class": "bild-knapp", "aria-label": "Visa bilden större" }, [img]));
            });
            p.replaceWith(ruta);
        });

        // Listor där varje punkt börjar med en fetstilad tid (**14:30**) blir ett schema.
        rot.querySelectorAll("ul").forEach(function (ul) {
            var punkter = Array.prototype.slice.call(ul.children);
            var arSchema = punkter.length > 0 && punkter.every(function (li) {
                var forsta = li.firstElementChild;
                return forsta && forsta.tagName === "STRONG" &&
                    li.textContent.trim().indexOf(forsta.textContent.trim()) === 0 &&
                    /^\d{1,2}[:.]\d{2}/.test(forsta.textContent.trim());
            });
            if (arSchema) ul.classList.add("schema");
        });

        // Varje "### Rubrik" + texten under blir ett eget kort.
        var underrubriker = rot.querySelectorAll(":scope > h3");
        if (underrubriker.length === 0) return;
        var rutnat = el("div", { "class": "kort-rutnat" });
        underrubriker[0].parentNode.insertBefore(rutnat, underrubriker[0]);
        var kort = null;
        while (rutnat.nextSibling) {
            var nod = rutnat.nextSibling;
            if (nod.nodeType === 1 && nod.tagName === "H3") {
                kort = el("div", { "class": "kort" });
                rutnat.appendChild(kort);
            }
            kort.appendChild(nod);
        }
    }

    // ---------- OSA ----------
    // "osa:" i innehall.md kan vara:
    //   en Google Apps Script-adress (…/exec)  -> formulär direkt på sidan, svaren hamnar i kalkylarket
    //   en mejladress                          -> knapp som öppnar ett mejl
    //   vilken annan länk som helst            -> knapp till t.ex. ett Google Formulär

    function byggOsa(varde, namn) {
        varde = (varde || "").trim();
        if (!varde) return null;

        if (/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(varde)) {
            return byggOsaFormular(varde);
        }
        if (/^(mailto:)?[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(varde)) {
            var adress = varde.replace(/^mailto:/i, "");
            var amne = encodeURIComponent("OSA – " + (namn || "bröllopet"));
            var text = encodeURIComponent("Namn:\nKommer: Ja / Nej\nAllergier eller specialkost:\nHälsning:\n");
            return knapp("mailto:" + adress + "?subject=" + amne + "&body=" + text, "Svara via mejl", false);
        }
        if (/^https?:\/\//i.test(varde)) {
            return knapp(varde, "Svara på inbjudan", true);
        }
        return null;
    }

    function knapp(href, text, nyFlik) {
        var a = el("a", { "class": "knapp", href: href, text: text });
        if (nyFlik) { a.target = "_blank"; a.rel = "noopener"; }
        return el("p", { "class": "knapp-rad osa-knapp" }, [a]);
    }

    function byggOsaFormular(adress) {
        var form = el("form", { "class": "osa-formular", novalidate: "" });
        form.innerHTML =
            '<label>Namn<span class="hjalp">Skriv namnen på alla som svaret gäller</span>' +
            '<input name="namn" autocomplete="name" required></label>' +
            '<fieldset><legend>Kommer ni?</legend>' +
            '<label class="val"><input type="radio" name="kommer" value="Ja" required> Ja, vi kommer gärna!</label>' +
            '<label class="val"><input type="radio" name="kommer" value="Nej"> Tyvärr, vi kan inte</label></fieldset>' +
            '<label class="om-ja">Allergier eller specialkost<input name="allergier"></label>' +
            '<label>Hälsning till oss <span class="hjalp-inline">(valfritt)</span><textarea name="meddelande" rows="3"></textarea></label>' +
            '<label class="fallgrop" aria-hidden="true">Lämna tomt<input name="webbplats" tabindex="-1" autocomplete="off"></label>' +
            '<p class="osa-fel" role="alert" hidden></p>' +
            '<button class="knapp" type="submit">Skicka svar</button>';

        var fel = form.querySelector(".osa-fel");
        var omJa = form.querySelector(".om-ja");

        form.addEventListener("change", function () {
            var val = form.querySelector("input[name=kommer]:checked");
            omJa.hidden = !!val && val.value === "Nej";
        });

        form.addEventListener("submit", function (h) {
            h.preventDefault();
            fel.hidden = true;
            var namnFalt = form.elements.namn;
            var kommer = form.querySelector("input[name=kommer]:checked");
            if (!namnFalt.value.trim()) return visaFel("Skriv ditt namn.", namnFalt);
            if (!kommer) return visaFel("Svara om ni kommer eller inte.", form.querySelector("input[name=kommer]"));

            var knappEl = form.querySelector("button");
            knappEl.disabled = true;
            knappEl.textContent = "Skickar…";

            var data = new URLSearchParams();
            ["namn", "allergier", "meddelande", "webbplats"].forEach(function (f) {
                data.append(f, form.elements[f].value.trim());
            });
            data.append("kommer", kommer.value);
            if (kommer.value === "Nej") data.set("allergier", "");

            if (forhandsvisning) {
                setTimeout(function () { visaTack(namnFalt.value, kommer.value, true); }, 400);
                return;
            }

            fetch(adress, { method: "POST", body: data })
                .then(function (svar) { return svar.json(); })
                .then(function (svar) {
                    if (!svar || !svar.ok) throw new Error((svar && svar.fel) || "okänt fel");
                    visaTack(namnFalt.value, kommer.value, false);
                })
                .catch(function (e) {
                    console.error(e);
                    knappEl.disabled = false;
                    knappEl.textContent = "Skicka svar";
                    visaFel("Något gick fel och svaret kom inte fram. Försök igen om en stund, eller hör av er direkt till oss.");
                });
        });

        function visaFel(text, falt) {
            fel.textContent = text;
            fel.hidden = false;
            if (falt) falt.focus();
        }

        function visaTack(namn, kommer, test) {
            var tack = el("div", { "class": "osa-tack", tabindex: "-1" }, [
                el("p", { "class": "osa-tack-rubrik", text: "Tack " + namn.trim().split(/[\s,&]+/)[0] + "!" }),
                el("p", { text: kommer === "Ja" ? "Vad roligt – vi ser fram emot att fira med er! 💛" : "Tråkigt att ni inte kan komma, tack för att ni hör av er." }),
                test ? el("p", { "class": "hjalp", text: "(Förhandsvisning – inget svar skickades.)" }) : null,
                el("button", { "class": "lank-knapp", type: "button", text: "Skicka ett svar till" })
            ]);
            tack.querySelector("button").addEventListener("click", function () {
                tack.replaceWith(byggOsaFormular(adress));
            });
            form.replaceWith(tack);
            tack.focus();
        }

        return form;
    }

    // ---------- Visa bild i stort format ----------

    function oppnaBild(knapp) {
        var grupp = Array.prototype.slice.call(knapp.parentNode.querySelectorAll("img"));
        var index = grupp.indexOf(knapp.querySelector("img"));
        var bild = el("img", { alt: "" });
        var fore = el("button", { type: "button", "class": "ljus-fore", "aria-label": "Föregående bild", text: "‹" });
        var nasta = el("button", { type: "button", "class": "ljus-nasta", "aria-label": "Nästa bild", text: "›" });
        var stang = el("button", { type: "button", "class": "ljus-stang", "aria-label": "Stäng", text: "×" });
        var ruta = el("div", { "class": "ljuslada", role: "dialog", "aria-modal": "true" }, [bild, stang]);
        if (grupp.length > 1) { ruta.appendChild(fore); ruta.appendChild(nasta); }

        function visa(i) {
            index = (i + grupp.length) % grupp.length;
            bild.src = grupp[index].currentSrc || grupp[index].src;
            bild.alt = grupp[index].alt;
        }
        function stanga() {
            document.removeEventListener("keydown", tangent);
            ruta.remove();
            document.body.style.overflow = "";
            knapp.focus();
        }
        function tangent(h) {
            if (h.key === "Escape") stanga();
            if (h.key === "ArrowLeft") visa(index - 1);
            if (h.key === "ArrowRight") visa(index + 1);
        }
        ruta.addEventListener("click", function (h) {
            if (h.target === fore) visa(index - 1);
            else if (h.target === nasta) visa(index + 1);
            else stanga();
        });
        var startX = null;
        ruta.addEventListener("touchstart", function (h) { startX = h.touches[0].clientX; }, { passive: true });
        ruta.addEventListener("touchend", function (h) {
            if (startX === null || grupp.length < 2) return;
            var dx = h.changedTouches[0].clientX - startX;
            if (Math.abs(dx) > 50) { h.preventDefault(); visa(index + (dx < 0 ? 1 : -1)); }
            startX = null;
        });
        document.addEventListener("keydown", tangent);
        visa(index);
        document.body.appendChild(ruta);
        document.body.style.overflow = "hidden";
        stang.focus();
    }

    document.addEventListener("click", function (h) {
        var knapp = h.target.closest && h.target.closest(".bild-knapp");
        if (knapp) oppnaBild(knapp);
    });

    // ---------- Menyn ----------

    function markeraAktivMenyrad() {
        if (menyObserver) menyObserver.disconnect();
        if (!("IntersectionObserver" in window)) return;
        var meny = document.getElementById("meny");
        var lankar = {};
        meny.querySelectorAll("a").forEach(function (a) {
            lankar[a.getAttribute("href").slice(1)] = a;
        });
        menyObserver = new IntersectionObserver(function (poster) {
            poster.forEach(function (post) {
                if (!post.isIntersecting) return;
                Object.keys(lankar).forEach(function (id) { lankar[id].classList.remove("aktiv"); });
                var a = lankar[post.target.id];
                if (a) {
                    a.classList.add("aktiv");
                    meny.scrollTo({ left: a.offsetLeft - meny.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
                }
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        document.querySelectorAll(".sektion").forEach(function (s) { menyObserver.observe(s); });
    }

    // ---------- Start ----------

    function rendera(text) {
        var delat = lasInstallningar(text.replace(/\r\n/g, "\n"));
        fyllHero(delat.installningar);
        byggSektioner(delat.text, delat.installningar);
    }

    if (forhandsvisning) {
        // Redigeringssidan skickar in texten hit för att visa hur det kommer se ut.
        window.addEventListener("message", function (h) {
            if (h.origin !== location.origin || !h.data) return;
            if (h.data.typ === "scrolla") {
                var mal = document.getElementById(h.data.id);
                if (mal) mal.scrollIntoView({ behavior: "smooth", block: "start" });
                return;
            }
            if (h.data.typ !== "forhandsvisa") return;
            lokalaBilder = h.data.bilder || {};
            var y = window.scrollY;
            rendera(h.data.text);
            window.scrollTo(0, y);
        });
        if (window.parent !== window) window.parent.postMessage({ typ: "forhandsvisning-redo" }, location.origin);
        return;
    }

    // cache: "no-cache" gör att gästerna alltid ser senaste versionen av texten.
    fetch("innehall.md", { cache: "no-cache" })
        .then(function (svar) {
            if (!svar.ok) throw new Error(svar.status);
            return svar.text();
        })
        .then(function (text) {
            rendera(text);
            if (location.hash) {
                var mal = document.getElementById(decodeURIComponent(location.hash.slice(1)));
                if (mal) mal.scrollIntoView();
            }
        })
        .catch(function (fel) {
            console.error(fel);
            document.getElementById("innehall").innerHTML =
                '<p class="laddar">Kunde inte läsa in innehållet. Ladda om sidan och försök igen.</p>';
        });
})();
