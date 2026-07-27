# Backend Route References

This directory is a development reference for frontend and backend integration.

Each module file lists the implemented HTTP methods, exact paths, authentication requirements, request fields, successful response data, next-step values, and stable domain error codes. It is intentionally faster to scan than Django URL and API-view source.

## Rules

- Update a route document in the same change as its URL, request, response, authentication, or error contract.
- Document implemented endpoints only. Label future endpoints as planned and keep them separate.
- Use paths relative to the backend origin.
- Never place secrets, real credentials, or live tokens in examples.
- OpenAPI remains the machine-readable API contract; these files are concise developer references.

## Modules

- [Identity](identity.md)
