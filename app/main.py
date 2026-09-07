"""
Detta är appens "hjärta". Här skapas FastAPI-applikationen och alla
routes (sidor) kopplas ihop.

FastAPI vet ingenting om våra sidor förbi vad vi kopplar in här -
det är därför app.include_router(...) är viktigt: utan den raden
skulle t.ex. app/routes/pages.py aldrig kopplas till webbplatsen.
"""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.routes import pages, osa

app = FastAPI(title="Bröllopshemsida")

# Kopplar in våra två route-filer.
app.include_router(pages.router)
app.include_router(osa.router)

# Gör mappen static/ tillgänglig i webbläsaren under /static/...
# T.ex. filen static/css/style.css blir nåbar på /static/css/style.css
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/manifest.json")
def manifest():
    """PWA-manifestet måste ligga på webbplatsens rot (inte under /static/)
    för att fungera korrekt i alla webbläsare."""
    return FileResponse("static/manifest.json", media_type="application/json")


@app.get("/sw.js")
def service_worker():
    """Samma sak gäller service workern - den måste ligga på roten
    för att kunna styra cachning för HELA webbplatsen."""
    return FileResponse("static/sw.js", media_type="application/javascript")


@app.get("/robots.txt")
def robots():
    return FileResponse("static/robots.txt", media_type="text/plain")
