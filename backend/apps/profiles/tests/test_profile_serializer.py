from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image

from ..serializers import ProfileUpdateSerializer


def image_upload(*, image_format="PNG", size=(20, 20)):
    buffer = BytesIO()
    Image.new("RGB", size, color="blue").save(buffer, format=image_format)
    extension = image_format.lower().replace("jpeg", "jpg")
    return SimpleUploadedFile(
        f"profile.{extension}",
        buffer.getvalue(),
        content_type=f"image/{extension}",
    )


class ProfileUpdateSerializerTests(SimpleTestCase):
    def test_normalizes_username_and_country(self):
        serializer = ProfileUpdateSerializer(
            data={
                "username": "Profile_User",
                "country_code": "TZ",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["username"], "profile_user")
        self.assertEqual(serializer.validated_data["country_code"], "TZ")

    def test_empty_update_is_rejected(self):
        serializer = ProfileUpdateSerializer(data={})

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["non_field_errors"][0].code,
            "profile_update_empty",
        )

    def test_supported_image_is_accepted(self):
        serializer = ProfileUpdateSerializer(data={"profile_image": image_upload()})

        self.assertTrue(serializer.is_valid(), serializer.errors)
