# Backend Commands

Run backend commands from:

```text
C:\Users\smart\OneDrive\Desktop\TEED\backend
```

## Activate the virtual environment

If the virtual environment is at the repository root:

```powershell
cd C:\Users\smart\OneDrive\Desktop\TEED
.\venv\Scripts\Activate.ps1
cd .\backend
```

If PowerShell blocks the activation script for the current process:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```

Do not change the machine-wide policy merely to activate one environment.

## Install dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r .\requirements\development.txt
```

The requirement files must be UTF-8 and `development.txt` must include the base
runtime dependencies.

## Environment file

From the repository root:

```powershell
Copy-Item .env.example .env
```

Fill in local values. Never commit `.env`.

## Django system checks

```powershell
python manage.py check
```

Production-oriented checks:

```powershell
python manage.py check --deploy --settings=config.settings.production
```

The production command requires valid production-like environment variables.

## Formatting and linting

Run these commands from the repository root:

```powershell
python -m ruff format backend
python -m ruff check backend
```

Apply safe import and lint fixes:

```powershell
python -m ruff check backend --fix
```

Verify formatting without changing files:

```powershell
python -m ruff format backend --check
```

## Migrations

Show migration state:

```powershell
python manage.py showmigrations
```

Detect model changes without writing:

```powershell
python manage.py makemigrations --check --dry-run
```

Create migrations:

```powershell
python manage.py makemigrations
```

Review the generated file, then apply:

```powershell
python manage.py migrate
```

Plan before applying:

```powershell
python manage.py migrate --plan
```

## Development server

```powershell
python manage.py runserver
```

Specific local address:

```powershell
python manage.py runserver 127.0.0.1:8000
```

## Tests

All backend tests:

```powershell
python manage.py test
```

Identity tests:

```powershell
python manage.py test apps.identity.tests
```

One test file:

```powershell
python manage.py test apps.identity.tests.test_email_verification_api
```

One test class:

```powershell
python manage.py test `
  apps.identity.tests.test_authentication_service.EmailAuthenticationServiceTests
```

Keep the test database after a run:

```powershell
python manage.py test --keepdb
```

Verbose output:

## Security-event retention

Delete audit rows whose configured retention date has passed:

```powershell
python manage.py purge_expired_security_events
```

Schedule this command in production. Do not remove security events manually
during normal development.

```powershell
python manage.py test --verbosity 2
```

## Create an administrator

```powershell
python manage.py createsuperuser
```

## Django shell

```powershell
python manage.py shell
```

## OpenAPI schema

Run the server and open:

```text
http://127.0.0.1:8000/schema/
http://127.0.0.1:8000/swagger/
http://127.0.0.1:8000/redoc/
```

Generate a schema file for verification:

```powershell
python manage.py spectacular --file schema.yml --validate
```

Remove generated inspection files if they are not intended repository
artifacts.

## Static files

Production collection:

```powershell
python manage.py collectstatic --noinput
```

## Useful diagnostics

Python and Django versions:

```powershell
python --version
python -m django --version
```

Installed dependencies:

```powershell
python -m pip list
python -m pip check
```

Configured settings module:

```powershell
$env:DJANGO_SETTINGS_MODULE
```

## Standard backend verification

```powershell
cd C:\Users\smart\OneDrive\Desktop\TEED
python -m ruff format backend --check
python -m ruff check backend
cd .\backend
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test
```
