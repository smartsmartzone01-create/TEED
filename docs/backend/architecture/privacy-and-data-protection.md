# Privacy and Data Protection

## Principle

Every personal-data field requires:

1. a specific product or security purpose;
2. an owning application;
3. an access and mutation policy;
4. a retention and deletion decision;
5. a user-facing explanation at the point of collection.

Do not add personal information for completeness, analytics speculation, or
future convenience.

## Transparency layers

TEED uses two complementary layers:

- a platform privacy notice explaining controllers, purposes, processors,
  transfers, retention, rights, and contact channels;
- concise contextual explanations beside forms, uploads, and security actions.

A broad promise that TEED will not use information for an "individual purpose"
is insufficient. Each actual use must be stated precisely.

## Consent and necessary processing

Consent is not a universal authorization mechanism. Authentication, requested
service delivery, fraud prevention, and security may rely on other applicable
legal grounds. Optional analytics, marketing, or social-provider permissions
must remain separable and revocable where required.

Policy acknowledgement and optional consent are different records and must not
be represented by one ambiguous checkbox.

## Cookies

Authentication, refresh, CSRF, and device-security cookies are treated as
necessary application infrastructure. Language and appearance cookies are
functional preferences. Non-essential analytics or advertising technologies
must not be activated until their legal and product requirements are defined.

## Data-subject capabilities

Future privacy work must define authenticated workflows for:

- access and export;
- correction;
- deletion or justified retention;
- processing restriction and objection where applicable;
- consent withdrawal;
- complaint and privacy-contact handling.

These operations must coordinate all owning applications rather than deleting
only a Profile row.

## Third parties and social identity

Before enabling a provider, document:

- exact fields requested and returned;
- why TEED needs each field;
- the provider and transfer relationship;
- token storage and revocation;
- disconnect and data-deletion behavior;
- the user-facing disclosure shown before connection.

Provider approval requirements do not replace TEED's own privacy obligations.
