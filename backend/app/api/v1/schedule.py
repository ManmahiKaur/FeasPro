from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.models.schedule import ScheduleMilestone
from backend.app.schemas.schedule import (
    ScheduleMilestoneCreate,
    ScheduleMilestoneRead,
    ScheduleSummaryResponse,
    BatchScheduleUpdateInput,
)

router = APIRouter(tags=["Project Schedule & Timeline"])

DEFAULT_SCHEDULE_MILESTONES = [
    {"stage": "acquisition", "name": "Site Acquisition & Due Diligence", "start_month": 1, "duration_months": 2, "end_month": 2, "status": "completed", "notes": "Contract execution and settlement"},
    {"stage": "planning_da", "name": "Town Planning & DA / CC Documentation", "start_month": 1, "duration_months": 4, "end_month": 4, "status": "in_progress", "notes": "Council approvals and engineering certs"},
    {"stage": "presales", "name": "Presales Campaign & Display Suite", "start_month": 3, "duration_months": 8, "end_month": 10, "status": "in_progress", "notes": "Target 60% qualifying presales hurdle"},
    {"stage": "civil_demo", "name": "Demolition, Earthworks & Site Prep", "start_month": 3, "duration_months": 3, "end_month": 5, "status": "planned", "notes": "Site clearance and service connections"},
    {"stage": "construction", "name": "Main Building Construction Works", "start_month": 5, "duration_months": 12, "end_month": 16, "status": "planned", "notes": "Head contract turnkey execution"},
    {"stage": "titling", "name": "Practical Completion & Strata Titling", "start_month": 16, "duration_months": 2, "end_month": 17, "status": "planned", "notes": "Occupation certificate and plan registration"},
    {"stage": "settlement", "name": "Final Settlements & Buyer Handover", "start_month": 17, "duration_months": 2, "end_month": 18, "status": "planned", "notes": "Disbursement of proceeds and debt payoff"},
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
    "/projects/{project_id}/scenarios/{scenario_id}/schedule",
    response_model=ScheduleSummaryResponse,
    summary="Get scenario timeline milestones and Gantt schedule"
)
def get_schedule(
    project_id: str,
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    milestones = db.query(ScheduleMilestone).filter(
        ScheduleMilestone.scenario_id == scenario_id
    ).order_by(ScheduleMilestone.start_month).all()

    if not milestones:
        for t in DEFAULT_SCHEDULE_MILESTONES:
            item = ScheduleMilestone(scenario_id=scenario_id, **t)
            db.add(item)
        db.commit()
        milestones = db.query(ScheduleMilestone).filter(
            ScheduleMilestone.scenario_id == scenario_id
        ).order_by(ScheduleMilestone.start_month).all()

    total_months = max([m.end_month for m in milestones], default=18)
    con_milestone = next((m for m in milestones if m.stage == "construction"), None)
    con_duration = con_milestone.duration_months if con_milestone else 12

    return ScheduleSummaryResponse(
        project_total_months=total_months,
        construction_duration_months=con_duration,
        milestones=milestones
    )

@router.put(
    "/projects/{project_id}/scenarios/{scenario_id}/schedule",
    response_model=ScheduleSummaryResponse,
    summary="Batch update/replace scenario schedule milestones"
)
def update_schedule_batch(
    project_id: str,
    scenario_id: str,
    payload: BatchScheduleUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    verify_scenario_access(project_id, scenario_id, db, current_user)

    db.query(ScheduleMilestone).filter(ScheduleMilestone.scenario_id == scenario_id).delete()

    for item_in in payload.milestones:
        duration = max(1, item_in.duration_months)
        end_m = item_in.start_month + duration - 1
        new_item = ScheduleMilestone(
            scenario_id=scenario_id,
            stage=item_in.stage,
            name=item_in.name,
            start_month=item_in.start_month,
            duration_months=duration,
            end_month=end_m,
            status=item_in.status,
            notes=item_in.notes,
        )
        db.add(new_item)

    db.commit()

    return get_schedule(project_id, scenario_id, db, current_user)
