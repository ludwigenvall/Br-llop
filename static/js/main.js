// ============================================
// NEDRÄKNING
// Räknar ner till datumet som ligger i data-date="..." på #countdown-elementet
// (se templates/index.html)
// ============================================
function startCountdown() {
    const el = document.getElementById("countdown");
    if (!el) return; // Finns inte på alla sidor, bara startsidan

    const targetDate = new Date(el.dataset.date).getTime();

    function update() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        if (diff <= 0) {
            el.innerHTML = "<p>Idag är dagen! 🎉</p>";
            clearInterval(timer);
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        document.getElementById("cd-days").textContent = days;
        document.getElementById("cd-hours").textContent = hours;
        document.getElementById("cd-minutes").textContent = minutes;
    }

    update();
    const timer = setInterval(update, 60 * 1000); // uppdatera varje minut
}

startCountdown();

// ============================================
// TEMAVÄXLARE
// Klick på 🎨-knappen cyklar igenom fem teman och sparar valet
// i webbläsaren (localStorage) så det finns kvar vid nästa besök.
// "classic" = standardtemat (tomt data-theme, dvs. färgerna i :root).
// ============================================
const THEMES = ["classic", "sage", "rose", "midnight", "terracotta", "ocean"];

function applyTheme(theme) {
    if (theme === "classic") {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.setAttribute("data-theme", theme);
    }
    localStorage.setItem("wedding-theme", theme);
}

const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const current = localStorage.getItem("wedding-theme") || "classic";
        const nextIndex = (THEMES.indexOf(current) + 1) % THEMES.length;
        applyTheme(THEMES[nextIndex]);
    });
}

// ============================================
// PWA: registrera service worker
// Detta gör att sidan kan cachas och "installeras" på hemskärmen.
// ============================================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((err) => {
            console.log("Service worker kunde inte registreras:", err);
        });
    });
}
