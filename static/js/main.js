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
