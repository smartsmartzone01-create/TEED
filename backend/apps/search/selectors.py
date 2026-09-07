from apps.commerce.catalog.search import search_available_products
from apps.commerce.inventory.search import search_stock

SEARCH_SCOPES = {"all", "available_products", "stock"}


def workspace_search(*, business, query, scope="all", limit=8):
    """Compose module-owned search providers into one workspace response."""
    cleaned = str(query or "").strip()
    normalized_scope = str(scope or "all").strip().lower()
    if normalized_scope not in SEARCH_SCOPES:
        raise ValueError("Unsupported workspace search scope.")

    normalized_limit = max(1, min(int(limit), 20))
    sections = []

    if normalized_scope in {"all", "available_products"}:
        sections.append(
            {
                "key": "available_products",
                "module": "commerce.catalog",
                "results": search_available_products(
                    business=business,
                    query=cleaned,
                    limit=normalized_limit,
                ),
            }
        )

    if normalized_scope in {"all", "stock"}:
        sections.append(
            {
                "key": "stock",
                "module": "commerce.inventory",
                "results": search_stock(
                    business=business,
                    query=cleaned,
                    limit=normalized_limit,
                ),
            }
        )

    return {
        "query": cleaned,
        "scope": normalized_scope,
        "sections": sections,
    }


__all__ = ["SEARCH_SCOPES", "workspace_search"]
