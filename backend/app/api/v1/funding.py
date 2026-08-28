from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.funding import FundingAssumption
from backend.app.models.land import LandInput
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.schemas.funding import (
    FundingAssumptionUpdate,
    FundingAssumptionRead,
    FundingCalculationSummary,
    FundingSummaryResponse,
)
from backend.app.calculations.funding import calculate_funding_capital_stack
from backend.app.calculations.costs import calculate_development_costs, calculate_land_acquisition_totals
from backend.app.calculations.revenue import calculate_gross_revenue
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Funding & Capital Stack"])

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

def get_scenario_cost_and_revenue(scenario_id: str, db: Session):
    # Land
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    land_total = Decimal("0.00")
    if land:
        cost_amounts = [item.amount for item in land.acquisition_costs]
        totals = calculate_land_acquisition_totals(land.purchase_price, land.deposit_amount, cost_amounts)
        land_total = totals["total_land_acquisition"]

    # Costs
    cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()
    if not cost_items:
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()

    cost_dicts = [
        {"category": c.category, "calculation_method": c.calculation_method, "quantity": c.quantity, "rate": c.rate, "amount": c.amount}
        for c in cost_items
    ]
    cost_calc = calculate_development_costs(cost_dicts, land_acquisition_total=land_total)
    total_project_cost = cost_calc["total_project_cost"]

    # Sales
    sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()
    if not sales_items:
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()

    sales_dicts = [
        {"total_units": s.total_units, "avg_internal_area": s.avg_internal_area, "avg_external_area": s.avg_external_area, "price_per_sqm": s.price_per_sqm, "unit_sale_price": s.unit_sale_price, "sales_commission_pct": s.sales_commission_pct, "marketing_cost_pct": s.marketing_cost_pct}
        for s in sales_items
    ]
    rev_calc = calculate_gross_revenue(sales_dicts)
    grv = rev_calc["gross_realisation_value"]
    nrv = rev_calc["net_realisation_value"]
    net_profit = nrv - total_project_cost

    return total_project_cost, grv, net_profit

@router.get(
    "/projects/{project_id}/scenarios/{scenario_id}/funding",
    response_model=FundingSummaryResponse,
    summary="Get scenario funding capital stack assumptions and calculations"
)
def get_funding(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    assumption = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == scenario_id).first()
    if not assumption:
        assumption = FundingAssumption(
            scenario_id=scenario_id,
            senior_debt_enabled=True,
            senior_max_ltc_pct=Decimal("70.00"),
            senior_max_lvr_pct=Decimal("65.00"),
            senior_interest_rate_pct=Decimal("8.50"),
            senior_line_fee_pct=Decimal("1.50"),
            senior_establishment_fee_pct=Decimal("1.00"),
            mezzanine_enabled=False,
            mezzanine_amount=Decimal("0.00"),
            mezzanine_interest_rate_pct=Decimal("15.00"),
            target_equity_contribution=Decimal("0.00"),
        )
        db.add(assumption)
        db.commit()
        db.refresh(assumption)

    total_cost, grv, net_profit = get_scenario_cost_and_revenue(scenario_id, db)

    calc = calculate_funding_capital_stack(
        total_project_cost=total_cost,
        gross_realisation_value=grv,
        senior_debt_enabled=assumption.senior_debt_enabled,
        senior_max_ltc_pct=assumption.senior_max_ltc_pct,
        senior_max_lvr_pct=assumption.senior_max_lvr_pct,
        senior_interest_rate_pct=assumption.senior_interest_rate_pct,
        senior_line_fee_pct=assumption.senior_line_fee_pct,
        senior_establishment_fee_pct=assumption.senior_establishment_fee_pct,
        mezzanine_enabled=assumption.mezzanine_enabled,
        mezzanine_amount=assumption.mezzanine_amount,
        mezzanine_interest_rate_pct=assumption.mezzanine_interest_rate_pct,
        net_profit_before_finance=net_profit,
    )

    summary = FundingCalculationSummary(**calc)
    return FundingSummaryResponse(assumption=assumption, summary=summary)

@router.put(
    "/projects/{project_id}/scenarios/{scenario_id}/funding",
    response_model=FundingSummaryResponse,
    summary="Update scenario funding assumptions"
)
def update_funding(
    project_id: str,
    scenario_id: str,
    payload: FundingAssumptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    assumption = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == scenario_id).first()
    if not assumption:
        assumption = FundingAssumption(scenario_id=scenario_id)
        db.add(assumption)

    assumption.senior_debt_enabled = payload.senior_debt_enabled
    assumption.senior_max_ltc_pct = payload.senior_max_ltc_pct
    assumption.senior_max_lvr_pct = payload.senior_max_lvr_pct
    assumption.senior_interest_rate_pct = payload.senior_interest_rate_pct
    assumption.senior_line_fee_pct = payload.senior_line_fee_pct
    assumption.senior_establishment_fee_pct = payload.senior_establishment_fee_pct
    assumption.mezzanine_enabled = payload.mezzanine_enabled
    assumption.mezzanine_amount = payload.mezzanine_amount
    assumption.mezzanine_interest_rate_pct = payload.mezzanine_interest_rate_pct
    assumption.target_equity_contribution = payload.target_equity_contribution

    db.commit()
    db.refresh(assumption)

    return get_funding(project_id, scenario_id, db, current_user)
