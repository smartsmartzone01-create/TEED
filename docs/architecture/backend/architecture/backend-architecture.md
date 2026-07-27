# Backend Architecture

> Defines the architecture, responsibilities, and development standards of the TEED backend.

---

# Document Information

| Property          | Value                                                                          |
| ----------------- | ------------------------------------------------------------------------------ |
| Document          | Backend Architecture                                                           |
| Status            | Active                                                                         |
| Version           | 1.0                                                                            |
| Last Updated      | 2026-07-21                                                                     |
| Owner             | TEED Architecture                                                              |
| Audience          | Backend Developers, Software Architects, AI Assistants                         |
| Depends On        | System Overview                                                                |
| Related Documents | Platform Foundation, Database Standards, API Standards, Development Guidelines |

---

# Purpose

The Backend Architecture document defines the structural design of the TEED backend.

Its purpose is to establish consistent architectural principles, define responsibilities for each backend layer, describe module boundaries, and provide a shared reference for developers and AI assistants implementing the platform.

This document serves as the authoritative architectural specification for backend development.

---

# Scope

## This document defines

* Backend architecture
* Layer responsibilities
* Module boundaries
* Module communication
* Dependency rules
* Architectural constraints
* Testing responsibilities
* Transaction ownership

## This document does not define

* Database schema
* API specifications
* Authentication implementation
* Authorization rules
* Business module design
* Coding standards
* Deployment architecture

These topics are documented separately.

---

# Architectural Principles

Every architectural decision within TEED should align with the following principles.

## API First

All platform functionality is exposed through well-defined APIs.

Backend implementation should remain independent from frontend applications.

---

## Modular Monolith

TEED is deployed as a single application while maintaining strict logical separation between business domains.

Modules evolve independently but share the same runtime and platform foundation.

---

## Domain-Driven Design

Business capabilities are organized into independent domain modules.

Each module owns its business logic, data, services, and APIs.

---

## Composition over Inheritance

Reusable behavior should be implemented through composition rather than deep inheritance hierarchies.

Platform Foundation provides reusable components without forcing unnecessary coupling.

---

## Single Responsibility

Every architectural component should have one clearly defined responsibility.

Responsibilities should never overlap across layers.

---

## Convention over Configuration

Common architectural conventions should be followed consistently across all modules.

Developers should spend their effort solving business problems rather than configuring infrastructure.

---

## Explicit Dependencies

Dependencies between modules and architectural layers must always be explicit.

Hidden dependencies reduce maintainability and make long-term evolution difficult.

---

## High Cohesion

Components within a module should work together toward a single business purpose.

Related functionality should remain close together.

---

## Loose Coupling

Modules should interact through public interfaces rather than internal implementation details.

This minimizes the impact of future changes.

---

# Architecture Goals

The backend architecture is designed to achieve the following objectives.

* Maintainability
* Scalability
* Modularity
* Testability
* Consistency
* Extensibility
* Reusability
* Observability
* AI-assisted development

Every architectural decision should support one or more of these goals.

---

# Backend Context

The backend serves as the core of the TEED platform.

It provides shared infrastructure, business services, data persistence, and REST APIs consumed by frontend applications.

```text
                     React Frontend
                            │
                      REST API
                            │
               ┌────────────▼────────────┐
               │      Django Backend      │
               ├──────────────────────────┤
               │  Platform Foundation     │
               ├──────────────────────────┤
               │    Business Modules      │
               └────────────┬────────────┘
                            │
                      PostgreSQL
```

The backend remains independent of frontend implementation while providing stable API contracts.

---

# Architectural Style

The TEED backend follows a Modular Monolith architecture.

The application is deployed as a single backend service while maintaining clear boundaries between business domains.

Each business module owns its own implementation and is responsible for managing its own business rules.

Shared infrastructure is provided exclusively by the Platform Foundation.

Modules communicate through public interfaces rather than direct access to internal implementation.

---

# Backend Structure

The backend is organized into platform infrastructure and business modules.

```text
backend/
│
├── apps/
│   ├── identity/
│   ├── business/
│   ├── workspace/
│   ├── rbac/
│   ├── payments/
│   ├── analytics/
│   ├── websites/
│   ├── education/
│   ├── ads/
│   └── ai/
│
├── common/
├── config/
├── requirements/
├── tests/
└── manage.py
```

Business modules implement domain functionality.

The `common` package provides reusable platform infrastructure shared across all modules.

Configuration remains isolated within the `config` package.

---

# Module Contract

Every business module follows the same architectural contract.

## Every module owns

* Models
* Services
* Repositories
* Selectors
* API
* Serializers
* Tests
* Documentation

## Every module may depend on

* Platform Foundation
* Public services exposed by other modules
* Shared platform utilities

## Every module must not depend on

* Internal implementation of another module
* Private models from another module
* Private repositories from another module
* Internal business logic of another module

Maintaining this contract preserves module independence and long-term maintainability.

---
# Ownership Principle

The TEED backend follows a single architectural rule above all others:

> **Every responsibility has exactly one owner.**

A responsibility should never be implemented across multiple architectural layers.

When ownership is clear, the system becomes easier to understand, maintain, test, and extend.

---

## Responsibility Ownership Matrix

| Responsibility           | Owner               |
| ------------------------ | ------------------- |
| HTTP Communication       | API Layer           |
| Request Validation       | Serializer Layer    |
| Response Serialization   | Serializer Layer    |
| Business Rules           | Service Layer       |
| Business Workflows       | Service Layer       |
| Transaction Coordination | Service Layer       |
| Database Writes          | Repository Layer    |
| Database Reads           | Selector Layer      |
| Domain State             | Model Layer         |
| Shared Infrastructure    | Platform Foundation |

Ownership should remain consistent across every module in the platform.

---

## Ownership Rules

The following rules apply throughout the backend.

* Business rules belong only in Services.
* Validation belongs only in Serializers.
* Database writes belong only in Repositories.
* Database reads belong only in Selectors.
* HTTP communication belongs only in the API Layer.
* Models represent state rather than business workflows.
* Shared infrastructure belongs only in the Platform Foundation.

Violating these ownership boundaries introduces architectural duplication and increases long-term maintenance costs.

---

# Layered Architecture

Every business module follows the same layered architecture.

```text
                    Module
                      │
      ┌───────────────┼───────────────┐
      │               │               │
      ▼               ▼               ▼
 API Layer     Service Layer     Domain Layer
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 Repository Layer         Selector Layer
                      │
                      ▼
                  Database
```

Each layer owns a specific responsibility and communicates only with the layers it is permitted to access.

The architecture is intentionally simple, predictable, and consistent across every module.

---

# Layer Responsibilities

## API Layer

### Purpose

Acts as the entry point to the backend.

### Owns

* HTTP request handling
* Routing
* Authentication integration
* Permission enforcement
* Calling serializers
* Returning HTTP responses

### Does Not Own

* Business logic
* Database access
* Business workflows
* Transaction management

---

## Serializer Layer

### Purpose

Transforms external data into validated application data and converts application data into API responses.

### Owns

* Request validation
* Data transformation
* Response serialization
* Field-level validation

### Does Not Own

* Business rules
* Database queries
* Workflow orchestration
* Transaction management

---

## Service Layer

### Purpose

The Service Layer is the heart of the application.

It coordinates business workflows and enforces business rules.

### Owns

* Business logic
* Business workflows
* Transaction boundaries
* Coordination between repositories and selectors
* Raising domain exceptions
* Calling external services

### Does Not Own

* HTTP communication
* Serialization
* Direct SQL
* Response formatting

---

## Repository Layer

### Purpose

Repositories encapsulate write-oriented persistence logic.

### Owns

* Create operations
* Update operations
* Delete operations
* Bulk persistence
* Persistence abstraction

### Does Not Own

* Business rules
* Validation
* Workflow orchestration
* Reporting queries

---

## Selector Layer

### Purpose

Selectors encapsulate reusable read operations.

### Owns

* Read queries
* Search
* Filtering
* Aggregation
* Dashboard queries
* Reporting queries

### Does Not Own

* Writes
* Updates
* Deletes
* Business workflows

---

## Domain Layer

### Purpose

Represents business entities and their state.

### Owns

* Models
* Enumerations
* Relationships
* Domain constants

### Does Not Own

* HTTP
* Business workflows
* Transaction coordination
* Complex business orchestration

---

# Layer Responsibility Matrix

| Layer      | Owns                          | Never Owns             |
| ---------- | ----------------------------- | ---------------------- |
| API        | HTTP communication            | Business logic         |
| Serializer | Validation and transformation | Business workflows     |
| Service    | Business workflows            | HTTP communication     |
| Repository | Database writes               | Business decisions     |
| Selector   | Database reads                | Data modification      |
| Model      | Domain state                  | Workflow orchestration |

This matrix serves as the primary architectural reference when deciding where new functionality belongs.

---

# Request Lifecycle

Every request follows the same execution path.

```text
Client
   │
   ▼
URL Router
   │
   ▼
APIView
   │
   ▼
Serializer
   │
   ▼
Service
   ├────────► Selector
   ├────────► Repository
   ▼
Model
   │
   ▼
Database
```

The request always moves downward through the architectural layers.

Responses propagate upward through the same path until an HTTP response is returned to the client.

Maintaining a consistent request lifecycle improves predictability, debugging, and maintainability.

---

# Module Communication

Business modules communicate through public contracts rather than internal implementation.

## Preferred

```text
Module A
    │
    ▼
Public Service
    │
    ▼
Module B
```

## Avoid

```text
Module A
    │
    ▼
Internal Repository
    │
    ▼
Module B
```

```text
Module A
    │
    ▼
Internal Model
    │
    ▼
Module B
```

A module should never directly manipulate another module's internal implementation.

Public services define the integration boundary between modules.

---

# Platform Foundation Dependency

Every business module depends on the Platform Foundation.

```text
                  Platform Foundation
                          ▲
      ┌──────────┬────────┼─────────┬──────────┐
      │          │        │         │          │
 Identity   Business  Workspace  Payments  Analytics
```

The Platform Foundation provides:

* Base models
* UUID generation
* Timestamp mixins
* Soft delete infrastructure
* Managers
* QuerySets
* Exception framework
* API response framework
* Pagination
* Logging
* Shared utilities

Business modules may depend on the Platform Foundation.

The Platform Foundation must never depend on business modules.

This one-way dependency preserves architectural stability.

---

# Dependency Rules

Dependencies always move downward.

Higher layers coordinate lower layers.

Lower layers never control higher layers.

---

## Allowed Dependencies

```text
API
 │
 ▼
Serializer
 │
 ▼
Service
 ├────► Repository
 ├────► Selector
 ▼
Model
```

```text
Business Module
      │
      ▼
Platform Foundation
```

---

## Forbidden Dependencies

```text
APIView
     │
     ▼
Repository
```

```text
Serializer
     │
     ▼
Repository
```

```text
Model
     │
     ▼
Service
```

```text
Repository
     │
     ▼
Service
```

```text
Selector
     │
     ▼
Repository
```

```text
Module A
     │
     ▼
Private Classes of Module B
```

Whenever a dependency violates these rules, the implementation should be refactored before being merged.

These dependency rules are mandatory across the entire TEED backend.

# Architectural Constraints

Architectural constraints are mandatory rules that preserve consistency across the TEED backend.

Unlike coding conventions, these constraints are not optional. Every module and every backend contribution must comply with them.

Failure to follow these constraints introduces technical debt, increases coupling, and reduces maintainability.

---

## General Constraints

The following constraints apply to every backend module.

* Business logic must never exist outside the Service Layer.
* Every responsibility must have exactly one owner.
* Shared functionality belongs in the Platform Foundation.
* Modules must remain loosely coupled.
* Architectural layers must not be bypassed.
* Dependencies must always be explicit.
* Circular dependencies are prohibited.
* Public interfaces define module boundaries.

---

## API Layer Constraints

The API Layer exists only to expose backend functionality through HTTP.

### Must

* Receive requests.
* Authenticate users.
* Authorize requests.
* Call serializers.
* Call services.
* Return HTTP responses.

### Must Not

* Execute business logic.
* Query models directly.
* Perform persistence operations.
* Coordinate transactions.

---

## Serializer Constraints

Serializers validate and transform data.

### Must

* Validate input.
* Serialize responses.
* Perform field-level validation.
* Transform external data.

### Must Not

* Execute business workflows.
* Call repositories.
* Modify database state.
* Contain business rules.

---

## Service Constraints

Services own business workflows.

### Must

* Implement business rules.
* Coordinate workflows.
* Manage transactions.
* Call repositories.
* Call selectors.
* Raise domain exceptions.

### Must Not

* Return HTTP responses.
* Parse request objects.
* Perform serialization.
* Contain presentation logic.

---

## Repository Constraints

Repositories own persistence.

### Must

* Persist data.
* Execute write operations.
* Encapsulate database writes.
* Support transactional persistence.

### Must Not

* Implement business rules.
* Coordinate workflows.
* Perform validation.
* Execute reporting queries.

---

## Selector Constraints

Selectors own reusable read operations.

### Must

* Query data.
* Search.
* Filter.
* Aggregate.
* Build reporting datasets.

### Must Not

* Create records.
* Update records.
* Delete records.
* Execute business workflows.

---

## Model Constraints

Models represent domain state.

### Must

* Represent entities.
* Define relationships.
* Define constraints.
* Maintain domain integrity.

### Must Not

* Coordinate workflows.
* Call services.
* Access HTTP requests.
* Execute complex business operations.

---

# Cross-Module Communication

Business modules communicate only through public interfaces.

## Preferred Communication

```text id="aw5qj6"
Module A
      │
      ▼
Public Service
      │
      ▼
Module B
```

Every interaction should occur through a clearly defined service contract.

---

## Forbidden Communication

```text id="k2mlvq"
Module A
      │
      ▼
Repository
      │
      ▼
Module B
```

```text id="b2uqn0"
Module A
      │
      ▼
Internal Model
      │
      ▼
Module B
```

```text id="5e10h9"
Module A
      │
      ▼
Private Utility
      │
      ▼
Module B
```

Internal implementation details must never become public dependencies.

---

# Error Propagation

Errors should propagate consistently through the backend.

```text id="lswsnc"
Business Rule
      │
      ▼
Service
      │
      ▼
TEED Exception
      │
      ▼
Global Exception Handler
      │
      ▼
Standard API Response
      │
      ▼
Client
```

Views and serializers should not generate business exceptions.

Business failures originate from the Service Layer.

---

# Transaction Ownership

Transaction boundaries belong exclusively to the Service Layer.

```text id="zrtk2p"
Service
    │
    ├──── Repository
    ├──── Repository
    ├──── Repository
    ▼
Commit / Rollback
```

Repositories participate in transactions but never define their boundaries.

This ensures that an entire business workflow either succeeds or fails as a single unit.

---

# Testing Strategy

Testing follows the architecture.

Every architectural layer has its own testing responsibility.

| Layer      | Primary Test         |
| ---------- | -------------------- |
| API        | API Tests            |
| Serializer | Validation Tests     |
| Service    | Business Logic Tests |
| Repository | Integration Tests    |
| Selector   | Query Tests          |
| Model      | Unit Tests           |

Tests should verify **behavior**, not implementation details.

A successful refactor should not require rewriting tests if observable behavior remains unchanged.

---

# Quality Attributes

The backend architecture is designed to maximize the following qualities.

## Maintainability

Components are easy to understand and modify.

---

## Modularity

Business domains evolve independently.

---

## Scalability

New modules can be introduced without restructuring existing architecture.

---

## Testability

Each architectural layer can be tested independently.

---

## Reusability

Shared functionality is centralized within the Platform Foundation.

---

## Consistency

Every module follows identical architectural rules.

---

## Observability

Errors, logs, and application behavior are visible and traceable.

---

## Extensibility

New capabilities can be added without violating existing architecture.

---

## AI-Assisted Development

The architecture is intentionally predictable and well-defined so AI assistants can generate code that follows existing conventions rather than introducing new patterns.

---

# Related Documents

The Backend Architecture document should be read together with the following documents.

| Document               | Purpose                           |
| ---------------------- | --------------------------------- |
| System Overview        | Overall platform architecture     |
| Platform Foundation    | Shared infrastructure             |
| Database Standards     | Database design principles        |
| API Standards          | API conventions                   |
| Security Architecture  | Authentication and authorization  |
| Development Guidelines | Coding and project standards      |
| AI Development Guide   | Rules for AI-assisted development |

---

# Related Architecture Decision Records

Significant architectural decisions are documented separately as Architecture Decision Records (ADRs).

Examples include:

* ADR-001 — UUID Strategy
* ADR-002 — Base Model Architecture
* ADR-003 — Composition over Inheritance
* ADR-004 — Soft Delete Strategy
* ADR-005 — Repository Pattern
* ADR-006 — Selector Pattern
* ADR-007 — Exception Framework
* ADR-008 — Standard API Response

The Backend Architecture document defines **what** the architecture is.

ADRs explain **why** important architectural decisions were made.

---

# Architecture Evolution

The backend architecture is intended to evolve without compromising consistency.

Future architectural changes should follow these principles:

* Preserve existing architectural boundaries whenever possible.
* Favor incremental evolution over large rewrites.
* Record significant changes in an ADR before implementation.
* Maintain backward compatibility unless there is a compelling architectural reason to break it.
* Update architecture documentation alongside implementation.

Architecture is considered part of the software.

Any implementation that changes the architecture without updating the documentation is considered incomplete.

---

# Summary

The Backend Architecture defines the structural foundation of every backend module in TEED.

By establishing clear ownership, strict layer responsibilities, explicit dependencies, and standardized communication patterns, the architecture ensures that the platform remains maintainable, scalable, and consistent as it grows.

Every backend contribution should reinforce these principles rather than introduce new architectural conventions.

