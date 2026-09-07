# Bröllopshemsida – mall

En återanvändbar digital bröllopshemsida byggd med Python, FastAPI och Jinja2.
Byggd som en Progressive Web App (PWA) – gäster kan lägga till länken på sin
hemskärm och få en app-liknande upplevelse.

## Funktioner

- Startsida med nedräkning till bröllopsdagen
- Sidor för schema, ceremoni, hitta hit, boende, mat & dryck, klädkod,
  önskelista, galleri och FAQ
- OSA-formulär som sparar svar till fil
- Allt innehåll separerat i JSON-filer – ingen kodkunskap krävs för att ändra text
- PWA-stöd (installerbar, viss offline-cache)
- SEO- och delningsmetadata (Open Graph, Twitter Card)

## Installation

1. Se till att Python 3.10+ är installerat
2. Skapa en virtuell miljö (rekommenderas):
   ```
   python -m venv venv
   source venv/bin/activate      # Mac/Linux
   venv\Scripts\activate         # Windows
   ```
3. Installera paket:
   ```
   pip install -r requirements.txt
   ```

## Starta lokalt

```
python start.py
```

Öppna sedan http://127.0.0.1:8000 i webbläsaren. Servern startar om
automatiskt när du sparar ändringar i koden.

## Så ändrar ni innehållet (utan kodkunskap)

All text ligger i JSON-filer i mappen `content/`:

| Fil | Innehåll |
|---|---|
| `wedding.json` | Namn, datum, platser, klädkod, boende, mat, önskelista |
| `schedule.json` | Dagens schema |
| `faq.json` | Vanliga frågor och svar |
| `gallery.json` | Vilka bilder som visas i galleriet |
| `settings.json` | Sidtitel, beskrivning, delningsbild |

Öppna filen i valfri textredigerare, ändra texten mellan citattecknen
(`"..."`), spara. Ändra INTE fältnamnen till vänster om `:` – bara texten
till höger.

Exempel – innan:
```json
"couple_names": "[BRUDPARETS NAMN]",
```
Exempel – efter:
```json
"couple_names": "Emma & Oskar",
```

## Så lägger ni till bilder

- **Hero-bild (startsidan):** lägg filen i `static/images/hero/`, peka på
  den i `static/css/style.css` (sök efter `.hero`)
- **Galleribilder:** lägg filerna i `static/images/gallery/`, lägg till
  filnamnet i `content/gallery.json`
- **App-ikoner (PWA):** lägg `icon-192.png`, `icon-512.png` och
  `favicon.ico` i `static/icons/`

## Deployment

Projektet fungerar med de flesta Python-hosting-tjänster. Två enkla
alternativ:

### Render.com (rekommenderas för nybörjare)
1. Pusha koden till GitHub
2. Skapa ett nytt "Web Service" på render.com, koppla ditt repo
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Render ger er automatiskt HTTPS

### Railway.app
Liknande process – koppla GitHub-repot, Railway upptäcker automatiskt att
det är ett Python-projekt.

## Koppla egen domän

1. Köp en domän (t.ex. via Loopia, One.com, Namecheap)
2. I er hosting-tjänst (Render/Railway): lägg till domänen under
   "Custom Domain"
3. Uppdatera DNS-inställningarna hos er domänleverantör enligt
   instruktionerna hostingen ger er (oftast en CNAME- eller A-post)
4. HTTPS aktiveras automatiskt av Render/Railway när domänen är verifierad

## Framtida uppdateringar

1. Ändra innehåll i `content/`-filerna (eller kod om ni vill)
2. `git add .`
3. `git commit -m "Beskrivning av ändring"`
4. `git push`
5. Render/Railway deployar automatiskt den nya versionen

## Bygga vidare

- **OSA till databas:** se kommentaren i `app/routes/osa.py`
- **E-postbekräftelse vid OSA:** lägg till i `osa_skicka()`-funktionen i
  samma fil, t.ex. med paketet `fastapi-mail`
- **Adminpanel för OSA-svar:** `content/osa_responses.json` innehåller
  alla svar och kan enkelt läsas in i en ny adminvy
