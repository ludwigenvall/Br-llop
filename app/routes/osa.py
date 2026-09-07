"""
OSA-sidan är lite speciell eftersom den både:
1. Visar ett formulär (GET-request, när gästen öppnar sidan)
2. Tar emot svaret från formuläret (POST-request, när gästen klickar "skicka")

Just nu sparas svaren i en enkel JSON-fil (content/osa_responses.json).
Det är medvetet enkelt - kommentaren i koden visar var man senare
kopplar in en riktig databas istället.
"""

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse

from app.config.content_loader import load_json, CONTENT_DIR

router = APIRouter()
templates = Jinja2Templates(directory="templates")

RESPONSES_FILE = CONTENT_DIR / "osa_responses.json"


def _read_existing_responses() -> list:
    """Läser tidigare OSA-svar, eller returnerar en tom lista om filen inte finns än."""
    if not RESPONSES_FILE.exists():
        return []
    with open(RESPONSES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_response(entry: dict) -> None:
    """Lägger till ett nytt OSA-svar och sparar hela listan till fil."""
    responses = _read_existing_responses()
    responses.append(entry)
    with open(RESPONSES_FILE, "w", encoding="utf-8") as f:
        json.dump(responses, f, ensure_ascii=False, indent=2)


@router.get("/osa")
def osa_formular(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/osa.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.post("/osa")
def osa_skicka(
    request: Request,
    namn: str = Form(...),
    antal_gaster: int = Form(...),
    kommer: str = Form(...),
    allergier: str = Form(""),
    meddelande: str = Form(""),
):
    """
    Form(...) betyder "det här fältet är obligatoriskt och kommer från
    formuläret". Form("") betyder "obligatoriskt att skickas med, men
    får vara tomt" - dvs valfritt för gästen att fylla i.

    ----------------------------------------------------------------
    FRAMTIDA UTBYGGNAD - lägg till databas här:
    Byt ut _save_response(...) mot t.ex.
        db.execute("INSERT INTO osa_responses (...) VALUES (...)")
    och lägg gärna till ett e-postutskick här (t.ex. med fastapi-mail)
    som bekräftar mottaget svar till gästen.
    ----------------------------------------------------------------
    """
    entry = {
        "namn": namn,
        "antal_gaster": antal_gaster,
        "kommer": kommer,
        "allergier": allergier,
        "meddelande": meddelande,
        "tidpunkt": datetime.now().isoformat(),
    }

    _save_response(entry)
    print(f"[OSA] Nytt svar mottaget: {entry}")  # enkel loggning i terminalen

    # Skickar gästen vidare till en tack-sida (undviker att formuläret
    # skickas igen om gästen laddar om sidan).
    return RedirectResponse(url="/osa-tack", status_code=303)


@router.get("/osa-tack")
def osa_tack(request: Request):
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/osa-tack.html", {"request": request, "settings": settings}
    )
