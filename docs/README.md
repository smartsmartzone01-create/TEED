# TEED Documentation

This directory contains the durable technical documentation for TEED.

The running code and verified tests describe the current implementation. These documents define the intended rules and explain the implemented organization. When documentation and code disagree, the disagreement must be resolved explicitly rather than silently treating an old document as authoritative.

## Documentation map

- [Backend architecture](backend/architecture/principles.md)
- [Backend structure](backend/structure/project-organization.md)
- [Frontend architecture](frontend/architecture/principles.md)
- [Frontend structure](frontend/structure/project-organization.md)
- [Command references](commands/git.md)

## Document categories

### Architecture

Architecture documents define principles, constraints, dependencies, security boundaries, and engineering rules.

### Structure

Structure documents describe the repository as it is organized: folders, layers, responsibilities, dependency direction, and implemented modules.

### Commands

Command references contain reviewed copy-and-paste commands for common development workflows.

## Status language

Every document must distinguish among:

- **Implemented** — present in the repository and verified.
- **Required** — an approved rule for current work.
- **Planned** — accepted direction that is not implemented yet.
- **Proposed** — an idea that still requires a decision.

Temporary chat handoffs and session-specific progress notes are not architecture documentation.
