import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator

class AcquisitionCostCategory:
    STAMP_DUTY = "stamp_duty"
    LEGAL_FEES = "legal_fees"
    DUE_DILIGENCE = "due_diligence"
    VALUATION_FEES = "valuation_fees"
    AGENT_FEES = "agent_fees"
    OTHER = "other"

class AcquisitionCostItemBase(BaseModel):
    category: str = Field("other", max_length=100, description="Cost category code")
    name: str = Field(..., min_length=1, max_length=255, description="Cost item label")
    amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Cost amount")
    notes: Optional[str] = Field(None, max_length=2000, description="Additional cost description")
    date: Optional[datetime.date] = Field(None, description="Expected date of payment")

class AcquisitionCostItemCreate(AcquisitionCostItemBase):
    pass

class AcquisitionCostItemUpdate(BaseModel):
    category: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    notes: Optional[str] = None
    date: Optional[datetime.date] = None

class AcquisitionCostItemRead(AcquisitionCostItemBase):
    id: str
    land_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class LandCalculationsSummary(BaseModel):
    purchase_price: Decimal
    deposit_amount: Decimal
    total_acquisition_costs: Decimal
    total_land_acquisition: Decimal
    remaining_purchase_amount: Decimal

class LandInputBase(BaseModel):
    purchase_price: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Site purchase price")
    deposit_amount: Optional[Decimal] = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Deposit paid / payable")
    deposit_due_date: Optional[datetime.date] = Field(None, description="Due date for initial deposit")
    contract_date: Optional[datetime.date] = Field(None, description="Contract exchange / signing date")
    settlement_date: Optional[datetime.date] = Field(None, description="Site acquisition settlement date")

    site_area: Optional[Decimal] = Field(None, ge=Decimal("0.00"), description="Total site land area")
    site_area_unit: str = Field(default="m²", max_length=50, description="Unit of measurement: m², hectares, acres")
    current_zoning: Optional[str] = Field(None, max_length=100, description="Planning zone designation")
    existing_improvements: Optional[str] = Field(None, max_length=2000, description="Existing structures or site improvements")
    planning_notes: Optional[str] = Field(None, max_length=5000, description="Planning approval constraints and notes")
    development_potential_notes: Optional[str] = Field(None, max_length=5000, description="Proposed density and yield potential")

    @model_validator(mode="after")
    def validate_dates(self) -> "LandInputBase":
        if self.contract_date and self.settlement_date:
            if self.settlement_date < self.contract_date:
                raise ValueError("Settlement date cannot precede contract date.")
        if self.deposit_due_date and self.settlement_date:
            if self.deposit_due_date > self.settlement_date:
                raise ValueError("Deposit due date should not be after settlement date.")
        return self

class LandInputCreate(LandInputBase):
    acquisition_costs: Optional[List[AcquisitionCostItemCreate]] = None

class LandInputUpdate(BaseModel):
    purchase_price: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    deposit_amount: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    deposit_due_date: Optional[datetime.date] = None
    contract_date: Optional[datetime.date] = None
    settlement_date: Optional[datetime.date] = None

    site_area: Optional[Decimal] = Field(None, ge=Decimal("0.00"))
    site_area_unit: Optional[str] = Field(None, max_length=50)
    current_zoning: Optional[str] = None
    existing_improvements: Optional[str] = None
    planning_notes: Optional[str] = None
    development_potential_notes: Optional[str] = None
    acquisition_costs: Optional[List[AcquisitionCostItemCreate]] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "LandInputUpdate":
        if self.contract_date and self.settlement_date:
            if self.settlement_date < self.contract_date:
                raise ValueError("Settlement date cannot precede contract date.")
        if self.deposit_due_date and self.settlement_date:
            if self.deposit_due_date > self.settlement_date:
                raise ValueError("Deposit due date should not be after settlement date.")
        return self

class LandInputRead(LandInputBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime
    acquisition_costs: List[AcquisitionCostItemRead] = []
    calculations: LandCalculationsSummary

    model_config = ConfigDict(from_attributes=True)
