"""
Den här filen har ett enda jobb: läsa JSON-filer från content/-mappen
och göra om dem till Python-dictionaries som resten av appen kan använda.

Anledningen till att detta är en egen funktion (istället för att varje route
öppnar sin egen fil) är att vi bara skriver "öppna och läs en JSON-fil"-koden
EN gång, och återanvänder den överallt.
"""

import json
from pathlib import Path

# Path(__file__) = sökvägen till just den här filen.
# .parent tre gånger tar oss från app/config/content_loader.py upp till Bröllop/
# (config -> app -> Bröllop). Sedan pekar vi ner i content/-mappen.
CONTENT_DIR = Path(__file__).parent.parent.parent / "content"


def load_json(filename: str) -> dict:
    """
    Läser en JSON-fil från content/-mappen och returnerar innehållet
    som en Python-dictionary.

    Exempel:
        data = load_json("wedding.json")
        print(data["couple_names"])
    """
    file_path = CONTENT_DIR / filename

    if not file_path.exists():
        # Om filen saknas vill vi hellre få ett tydligt felmeddelande
        # än att appen kraschar med ett kryptiskt Python-fel.
        raise FileNotFoundError(
            f"Kunde inte hitta {filename} i content/-mappen. "
            f"Sökte på: {file_path}"
        )

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
