// Läser innehall.md och bygger upp hela sidan utifrån den.
// Ebba & Axel behöver aldrig röra den här filen.

(function () {
    "use strict";

    var MANADER = ["januari", "februari", "mars", "april", "maj", "juni", "juli",
        "augusti", "september", "oktober", "november", "december"];

    // Delar upp filen i inställningar (mellan --- högst upp) och själva texten.
    function lasInstallningar(text) {
        var installningar = {};
        var match = text.match(/^﻿?\s*---\s*\n([\s\S]*?)\n---\s*(\n|$)/);
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

        if (inst.bild) {
            var hero = document.querySelector(".hero");
            hero.style.backgroundImage = "url('" + inst.bild.replace(/'/g, "%27") + "')";
            hero.classList.add("med-bild");
        }

        var tema = (inst.tema || "").toLowerCase();
        if (tema && tema !== "klassisk") document.documentElement.setAttribute("data-tema", tema);

        if (datum) startaNedrakning(datum);
    }

    function startaNedrakning(datum) {
        var el = document.getElementById("nedrakning");
        el.hidden = false;
        function ruta(tal, etikett) {
            return '<div class="cd"><span>' + tal + "</span><small>" + etikett + "</small></div>";
        }
        function uppdatera() {
            var kvar = datum.getTime() - Date.now();
            if (kvar <= 0) {
                var dagenEfter = kvar < -24 * 3600 * 1000;
                el.innerHTML = '<p class="cd-klar">' + (dagenEfter ? "Tack för en fantastisk dag! 💛" : "Idag är dagen! 🎉") + "</p>";
                return;
            }
            var dagar = Math.floor(kvar / 864e5);
            var timmar = Math.floor(kvar % 864e5 / 36e5);
            var minuter = Math.floor(kvar % 36e5 / 6e4);
            el.innerHTML = ruta(dagar, dagar === 1 ? "dag" : "dagar") +
                ruta(timmar, "timmar") + ruta(minuter, "minuter");
            setTimeout(uppdatera, 30 * 1000);
        }
        uppdatera();
    }

    function byggSektioner(markdown) {
        var main = document.getElementById("innehall");
        var meny = document.getElementById("meny");
        main.innerHTML = "";
        meny.innerHTML = "";

        // Allt före första "## " (t.ex. instruktionskommentaren) hoppas över.
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

            var sektion = document.createElement("section");
            sektion.className = "sektion";
            sektion.id = id;

            var h2 = document.createElement("h2");
            h2.textContent = rubrik;
            sektion.appendChild(h2);

            var innehall = document.createElement("div");
            innehall.className = "sektion-text";
            innehall.innerHTML = marked.parse(kropp, { breaks: true });
            formatera(innehall);
            sektion.appendChild(innehall);
            main.appendChild(sektion);

            var lank = document.createElement("a");
            lank.href = "#" + id;
            lank.textContent = rubrik;
            meny.appendChild(lank);
        });

        if (anvandaId.osa) document.getElementById("hero-osa").hidden = false;
        markeraAktivMenyrad();

        // Hoppa till rätt del om länken innehöll t.ex. #osa
        if (location.hash) {
            var mal = document.getElementById(decodeURIComponent(location.hash.slice(1)));
            if (mal) mal.scrollIntoView();
        }
    }

    function formatera(el) {
        // En länk som står ensam på en rad blir en knapp.
        el.querySelectorAll("p").forEach(function (p) {
            var a = p.querySelector("a");
            if (a && p.children.length === 1 && p.textContent.trim() === a.textContent.trim()) {
                a.classList.add("knapp");
                p.classList.add("knapp-rad");
            }
        });

        // Externa länkar öppnas i ny flik.
        el.querySelectorAll("a[href^='http']").forEach(function (a) {
            a.target = "_blank";
            a.rel = "noopener";
        });

        // Listor där varje punkt börjar med en fetstilad tid (**14:30**) blir ett schema.
        el.querySelectorAll("ul").forEach(function (ul) {
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
        var underrubriker = el.querySelectorAll(":scope > h3");
        if (underrubriker.length === 0) return;
        var rutnat = document.createElement("div");
        rutnat.className = "kort-rutnat";
        underrubriker[0].parentNode.insertBefore(rutnat, underrubriker[0]);
        var kort = null;
        while (rutnat.nextSibling) {
            var nod = rutnat.nextSibling;
            if (nod.nodeType === 1 && nod.tagName === "H3") {
                kort = document.createElement("div");
                kort.className = "kort";
                rutnat.appendChild(kort);
            }
            kort.appendChild(nod);
        }
    }

    function markeraAktivMenyrad() {
        if (!("IntersectionObserver" in window)) return;
        var lankar = {};
        document.querySelectorAll("#meny a").forEach(function (a) {
            lankar[a.getAttribute("href").slice(1)] = a;
        });
        var observer = new IntersectionObserver(function (poster) {
            poster.forEach(function (post) {
                if (!post.isIntersecting) return;
                Object.keys(lankar).forEach(function (id) { lankar[id].classList.remove("aktiv"); });
                var a = lankar[post.target.id];
                if (a) {
                    a.classList.add("aktiv");
                    var meny = document.getElementById("meny");
                    meny.scrollTo({ left: a.offsetLeft - meny.clientWidth / 2 + a.clientWidth / 2, behavior: "smooth" });
                }
            });
        }, { rootMargin: "-45% 0px -50% 0px" });
        document.querySelectorAll(".sektion").forEach(function (s) { observer.observe(s); });
    }

    function visaFel() {
        document.getElementById("innehall").innerHTML =
            '<p class="laddar">Kunde inte läsa in innehållet. Ladda om sidan och försök igen.</p>';
    }

    // cache: "no-cache" gör att gästerna alltid ser senaste versionen av texten.
    fetch("innehall.md", { cache: "no-cache" })
        .then(function (svar) {
            if (!svar.ok) throw new Error(svar.status);
            return svar.text();
        })
        .then(function (text) {
            var delat = lasInstallningar(text.replace(/\r\n/g, "\n"));
            fyllHero(delat.installningar);
            byggSektioner(delat.text);
        })
        .catch(function (fel) {
            console.error(fel);
            visaFel();
        });
})();
