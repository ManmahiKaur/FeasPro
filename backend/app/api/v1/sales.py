from decimal import Decimal
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.sales import SalesProductItem
from backend.app.schemas.sales import (
    SalesProductItemCreate,
    SalesProductItemRead,
    SalesCalculationSummary,
    SalesSummaryResponse,
    BatchSalesUpdateInput,
)
from backend.app.calculations.revenue import calculate_gross_revenue

router = APIRouter(tags=["Sales & Revenue"])

DEFAULT_SALES_TEMPLATES = [
    {"name": "1-Bedroom Luxury Apartments", "unit_type": "residential_1bed", "total_units": 8, "avg_internal_area": Decimal("55.0"), "avg_external_area": Decimal("10.0"), "price_per_sqm": Decimal("12000.00"), "unit_sale_price": Decimal("660000.00"), "total_revenue": Decimal("5280000.00"), "sales_commission_pct": Decimal("2.00"), "marketing_cost_pct": Decimal("1.50"), "sales_start_month": 3, "sales_end_month": 12, "settlement_month": 18, "notes": "Targeted at young professionals / investors"},
    {"name": "2-Bedroom / 2-Bath Apartments", "unit_type": "residential_2bed", "total_units": 12, "avg_internal_area": Decimal("82.0"), "avg_external_area": Decimal("15.0"), "price_per_sqm": Decimal("11500.00"), "unit_sale_price": Decimal("943000.00"), "total_revenue": Decimal("11316000.00"), "sales_commission_pct": Decimal("2.00"), "marketing_cost_pct": Decimal("1.50"), "sales_start_month": 2, "sales_end_month": 14, "settlement_month": 18, "notes": "Owner-occupier premium layouts"},
    {"name": "3-Bedroom Penthouse Residences", "unit_type": "penthouse", "total_units": 2, "avg_internal_area": Decimal("140.0"), "avg_external_area": Decimal("40.0"), "price_per_sqm": Decimal("13500.00"), "unit_sale_price": Decimal("1890000.00"), "total_revenue": Decimal("3780000.00"), "sales_commission_pct": Decimal("2.50"), "marketing_cost_pct": Decimal("1.50"), "sales_start_month": 6, "sales_end_month": 16, "settlement_month": 18, "notes": "Top floor ocean/skyline views with private terraces"},
]

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
    "/projects/{project_id}/scenarios/{scenario_id}/sales",
    response_model=SalesSummaryResponse,
    summary="Get scenario sales products, pricing and GRV calculations"
)
def get_sales(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    scenario = verify_scenario_access(project_id, scenario_id, db, current_user)
    
    items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).order_by(SalesProductItem.created_at).all()
    
    # Auto seed initial template if empty
    if not items:
        for t in DEFAULT_SALES_TEMPLATES:
            item = SalesProductItem(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        items = db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).order_by(SalesProductItem.created_at).all()

    items_dicts = [
        {
            "total_units": i.total_units,
            "avg_internal_area": i.avg_internal_area,
            "avg_external_area": i.avg_external_area,
            "price_per_sqm": i.price_per_sqm,
            "unit_sale_price": i.unit_sale_price,
            "sales_commission_pct": i.sales_commission_pct,
            "marketing_cost_pct": i.marketing_cost_pct,
        }
        for i in items
    ]
    calc = calculate_gross_revenue(items_dicts)

    summary = SalesCalculationSummary(
        total_units=calc["total_units"],
        total_internal_area=calc["total_internal_area"],
        total_external_area=calc["total_external_area"],
        gross_realisation_value=calc["gross_realisation_value"],
        total_commissions=calc["total_commissions"],
        total_marketing=calc["total_marketing"],
        total_selling_costs=calc["total_selling_costs"],
        net_realisation_value=calc["net_realisation_value"],
        avg_price_per_unit=calc["avg_price_per_unit"],
        avg_rate_sqm=calc["avg_rate_sqm"],
    )

    return SalesSummaryResponse(summary=summary, items=items)

@router.put(
    "/projects/{project_id}/scenarios/{scenario_id}/sales",
    response_model=SalesSummaryResponse,
    summary="Batch update/replace scenario sales products"
)
def update_sales_batch(
    project_id: str,
    scenario_id: str,
    payload: BatchSalesUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    # Delete existing items and insert new
    db.query(SalesProductItem).filter(SalesProductItem.scenario_id == scenario_id).delete()

    for item_in in payload.items:
        unit_price = item_in.unit_sale_price
        if unit_price <= 0 and item_in.price_per_sqm and item_in.avg_internal_area:
            unit_price = item_in.price_per_sqm * item_in.avg_internal_area

        total_rev = unit_price * item_in.total_units

        new_item = SalesProductItem(
            scenario_id=scenario_id,
            name=item_in.name,
            unit_type=item_in.unit_type,
            total_units=item_in.total_units,
            avg_internal_area=item_in.avg_internal_area,
            avg_external_area=item_in.avg_external_area,
            price_per_sqm=item_in.price_per_sqm,
            unit_sale_price=unit_price,
            total_revenue=total_rev,
            sales_commission_pct=item_in.sales_commission_pct,
            marketing_cost_pct=item_in.marketing_cost_pct,
            gst_applicable=item_in.gst_applicable,
            sales_start_month=item_in.sales_start_month,
            sales_end_month=item_in.sales_end_month,
            settlement_month=item_in.settlement_month,
            notes=item_in.notes,
        )
        db.add(new_item)

    db.commit()

    return get_sales(project_id, scenario_id, db, current_user)
