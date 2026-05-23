from fastapi import APIRouter

from src.api.v1 import assignments, auth, events, progress, projects, tickets, transitions, users

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(projects.router)
router.include_router(tickets.router)
router.include_router(assignments.router)
router.include_router(progress.router)
router.include_router(transitions.router)
router.include_router(events.router)
