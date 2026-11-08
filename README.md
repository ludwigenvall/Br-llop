# Ebba & Axels bröllop 💍

Bröllopshemsidan för Ebba & Axel. En enkel sida som fungerar på mobil och
dator, och där **all text finns i en enda fil: [`innehall.md`](innehall.md)**.

---

## ✏️ Så ändrar ni text på hemsidan

Det går lika bra från mobilen som från datorn – ni behöver bara ett
GitHub-konto med behörighet till det här repot.

1. Gå till **github.com/ludwigenvall/Br-llop** och logga in.
2. Klicka på filen **`innehall.md`**.
3. Klicka på **pennan ✏️** uppe till höger (på mobil: tryck på `…` och välj *Edit*).
4. Ändra texten.
5. Klicka på den gröna knappen **Commit changes…** och sedan **Commit changes** igen.

Efter ungefär en minut syns ändringen på hemsidan. (Ladda om sidan
om ni inte ser den direkt.)

### Snabbguide till formatet

| Skriv så här | Blir |
|---|---|
| `## Boende` | En ny del på sidan + en knapp i menyn |
| `### Hotell Strand` | En mindre rubrik i ett eget kort |
| `**viktigt**` | **fetstil** |
| `*kursivt*` | *kursiv* |
| `- något` | punktlista |
| `- **15:00** Vigsel` | rad i ett snyggt schema (när alla punkter börjar med en fet tid) |
| `[Boka här](https://…)` | länk |
| `[Boka här](https://…)` på en egen rad | knapp |
| `![Beskrivning](bilder/foto.jpg)` | bild |

En ny rad i texten blir en ny rad på sidan, och en tom rad emellan blir
ett nytt stycke. Ordningen på delarna i filen är ordningen på sidan.

### Inställningarna högst upp

Mellan de två `---`-raderna högst upp i `innehall.md` finns:

| Inställning | Vad den gör |
|---|---|
| `namn` | Namnen högst upp på sidan |
| `datum` | Bröllopsdatum som `2027-07-10` (används till nedräkningen) |
| `tid` | Klockslag som `15:00` (nedräkningen räknar ner hit) |
| `datum_text` | Hur datumet skrivs ut, t.ex. `Lördag 10 juli 2027` |
| `plats` | Ort/plats under datumet |
| `tema` | Färgtema: `klassisk`, `salvia`, `ros`, `natt`, `terrakotta` eller `hav` |
| `bild` | Omslagsbild högst upp, t.ex. `bilder/omslag.jpg` (lämna tomt för ingen bild) |

### Lägga till bilder

1. Gå in i mappen **`bilder`** på GitHub.
2. Klicka på **Add file → Upload files** och välj bilden.
   (Tips: förminska stora mobilbilder först, t.ex. till ca 2000 px breda.)
3. Använd sedan bilden i `innehall.md`, t.ex. `bild: bilder/omslag.jpg`
   högst upp, eller `![Vi två](bilder/omslag.jpg)` någonstans i texten.

Om något blir fel kan man alltid gå tillbaka: på filens sida finns
**History**, där alla tidigare versioner finns sparade.

---

## 📨 OSA

Sidan har ingen egen server, så OSA-svaren samlas enklast i ett
**Google Formulär** (svaren hamnar då automatiskt i ett kalkylark).

1. Skapa ett formulär på forms.google.com (namn, kommer/kommer inte,
   allergier/specialkost, meddelande).
2. Klicka på **Skicka → 🔗** och kopiera länken.
3. Klistra in länken i `innehall.md` under `## OSA`, i stället för `#` i
   `[Svara på inbjudan](#)`.

Knappen ”OSA” högst upp på sidan hoppar automatiskt till OSA-delen.

---

## 🚀 Publicera sidan (görs en gång)

Sidan publiceras gratis med GitHub Pages:

1. Se till att filerna ligger på `main`-grenen.
2. Gå till repot på GitHub → **Settings → Pages**.
3. Under *Build and deployment*: välj **Deploy from a branch**, branch
   **main** och mapp **/ (root)**. Klicka **Save**.
4. Efter någon minut finns sidan på
   **https://ludwigenvall.github.io/Br-llop/** – det är den adressen ni
   skriver i inbjudan (eller koppla en egen domän, se nedan).

**Ge Ebba & Axel redigeringsbehörighet:** Settings → Collaborators →
*Add people* och lägg till deras GitHub-konton.

**Egen domän (valfritt):** köp t.ex. `ebbaochaxel.se` hos Loopia/One.com,
skriv in den under Settings → Pages → *Custom domain* och följ GitHubs
instruktioner för DNS. Bocka i *Enforce HTTPS*.

**Förhandsvisningen i sms/Messenger** (titel och beskrivning när länken
delas) står högst upp i `index.html`.

---

## Teknik (för den nyfikne)

- `index.html` – sidans ram
- `innehall.md` – all text (Markdown)
- `assets/app.js` – läser `innehall.md` och bygger sidan
- `assets/style.css` – utseende och färgteman
- `assets/marked.min.js` – Markdown-tolk ([marked](https://github.com/markedjs/marked), MIT)
- `.nojekyll` – behövs för att GitHub Pages ska servera `innehall.md` som den är

Förhandsgranska lokalt: kör `python3 -m http.server` i mappen och öppna
http://localhost:8000 (att öppna `index.html` direkt som fil fungerar inte).
