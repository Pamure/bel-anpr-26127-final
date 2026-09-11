import logging
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from models import BlacklistResponse
from db import add_to_blacklist, get_blacklist, check_blacklist

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/blacklist", tags=["Blacklist"])


class BlacklistCreate(BaseModel):
    plate: str = Field(..., min_length=1, max_length=20, description="License plate")
    reason: str = Field(..., min_length=1, max_length=200, description="Reason for blacklisting")
    added_by: Optional[str] = Field(None, max_length=100, description="Who added this entry")

    @field_validator("plate", mode="before")
    @classmethod
    def normalize_plate(cls, v: str) -> str:
        return v.upper().replace(" ", "").replace("-", "")


@router.post(
    "",
    response_model=BlacklistResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add plate to blacklist",
)
async def add_blacklist(payload: BlacklistCreate):
    """Add or update a plate in the blacklist (upsert)."""
    result = await add_to_blacklist(
        plate_normalized=payload.plate,
        reason=payload.reason,
        added_by=payload.added_by,
    )
    return BlacklistResponse(**result)


@router.get(
    "",
    response_model=List[BlacklistResponse],
    summary="List blacklisted plates",
)
async def list_blacklist(active_only: bool = True):
    """Get all blacklisted plates."""
    rows = await get_blacklist(active_only=active_only)
    return [BlacklistResponse(**r) for r in rows]


@router.get(
    "/check/{plate}",
    summary="Check if plate is blacklisted",
)
async def check_blacklist_endpoint(plate: str):
    """Check if a plate is in the blacklist."""
    normalized = plate.upper().replace(" ", "").replace("-", "")
    result = await check_blacklist(normalized)
    
    if result:
        return {
            "blacklisted": True,
            "plate": normalized,
            "reason": result["reason"],
        }
    return {"blacklisted": False, "plate": normalized}


@router.delete(
    "/{plate}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate blacklist entry (soft delete)",
)
async def deactivate_blacklist(plate: str):
    """Deactivate a blacklist entry (soft delete)."""
    normalized = plate.upper().replace(" ", "").replace("-", "")
    from db import execute_query
    
    await execute_query(
        "UPDATE blacklist SET active = false WHERE plate_normalized = $1",
        (normalized,),
    )