import logging

from app.core.config import settings


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO if settings.ENV == "production" else logging.DEBUG,
        format="%(asctime)s %(levelname)-8s %(name)s %(message)s",
    )
