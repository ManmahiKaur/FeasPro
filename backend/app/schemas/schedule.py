from typing import List, Optional
import datetime
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict

class ScheduleMilestoneBase(BaseModel):
    stage: str = "construction"  # acquisition, planning_da, presales, civil_demo, construction, titling, settlement
    name: str
    start_month: int = 1
    duration_months: int = 6
    end_month: int = 6
    status: str = "planned"  # planned, in_progress, completed
    notes: Optional[str] = None

class ScheduleMilestoneCreate(ScheduleMilestoneBase):
    pass

class ScheduleMilestoneRead(ScheduleMilestoneBase):
    id: str
    scenario_id: str
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class ScheduleSummaryResponse(BaseModel):
    project_total_months: int
    construction_duration_months: int
    milestones: List[ScheduleMilestoneRead]

class BatchScheduleUpdateInput(BaseModel):
    milestones: List[ScheduleMilestoneCreate]
