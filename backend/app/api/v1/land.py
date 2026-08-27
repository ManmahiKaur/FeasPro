from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput, AcquisitionCostItem
from backend.app.schemas.land import (
    LandInputUpdate,
    LandInputRead,
    AcquisitionCostItemCreate,
    AcquisitionCostItemUpdate,
    AcquisitionCostItemRead,
    LandCalculationsSummary,
)
from backend.app.calculations.costs import calculate_land_acquisition_totals

router = APIRouter(tags=["Land & Acquisition"])

DEFAULT_INITIAL_COST_CATEGORIES = [
    {"category": "stamp_duty", "name": "Stamp / Transfer Duty", "amount": Decimal("0.00"), "notes": "State property acquisition duty"},
    {"category": "legal_fees", "name": "Legal & Conveyancing", "amount": Decimal("0.00"), "notes": "Contract review and conveyancing fees"},
    {"category": "due_diligence", "name": "Due Diligence & Investigations", "amount": Decimal("0.00"), "notes": "Site investigations, environmental and soil testing"},
    {"category": "valuation_fees", "name": "Valuation Fees", "amount": Decimal("0.00"), "notes": "Independent site valuation report"},
    {"category": "agent_fees", "name": "Buyer's Agent & Acquisition Fees", "amount": Decimal("0.00"), "notes": "Acquisition advisory & search fees"},
    {"category": "other", "name": "Other Acquisition Expenses", "amount": Decimal("0.00"), "notes": "Sundry acquisition expenses"},
]

def verify_scenario_ownership(
    project_id: str,
    scenario_id: str,
    db: Session,
    current_user: User
) -> Scenario:
    """Verify that project belongs to current user's organization and scenario belongs to project."""
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in your organization."
        )

    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.project_id == project_id
    ).first()

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found in project '{project_id}'."
        )

    return scenario

def build_land_response(land: LandInput) -> LandInputRead:
    """Helper to attach deterministic calculations to LandInputRead response schema."""
    cost_amounts = [item.amount for item in land.acquisition_costs]
    totals = calculate_land_acquisition_totals(
        purchase_price=land.purchase_price,
        deposit_amount=land.deposit_amount,
        cost_amounts=cost_amounts
    )
    
    calculations = LandCalculationsSummary(
        purchase_price=totals["purchase_price"],
        deposit_amount=totals["deposit_amount"],
        total_acquisition_costs=totals["total_acquisition_costs"],
        total_land_acquisition=totals["total_land_acquisition"],
        remaining_purchase_amount=totals["remaining_purchase_amount"],
    )

    return LandInputRead(
        id=land.id,
        scenario_id=land.scenario_id,
        purchase_price=land.purchase_price,
        deposit_amount=land.deposit_amount,
        deposit_due_date=land.deposit_due_date,
        contract_date=land.contract_date,
        settlement_date=land.settlement_date,
        site_area=land.site_area,
        site_area_unit=land.site_area_unit,
        current_zoning=land.current_zoning,
        existing_improvements=land.existing_improvements,
        planning_notes=land.planning_notes,
        development_potential_notes=land.development_potential_notes,
        created_at=land.created_at,
        updated_at=land.updated_at,
        acquisition_costs=[AcquisitionCostItemRead.model_validate(item) for item in land.acquisition_costs],
        calculations=calculations
    )

@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/land",
    response_model=LandInputRead
)
def get_or_create_land(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get Land & Acquisition assumptions for a scenario.
    If none exists yet, provisions a clean record with default cost categories.
    """
    verify_scenario_ownership(project_id, scenario_id, db, current_user)

    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    if not land:
        # Auto-initialize template for this scenario
        land = LandInput(
            scenario_id=scenario_id,
            purchase_price=Decimal("0.00"),
            deposit_amount=Decimal("0.00"),
            site_area_unit="m²"
        )
        db.add(land)
        db.flush()

        # Add standard default cost categories
        for cat in DEFAULT_INITIAL_COST_CATEGORIES:
            cost_item = AcquisitionCostItem(
                land_id=land.id,
                category=cat["category"],
                name=cat["name"],
                amount=cat["amount"],
                notes=cat["notes"]
            )
            db.add(cost_item)

        db.commit()
        db.refresh(land)

    return build_land_response(land)

@router.put(
    "/projects/{project_id}/scenarios/{scenario_id}/land",
    response_model=LandInputRead
)
@router.patch(
    "/projects/{project_id}/scenarios/{scenario_id}/land",
    response_model=LandInputRead
)
def update_land(
    project_id: str,
    scenario_id: str,
    land_in: LandInputUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update land purchase terms, site metrics, dates, and optional acquisition costs list.
    """
    verify_scenario_ownership(project_id, scenario_id, db, current_user)

    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    if not land:
        land = LandInput(scenario_id=scenario_id)
        db.add(land)
        db.flush()

    update_data = land_in.model_dump(exclude_unset=True)
    cost_items_data = update_data.pop("acquisition_costs", None)

    for field, value in update_data.items():
        setattr(land, field, value)

    # If acquisition_costs array provided, replace existing items atomically
    if cost_items_data is not None:
        db.query(AcquisitionCostItem).filter(AcquisitionCostItem.land_id == land.id).delete()
        for item_data in cost_items_data:
            item = AcquisitionCostItem(
                land_id=land.id,
                category=item_data.get("category", "other"),
                name=item_data.get("name", "Cost Item"),
                amount=item_data.get("amount", Decimal("0.00")),
                notes=item_data.get("notes"),
                date=item_data.get("date")
            )
            db.add(item)

    db.commit()
    db.refresh(land)
    return build_land_response(land)

@router.post(
    "/projects/{project_id}/scenarios/{scenario_id}/land/costs",
    response_model=AcquisitionCostItemRead,
    status_code=status.HTTP_201_CREATED
)
def add_acquisition_cost_item(
    project_id: str,
    scenario_id: str,
    cost_in: AcquisitionCostItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new individual acquisition cost item."""
    verify_scenario_ownership(project_id, scenario_id, db, current_user)

    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    if not land:
        land = LandInput(scenario_id=scenario_id)
        db.add(land)
        db.flush()

    cost_item = AcquisitionCostItem(
        land_id=land.id,
        category=cost_in.category,
        name=cost_in.name.strip(),
        amount=cost_in.amount,
        notes=cost_in.notes,
        date=cost_in.date
    )
    db.add(cost_item)
    db.commit()
    db.refresh(cost_item)
    return cost_item

@router.patch(
    "/projects/{project_id}/scenarios/{scenario_id}/land/costs/{cost_id}",
    response_model=AcquisitionCostItemRead
)
def update_acquisition_cost_item(
    project_id: str,
    scenario_id: str,
    cost_id: str,
    cost_update: AcquisitionCostItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a specific acquisition cost item."""
    verify_scenario_ownership(project_id, scenario_id, db, current_user)

    cost_item = db.query(AcquisitionCostItem).join(LandInput).filter(
        AcquisitionCostItem.id == cost_id,
        LandInput.scenario_id == scenario_id
    ).first()

    if not cost_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Acquisition cost item '{cost_id}' not found."
        )

    for field, value in cost_update.model_dump(exclude_unset=True).items():
        setattr(cost_item, field, value)

    db.commit()
    db.refresh(cost_item)
    return cost_item

@router.delete(
    "/projects/{project_id}/scenarios/{scenario_id}/land/costs/{cost_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_acquisition_cost_item(
    project_id: str,
    scenario_id: str,
    cost_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an acquisition cost item."""
    verify_scenario_ownership(project_id, scenario_id, db, current_user)

    cost_item = db.query(AcquisitionCostItem).join(LandInput).filter(
        AcquisitionCostItem.id == cost_id,
        LandInput.scenario_id == scenario_id
    ).first()

    if not cost_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Acquisition cost item '{cost_id}' not found."
        )

    db.delete(cost_item)
    db.commit()
    return None
