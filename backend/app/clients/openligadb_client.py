from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from app.settings import settings


class OpenLigaDBClient:
    def __init__(self, base_url: str | None = None, timeout_s: float = 10.0):
        self.base_url = (base_url or str(settings.api_base_url)).rstrip("/")
        self.timeout = httpx.Timeout(timeout_s)

    async def _get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            return resp.json()

    # ===== OpenLigaDB endpoints (минимальный набор для MVP) =====

    async def get_matchdata_league_season(self, league: str, season: int) -> List[Dict[str, Any]]:
        # /getmatchdata/{league}/{season}
        return await self._get(f"/getmatchdata/{league}/{season}")

    async def get_matchdata_league_season_group(
        self, league: str, season: int, group_order_id: int
    ) -> List[Dict[str, Any]]:
        # /getmatchdata/{league}/{season}/{groupOrderId}
        return await self._get(f"/getmatchdata/{league}/{season}/{group_order_id}")

    async def get_available_groups(self, league: str, season: int) -> List[Dict[str, Any]]:
        # /getavailablegroups/{league}/{season}
        return await self._get(f"/getavailablegroups/{league}/{season}")

    async def get_available_teams(self, league: str, season: int) -> List[Dict[str, Any]]:
        # /getavailableteams/{league}/{season}
        return await self._get(f"/getavailableteams/{league}/{season}")
