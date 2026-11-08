// Läser innehall.md och bygger upp hela sidan utifrån den.
// Ebba & Axel behöver aldrig röra den här filen.

(function () {
    "use strict";

    var MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli",
        "augusti", "september", "oktober", "november", "december"];

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

        document.getElementById("hero-namn").textContent = namn;
        document.getElementById("hero-datum").textContent = datumText;
        document.getElementById("hero-plats").textContent = inst.plats || "";
        document.getElementById("sidfot-text").textContent = namn + (datumText ? " · " + datumText : "");
        document.title = namn + " – Bröllop";

        var hero = document.querySelector(".hero");
        if (inst.bild) {
            hero.style.backgroundImage = "url('" + bildAdress(inst.bild).replace(/'/g, "%27") + "')";
            hero.classList.add("med-bild");
        } else {
            hero.style.backgroundImage = "";
            hero.classList.remove("med-bild");
        }

        var tema = (inst.tema || "").toLowerCase();
        if (tema && tema !== "klassisk") document.documentElement.setAttribute("data-tema", tema);
        else document.documentElement.removeAttribute("data-tema");

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
            if (h.origin !== location.origin || !h.data || h.data.typ !== "forhandsvisa") return;
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
