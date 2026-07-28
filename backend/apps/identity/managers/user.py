from django.contrib.auth.base_user import BaseUserManager


class UserManager(BaseUserManager):
    """
    Manager for TEED users authenticated through email,
    phone, or an external identity provider.
    """

    use_in_migrations = True

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                is_deleted=False,
            )
        )

    def _create_user(
        self,
        *,
        password=None,
        email=None,
        phone_number=None,
        **extra_fields,
    ):
        if not email and not phone_number:
            raise ValueError("An email address or phone number is required.")

        if email:
            email = self.normalize_email(email).strip().lower()

        if phone_number:
            phone_number = phone_number.strip()

        user = self.model(
            email=email,
            phone_number=phone_number,
            **extra_fields,
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)

        return user

    def create_user(
        self,
        email=None,
        password=None,
        phone_number=None,
        **extra_fields,
    ):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        return self._create_user(
            email=email,
            phone_number=phone_number,
            password=password,
            **extra_fields,
        )

    def create_superuser(
        self,
        email,
        password,
        **extra_fields,
    ):
        if not email:
            raise ValueError("A superuser must have an email address.")

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault(
            "is_email_verified",
            True,
        )

        if extra_fields.get("is_staff") is not True:
            raise ValueError("A superuser must have is_staff=True.")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have is_superuser=True.")

        return self._create_user(
            email=email,
            password=password,
            **extra_fields,
        )
