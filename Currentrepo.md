backend/
├── manage.py
├── config/
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py
│       ├── development.py
│       └── production.py
├── apps/
│   └── identity/
│       ├── __init__.py
│       ├── admin.py
│       ├── apps.py
│       ├── views.py
│       ├── managers/
│       │   └── user.py
│       ├── models/
│       │   ├── user.py
│       │   └── email_verification.py
│       ├── repositories/
│       │   └── user.py
│       ├── selectors/
│       │   └── user.py
│       ├── tests/
│       └── migrations/
├── common/
│   ├── __init__.py
│   ├── constants/
│   │   ├── notifications.py
│   │   ├── status.py
│   │   └── system.py
│   ├── database/
│   │   ├── base_model.py
│   │   ├── managers.py
│   │   ├── querysets.py
│   │   └── uuid.py
│   ├── exceptions/
│   │   ├── base.py
│   │   ├── handlers.py
│   │   └── modules/
│   ├── logging/
│   │   ├── formatters.py
│   │   ├── handlers.py
│   │   └── logger.py
│   ├── mixins/
│   │   └── database.py
│   ├── pagination/
│   │   ├── constants.py
│   │   └── default.py
│   ├── permissions/
│   ├── responses/
│   │   ├── error.py
│   │   ├── pagination.py
│   │   ├── response.py
│   │   └── success.py
│   ├── types/
│   ├── utils/
│   └── validators/
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   └── production.txt
├── static/
├── media/
├── logs/
└── tests/