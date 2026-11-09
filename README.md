# Ebba & Axels bröllop 💍

Bröllopshemsidan för Ebba & Axel. Sidan fungerar på mobil och dator, och
Ebba & Axel kan själva ändra text, bilder och OSA via en redigeringssida med
lösenord.

- **Hemsidan:** https://ludwigenvall.github.io/Br-llop/
- **Redigera:** https://ludwigenvall.github.io/Br-llop/redigera.html

---

## 🚀 Kom igång (görs en gång av den som äger repot)

### 1. Publicera sidan med GitHub Pages
1. Se till att allt ligger på grenen `main`.
2. På GitHub: **Settings → Pages**.
3. Under *Build and deployment*: välj **Deploy from a branch**, branch
   **main**, mapp **/ (root)**, och klicka **Save**.
4. Efter 1–2 minuter finns sidan på adressen ovan.

### 2. Ställ in lösenordet för redigeringssidan
1. Öppna **redigera.html** (länken ovan).
2. Följ instruktionerna på sidan: skapa en *fine-grained token* på GitHub
   som bara har behörighet till det här repot (*Contents: Read and write*),
   och sätt ett utgångsdatum en bit efter bröllopet.
3. Klistra in nyckeln, välj ett lösenord (eller tryck **Föreslå**) och
   klicka **Spara och logga in**.
4. Ge lösenordet till Ebba & Axel.

Vill man byta lösenord, eller har nyckeln gått ut, gör man om samma sak
via *Glömt lösenordet?* på inloggningssidan.

---

## ✏️ För Ebba & Axel: så ändrar ni hemsidan

1. Gå till **…/Br-llop/redigera.html** och logga in med lösenordet.
   (Bocka i *Kom ihåg mig* så slipper ni logga in varje gång.)
2. Ändra det ni vill i flikarna:
   - **Innehåll:** varje del på hemsidan är en egen ruta. Skriv direkt i
     rutan, byt ordning med ↑ ↓ och lägg till nya delar längst ner.
   - **Utseende:** välj ett av 12 färdiga förslag, eller välj stil
     (typsnitt och dekor) och färg var för sig. Här väljs också omslagsbilden.
   - **Grundinfo:** namn, datum och plats.
   - **OSA:** hur gästerna svarar (se nedan).
   - **Bilder:** alla uppladdade bilder.
   - **Hjälp:** en snabbguide.
3. Till höger (eller under fliken *Förhandsvisa* på mobilen) ser ni hur
   sidan kommer att se ut.
4. Tryck **Spara**. Efter ungefär en minut syns ändringen på hemsidan.

### Bilder

- **Bilder i en del:** tryck **+ Lägg till bilder** i den ruta där
  bilderna ska synas, och välj en eller flera bilder från mobilen eller
  datorn. På datorn går det också att dra in bilder i rutan.
- **En bild** visas stort. **Flera bilder** blir automatiskt ett galleri.
  Gästerna kan trycka på en bild för att se den i helskärm och bläddra
  mellan bilderna.
- Byt ordning på bilderna med ‹ › och ta bort en bild med ✕ på bilden.
- **Omslagsbild** bakom namnen högst upp väljs under *Utseende*.
- Under **Bilder** finns alla uppladdade bilder. Där kan man lägga en
  bild i valfri del, göra den till omslagsbild eller ta bort den helt.
- Bilderna förminskas automatiskt innan de laddas upp, så det går bra att
  välja bilder direkt från mobilkameran.

### Utseende

Under fliken **Utseende** finns 22 färdiga förslag som väljs med ett klick,
t.ex. Toscana, Svart & guld, Trädgårdsfest och Skogsbröllop. Därefter går
varje del att ändra för sig:

| Val | Alternativ |
|---|---|
| Stil | Klassisk, Romantisk, Modern, Botanisk, Art deco, Lekfull |
| Färg | 22 färger i grupper (ljust, grönt & jordnära, rosa & lila, blått, djärvt, mörkt), eller helt egna färger |
| Namnens typsnitt | 11 typsnitt, både handskrivna och klassiska |
| Namnens placering | På en rad, eller under varandra med "&" emellan |
| Dekoration | Blomsterranka, eukalyptus, olivkvist, vildblommor, palmer, hjärtan, stjärnor, monogram |
| Ram runt namnen | Tunn, dubbel, rundad, valv, oval, hörn, kort |
| Mönster | Prickar, ränder, rutigt, romber, vågor, små blommor, linne |
| Omslagsbildens placering | Bakom, ovanför, under eller bredvid namnen |

Dekorationer och mönster tar automatiskt den valda accentfärgen.

Alla tidigare versioner sparas på GitHub (filen `innehall.md` → *History*),
så inget kan förstöras på riktigt.

---

## 📨 OSA

Under fliken **OSA** på redigeringssidan väljer ni hur gästerna svarar:

| Val | Så fungerar det |
|---|---|
| **Formulär på hemsidan → Google Kalkylark** (rekommenderas) | Gästerna fyller i namn, om de kommer, allergier och en hälsning direkt på hemsidan. Varje svar blir en ny rad i ert kalkylark. Ni kan också få ett mejl för varje svar. |
| **Länk till ett formulär** | T.ex. Google Formulär eller Microsoft Forms. Sidan visar en knapp *Svara på inbjudan*. |
| **Svar via mejl** | Knappen öppnar ett färdigt mejl till er. |

Steg-för-steg-instruktioner för kalkylarket finns direkt i fliken. Skriptet
som kalkylarket använder ligger i [`assets/osa-google-kalkylark.gs`](assets/osa-google-kalkylark.gs).
Med knappen **Testa** ser ni att anslutningen fungerar innan ni sparar.

OSA-formuläret visas i den del av texten som heter `## OSA`. Knappen *OSA*
högst upp på sidan hoppar dit.

---

## 🔒 Om säkerheten

Hemsidan har ingen egen server. Redigeringssidan sparar därför direkt till
GitHub med en nyckel som bara får ändra filer i det här repot. Nyckeln
ligger krypterad med lösenordet (AES-GCM, PBKDF2 med 600 000 iterationer)
i `assets/nyckel.json`. Eftersom repot är publikt måste lösenordet vara
långt. Värsta fallet om någon gissar det är att de kan ändra innehållet
på bröllopssidan, och allt kan återställas via historiken. Nyckeln slutar
gälla på det datum som valdes när den skapades.

---

## Övrigt

**Egen domän (valfritt):** köp t.ex. `ebbaochaxel.se` hos Loopia/One.com,
skriv in den under Settings → Pages → *Custom domain* och följ GitHubs
instruktioner för DNS. Bocka i *Enforce HTTPS*. Bestäm detta innan
inbjudningarna trycks, eftersom adressen i inbjudan ändras.

**Förhandsvisningen i sms/Messenger** (titel och beskrivning när länken
delas) står högst upp i `index.html`.

**Redigera utan redigeringssidan:** det går också att ändra `innehall.md`
direkt på github.com (klicka på filen → pennan ✏️ → *Commit changes*).

### Filer

| Fil | Vad |
|---|---|
| `index.html` | Hemsidans ram |
| `innehall.md` | All text och alla inställningar |
| `redigera.html` | Redigeringssidan |
| `bilder/` | Uppladdade bilder |
| `assets/app.js` | Läser `innehall.md` och bygger sidan |
| `assets/redigera.js` | Inloggning, redigering och sparande |
| `assets/style.css`, `assets/redigera.css` | Utseende |
| `assets/osa-google-kalkylark.gs` | Skriptet för OSA till Google Kalkylark |
| `assets/marked.min.js` | Markdown-tolk ([marked](https://github.com/markedjs/marked), MIT) |
| `.nojekyll` | Gör att GitHub Pages serverar filerna som de är |

Förhandsgranska lokalt: kör `python3 -m http.server` i mappen och öppna
http://localhost:8000. Att öppna `index.html` direkt som fil fungerar inte.
