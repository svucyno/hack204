"""
FastAPI application entry: MongoDB, middleware, routers, static files.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config.settings import settings
from app.core.paths import UPLOAD_ROOT
from app.db.mongo import connect_mongo, disconnect_mongo, init_mongo_indexes
from app.models.schemas import APIError, AccessTokenResponse, DevTokenRequest, ErrorDetail
from app.routes.admin import router as admin_router
from app.routes.analysis import router as analysis_router, set_analysis_dependencies
from app.routes.assessments import router as assessments_router
from app.routes.auth import router as auth_router
from app.routes.chatbot import router as chatbot_router
from app.routes.learning import router as learning_router, set_learning_dependencies
from app.routes.notifications import router as notifications_router
from app.routes.profile import router as profile_router
from app.routes.quiz import router as quiz_router, set_quiz_dependencies
from app.routes.recommend import router as recommend_router, set_recommend_dependencies
from app.routes.reports import router as reports_router
from app.routes.resume import router as resume_router
from app.services.ai_service import AIService
from app.services.analysis_service import AnalysisService
from app.utils.helper import create_access_token

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[settings.rate_limit_default],
)

_services_wired = False


def wire_application_services() -> None:
    global _services_wired
    if _services_wired:
        return
    ai = AIService()
    analysis = AnalysisService(ai)
    set_learning_dependencies(ai)
    set_quiz_dependencies(ai)
    set_analysis_dependencies(analysis)
    set_recommend_dependencies(ai)
    _services_wired = True
    logger.info("Application services wired")


@asynccontextmanager
async def lifespan(app: FastAPI):
    wire_application_services()
    await connect_mongo()
    try:
        await init_mongo_indexes()
    except Exception as e:
        if not settings.skip_db_init:
            logger.exception("MongoDB index init failed: %s", e)
            raise
        logger.warning("MongoDB index init skipped or failed (SKIP_DB_INIT): %s", e)
    yield
    await disconnect_mongo()
    logger.info("Shutdown complete")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=APIError(
            error=ErrorDetail(code="validation_error", message="Request validation failed", field=str(exc.errors()))
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=APIError(
            error=ErrorDetail(code="internal_error", message="An unexpected error occurred")
        ).model_dump(),
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


@app.get("/health", tags=["health"])
@limiter.exempt
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.post(
    f"{settings.api_v1_prefix}/auth/dev-token",
    response_model=AccessTokenResponse,
    tags=["auth"],
    summary="Mint JWT for development (subject must be an existing user id)",
)
def dev_token(body: DevTokenRequest) -> AccessTokenResponse:
    token = create_access_token(body.user_id, role=body.role)
    return AccessTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=settings.access_token_expire_minutes,
    )


app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(profile_router, prefix=settings.api_v1_prefix)
app.include_router(notifications_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(chatbot_router, prefix=settings.api_v1_prefix)
app.include_router(assessments_router, prefix=settings.api_v1_prefix)
app.include_router(reports_router, prefix=settings.api_v1_prefix)
app.include_router(learning_router, prefix=settings.api_v1_prefix)
app.include_router(quiz_router, prefix=settings.api_v1_prefix)
app.include_router(analysis_router, prefix=settings.api_v1_prefix)
app.include_router(recommend_router, prefix=settings.api_v1_prefix)
app.include_router(resume_router, prefix=settings.api_v1_prefix)

wire_application_services()
