from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.schemas.cashflow import CashFlowSummary
from backend.app.calculations.cashflow import generate_cash_flow_schedule
from backend.app.calculations.costs import calculate_land_acquisition_totals
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Cash Flow & S-Curve Engine"])

def verify_scenario_access(project_id: str, scenario_id: str, db: Session, user: User) -> Scenario:
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == user.organization_id
    ).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    scenario = db.query(Scenario).filter(
        Scenario.id == scenario_id,
        Scenario.project_id == project_id
    ).first()
    if not scenario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scenario not found")

    return scenario

@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/cashflow",
    response_model=CashFlowSummary,
    summary="Generate full deterministic monthly cash flow schedule and S-Curve"
)
def get_cash_flow(
    project_id: str,
    scenario_id: str,
    duration_months: Optional[int] = Query(None, description="Optional custom project duration override"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    # 1. Fetch Land
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    land_price = 0.0
    land_costs = 0.0
    if land:
        land_price = float(land.purchase_price or 0.0)
        cost_amounts = [item.amount for item in land.acquisition_costs]
        totals = calculate_land_acquisition_totals(land.purchase_price, land.deposit_amount, cost_amounts)
        land_costs = float(totals["total_acquisition_costs"])

    # 2. Fetch Costs
    cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()
    if not cost_items:
        # Seed defaults if empty
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()

    cost_dicts = [
        {
            "category": c.category,
            "name": c.name,
            "amount": float(c.amount or 0.0),
            "phasing_curve": c.phasing_curve,
            "start_month": c.start_month,
            "end_month": c.end_month,
        }
        for c in cost_items
    ]

    # 3. Fetch Sales
    sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()
    if not sales_items:
        # Seed defaults if empty
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()

    sales_dicts = [
        {
            "name": s.name,
            "total_units": s.total_units,
            "unit_sale_price": float(s.unit_sale_price or 0.0),
            "total_revenue": float(s.total_revenue or 0.0),
            "sales_commission_pct": float(s.sales_commission_pct or 2.0),
            "marketing_cost_pct": float(s.marketing_cost_pct or 1.5),
            "sales_start_month": s.sales_start_month,
            "sales_end_month": s.sales_end_month,
            "settlement_month": s.settlement_month,
        }
        for s in sales_items
    ]

    # 4. Generate schedule
    cf_result = generate_cash_flow_schedule(
        land_purchase_price=land_price,
        land_acquisition_costs=land_costs,
        cost_items=cost_dicts,
        sales_items=sales_dicts,
        project_duration_months=duration_months
    )

    return CashFlowSummary(**cf_result)
