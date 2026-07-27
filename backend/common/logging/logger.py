import logging


def get_logger(module_name: str):
    """
    Returns a TEED application logger.
    """

    return logging.getLogger(
        f"teed.{module_name}"
    )