from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from depazo.application.ports.access_token_verifier import (
    AccessTokenVerifier,
    AuthenticatedUser,
    InvalidAccessTokenError,
    TokenVerificationUnavailableError,
)
from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.presentation.api.rate_limit import InMemoryRateLimiter

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True, slots=True)
class ApiDependencies:
    open_unit_of_work: Callable[[], UnitOfWork]
    token_verifier: AccessTokenVerifier
    rate_limiter: InMemoryRateLimiter
    clock: Callable[[], datetime]


def api_dependencies(request: Request) -> ApiDependencies:
    dependencies: ApiDependencies = request.app.state.dependencies
    return dependencies


async def current_user(
    dependencies: Annotated[ApiDependencies, Depends(api_dependencies)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> AuthenticatedUser:
    if credentials is None:
        raise _unauthorized()
    try:
        user = await dependencies.token_verifier.verify(credentials.credentials)
    except InvalidAccessTokenError as error:
        raise _unauthorized() from error
    except TokenVerificationUnavailableError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="authentication is temporarily unavailable",
        ) from error
    if not dependencies.rate_limiter.allow(str(user.user_id)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too many requests",
            headers={"Retry-After": str(int(dependencies.rate_limiter.window_seconds))},
        )
    return user


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="invalid or missing access token",
        headers={"WWW-Authenticate": "Bearer"},
    )


Dependencies = Annotated[ApiDependencies, Depends(api_dependencies)]
CurrentUser = Annotated[AuthenticatedUser, Depends(current_user)]
