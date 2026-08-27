from decimal import Decimal
import datetime
from backend.app.core.database import SessionLocal
from backend.app.models.project import Project
from backend.app.models.land import LandInput, AcquisitionCostItem

def seed_demo_land():
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.name == "Pacific Horizon Residences").first()
        if project and len(project.scenarios) >= 2:
            scen_base = project.scenarios[0]
            scen_alt = project.scenarios[1]

            # Baseline Land
            land_base = db.query(LandInput).filter(LandInput.scenario_id == scen_base.id).first()
            if not land_base:
                land_base = LandInput(scenario_id=scen_base.id)
                db.add(land_base)
                db.flush()

            land_base.purchase_price = Decimal("4200000.00")
            land_base.deposit_amount = Decimal("420000.00")
            land_base.contract_date = datetime.date(2026, 9, 1)
            land_base.deposit_due_date = datetime.date(2026, 9, 15)
            land_base.settlement_date = datetime.date(2026, 12, 1)
            land_base.site_area = Decimal("1850.00")
            land_base.site_area_unit = "m²"
            land_base.current_zoning = "Medium Density Residential (R3)"
            land_base.existing_improvements = "Two vacant residential dwellings and asphalt hardstand."
            land_base.planning_notes = "Zoned for up to 6 storeys with ground retail permissible."
            land_base.development_potential_notes = "Target 48 residential units across 5 levels."

            db.query(AcquisitionCostItem).filter(AcquisitionCostItem.land_id == land_base.id).delete()
            costs_base = [
                AcquisitionCostItem(land_id=land_base.id, category="stamp_duty", name="Transfer Stamp Duty", amount=Decimal("231000.00"), notes="State transfer duty on $4.2M purchase"),
                AcquisitionCostItem(land_id=land_base.id, category="legal_fees", name="Legal Conveyancing", amount=Decimal("18500.00"), notes="Contract review, title searches, conveyancing"),
                AcquisitionCostItem(land_id=land_base.id, category="due_diligence", name="Soil & Geotechnical Reports", amount=Decimal("24000.00"), notes="Phase 1 environmental & soil bore tests"),
                AcquisitionCostItem(land_id=land_base.id, category="valuation_fees", name="Bank Feasibility Valuation", amount=Decimal("12500.00"), notes="Lender required valuation"),
                AcquisitionCostItem(land_id=land_base.id, category="agent_fees", name="Buyer Advisory Retainer", amount=Decimal("35000.00"), notes="Off-market advisory retainer"),
                AcquisitionCostItem(land_id=land_base.id, category="other", name="Council Search & Rates Adjustment", amount=Decimal("4500.00"), notes="Title registration & council adjustments"),
            ]
            db.add_all(costs_base)

            # Alternate Land
            land_alt = db.query(LandInput).filter(LandInput.scenario_id == scen_alt.id).first()
            if not land_alt:
                land_alt = LandInput(scenario_id=scen_alt.id)
                db.add(land_alt)
                db.flush()

            land_alt.purchase_price = Decimal("4500000.00")
            land_alt.deposit_amount = Decimal("450000.00")
            land_alt.contract_date = datetime.date(2026, 9, 1)
            land_alt.deposit_due_date = datetime.date(2026, 9, 15)
            land_alt.settlement_date = datetime.date(2027, 2, 1)
            land_alt.site_area = Decimal("1850.00")
            land_alt.site_area_unit = "m²"
            land_alt.current_zoning = "Medium Density Residential (R3)"
            land_alt.existing_improvements = "Two vacant residential dwellings."
            land_alt.planning_notes = "DA variation for 7 storeys under code assessment."
            land_alt.development_potential_notes = "Target 56 residential units with increased penthouse yield."

            db.query(AcquisitionCostItem).filter(AcquisitionCostItem.land_id == land_alt.id).delete()
            costs_alt = [
                AcquisitionCostItem(land_id=land_alt.id, category="stamp_duty", name="Transfer Stamp Duty", amount=Decimal("247500.00"), notes="Calculated on $4.5M purchase price"),
                AcquisitionCostItem(land_id=land_alt.id, category="legal_fees", name="Legal & Planning Legal Review", amount=Decimal("25000.00"), notes="Extended settlement agreement legal fees"),
                AcquisitionCostItem(land_id=land_alt.id, category="due_diligence", name="Geotech & Deep Piling Due Diligence", amount=Decimal("28000.00"), notes="Deep piling & basement assessment"),
                AcquisitionCostItem(land_id=land_alt.id, category="valuation_fees", name="Independent Site Valuation", amount=Decimal("14000.00")),
                AcquisitionCostItem(land_id=land_alt.id, category="agent_fees", name="Acquisition Advisory Fee", amount=Decimal("40000.00")),
                AcquisitionCostItem(land_id=land_alt.id, category="other", name="Option Holding & Settlement Extension Fee", amount=Decimal("15000.00")),
            ]
            db.add_all(costs_alt)

            db.commit()
            print("Successfully populated baseline and alternate land data!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_land()
