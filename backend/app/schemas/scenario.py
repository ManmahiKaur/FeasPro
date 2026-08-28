import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict

class ScenarioBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Scenario name e.g. Base Case, Higher Density, Staged Release")
    description: Optional[str] = Field(None, max_length=2000)
    is_baseline: bool = False
    status: str = Field("draft", description="Scenario status: draft, active, archived")

class ScenarioCreate(ScenarioBase):
    pass

class ScenarioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    is_baseline: Optional[bool] = None
    status: Optional[str] = None

class ScenarioCloneInput(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ScenarioRead(ScenarioBase):
    id: str
    project_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ScenarioMetrics(BaseModel):
    scenario_id: str
    name: str
    is_baseline: bool
    status: str
    total_units: int
    total_internal_area: Decimal
    gross_realisation_value: Decimal
    net_realisation_value: Decimal
    land_acquisition_total: Decimal
    construction_subtotal: Decimal
    total_development_cost_ex_land: Decimal
    total_project_cost: Decimal
    net_profit: Decimal
    margin_on_cost_pct: Decimal
    margin_on_grv_pct: Decimal
    project_irr: float
    peak_debt: float
    required_developer_equity: Decimal
    return_on_equity_pct: Decimal
    duration_months: int

class ScenarioComparisonResponse(BaseModel):
    project_id: str
    project_name: str
    baseline_scenario_id: Optional[str]
    scenarios: List[ScenarioMetrics]
