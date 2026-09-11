import logging
from typing import Optional, List

from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel

from models import AlertResponse, AlertType
from db import get_alerts

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get(
    "",
    response_model=List[AlertResponse],
    summary="Get recent alerts",
)
async def list_alerts(
    limit: int = Query(100, ge=1, le=500),
    alert_type: Optional[AlertType] = Query(None, description="Filter by alert type"),
):
    """Get recent alerts with optional type filter."""
    alerts = await get_alerts(limit=limit)

    if alert_type:
        alerts = [a for a in alerts if a['alert_type'] == alert_type.value]

    import json
    results = []
    for a in alerts:
        item = dict(a)
        if isinstance(item.get('details'), str):
            try:
                item['details'] = json.loads(item['details'])
            except Exception:
                item['details'] = {}
        results.append(AlertResponse(**item))
    return results

@router.get(
    "/stats/summary",
    summary="Get alert statistics",
)
async def alert_stats():
    """Get alert statistics for dashboard."""
    from db import execute_query

    stats = await execute_query("""
        SELECT
            alert_type,
            COUNT(*) as count
        FROM alerts
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY alert_type
    """)

    total = await execute_query("SELECT COUNT(*) as count FROM alerts")
    
    return {
        "last_24h": {row['alert_type']: row['count'] for row in stats},
        "total": total[0]['count'] if total else 0,
    }