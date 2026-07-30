PROFILE_COMPLETION_FIELDS = (
    ("first_name", "personal"),
    ("last_name", "personal"),
    ("username", "personal"),
    ("country_code", "personal"),
    ("phone_number", "contacts"),
)


def build_profile_overview(*, user, profile):
    completion_items = [
        {
            "key": field,
            "completed": bool(getattr(user, field)),
            "destination": destination,
        }
        for field, destination in PROFILE_COMPLETION_FIELDS
    ]
    completed_count = sum(item["completed"] for item in completion_items)
    completion_percentage = round((completed_count / len(completion_items)) * 100)

    prompts = [
        {
            "key": item["key"],
            "destination": item["destination"],
        }
        for item in completion_items
        if not item["completed"]
    ]

    if not profile or not profile.profile_image:
        prompts.append(
            {
                "key": "profile_image",
                "destination": "edit",
                "optional": True,
            }
        )

    return {
        "completion": {
            "percentage": completion_percentage,
            "completed_fields": completed_count,
            "total_required_fields": len(completion_items),
        },
        "verified_contacts": {
            "email": bool(user.email and user.is_email_verified),
            "phone": bool(user.phone_number and user.is_phone_verified),
        },
        "prompts": prompts,
        "quick_links": [
            "personal",
            "edit",
            "contacts",
        ],
    }


def build_contact_summary(*, user):
    return {
        "email": {
            "value": user.email,
            "verified": user.is_email_verified,
            "purposes": [
                "authentication",
                "email_verification",
                "password_recovery",
                "security_notifications",
            ],
            "recovery_available": bool(user.email and user.is_email_verified),
            "managed_by": "identity",
        },
        "phone": {
            "value": user.phone_number,
            "verified": user.is_phone_verified,
            "purposes": [
                "identity_record",
                "phone_verification_when_enabled",
            ],
            "recovery_available": False,
            "managed_by": "identity",
        },
    }
