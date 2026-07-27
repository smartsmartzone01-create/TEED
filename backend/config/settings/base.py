

from pathlib import Path
from decouple import AutoConfig
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

config = AutoConfig(search_path=BASE_DIR.parent)


SECRET_KEY = config("SECRET_KEY")


ALLOWED_HOSTS = config(
    "ALLOWED_HOSTS",
    cast=lambda value: [host.strip() for host in value.split(",")]
)

# Application definition

# =====================================================
# DJANGO APPS
# =====================================================

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

# =====================================================
# THIRD PARTY APPS
# =====================================================

THIRD_PARTY_APPS = [
    'rest_framework',
    'django_filters',
    'drf_spectacular',
    'corsheaders',
    "rest_framework_simplejwt.token_blacklist",
]

# =====================================================
# LOCAL APPS
# =====================================================

LOCAL_APPS = [
    "apps.identity.apps.IdentityConfig",
]

# =====================================================
# INSTALLED APPS
# =====================================================

INSTALLED_APPS = (
    DJANGO_APPS
    + THIRD_PARTY_APPS
    + LOCAL_APPS
)

AUTH_USER_MODEL = "identity.User"

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'



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
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "common.pagination.TEEDPagination",
    "EXCEPTION_HANDLER": "common.exceptions.handlers.teed_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

SPECTACULAR_SETTINGS = {
    "TITLE": "TEED API",
    "DESCRIPTION": "Technical Ecommerce Environment Development API",
    "VERSION": "1.0.0",
}


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True




STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"



DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Logging Configuration

LOGGING = {
    "version": 1,
    
    "disable_existing_loggers": False,

    "formatters": {
        "default": {
            "format": (
                "{levelname} "
                "{asctime} "
                "{name} "
                "{message}"
            ),
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
    "DEFAULT_SCHEMA_CLASS": (
        "drf_spectacular.openapi.AutoSchema"
    ),
    "DEFAULT_PAGINATION_CLASS": (
        "common.pagination.TEEDPagination"
    ),
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": (
        "common.exceptions.handlers.teed_exception_handler"
    ),
    "DEFAULT_AUTHENTICATION_CLASSES": [
    (
        "rest_framework_simplejwt.authentication."
        "JWTAuthentication"
    ),
    ],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
    ],
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
    default=5,
    cast=int,
)

