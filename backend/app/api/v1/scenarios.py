from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import get_current_user
from backend.app.models.user import User
from backend.app.models.project import Project
from backend.app.models.scenario import Scenario
from backend.app.schemas.scenario import (
    ScenarioCreate,
    ScenarioUpdate,
    ScenarioRead,
)

router = APIRouter(tags=["Scenarios"])

@router.post("/projects/{project_id}/scenarios", response_model=ScenarioRead, status_code=status.HTTP_201_CREATED)
def create_scenario_for_project(
    project_id: str,
    scenario_in: ScenarioCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new feasibility scenario for a specific project.
    Validates project existence and organization tenant isolation.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in your organization."
        )

    # If this new scenario is marked baseline, unset baseline from others in the same project
    if scenario_in.is_baseline:
        db.query(Scenario).filter(Scenario.project_id == project_id).update({"is_baseline": False})

    scenario = Scenario(
        project_id=project.id,
        name=scenario_in.name.strip(),
        description=scenario_in.description,
        is_baseline=scenario_in.is_baseline,
        status=scenario_in.status
    )
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

@router.get("/projects/{project_id}/scenarios", response_model=List[ScenarioRead])
def list_scenarios_for_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all scenarios under a specific project.
    """
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in your organization."
        )

    return db.query(Scenario).filter(Scenario.project_id == project_id).order_by(Scenario.created_at.asc()).all()

@router.get("/scenarios/{scenario_id}", response_model=ScenarioRead)
def get_scenario(
    scenario_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve single scenario with tenant authorization check via parent project.
    """
    scenario = db.query(Scenario).join(Project).filter(
        Scenario.id == scenario_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found."
        )

    return scenario

@router.patch("/scenarios/{scenario_id}", response_model=ScenarioRead)
def update_scenario(
    scenario_id: str,
    scenario_update: ScenarioUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update scenario parameters.
    """
    scenario = db.query(Scenario).join(Project).filter(
        Scenario.id == scenario_id,
        Project.organization_id == current_user.organization_id
    ).first()

    if not scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scenario with ID '{scenario_id}' not found."
        )

    update_data = scenario_update.model_dump(exclude_unset=True)

    if update_data.get("is_baseline") is True:
        # Unset other scenarios in this project
        db.query(Scenario).filter(
            Scenario.project_id == scenario.project_id,
            Scenario.id != scenario.id
        ).update({"is_baseline": False})

    for field, value in update_data.items():
        setattr(scenario, field, value)

    db.commit()
    db.refresh(scenario)
    return scenario
