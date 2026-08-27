import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, model_validator
from backend.app.schemas.scenario import ScenarioRead

class DevelopmentType(str, Enum):
    RESIDENTIAL_SUBDIVISION = "residential_subdivision"
    MULTI_UNIT_RESIDENTIAL = "multi_unit_residential"
    TOWNHOUSES = "townhouses"
    COMMERCIAL_MIXED_USE = "commercial_mixed_use"
    INDUSTRIAL = "industrial"
    RETAIL = "retail"
    OTHER = "other"

class ProjectStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    ARCHIVED = "archived"

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Project name")
    description: Optional[str] = Field(None, max_length=5000, description="Project scope and description")
    location: Optional[str] = Field(None, max_length=255, description="Site address or location")
    development_type: DevelopmentType = Field(default=DevelopmentType.MULTI_UNIT_RESIDENTIAL, description="Type of property development")
    status: ProjectStatus = Field(default=ProjectStatus.ACTIVE, description="Current project status")
    start_date: Optional[datetime.date] = Field(None, description="Project acquisition/commencement date")
    target_completion_date: Optional[datetime.date] = Field(None, description="Expected completion and settlement date")

    @model_validator(mode="after")
    def validate_dates(self) -> "ProjectBase":
        if self.start_date and self.target_completion_date:
            if self.target_completion_date < self.start_date:
                raise ValueError("Target completion date cannot precede project start date.")
        return self

class ProjectCreate(ProjectBase):
    initial_scenario_name: Optional[str] = Field("Baseline Feasibility", max_length=255, description="Name for the initial scenario created with the project")

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    development_type: Optional[DevelopmentType] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[datetime.date] = None
    target_completion_date: Optional[datetime.date] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ProjectUpdate":
        if self.start_date and self.target_completion_date:
            if self.target_completion_date < self.start_date:
                raise ValueError("Target completion date cannot precede project start date.")
        return self

class ProjectRead(ProjectBase):
    id: str
    organization_id: str
    created_by_id: Optional[str] = None
    is_archived: bool
    archived_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime
    scenarios: List[ScenarioRead] = []

    model_config = ConfigDict(from_attributes=True)

class ProjectListItem(BaseModel):
    id: str
    organization_id: str
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    development_type: DevelopmentType
    status: ProjectStatus
    start_date: Optional[datetime.date] = None
    target_completion_date: Optional[datetime.date] = None
    is_archived: bool
    archived_at: Optional[datetime.datetime] = None
    scenario_count: int = 0
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectListResponse(BaseModel):
    items: List[ProjectListItem]
    total: int
