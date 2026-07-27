# Identity API Routes

Base URL:

`/api/v1/identity/`

## Email registration

- Method: `POST`
- Final route: `/api/v1/identity/registration/email/`
- Authentication: Not required
- Purpose: Register a user using an email and password.
- Success status: `201 Created`
- Next step: Email verification
- Implementation: `apps/identity/api/registration.py`
- URL configuration: `apps/identity/urls.py`


## Verify email

- Method: `POST`
- Final route: `/api/v1/identity/email-verification/`
- Authentication: Not required
- Purpose: Verify an email using the submitted code.
- Success status: `200 OK`
- Next step: Complete onboarding

## Resend email verification code

- Method: `POST`
- Final route: `/api/v1/identity/email-verification/resend/`
- Authentication: Not required
- Purpose: Request a replacement verification code.
- Success status: `200 OK`
- Response does not reveal whether an account exists.


## Complete onboarding

- Method: `POST`
- Final route: `/api/v1/identity/onboarding/`
- Authentication: Required — JWT Bearer access token
- Purpose: Save the required username, phone number, and country.
- Success status: `200 OK`
- Next step: Dashboard

Authorization: Bearer <access_token>

## Email login

- Method: `POST`
- Final route: `/api/v1/identity/login/email/`
- Authentication: Not required
- Purpose: Authenticate using email and password.
- Success status: `200 OK`
- Authentication result: JWT access and refresh tokens
- Next step: Complete onboarding or dashboard  