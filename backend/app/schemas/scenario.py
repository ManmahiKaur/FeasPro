import datetime
from typing import Optional
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

class ScenarioRead(ScenarioBase):
    id: str
    project_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
