"""
Kör den här filen för att starta webbplatsen lokalt:

    python start.py

Sedan öppnar du http://127.0.0.1:8000 i webbläsaren.

reload=True gör att servern startar om automatiskt när du sparar
ändringar i koden - väldigt praktiskt under utveckling. Stäng av det
(reload=False) när ni faktiskt lanserar webbplatsen på riktigt.
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
