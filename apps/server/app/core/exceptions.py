from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, resource: str = "Resource") -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, f"{resource} not found")


class ConflictError(HTTPException):
    def __init__(self, detail: str) -> None:
        super().__init__(status.HTTP_409_CONFLICT, detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Not authenticated") -> None:
        super().__init__(
            status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Not permitted") -> None:
        super().__init__(status.HTTP_403_FORBIDDEN, detail)
