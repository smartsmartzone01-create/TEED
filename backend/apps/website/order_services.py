from decimal import Decimal

from django.db import transaction
from rest_framework.exceptions import ValidationError

from .catalog_resolver import resolve_storefront_variant
from .models import WebsiteVariant
from .order_models import WebsiteOrder, WebsiteOrderItem


def _item_error(index, message):
    raise ValidationError({"items": [f"Item {index + 1}: {message}"]})


def _resolve_public_offer(*, site, item, index):
    variant = (
        WebsiteVariant.objects.filter(
            id=item["websiteVariantId"],
            listing__site=site,
            listing__is_published=True,
            is_published=True,
        )
        .select_related(
            "listing",
            "listing__primary_media",
            "commerce_product",
            "media",
        )
        .prefetch_related("gallery_items__media")
        .first()
    )
    if variant is None:
        _item_error(index, "This product is no longer available.")

    _option_payloads, offers = resolve_storefront_variant(variant)
    offer = next((candidate for candidate in offers if candidate["id"] == item["offerId"]), None)
    if offer is None:
        _item_error(index, "This product configuration is no longer available.")
    if offer["availability"] == WebsiteVariant.Availability.OUT_OF_STOCK:
        _item_error(index, "This product configuration is out of stock.")
    if offer["price"] is None:
        _item_error(index, "This product does not currently have an orderable price.")

    return variant, offer


def serialize_public_order(order):
    return {
        "id": str(order.id),
        "orderNumber": order.order_number,
        "status": order.status,
        "customer": {
            "fullName": order.customer_full_name,
            "phone": order.customer_phone,
            "email": order.customer_email,
        },
        "deliveryAddress": order.delivery_address,
        "note": order.note,
        "currency": order.currency,
        "total": format(order.total, "f"),
        "createdAt": order.created_at.isoformat(),
        "items": [
            {
                "id": str(item.id),
                "offerId": item.offer_id,
                "websiteVariantId": str(item.variant_id) if item.variant_id else None,
                "productSlug": item.product_slug,
                "title": item.title,
                "sku": item.sku,
                "options": item.options,
                "imageUrl": item.image_url,
                "quantity": item.quantity,
                "unitPrice": format(item.unit_price, "f"),
                "lineTotal": format(item.line_total, "f"),
                "currency": item.currency,
            }
            for item in order.items.all()
        ],
    }


@transaction.atomic
def create_public_order(*, site, validated_data):
    resolved_items = []
    order_currency = None
    order_total = Decimal("0.00")

    for index, item in enumerate(validated_data["items"]):
        variant, offer = _resolve_public_offer(site=site, item=item, index=index)
        currency = str(offer["price"]["currency"] or "").upper()
        if not currency:
            _item_error(index, "This product has an invalid currency.")
        if order_currency is None:
            order_currency = currency
        elif currency != order_currency:
            _item_error(index, "Products with different currencies cannot be ordered together.")

        unit_price = Decimal(offer["price"]["amount"])
        quantity = item["quantity"]
        line_total = unit_price * quantity
        order_total += line_total
        resolved_items.append(
            {
                "variant": variant,
                "offer": offer,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
                "currency": currency,
            }
        )

    order = WebsiteOrder.objects.create(
        site=site,
        customer_full_name=validated_data["fullName"],
        customer_phone=validated_data["phone"],
        customer_email=validated_data.get("email", ""),
        delivery_address=validated_data["deliveryAddress"],
        note=validated_data.get("note", ""),
        currency=order_currency or "TZS",
        total=order_total,
    )

    for resolved in resolved_items:
        variant = resolved["variant"]
        offer = resolved["offer"]
        listing = variant.listing
        WebsiteOrderItem.objects.create(
            order=order,
            listing=listing,
            variant=variant,
            offer_id=offer["id"],
            product_slug=listing.slug,
            title=listing.title if isinstance(listing.title, dict) else {},
            sku=offer["sku"],
            options=offer["options"],
            image_url=offer.get("imageUrl") or listing.resolved_primary_image_url(),
            quantity=resolved["quantity"],
            unit_price=resolved["unit_price"],
            line_total=resolved["line_total"],
            currency=resolved["currency"],
        )

    return order
