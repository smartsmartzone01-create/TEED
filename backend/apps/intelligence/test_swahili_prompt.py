from datetime import date

from django.test import SimpleTestCase

from .context import IntelligenceContext
from .prompts import build_partner_system_prompt


class KuzaAISwahiliPromptTests(SimpleTestCase):
    def _context(self, *, locale):
        return IntelligenceContext(
            business_id="business-1",
            business_name="Duka Demo",
            locale=locale,
            timezone_name="Africa/Dar_es_Salaam",
            local_date=date(2026, 9, 5),
        )

    def test_swahili_prompt_prefers_natural_tanzanian_business_language(self):
        prompt = build_partner_system_prompt(self._context(locale="sw"))

        self.assertIn("natural Tanzanian business Swahili", prompt)
        self.assertIn("punguzo", prompt)
        self.assertIn("marejesho ya mauzo", prompt)
        self.assertIn("hisa ndogo", prompt)
        self.assertIn("hisa imeisha", prompt)
        self.assertIn("gharama za uendeshaji", prompt)
        self.assertIn("Hakuna mauzo yaliyorekodiwa leo", prompt)

    def test_prompt_requires_exact_data_scope_and_grounded_explanations(self):
        prompt = build_partner_system_prompt(self._context(locale="sw"))

        self.assertIn("Preserve the exact scope of verified data", prompt)
        self.assertIn("Do not present an unverified cause as an explanation", prompt)
        self.assertIn("weekday", prompt)
        self.assertIn("unverified possibility or suggestion", prompt)

    def test_english_prompt_does_not_include_swahili_style_guidance(self):
        prompt = build_partner_system_prompt(self._context(locale="en"))

        self.assertNotIn("natural Tanzanian business Swahili", prompt)
        self.assertNotIn("punguzo", prompt)
