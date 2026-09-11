import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, List, Dict, Any

import asyncpg
import logging
from config import settings

logger = logging.getLogger(__name__)
_pool: Optional[asyncpg.Pool] = None


async def init_pool(min_size: int = 2, max_size: int = 10) -> asyncpg.Pool:
    """Initialize the asyncpg connection pool."""
    global _pool
    if _pool is not None:
        return _pool

    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=min_size,
        max_size=max_size,
        command_timeout=60,
    )
    return _pool


async def close_pool() -> None:
    """Close the connection pool."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Get the connection pool (must be initialized first)."""
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Call init_pool() first.")
    return _pool


@asynccontextmanager
async def get_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """Get a connection from the pool."""
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn


async def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    """Execute a SELECT query and return all rows."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, *params)
        return [dict(row) for row in rows]


async def execute_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute a SELECT query and return one row."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
        return dict(row) if row else None


async def execute_insert(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    """Execute an INSERT query with RETURNING and return the row."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(query, *params)
        return dict(row) if row else None


async def execute_many(query: str, params_list: List[tuple]) -> None:
    """Execute a query many times (batch insert)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.executemany(query, params_list)


# Health check
async def check_db_health() -> bool:
    """Check database connectivity."""
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception as e:
        logging.getLogger(__name__).error(f"Database health check failed: {e}")
        return False


# Camera queries
async def get_all_cameras() -> List[Dict[str, Any]]:
    return await execute_query(
        "SELECT camera_id, label, latitude, longitude, created_at FROM cameras ORDER BY camera_id"
    )


async def get_camera(camera_id: str) -> Optional[Dict[str, Any]]:
    return await execute_one(
        "SELECT camera_id, label, latitude, longitude, created_at FROM cameras WHERE camera_id = $1",
        (camera_id,),
    )


# Detection queries
async def insert_detection(
    camera_id: str,
    plate_raw: str,
    plate_normalized: str,
    confidence: float,
    vehicle_type: str,
    image_ref: Optional[str],
    detected_at: str,
) -> Dict[str, Any]:
    return await execute_insert(
        """
        INSERT INTO detections (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, image_ref, detected_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, camera_id, plate_raw, plate_normalized, confidence, vehicle_type, image_ref, detected_at, created_at
        """,
        (camera_id, plate_raw, plate_normalized, confidence, vehicle_type, image_ref, detected_at),
    )


async def get_detections(
    camera_id: Optional[str] = None,
    plate_normalized: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Dict[str, Any]]:
    conditions = []
    params = []
    param_idx = 1

    if camera_id:
        conditions.append(f"d.camera_id = ${param_idx}")
        params.append(camera_id)
        param_idx += 1

    if plate_normalized:
        conditions.append(f"d.plate_normalized = ${param_idx}")
        params.append(plate_normalized)
        param_idx += 1

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
    query = f"""
        SELECT d.*, c.label as camera_label, c.latitude, c.longitude
        FROM detections d
        LEFT JOIN cameras c ON c.camera_id = d.camera_id
        {where_clause}
        ORDER BY d.detected_at DESC
        LIMIT ${param_idx} OFFSET ${param_idx + 1}
    """
    params.append(limit)
    params.append(offset)
    return await execute_query(query, tuple(params))


async def get_trajectory_exact(plate: str) -> List[Dict[str, Any]]:
    return await execute_query(
        """
        SELECT d.*, c.label as camera_label, c.latitude, c.longitude
        FROM detections d
        LEFT JOIN cameras c ON c.camera_id = d.camera_id
        WHERE d.plate_normalized = $1
        ORDER BY d.detected_at ASC
        """,
        (plate,),
    )


async def get_trajectory_fuzzy(plate: str, max_edit_distance: int = 2) -> List[Dict[str, Any]]:
    """Get trajectory using pg_trgm fuzzy matching + Levenshtein refinement."""
    return await execute_query(
        """
        SELECT d.*, c.label as camera_label, c.latitude, c.longitude
        FROM detections d
        LEFT JOIN cameras c ON c.camera_id = d.camera_id
        WHERE d.plate_normalized % $1
        ORDER BY d.detected_at ASC
        """,
        (plate,),
    )


# Blacklist queries
async def add_to_blacklist(
    plate_normalized: str, reason: str, added_by: Optional[str]
) -> Dict[str, Any]:
    return await execute_insert(
        """
        INSERT INTO blacklist (plate_normalized, reason, added_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (plate_normalized) DO UPDATE SET
            reason = EXCLUDED.reason,
            active = true,
            added_by = EXCLUDED.added_by
        RETURNING id, plate_normalized, reason, added_by, active, created_at
        """,
        (plate_normalized, reason, added_by),
    )


async def get_blacklist(active_only: bool = True) -> List[Dict[str, Any]]:
    query = "SELECT id, plate_normalized, reason, added_by, active, created_at FROM blacklist"
    if active_only:
        query += " WHERE active = true"
    query += " ORDER BY created_at DESC"
    return await execute_query(query)


async def check_blacklist(plate_normalized: str) -> Optional[Dict[str, Any]]:
    return await execute_one(
        "SELECT id, plate_normalized, reason, added_by, active, created_at FROM blacklist WHERE plate_normalized = $1 AND active = true",
        (plate_normalized,),
    )


# Alert queries
async def get_alerts(limit: int = 100) -> List[Dict[str, Any]]:
    return await execute_query(
        """
        SELECT a.*, d.camera_id, d.plate_raw, d.detected_at AS detection_time
        FROM alerts a
        LEFT JOIN detections d ON d.id = a.detection_id
        ORDER BY a.created_at DESC
        LIMIT $1
        """,
        (limit,),
    )


# Analytics queries
async def get_density_analytics(hours: int = 24) -> List[Dict[str, Any]]:
    return await execute_query(
        """
        SELECT
            date_trunc('hour', d.detected_at) as hour_bucket,
            d.camera_id,
            c.label as camera_label,
            COUNT(*) as vehicle_count,
            COUNT(DISTINCT d.plate_normalized) as unique_plates
        FROM detections d
        JOIN cameras c ON c.camera_id = d.camera_id
        WHERE d.detected_at >= NOW() - make_interval(hours => $1)
        GROUP BY hour_bucket, d.camera_id, c.label
        ORDER BY hour_bucket DESC, d.camera_id
        """,
        (hours,),
    )


async def get_heatmap_analytics(hours: int = 24) -> List[Dict[str, Any]]:
    return await execute_query(
        """
        SELECT
            c.camera_id,
            c.label as camera_label,
            c.latitude,
            c.longitude,
            COUNT(DISTINCT d.plate_normalized) as unique_vehicles,
            COUNT(d.id) as total_detections
        FROM cameras c
        LEFT JOIN detections d ON d.camera_id = c.camera_id
            AND d.detected_at >= NOW() - make_interval(hours => $1)
        GROUP BY c.camera_id, c.label, c.latitude, c.longitude
        ORDER BY unique_vehicles DESC
        """,
        (hours,),
    )


async def get_od_analytics(hours: int = 24) -> List[Dict[str, Any]]:
    rows = await execute_query(
        """
        WITH vehicle_flows AS (
            SELECT
                d1.plate_normalized,
                d1.camera_id as origin_camera,
                c1.label as origin_label,
                d2.camera_id as destination_camera,
                COALESCE(c2.label, d2.camera_id) as destination_label,
                EXTRACT(EPOCH FROM (d2.detected_at - d1.detected_at)) / 60.0 as transit_minutes
            FROM detections d1
            JOIN detections d2 ON d2.plate_normalized = d1.plate_normalized
                AND d2.detected_at > d1.detected_at
                AND d2.camera_id != d1.camera_id
            JOIN cameras c1 ON c1.camera_id = d1.camera_id
            LEFT JOIN cameras c2 ON c2.camera_id = d2.camera_id
            WHERE d1.detected_at >= NOW() - ($1 * INTERVAL '1 hour')
              AND d2.detected_at <= d1.detected_at + INTERVAL '2 hours'
        )
        SELECT
            origin_camera, origin_label,
            destination_camera, destination_label,
            COUNT(*) as vehicle_count,
            ROUND(AVG(transit_minutes)::numeric, 1) as avg_transit_minutes
        FROM vehicle_flows
        GROUP BY origin_camera, origin_label, destination_camera, destination_label
        ORDER BY vehicle_count DESC
        """,
        (hours,),
    )
    return rows


async def get_speed_analytics(hours: int = 24) -> List[Dict[str, Any]]:
    return await execute_query(
        """
        WITH vehicle_flows AS (
            SELECT
                d1.plate_normalized,
                d1.camera_id as camera_a,
                d2.camera_id as camera_b,
                ST_Distance(
                    ST_SetSRID(ST_MakePoint(c1.longitude, c1.latitude), 4326)::geography,
                    ST_SetSRID(ST_MakePoint(c2.longitude, c2.latitude), 4326)::geography
                ) / 1000.0 as distance_km,
                EXTRACT(EPOCH FROM (d2.detected_at - d1.detected_at)) / 3600.0 as hours
            FROM detections d1
            JOIN detections d2 ON d2.plate_normalized = d1.plate_normalized
                AND d2.detected_at > d1.detected_at
                AND d2.camera_id != d1.camera_id
            JOIN cameras c1 ON c1.camera_id = d1.camera_id
            JOIN cameras c2 ON c2.camera_id = d2.camera_id
            WHERE d1.detected_at >= NOW() - ($1 * INTERVAL '1 hour')
              AND d2.detected_at <= d1.detected_at + INTERVAL '2 hours'
        )
        SELECT
            camera_a, camera_b,
            ROUND(AVG(distance_km)::numeric, 2) as distance_km,
            ROUND(AVG(distance_km / NULLIF(hours, 0))::numeric, 1) as avg_speed_kmh,
            COUNT(*) as sample_count
        FROM vehicle_flows
        WHERE hours > 0
        GROUP BY camera_a, camera_b
        ORDER BY avg_speed_kmh DESC
        """,
        (hours,),
    )