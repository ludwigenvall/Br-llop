/**
 * OSA-mottagare för bröllopshemsidan.
 *
 * Tar emot svaren från OSA-formuläret på hemsidan och skriver in dem
 * som nya rader i det här kalkylarket.
 *
 * Instruktioner finns på redigeringssidan (fliken OSA) och i README.md.
 */

// Vill ni få ett mejl för varje nytt svar? Skriv in en eller flera
// mejladresser (separerade med kommatecken), t.ex. "ebba@exempel.se,axel@exempel.se".
// Lämna tomt ("") om ni inte vill ha mejl.
var MEJLA_TILL = "";

var KOLUMNER = ["Tidpunkt", "Namn", "Kommer", "Allergier / specialkost", "Hälsning"];

function doPost(e) {
  var p = (e && e.parameter) || {};

  // Enkelt skydd mot spam-robotar (ett dolt fält som människor lämnar tomt).
  if (p.webbplats) return svara({ ok: true });

  var namn = rensa(p.namn, 200);
  if (!namn) return svara({ ok: false, fel: "Namn saknas" });

  var rad = [new Date(), namn, rensa(p.kommer, 10), rensa(p.allergier, 500), rensa(p.meddelande, 2000)];

  var las = LockService.getScriptLock();
  las.waitLock(15000);
  try {
    var blad = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (blad.getLastRow() === 0) {
      blad.appendRow(KOLUMNER);
      blad.getRange(1, 1, 1, KOLUMNER.length).setFontWeight("bold");
      blad.setFrozenRows(1);
    }
    blad.appendRow(rad);
  } finally {
    las.releaseLock();
  }

  if (MEJLA_TILL) {
    try {
      MailApp.sendEmail(MEJLA_TILL, "Ny OSA: " + namn + " (" + rad[2] + ")",
        KOLUMNER.slice(1).map(function (k, i) { return k + ": " + rad[i + 1]; }).join("\n"));
    } catch (fel) {
      // Svaret är redan sparat, så ett misslyckat mejl ska inte ge fel till gästen.
    }
  }

  return svara({ ok: true });
}

// Öppnar man webbadressen direkt i webbläsaren ser man att allt fungerar.
function doGet() {
  return svara({ ok: true, meddelande: "OSA-mottagaren fungerar!" });
}

function rensa(varde, maxLangd) {
  var s = String(varde || "").trim().slice(0, maxLangd);
  // Hindrar att text som börjar med = + - @ tolkas som formler i kalkylarket.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function svara(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
