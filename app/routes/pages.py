"""
Den här filen innehåller alla "vanliga" sidor på webbplatsen
(startsidan + alla undersidor som schema, boende, FAQ osv.).

Varje @router.get(...) är en "route" - en URL som webbläsaren kan
besöka. FastAPI kör funktionen under och skickar tillbaka det den
returnerar.

request: Request behövs av Jinja2Templates för att kunna rendera HTML.
"""

from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

from app.config.content_loader import load_json

router = APIRouter()
templates = Jinja2Templates(directory="templates")


@router.get("/")
def startsida(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")

    # "context" är datan som skickas in i HTML-mallen.
    # I index.html kan vi sedan skriva t.ex. {{ wedding.couple_names }}
    return templates.TemplateResponse(
        request,
        "index.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/schema")
def schema(request: Request):
    schedule = load_json("schedule.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/schema.html",
        {"request": request, "schedule": schedule, "settings": settings},
    )


@router.get("/ceremoni")
def ceremoni(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/ceremoni.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/hitta-hit")
def hitta_hit(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/hitta-hit.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/boende")
def boende(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/boende.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/mat-dryck")
def mat_dryck(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/mat-dryck.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/kladkod")
def kladkod(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/kladkod.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/onskelista")
def onskelista(request: Request):
    wedding = load_json("wedding.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/onskelista.html",
        {"request": request, "wedding": wedding, "settings": settings},
    )


@router.get("/galleri")
def galleri(request: Request):
    gallery = load_json("gallery.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/galleri.html",
        {"request": request, "gallery": gallery, "settings": settings},
    )


@router.get("/faq")
def faq(request: Request):
    faq_data = load_json("faq.json")
    settings = load_json("settings.json")
    return templates.TemplateResponse(
        request,
        "pages/faq.html",
        {"request": request, "faq": faq_data, "settings": settings},
    )
