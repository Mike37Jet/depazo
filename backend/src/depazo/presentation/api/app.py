import logging
from collections.abc import AsyncIterator, Awaitable, Callable, Sequence
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from depazo.presentation.api.dependencies import ApiDependencies
from depazo.presentation.api.routers import health, me, neighborhoods

SECURITY_HEADERS = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
}
MAX_BODY_BYTES = 16 * 1024

logger = logging.getLogger("depazo.api")

DependenciesOpener = Callable[[], AbstractAsyncContextManager[ApiDependencies]]


def create_app(
    open_dependencies: DependenciesOpener,
    cors_origins: Sequence[str] = (),
    is_openapi_published: bool = False,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with open_dependencies() as dependencies:
            app.state.dependencies = dependencies
            yield

    app = FastAPI(
        title="depazo API",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url="/openapi.json" if is_openapi_published else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(cors_origins),
        allow_methods=["GET", "PUT"],
        allow_headers=["Authorization", "Content-Type"],
    )
    app.middleware("http")(_limit_body_size)
    app.middleware("http")(_add_security_headers)
    app.add_exception_handler(RequestValidationError, _validation_error)
    app.add_exception_handler(Exception, _unexpected_error)
    app.include_router(health.router)
    app.include_router(me.router)
    app.include_router(neighborhoods.router)
    return app


def describe_api() -> dict[str, Any]:
    return create_app(_never_opened, is_openapi_published=True).openapi()


def _never_opened() -> AbstractAsyncContextManager[ApiDependencies]:
    raise RuntimeError("describing the api never opens its dependencies")


async def _add_security_headers(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    response = await call_next(request)
    response.headers.update(SECURITY_HEADERS)
    return response


async def _limit_body_size(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    if "transfer-encoding" in request.headers:
        return JSONResponse(
            status_code=status.HTTP_411_LENGTH_REQUIRED, content={"detail": "length required"}
        )
    declared_length = request.headers.get("content-length", "0")
    if not declared_length.isdigit() or int(declared_length) > MAX_BODY_BYTES:
        return JSONResponse(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE, content={"detail": "body too large"}
        )
    return await call_next(request)


async def _validation_error(request: Request, error: Exception) -> JSONResponse:
    issues = error.errors() if isinstance(error, RequestValidationError) else []
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={
            "detail": [
                {"loc": issue.get("loc"), "msg": issue.get("msg"), "type": issue.get("type")}
                for issue in issues
            ]
        },
    )


async def _unexpected_error(request: Request, error: Exception) -> JSONResponse:
    logger.error("unexpected error on %s %s", request.method, request.url.path, exc_info=error)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "internal error"}
    )
