import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from config import settings

logger = logging.getLogger(__name__)


@dataclass
class OSRMMatchResult:
    geometry: Dict[str, Any]
    distance: float
    duration: float
    confidence: float
    tracepoints: List[Optional[Dict[str, Any]]]


class OSRMClient:
    """
    OSRM /match client with automatic chunking and overlap.
    
    Based on TraceView's osrm.js implementation:
    - OSRM has a 100-coordinate limit per request
    - Uses 90-coordinate chunks with 9-coordinate overlap
    - Merges chunk geometries by dropping duplicate boundary points
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: float = 10.0,
        chunk_size: int = 100,  # OSRM hard limit; overlap applied between chunks
        overlap: int = 9,
    ):
        self.base_url = (base_url or settings.osrm_base_url).rstrip('/')
        self.timeout = timeout
        self.chunk_size = chunk_size
        self.overlap = overlap
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client

    async def _get_active_base_url(self) -> str:
        if getattr(self, '_active_base_url', None):
            return self._active_base_url
        client = await self._get_client()
        candidates = ["http://osrm-router:5000", self.base_url, "http://host.docker.internal:5000", "http://127.0.0.1:5000"]
        for cand in candidates:
            try:
                r = await client.get(f"{cand.rstrip('/')}/nearest/v1/driving/77.21,28.61", timeout=1.5)
                if r.status_code == 200:
                    self._active_base_url = cand.rstrip('/')
                    logger.info(f"Connected to OSRM at {self._active_base_url}")
                    return self._active_base_url
            except Exception:
                continue
        self._active_base_url = self.base_url
        return self._active_base_url

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def chunk_coordinates(self, points: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Chunk coordinates array to respect OSRM's 100-coordinate limit.
        Uses overlap to ensure smooth boundary matching (HMM needs context).

        - len <= chunk_size (90): single chunk (covers all <=100 traces used by
          OSRM's single-request path)
        - longer traces: chunks of <=90 points overlapping by `overlap` points.

        Args:
            points: List of {lon, lat, t} dicts

        Returns:
            List of coordinate chunks
        """
        if not points:
            return []
        if len(points) <= self.chunk_size:
            return [points]

        chunks = []
        step = self.chunk_size - self.overlap
        i = 0
        while i < len(points):
            end = min(i + self.chunk_size, len(points))
            chunks.append(points[i:end])
            if end == len(points):
                break
            i += step  # next chunk starts `step` ahead -> `overlap` points shared
        return chunks

    def build_match_url(self, points: List[Dict[str, Any]]) -> str:
        """Build OSRM /match URL for a set of points."""
        coords = ';'.join(f"{p['lon']},{p['lat']}" for p in points)
        timestamps = ';'.join(str(p['t']) for p in points)
        return (
            f"{self.base_url}/match/v1/driving/{coords}"
            f"?timestamps={timestamps}"
            f"&geometries=geojson"
            f"&overview=full"
            f"&tidy=true"
        )

    async def match_chunk(self, points: List[Dict[str, Any]]) -> Optional[OSRMMatchResult]:
        """Fetch OSRM /match for a single chunk of points."""
        if len(points) < 2:
            return None

        base_url = await self._get_active_base_url()
        coords = ';'.join(f"{p['lon']},{p['lat']}" for p in points)
        timestamps = ';'.join(str(p['t']) for p in points)
        url = (
            f"{base_url}/match/v1/driving/{coords}"
            f"?timestamps={timestamps}"
            f"&geometries=geojson"
            f"&overview=full"
            f"&tidy=true"
        )
        client = await self._get_client()
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get('code') != 'Ok' or not data.get('matchings'):
                logger.warning(f"OSRM match failed: {data.get('code')}, {data.get('message')}")
                return None

            matching = data['matchings'][0]
            return OSRMMatchResult(
                geometry=matching['geometry'],
                distance=matching['distance'],
                duration=matching['duration'],
                confidence=matching.get('confidence', 0.0),
                tracepoints=data.get('tracepoints', []),
            )
        except httpx.HTTPError as e:
            logger.error(f"OSRM HTTP error: {e}")
            return None
        except Exception as e:
            logger.error(f"OSRM match error: {e}")
            return None

    async def match_track(self, points: List[Dict[str, Any]]) -> Optional[OSRMMatchResult]:
        """
        Fetch OSRM /match for an entire track with automatic chunking.
        
        Merges chunk geometries and sums distance/duration.
        """
        if len(points) < 2:
            return None

        # Single request if under limit
        if len(points) <= 100:
            res = await self.match_chunk(points)
            if res:
                return res
            # Fallback to route if match fails (sparse CCTV cameras)
            logger.info("OSRM match returned no result; falling back to driving route")
            return await self.route_track(points)

        # Chunk and merge
        chunks = self.chunk_coordinates(points)
        results = []

        for chunk in chunks:
            result = await self.match_chunk(chunk)
            if result:
                results.append(result)

        if not results:
            logger.info("OSRM chunked match returned no results; falling back to driving route")
            return await self.route_track(points)
        # Merge geometries - drop duplicate boundary points
        merged_coords = list(results[0].geometry['coordinates'])
        for i in range(1, len(results)):
            coords = results[i].geometry['coordinates']
            merged_coords.extend(coords[1:])  # Skip first point (overlap)

        return OSRMMatchResult(
            geometry={
                'type': 'LineString',
                'coordinates': merged_coords,
            },
            distance=sum(r.distance for r in results),
            duration=sum(r.duration for r in results),
            confidence=sum(r.confidence for r in results) / len(results),
            tracepoints=results[0].tracepoints,
        )


    async def route_track(self, points: List[Dict[str, Any]]) -> Optional[OSRMMatchResult]:
        """
        Fallback when /match fails: use OSRM /route to calculate driving route between camera checkpoints.
        """
        if len(points) < 2:
            return None

        base_url = await self._get_active_base_url()
        coords = ";".join(
            f"{p.get('lon', p.get('longitude')):.6f},{p.get('lat', p.get('latitude')):.6f}"
            for p in points
        )
        url = (
            f"{base_url}/route/v1/driving/{coords}"
            f"?overview=full"
            f"&geometries=geojson"
        )
        client = await self._get_client()
        try:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            if data.get('code') != 'Ok' or not data.get('routes'):
                logger.warning(f"OSRM route failed: {data.get('code')}")
                return None

            route = data['routes'][0]
            return OSRMMatchResult(
                geometry=route['geometry'],
                distance=route['distance'],
                duration=route['duration'],
                confidence=0.88,
                tracepoints=[],
            )
        except Exception as e:
            logger.error(f"OSRM route fallback error: {e}")
            return None

# Convenience functions
async def match_to_roads(
    points: List[Dict[str, Any]],
    base_url: Optional[str] = None,
) -> Optional[OSRMMatchResult]:
    """Convenience function for one-shot matching."""
    client = OSRMClient(base_url=base_url)
    try:
        return await client.match_track(points)
    finally:
        await client.close()


def points_from_detections(detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Convert detection records to OSRM points format."""
    out = []
    for d in detections:
        lat = d.get('latitude')
        lon = d.get('longitude')
        ts = d.get('detected_at')
        if lat is None or lon is None or ts is None:
            continue
        # Accept ISO strings, datetimes, or numeric epoch seconds
        if isinstance(ts, (int, float)):
            t = int(ts)
        elif isinstance(ts, str):
            from datetime import datetime
            try:
                t = int(datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp())
            except ValueError:
                continue
        else:  # datetime-like
            t = int(ts.timestamp())
        out.append({'lon': float(lon), 'lat': float(lat), 't': t})
    return out