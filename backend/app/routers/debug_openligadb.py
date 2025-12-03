from fastapi import APIRouter

from app.clients.openligadb_client import OpenLigaDBClient
from app.settings import settings

router = APIRouter(prefix="/debug/openligadb", tags=["debug"])


@router.get("/ping")
async def ping():
    client = OpenLigaDBClient()
    league = settings.default_leagues[0] if settings.default_leagues else "bl1"
    groups = await client.get_available_groups(league, settings.default_season)
    return {"ok": True, "league": league, "season": settings.default_season, "groups_count": len(groups)}
