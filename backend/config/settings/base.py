from datetime import timedelta
from pathlib import Path

from decouple import AutoConfig

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

config = AutoConfig(search_path=BASE_DIR.parent)


SECRET_KEY = config("SECRET_KEY")


def parse_csv(value):
    """Return a clean list from a comma-separated environment value."""
    return [item.strip() for item in value.split(",") if item.strip()]


ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    default="",
    cast=parse_csv,
)

# Application definition

# =====================================================
# DJANGO APPS
# =====================================================

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

# =====================================================
# THIRD PARTY APPS
# =====================================================

THIRD_PARTY_APPS = [
    "rest_framework",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    "rest_framework_simplejwt.token_blacklist",
]

# =====================================================
# LOCAL APPS
# =====================================================

LOCAL_APPS = [
    "apps.identity.apps.IdentityConfig",
    "apps.profiles.apps.ProfilesConfig",
    "apps.security.apps.SecurityConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.workspaces.apps.WorkspacesConfig",
]

# =====================================================
# INSTALLED APPS
# =====================================================

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "identity.User"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
CSRF_FAILURE_VIEW = "common.exceptions.csrf.csrf_failure"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("DB_NAME"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT"),
    }
}


AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


SPECTACULAR_SETTINGS = {
    "TITLE": "TEED API",
    "DESCRIPTION": "Technical Ecommerce Environment Development API",
    "VERSION": "1.0.0",
}


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Logging Configuration

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": ("{levelname} {asctime} {name} {message}"),
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": True,
        },
        "teed": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
}


# Django REST Framework Configuration

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": ("drf_spectacular.openapi.AutoSchema"),
    "DEFAULT_PAGINATION_CLASS": ("common.pagination.TEEDPagination"),
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": ("common.exceptions.handlers.teed_exception_handler"),
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.identity.authentication.SessionJWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
    "NUM_PROXIES": config(
        "THROTTLE_NUM_PROXIES",
        default=0,
        cast=int,
    ),
    "DEFAULT_THROTTLE_RATES": {
        "login_ip": config(
            "LOGIN_IP_THROTTLE_RATE",
            default="10/minute",
        ),
        "login_email": config(
            "LOGIN_EMAIL_THROTTLE_RATE",
            default="5/minute",
        ),
        "email_verification_resend_ip": config(
            "EMAIL_VERIFICATION_RESEND_IP_THROTTLE_RATE",
            default="20/hour",
        ),
        "email_registration_ip": config(
            "EMAIL_REGISTRATION_IP_THROTTLE_RATE",
            default="10/hour",
        ),
        "email_verification_resend_account": config(
            "EMAIL_VERIFICATION_RESEND_ACCOUNT_THROTTLE_RATE",
            default="5/hour",
        ),
        "password_reset_request_ip": config(
            "PASSWORD_RESET_REQUEST_IP_THROTTLE_RATE",
            default="30/hour",
        ),
        "password_reset_request_account": config(
            "PASSWORD_RESET_REQUEST_ACCOUNT_THROTTLE_RATE",
            default="5/hour",
        ),
        "password_reset_verify_ip": config(
            "PASSWORD_RESET_VERIFY_IP_THROTTLE_RATE",
            default="60/hour",
        ),
        "password_reset_verify_account": config(
            "PASSWORD_RESET_VERIFY_ACCOUNT_THROTTLE_RATE",
            default="10/hour",
        ),
        "password_reset_confirm_ip": config(
            "PASSWORD_RESET_CONFIRM_IP_THROTTLE_RATE",
            default="30/hour",
        ),
    },
}


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=config(
            "JWT_ACCESS_TOKEN_MINUTES",
            default=15,
            cast=int,
        )
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=config(
            "JWT_REFRESH_TOKEN_DAYS",
            default=7,
            cast=int,
        )
    ),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}

REFRESH_TOKEN_COOKIE_NAME = config(
    "REFRESH_TOKEN_COOKIE_NAME",
    default="teed_refresh",
)
REFRESH_TOKEN_COOKIE_PATH = "/api/v1/identity/session/"
REFRESH_TOKEN_COOKIE_SECURE = False
REFRESH_TOKEN_COOKIE_SAMESITE = "Lax"

DEVICE_COOKIE_NAME = config("DEVICE_COOKIE_NAME", default="teed_device")
DEVICE_COOKIE_MAX_AGE_SECONDS = config(
    "DEVICE_COOKIE_MAX_AGE_SECONDS",
    default=31536000,
    cast=int,
)
DEVICE_COOKIE_SECURE = False
DEVICE_COOKIE_SAMESITE = "Lax"

PASSWORD_RESET_COOKIE_NAME = config(
    "PASSWORD_RESET_COOKIE_NAME",
    default="teed_password_reset",
)
PASSWORD_RESET_COOKIE_PATH = "/api/v1/identity/password-reset/"
PASSWORD_RESET_COOKIE_SECURE = False
PASSWORD_RESET_COOKIE_SAMESITE = "Lax"

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"

# Email verification

DEFAULT_FROM_EMAIL = config(
    "DEFAULT_FROM_EMAIL",
    default="TEED <no-reply@teed.local>",
)

EMAIL_VERIFICATION_CODE_LENGTH = config(
    "EMAIL_VERIFICATION_CODE_LENGTH",
    default=6,
    cast=int,
)

EMAIL_VERIFICATION_TTL_MINUTES = config(
    "EMAIL_VERIFICATION_TTL_MINUTES",
    default=10,
    cast=int,
)

EMAIL_VERIFICATION_MAX_ATTEMPTS = config(
    "EMAIL_VERIFICATION_MAX_ATTEMPTS",
    default=3,
    cast=int,
)

EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = config(
    "EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS",
    default=60,
    cast=int,
)

EMAIL_VERIFICATION_DAILY_LIMIT = config(
    "EMAIL_VERIFICATION_DAILY_LIMIT",
    default=5,
    cast=int,
)

PASSWORD_RESET_GRANT_TTL_MINUTES = config(
    "PASSWORD_RESET_GRANT_TTL_MINUTES",
    default=10,
    cast=int,
)
PASSWORD_RESET_REQUESTS_PER_HOUR = config(
    "PASSWORD_RESET_REQUESTS_PER_HOUR",
    default=3,
    cast=int,
)
IDENTITY_SECURITY_EVENT_RETENTION_DAYS = config(
    "IDENTITY_SECURITY_EVENT_RETENTION_DAYS",
    default=180,
    cast=int,
)

# Durable email delivery outbox
EMAIL_DELIVERY_PROVIDER = config(
    "EMAIL_DELIVERY_PROVIDER",
    default="apps.identity.email.DjangoEmailProvider",
)
EMAIL_DELIVERY_ENCRYPTION_KEY = config(
    "EMAIL_DELIVERY_ENCRYPTION_KEY",
    default="",
)
EMAIL_DELIVERY_MAX_ATTEMPTS = config(
    "EMAIL_DELIVERY_MAX_ATTEMPTS",
    default=5,
    cast=int,
)
EMAIL_DELIVERY_RETRY_BASE_SECONDS = config(
    "EMAIL_DELIVERY_RETRY_BASE_SECONDS",
    default=60,
    cast=int,
)
EMAIL_DELIVERY_RETRY_MAX_SECONDS = config(
    "EMAIL_DELIVERY_RETRY_MAX_SECONDS",
    default=3600,
    cast=int,
)
EMAIL_DELIVERY_LOCK_TIMEOUT_SECONDS = config(
    "EMAIL_DELIVERY_LOCK_TIMEOUT_SECONDS",
    default=300,
    cast=int,
)
EMAIL_DELIVERY_TTL_HOURS = config(
    "EMAIL_DELIVERY_TTL_HOURS",
    default=24,
    cast=int,
)
EMAIL_DELIVERY_AUTOPROCESS = False
EMAIL_DELIVERY_REQUIRE_EXPLICIT_KEY = False
EMAIL_DELIVERY_RETENTION_DAYS = config(
    "EMAIL_DELIVERY_RETENTION_DAYS",
    default=30,
    cast=int,
)
