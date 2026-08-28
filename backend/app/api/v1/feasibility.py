from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.land import LandInput
from backend.app.models.cost import CostItem
from backend.app.models.sales import SalesProductItem
from backend.app.models.funding import FundingAssumption
from backend.app.models.schedule import ScheduleMilestone
from backend.app.calculations.engine import FeasibilityCoreEngine
from backend.app.schemas.feasibility import (
    FullFeasibilityResponse,
    StandaloneFeasibilityEvaluateInput,
)
from backend.app.api.v1.costs import DEFAULT_COST_TEMPLATES
from backend.app.api.v1.sales import DEFAULT_SALES_TEMPLATES

router = APIRouter(tags=["Feasibility & Valuation Engine"])

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
    "/projects/{project_id}/scenarios/{scenario_id}/feasibility",
    response_model=FullFeasibilityResponse,
    summary="Get master end-to-end feasibility valuation, stamp duty, RLV, and returns"
)
def get_scenario_full_feasibility(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = verify_scenario_access(project_id, scenario_id, db, current_user)

    # 1. Land
    land = db.query(LandInput).filter(LandInput.scenario_id == scenario_id).first()
    purchase_price = land.purchase_price if land else Decimal("0.00")
    deposit = land.deposit_amount if land else Decimal("0.00")
    acq_costs = [c.amount for c in land.acquisition_costs] if (land and land.acquisition_costs) else []

    # 2. Costs
    cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()
    if not cost_items:
        for t in DEFAULT_COST_TEMPLATES:
            item = CostItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        cost_items = db.query(CostItem).filter(CostItem.scenario_id == scenario_id).all()

    cost_dicts = [
        {"category": c.category, "name": c.name, "amount": c.amount, "phasing_curve": c.phasing_curve, "start_month": c.start_month, "end_month": c.end_month, "calculation_method": c.calculation_method, "quantity": c.quantity, "rate": c.rate}
        for c in cost_items
    ]

    # 3. Sales
    sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()
    if not sales_items:
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        sales_items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).all()

    sales_dicts = [
        {"name": s.name, "total_units": s.total_units, "avg_internal_area": s.avg_internal_area, "avg_external_area": s.avg_external_area, "price_per_sqm": s.price_per_sqm, "unit_sale_price": s.unit_sale_price, "total_revenue": s.total_revenue, "sales_commission_pct": s.sales_commission_pct, "marketing_cost_pct": s.marketing_cost_pct, "sales_start_month": s.sales_start_month, "sales_end_month": s.sales_end_month, "settlement_month": s.settlement_month}
        for s in sales_items
    ]

    # 4. Funding
    funding = db.query(FundingAssumption).filter(FundingAssumption.scenario_id == scenario_id).first()
    senior_enabled = funding.senior_debt_enabled if funding else True
    senior_ltc = funding.senior_max_ltc_pct if funding else Decimal("70.00")
    senior_lvr = funding.senior_max_lvr_pct if funding else Decimal("65.00")
    senior_rate = funding.senior_interest_rate_pct if funding else Decimal("8.50")
    senior_line = funding.senior_line_fee_pct if funding else Decimal("1.50")
    senior_est = funding.senior_establishment_fee_pct if funding else Decimal("1.00")
    mezz_enabled = funding.mezzanine_enabled if funding else False
    mezz_amt = funding.mezzanine_amount if funding else Decimal("0.00")
    mezz_rate = funding.mezzanine_interest_rate_pct if funding else Decimal("15.00")

    # 5. Schedule
    milestones = db.query(ScheduleMilestone).filter(ScheduleMilestone.scenario_id == scenario_id).all()
    duration = max([m.end_month for m in milestones], default=18)

    # Run Master Engine
    engine_output = FeasibilityCoreEngine.run_full_feasibility(
        land_purchase_price=purchase_price,
        land_deposit_amount=deposit,
        land_acquisition_costs=acq_costs if acq_costs else None,
        state="QLD",
        cost_items=cost_dicts,
        sales_items=sales_dicts,
        senior_debt_enabled=senior_enabled,
        senior_max_ltc_pct=senior_ltc,
        senior_max_lvr_pct=senior_lvr,
        senior_interest_rate_pct=senior_rate,
        senior_line_fee_pct=senior_line,
        senior_establishment_fee_pct=senior_est,
        mezzanine_enabled=mezz_enabled,
        mezzanine_amount=mezz_amt,
        mezzanine_interest_rate_pct=mezz_rate,
        project_duration_months=duration,
        discount_rate_pct=10.0,
        target_margin_for_rlv_pct=Decimal("20.00"),
    )

    return FullFeasibilityResponse(
        project_id=project_id,
        scenario_id=scenario_id,
        scenario_name=scenario.name,
        stamp_duty=engine_output["stamp_duty"],
        gst=engine_output["gst"],
        valuation_rlv=engine_output["valuation_rlv"],
        wacc_pct=engine_output["wacc_pct"],
        metrics=engine_output["metrics"],
    )

@router.post(
    "/feasibility/evaluate",
    summary="Evaluate standalone property feasibility metrics on-the-fly"
)
def evaluate_standalone_feasibility(
    payload: StandaloneFeasibilityEvaluateInput,
    current_user: User = Depends(get_current_user),
):
    output = FeasibilityCoreEngine.run_full_feasibility(
        land_purchase_price=payload.land_purchase_price,
        land_deposit_amount=payload.land_deposit_amount,
        state=payload.state,
        is_foreign_purchaser=payload.is_foreign_purchaser,
        cost_items=payload.cost_items,
        sales_items=payload.sales_items,
        use_gst_margin_scheme=payload.use_gst_margin_scheme,
        senior_debt_enabled=payload.senior_debt_enabled,
        senior_max_ltc_pct=payload.senior_max_ltc_pct,
        senior_max_lvr_pct=payload.senior_max_lvr_pct,
        senior_interest_rate_pct=payload.senior_interest_rate_pct,
        senior_line_fee_pct=payload.senior_line_fee_pct,
        senior_establishment_fee_pct=payload.senior_establishment_fee_pct,
        project_duration_months=payload.project_duration_months,
        discount_rate_pct=payload.discount_rate_pct,
        target_margin_for_rlv_pct=payload.target_margin_for_rlv_pct,
    )
    return output
