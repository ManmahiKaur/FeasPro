from fastapi import APIRouter
from backend.app.api.v1.auth import router as auth_router
from backend.app.api.v1.projects import router as projects_router
from backend.app.api.v1.scenarios import router as scenarios_router
from backend.app.api.v1.land import router as land_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(scenarios_router)
api_router.include_router(land_router)
