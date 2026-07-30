from django.test import TestCase

from ..models import UserProfile
from ..selectors import build_contact_summary, build_profile_overview
from .factories import create_profile_user


class ProfileSelectorTests(TestCase):
    def test_overview_uses_only_required_purposeful_fields(self):
        user = create_profile_user(first_name="", last_name="")
        profile = UserProfile.objects.create(user=user)

        overview = build_profile_overview(user=user, profile=profile)

        self.assertEqual(overview["completion"]["percentage"], 60)
        self.assertEqual(
            {prompt["key"] for prompt in overview["prompts"]},
            {"first_name", "last_name", "profile_image"},
        )
        image_prompt = next(
            prompt for prompt in overview["prompts"] if prompt["key"] == "profile_image"
        )
        self.assertTrue(image_prompt["optional"])

    def test_contact_summary_exposes_no_secondary_contacts(self):
        user = create_profile_user(is_phone_verified=False)

        summary = build_contact_summary(user=user)

        self.assertEqual(set(summary), {"email", "phone"})
        self.assertTrue(summary["email"]["recovery_available"])
        self.assertFalse(summary["phone"]["recovery_available"])
        self.assertEqual(summary["email"]["managed_by"], "identity")
