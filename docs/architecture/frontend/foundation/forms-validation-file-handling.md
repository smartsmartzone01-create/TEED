# `docs/frontend/foundation/forms-validation-and-file-handling.md`

# Forms, Validation, and File Handling Architecture

## Purpose

This document defines how TEED frontend forms are structured, validated, submitted, reset, recovered, and integrated with backend services.

It also defines how file selection, validation, upload, progress, cancellation, confirmation, and failure recovery should work across the application.

The architecture should make simple forms easy to implement while keeping complex workflows predictable, accessible, bilingual, secure, and reusable across web, PWA, and future mobile clients.

---

# Objectives

The forms and file-handling architecture should:

* Establish one consistent form lifecycle.
* Separate form state from server state.
* Centralize reusable validation rules.
* Support client-side and server-side validation.
* Prevent duplicate and unsafe submissions.
* Provide accessible field and form feedback.
* Support multilingual labels, instructions, and errors.
* Define secure and resilient file workflows.
* Support draft recovery only where explicitly appropriate.
* Remain compatible with future platform-specific file adapters.

---

# Scope

This document covers:

* Form ownership
* Form state
* Field architecture
* Validation schemas
* Client and server validation
* Submission lifecycle
* Error mapping
* Dynamic and multi-step forms
* Unsaved changes
* Draft recovery
* File selection
* File validation
* File upload
* Upload progress
* Cancellation and retry
* Presigned upload workflows
* File downloads
* Accessibility
* Internationalization
* Security
* Testing

Low-level transport behavior belongs in `api-and-service-architecture.md`.

Global error handling belongs in `application-error-handling.md`.

---

# Core Principle

Forms should own temporary user input, while the server-state layer owns persisted backend data.

```text
Server Data
    │
    ▼
Initial Form Values
    │
    ▼
Editable Form State
    │
    ▼
Validated Submission
    │
    ▼
Mutation
    │
    ▼
Updated Server State
```

The form should not become a second long-lived cache of backend resources.

---

# Form Architecture Layers

The form architecture contains five primary layers:

1. Primitive controls
2. Field composition
3. Form state and validation
4. Module form components
5. Submission and mutation integration

Each layer should have a distinct responsibility.

---

# Primitive Controls

Primitive controls include:

```text
Input

Textarea

Select

Checkbox

Radio

Switch

Date input

File input

Button
```

Primitive controls should own:

* Native interaction behavior
* Focus behavior
* Disabled and read-only states
* Accessible control semantics
* Design-system styling
* Forwarded refs where required

They should not own business validation rules.

---

# Field Components

A field component combines a primitive control with its supporting content.

A standard field may include:

```text
Label

Control

Description

Validation message

Required indicator
```

Field components should centralize label association and error relationships.

---

# Field Structure

A recommended semantic structure is:

```text
Field Container
    │
    ├── Label
    ├── Help Text
    ├── Control
    └── Error Message
```

The exact visual order may vary, but semantic relationships must remain intact.

---

# Form Components

Module form components represent application workflows.

Examples:

```text
LoginForm

CreateWorkspaceForm

InviteMemberForm

BillingAddressForm

ProjectSettingsForm
```

A form component may own:

* Form initialization
* Validation schema integration
* Field composition
* Submission coordination
* Form-level feedback
* Workflow-specific actions

It should not own raw API transport logic.

---

# Form Ownership

Form state should live at the narrowest scope that owns the submission workflow.

Examples:

```text
Dialog form
    → Dialog workflow owner

Page form
    → Page or module form component

Multi-step workflow
    → Shared step coordinator
```

Form state should not be global unless several routes genuinely participate in one persistent workflow.

---

# Form State

Form state may include:

* Current values
* Initial values
* Touched fields
* Dirty fields
* Field errors
* Form errors
* Submission status
* Validation status
* Active step
* File selection state

This state should be managed by the approved form library or shared form abstraction.

---

# Form Lifecycle

A standard form lifecycle is:

```text
Initialize

↓

Edit

↓

Validate

↓

Submit

↓

Pending

↓

Success or Failure

↓

Reset, Preserve, or Navigate
```

Every form should define its expected behavior at each stage.

---

# Initial Values

Initial form values may come from:

* Static defaults
* Route context
* Server state
* Safe recovered draft data
* User preferences

Initial values should be mapped deliberately.

A backend response should not be passed directly into a form when its shape differs from editable form values.

---

# Form Value Types

Form value types should represent editable values.

Example:

```typescript
interface ProjectFormValues {
  name: string;
  description: string;
  dueDate: string;
}
```

The corresponding API request may use a different type:

```typescript
interface UpdateProjectRequest {
  name: string;
  description?: string;
  dueDate?: string | null;
}
```

The mapping between them should be explicit.

---

# Empty Values

The architecture should define how empty values are represented.

Possible representations include:

```text
Empty string

Undefined

Null

Empty array
```

Each field type should have a consistent convention.

Components should not alternate unpredictably between `null`, `undefined`, and empty strings.

---

# Controlled Form Values

The form system should remain the primary owner of field values during editing.

Avoid duplicating every field value in local component state.

Additional local state is appropriate only for presentation concerns not represented by the submitted value.

---

# Derived Form State

Derived values should be calculated from form state rather than copied into separately synchronized fields where practical.

Examples:

```text
Full name preview

Calculated total

Character count

Eligibility message
```

A derived value should become stored form state only when the user must edit or submit it independently.

---

# Validation Architecture

Validation should occur through reusable schemas and clearly separated validation layers.

Recommended layers:

1. Native structural constraints
2. Shared client schema validation
3. Workflow-specific client validation
4. Backend validation
5. Business-rule validation

The backend remains authoritative.

---

# Schema Ownership

Reusable validation schemas belong under:

```text
schemas/
    global/
    identity/
    workspace/
    billing/
```

Schemas should follow backend-aligned module ownership.

A form component should import the schema it needs rather than redefine the same rules locally.

---

# Schema Responsibilities

Schemas may define:

* Required values
* String length
* Number bounds
* Format constraints
* Enum values
* Nested object shape
* Array requirements
* Cross-field constraints
* File metadata requirements

Schemas should remain independent of presentation.

---

# Validation Types

Validation may be:

```text
Field-level

Form-level

Cross-field

Step-level

Server-side

Asynchronous
```

The correct validation type should be chosen based on where the rule can be evaluated reliably.

---

# Field-Level Validation

Field-level validation is suitable for rules such as:

* Required value
* Maximum length
* Email format
* Positive number
* Allowed characters

Field-level validation should not make independent backend requests on every keystroke unless the workflow explicitly requires it.

---

# Cross-Field Validation

Cross-field validation is required when validity depends on more than one value.

Examples:

```text
Password confirmation

Start date before end date

Minimum less than maximum

Conditional required field

At least one contact method
```

These rules should remain in the shared schema or form-level validation logic.

---

# Conditional Validation

Conditional fields should define both:

* When the field is visible or active
* When the field is required or included

Hidden fields should not accidentally submit stale values unless the backend contract expects them.

The form should explicitly clear, preserve, or ignore inactive field values.

---

# Asynchronous Validation

Asynchronous validation may be used for checks such as:

* Username availability
* Unique workspace code
* Invitation eligibility
* External identifier validation

It should:

* Be debounced where appropriate.
* Cancel obsolete requests.
* Distinguish pending from invalid.
* Avoid blocking unrelated fields.
* Be confirmed again by the backend during submission.

---

# Validation Timing

Forms should choose deliberate validation timing.

Possible triggers include:

```text
On submit

On blur

On change

After first submit attempt
```

Immediate validation on every keystroke may create distracting feedback.

A common policy is:

```text
Validate on submit

Then revalidate invalid fields during correction
```

---

# Client Validation

Client-side validation exists to improve speed and usability.

It should:

* Catch obvious input problems.
* Use the same documented constraints as the backend where possible.
* Provide localized feedback.
* Prevent unnecessary requests.
* Never be treated as a security boundary.

---

# Backend Validation

The backend remains responsible for:

* Authorization
* Business rules
* Uniqueness
* Current resource state
* Security checks
* File verification
* Cross-user conflicts

A form must handle backend rejection even after client validation succeeds.

---

# Validation Error Shape

Form-compatible errors should support:

```typescript
interface FormErrors {
  fields?: Record<string, string>;
  form?: string;
}
```

Nested fields may require a typed path representation.

Error values should preferably be stable message keys or normalized application error codes.

---

# Server Error Mapping

Backend errors should be mapped to:

* Specific fields
* A form-level message
* A global workflow error
* Session or authorization handling

Example:

```text
EMAIL_ALREADY_EXISTS
        │
        ▼
email field error
```

Another example:

```text
WORKSPACE_LIMIT_REACHED
        │
        ▼
form-level actionable error
```

---

# Unknown Server Errors

Unknown failures should not be assigned to an arbitrary field.

They should appear as a form-level or workflow-level error with a safe fallback message and retry guidance where appropriate.

Diagnostic identifiers may be shown separately if useful for support.

---

# Field Error Presentation

Field errors should:

* Appear near the affected field.
* Be programmatically associated with the control.
* Use readable, localized text.
* Persist until corrected or revalidated.
* Avoid relying on color alone.

The control should expose an invalid semantic state.

---

# Form-Level Error Presentation

Form-level errors are appropriate when:

* No individual field is solely responsible.
* The backend rejected the workflow.
* The resource changed concurrently.
* Submission failed due to network or server conditions.
* The user lacks permission.

Form-level feedback should remain visible and actionable.

---

# Error Summary

Long or complex forms may include an error summary after unsuccessful submission.

The summary should:

* State that the form contains errors.
* List affected fields.
* Link or move focus to each invalid field.
* Avoid duplicating overly long messages.

This is especially useful when invalid fields may be outside the current viewport.

---

# Focus After Validation Failure

After a failed submission, focus should normally move to:

1. The error summary, if present
2. Otherwise, the first invalid field

Focus movement should not occur repeatedly during ordinary field correction.

---

# Submission Architecture

A form should submit through a typed mutation hook or approved workflow service.

```text
Form Values

↓

Request Mapping

↓

Mutation Hook

↓

Module Service

↓

Backend
```

Form components must not construct endpoint URLs or authorization headers.

---

# Submission States

A form should distinguish:

```text
Idle

Validating

Submitting

Succeeded

Failed
```

Some implementations may combine validation and submitting internally, but user-facing behavior should remain predictable.

---

# Submission Guarding

While a submission is pending, the form should prevent harmful duplicate actions.

Possible behavior includes:

* Disable the submit action
* Show pending state
* Retain entered values
* Permit safe cancellation where supported
* Keep non-conflicting fields readable

The entire interface should not be disabled automatically unless required.

---

# Duplicate Submission Prevention

Duplicate submission protection should exist at multiple layers where appropriate:

```text
UI pending guard

Mutation lifecycle guard

Idempotency key

Backend duplicate protection
```

UI disabling alone is insufficient for high-impact operations.

---

# Request Mapping

Mapping from form values to request payloads should occur in one stable location.

Suitable locations include:

* Form submission function
* Module mapper
* Module service

The mapping should handle:

* Empty strings
* Optional fields
* Dates
* Numeric conversion
* Nested objects
* Removed values
* File references

---

# Submission Success

A successful submission should define:

* Cache update or invalidation
* Success feedback
* Form reset or preservation
* Navigation
* Dialog closure
* Focus restoration
* Draft cleanup

These behaviors should be coordinated rather than triggered by unrelated effects.

---

# Reset Behavior

Forms should support explicit reset strategies.

Possible strategies include:

```text
Reset to original values

Reset to empty defaults

Reset to newly saved values

Preserve values
```

After an edit succeeds, resetting to the newly persisted values usually provides the clearest dirty-state behavior.

---

# Submission Failure

After a recoverable failure:

* User values should normally remain intact.
* Field errors should be mapped where possible.
* The submit action should become available again.
* File state should follow workflow-specific recovery rules.
* The user should receive a clear next action.

Forms should not clear user input after failure unless security requires it.

---

# Sensitive Fields

Sensitive fields may require special handling.

Examples:

* Passwords
* Verification codes
* Recovery codes
* Payment details

Rules may include:

* Clear after failed submission
* Disable browser persistence
* Avoid analytics capture
* Avoid logging
* Limit visibility toggles
* Use specialized external payment components

---

# Dirty State

A form is dirty when editable values differ meaningfully from their current baseline.

Dirty comparison should account for normalized values.

Examples:

```text
Whitespace normalization

Empty string versus null

Sorted arrays where order is irrelevant

Date formatting
```

Naive object comparison may produce incorrect results.

---

# Unsaved Changes

Forms with meaningful unsaved work may warn before:

* Route navigation
* Dialog closure
* Browser refresh
* Workspace switching
* Logout

Warnings should be used only when data loss would be significant.

Frequent trivial forms should not create unnecessary interruption.

---

# Navigation Blocking

Navigation blocking should:

* Activate only when the form is meaningfully dirty.
* Disable after successful submission or explicit discard.
* Support internal routing.
* Support browser page exit where possible.
* Avoid trapping users after unrecoverable errors.

The warning message should remain concise and localized.

---

# Draft Recovery

Draft persistence may be appropriate for:

* Long content forms
* Multi-step applications
* Complex reports
* Offline-capable workflows

It is generally inappropriate for:

* Passwords
* Payment details
* Verification codes
* Short forms
* Sensitive personal information without explicit policy

---

# Draft Ownership

A recoverable draft should include enough context to avoid applying it to the wrong resource.

Possible identifiers include:

```text
Form type

User context

Workspace context

Resource ID

Schema version

Last updated time
```

Draft storage rules belong to `performance-pwa-and-client-storage.md`.

---

# Draft Versioning

Persisted drafts should have a schema version.

When the form structure changes, the application should:

* Migrate supported drafts
* Reject incompatible drafts safely
* Avoid submitting malformed old data
* Explain when recovery is unavailable

---

# Multi-Step Forms

Multi-step forms should separate:

* Shared workflow state
* Step-specific fields
* Step validation
* Navigation
* Final submission

Example:

```text
Workflow Coordinator
    │
    ├── Step 1
    ├── Step 2
    ├── Step 3
    └── Review
```

Steps should not independently submit the final resource unless the backend workflow is explicitly incremental.

---

# Step Validation

Advancing to the next step should validate fields required for the current step.

Final submission should validate the complete form again.

A later step should not assume earlier data is still valid if dependencies have changed.

---

# Step Navigation

Users may be allowed to return to earlier steps without losing entered values.

Skipping steps should only be allowed when business rules permit it.

Step state should be reflected in the URL only when refresh, sharing, or navigation history benefits the workflow.

---

# Incremental Backend Workflows

Some multi-step workflows may save progress to the backend.

In this case, distinguish:

```text
Local draft state

Backend draft resource

Final submitted resource
```

The backend should expose explicit draft and finalization contracts.

---

# Dynamic Field Collections

Forms may contain dynamic arrays such as:

* Contacts
* Team members
* Addresses
* Line items
* Attachments

Each entry should have a stable client key independent of array position.

Index-based identity can cause incorrect error and focus behavior when items are reordered or removed.

---

# Adding and Removing Fields

Dynamic collections should define:

* Minimum items
* Maximum items
* Empty collection behavior
* Removal confirmation where needed
* Error mapping
* Reordering behavior

Removing an entry should also remove stale validation and temporary file state associated with it.

---

# Date and Time Inputs

Date and time fields should distinguish:

* Date-only values
* Local date-time values
* Absolute timestamps
* Time zones

Form display formatting should not be confused with API serialization.

The request mapping layer should convert values according to the backend contract.

---

# Numeric Inputs

Numeric fields should account for:

* Localized decimal separators
* Thousands separators
* Negative values
* Minimum and maximum
* Precision
* Empty value
* Currency units

The editable string and parsed numeric value may need separate treatment.

---

# Currency Inputs

Currency forms should define:

* Currency code
* Minor-unit precision
* Display formatting
* Input parsing
* Rounding behavior
* Backend representation

Floating-point arithmetic should not be used carelessly for financial values.

---

# Checkbox and Switch Semantics

Checkboxes and switches should not be treated as visually interchangeable.

Use:

* Checkbox for selection or agreement
* Switch for an immediate on/off setting

A switch should not be used when activation requires a separate submit step unless the interaction clearly communicates deferred saving.

---

# Read-Only and Disabled Fields

Read-only means the value can be focused and reviewed but not edited.

Disabled means the control is unavailable and may be excluded from native form submission.

The architecture should choose deliberately based on workflow behavior.

---

# Hidden Fields

Hidden values should not be trusted because they exist in the DOM.

Backend authorization and validation remain required.

Sensitive identifiers should not be exposed unless the frontend genuinely needs them.

---

# File Handling Architecture

File handling should be treated as a dedicated workflow rather than a normal text field.

The workflow may include:

```text
Select

↓

Validate

↓

Preview or Queue

↓

Authorize Upload

↓

Transfer

↓

Confirm

↓

Attach to Resource
```

Not every file workflow requires every stage.

---

# File State Model

Each selected file may require state such as:

```typescript
interface FileItemState {
  clientId: string;
  file: File;
  status:
    | "selected"
    | "validating"
    | "ready"
    | "uploading"
    | "uploaded"
    | "failed"
    | "cancelled";
  progress?: number;
  errorKey?: string;
  remoteReference?: string;
}
```

Browser `File` objects should remain temporary and should not be treated as serializable persistent state.

---

# File Selection

File selection may occur through:

* Native file picker
* Drag and drop
* Camera or media chooser
* Future mobile platform picker

All selection methods should feed the same validation and upload pipeline.

---

# File Input Accessibility

File controls should provide:

* A visible label
* Accepted file guidance
* Size limits
* Multiple-file guidance
* Selected file list
* Removal actions
* Accessible error messages
* Keyboard-operable dropzone alternatives

Drag and drop must never be the only selection method.

---

# Accepted File Types

Allowed file types should be based on explicit workflow policy.

Validation may consider:

* MIME type
* File extension
* File signature
* Backend scanning result

Frontend MIME and extension checks improve usability but are not sufficient security validation.

---

# File Size Validation

Size limits should be checked before upload where possible.

Messages should clearly state:

* Which file is invalid
* The maximum size
* The detected size where useful
* Whether another file may be selected

The backend must enforce the same or stricter limit.

---

# File Count Validation

Multi-file workflows should define:

* Maximum number of files
* Total combined size
* Per-file size
* Duplicate behavior
* Replacement behavior

The UI should prevent or clearly report excess selection.

---

# Duplicate Files

Duplicate detection may use:

* Name
* Size
* Last-modified time
* Optional content hash

File names alone are not reliable identifiers.

The workflow should define whether duplicates are rejected, replaced, or allowed.

---

# File Preview

Preview may be appropriate for:

* Images
* PDF cover thumbnails
* Selected document metadata
* Audio or video metadata

Previews should:

* Release generated object URLs when no longer needed.
* Avoid loading very large files unnecessarily.
* Provide fallback presentation.
* Never imply that client preview equals server acceptance.

---

# Image Validation

Image workflows may validate:

* File type
* File size
* Dimensions
* Aspect ratio
* Orientation
* Animation policy

Image transformation should only occur when explicitly required.

The original file should not be silently modified without clear product intent.

---

# Document Validation

Document workflows may validate metadata such as:

* Extension
* Size
* Page count where available
* Encryption status where detectable
* Required document category

Deep content validation normally belongs to backend processing.

---

# Upload Strategies

Supported upload strategies may include:

1. Direct multipart upload
2. Presigned object-storage upload
3. Chunked or resumable upload
4. Background upload queue

Each workflow should use one documented strategy.

---

# Direct Upload

A direct upload sends the file to the backend API.

```text
Frontend

↓

Backend

↓

Storage
```

This may be suitable for small files and simple workflows.

The request should support cancellation and appropriate timeout behavior.

---

# Presigned Upload

A presigned workflow separates upload authorization from file transfer.

```text
Request Upload Authorization

↓

Upload to Storage

↓

Confirm with Backend
```

The backend confirmation step is required before the file is treated as an application resource.

---

# Presigned Upload Contract

The authorization response may include:

* Upload URL
* Required headers
* Expiration
* Object key
* Upload identifier
* Size constraints
* Content type constraints

The frontend must treat these values as temporary and operation-specific.

---

# Upload Confirmation

After storage transfer succeeds, the frontend should call the backend to confirm the upload.

The backend may then:

* Verify ownership
* Verify metadata
* Trigger scanning
* Create a file resource
* Attach it to a workflow
* Return processing state

A successful storage response alone does not mean the application has accepted the file.

---

# Upload Progress

Progress should be shown when the transport provides meaningful measurements and the upload duration justifies it.

Possible states include:

```text
Preparing

Uploading 45%

Processing

Complete
```

Do not display fake precision when actual upload progress is unavailable.

---

# Processing State

Some uploads require backend processing after transfer.

Examples:

* Virus scanning
* Image transformation
* Text extraction
* Format validation
* Document classification

The frontend should distinguish transfer completion from processing completion.

---

# Upload Cancellation

Users should be able to cancel long-running uploads where supported.

Cancellation should:

* Abort the active transfer.
* Update the file state.
* Release temporary resources.
* Notify the backend when cleanup is required.
* Allow reselection or retry where appropriate.

Cancellation should not appear as an unexpected error.

---

# Upload Retry

Retry may be allowed for:

* Temporary network failure
* Expired presigned URL after reauthorization
* Retryable storage failure

Retry should not automatically repeat a file that the backend rejected for policy, type, size, or security reasons.

---

# Resumable Uploads

Large-file workflows may use resumable upload protocols.

They should define:

* Chunk size
* Resume identifier
* Progress calculation
* Expiration
* Retry policy
* Integrity verification
* Cancellation cleanup

Resumable support should only be introduced where file size and network conditions justify the complexity.

---

# Offline Upload Behavior

File uploads generally require connectivity.

Offline behavior may include:

* Preserve safe metadata
* Retain user selection while the page remains open
* Queue an explicitly supported upload
* Ask the user to retry after reconnecting

Browser `File` objects may not survive reload or application restart reliably.

The UI must not promise persistence that the platform cannot guarantee.

---

# File Removal

Removing a file may mean:

```text
Remove local selection

Cancel upload

Delete temporary remote upload

Detach existing file

Delete persisted file
```

These actions have different backend and confirmation requirements.

The UI should use precise labels.

---

# Existing Files in Edit Forms

An edit form may contain both:

* Already persisted files
* Newly selected local files

These should have separate state and operations.

Example:

```text
Existing attachment
    → detach or delete mutation

New attachment
    → upload workflow
```

A failed new upload should not affect existing persisted attachments.

---

# File Replacement

Replacement should be modeled explicitly.

A safe sequence may be:

```text
Upload New File

↓

Confirm New File

↓

Update Resource Reference

↓

Delete Old File if Policy Allows
```

Deleting the old file before the new one succeeds may create avoidable data loss.

---

# File Download

File downloads should use an authorized backend or temporary URL workflow.

The frontend should support:

* Suggested filename
* Content type
* Expired link recovery
* Download failure feedback
* Large-file handling
* Mobile and PWA behavior

Secrets or long-lived credentials must not be embedded in download URLs.

---

# File Security

The frontend must assume selected files are untrusted.

Security requirements include:

* Backend file validation
* Malware or content scanning where required
* Authorized file access
* Safe content-disposition behavior
* Sanitized preview mechanisms
* No execution of uploaded content
* No trust in extension alone

Client validation is a usability layer, not a security boundary.

---

# File Privacy

The interface should communicate when files:

* Are uploaded immediately
* Remain local until form submission
* Are shared with other users
* Are retained after cancellation
* Are processed by external services

Sensitive file names should not be included unnecessarily in analytics or logs.

---

# Form and Upload Coordination

Forms with file uploads should define whether files are:

1. Uploaded before form submission
2. Uploaded during form submission
3. Uploaded after the main resource is created
4. Managed through a temporary draft resource

The selected strategy should remain consistent for the workflow.

---

# Upload-Before-Submit

This pattern may be useful when the final request requires file references.

```text
Upload Files

↓

Receive References

↓

Submit Form
```

The architecture must clean up abandoned temporary uploads.

---

# Submit-Before-Upload

This pattern may be useful when files require an existing resource identifier.

```text
Create Resource

↓

Upload Files

↓

Attach Files
```

The workflow should define recovery when resource creation succeeds but file upload fails.

---

# Transaction Expectations

Frontend workflows should not imply atomicity where the backend does not provide it.

For multi-operation forms, the UI should distinguish:

* Fully completed
* Partially completed
* Recoverable pending work
* Failed with rollback
* Failed without rollback

Backend workflow design should minimize inconsistent partial states.

---

# Confirmation and Destructive Actions

Forms that perform destructive or high-impact actions may require confirmation.

Examples:

* Delete resource
* Remove member
* Cancel subscription
* Replace official document
* Discard long unsaved work

Confirmation should describe the actual consequence rather than use generic wording.

---

# Accessibility Requirements

Forms must support:

* Semantic labels
* Keyboard navigation
* Clear focus order
* Accessible descriptions
* Error association
* Error summaries
* Required-field communication
* Status announcements
* Sufficient touch targets

Placeholder text must not replace a label.

---

# Required Fields

Required status should be communicated through:

* Native or ARIA semantics
* Visible text or symbol
* Instructions explaining the convention

Color alone is insufficient.

---

# Help Text

Help text should be associated with the corresponding control.

It should explain:

* Expected format
* Constraints
* Consequences
* Optional guidance

Help text should not repeat the label unnecessarily.

---

# Status Announcements

Screen readers should receive meaningful updates for:

* Validation completion
* Submission pending
* Submission success
* Submission failure
* Upload progress when useful
* Upload completion
* File removal

Announcements should avoid excessive repetition.

---

# Internationalization

All form content should use translation resources.

This includes:

* Labels
* Help text
* Placeholders
* Validation messages
* Submission status
* File constraints
* Confirmation dialogs
* Success and failure feedback

Schemas should not embed user-facing English strings directly.

---

# Translation Keys

Validation may map stable rules to keys such as:

```text
validation.required

validation.email

validation.maxLength

validation.fileTooLarge

validation.unsupportedFileType
```

Dynamic values such as maximum length or file size should be passed as translation parameters.

---

# Text Expansion

Form layouts should tolerate:

* Longer translated labels
* Multi-line help text
* Multi-line errors
* Longer button labels
* Different plural forms

Fixed-width controls should not clip translated content.

---

# Localized Input

Some fields may accept localized display input while submitting normalized values.

Examples:

* Dates
* Numbers
* Currency
* Phone numbers

Parsing and formatting rules should remain centralized and tested for both supported languages.

---

# Security Requirements

Forms must:

* Avoid rendering unsanitized content.
* Avoid logging sensitive values.
* Avoid exposing secrets in URLs.
* Avoid relying on hidden or disabled controls for authorization.
* Respect CSRF and session policies.
* Use secure third-party payment or identity components where required.
* Treat all backend validation and authorization as authoritative.

---

# Analytics

Analytics should record workflow outcomes without capturing sensitive field content.

Suitable events may include:

```text
form_started

form_submitted

form_succeeded

form_failed

upload_started

upload_completed

upload_failed
```

Events may include:

* Form identifier
* Module
* Error category
* File category
* Duration

They should not include passwords, full free-text content, private filenames, or uploaded file contents.

---

# Observability

Technical telemetry may include:

* Validation failure rate
* Submission duration
* API error category
* Upload duration
* Upload cancellation
* Upload processing failure
* Draft recovery failure

Telemetry should support diagnostics without exposing user-entered sensitive data.

---

# Folder Structure

Recommended placement:

```text
src/
    components/
        global/
            controls/
            forms/
            file-handling/

        identity/
        workspace/
        billing/

    hooks/
        global/
            useUnsavedChanges.ts
            useFileUpload.ts

        identity/
        workspace/
        billing/

    schemas/
        global/
            fileSchema.ts

        identity/
        workspace/
        billing/

    types/
        global/
            forms.ts
            files.ts

        identity/
        workspace/
        billing/

    services/
        global/
            uploads/

        identity/
        workspace/
        billing/

    styles/
        global/
            forms/
            file-handling/

        identity/
        workspace/
        billing/
```

This preserves responsibility-first organization.

---

# Shared Form Infrastructure

Global form infrastructure may include:

```text
FormField

FormSection

FormErrorSummary

RequiredIndicator

UnsavedChangesDialog

FilePicker

FileList

UploadProgress

UploadError
```

Module-specific forms should compose this infrastructure rather than recreate it.

---

# Naming Conventions

Form components should describe their workflow.

Prefer:

```text
CreateWorkspaceForm

EditProfileForm

InviteMemberForm
```

Avoid:

```text
WorkspaceFields

GenericForm

FormComponent
```

Schemas should use names such as:

```text
createWorkspaceSchema

inviteMemberSchema

profileFormSchema
```

---

# Public Contracts

Reusable form components should expose stable typed props.

Example:

```typescript
interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  children: React.ReactNode;
}
```

Public contracts should not expose private form-library internals unnecessarily.

---

# Form-Library Boundaries

The project may use an approved form library, but module components should depend on TEED conventions rather than ad hoc library usage.

Shared wrappers or hooks should standardize:

* Schema integration
* Error mapping
* Submission status
* Field registration
* Accessibility
* Reset behavior

The architecture should allow library replacement without rewriting every primitive control.

---

# Third-Party File Components

Third-party upload or dropzone libraries should be wrapped when used.

The TEED wrapper should own:

* Accessible behavior
* Accepted types
* Styling
* File state mapping
* Progress presentation
* Error handling
* Mobile fallback

Module pages should not consume external library APIs directly.

---

# Performance

Forms should avoid unnecessary rerenders.

Strategies include:

* Field-level subscriptions
* Focused context values
* Deferred expensive calculations
* Debounced asynchronous validation
* Lazy loading heavy editors
* Avoiding full-form serialization on every keystroke

Optimization should be based on measurement.

---

# Large Forms

Large forms may require:

* Sectioning
* Progressive disclosure
* Step workflows
* Virtualized supporting lists
* Draft recovery
* Error summaries
* Sticky actions

All fields should remain discoverable and keyboard-accessible.

---

# Rich Text Editors

Rich text forms require dedicated treatment.

They should define:

* Sanitization
* Allowed formatting
* Character or content limits
* Pasted content handling
* Keyboard accessibility
* Mobile behavior
* Autosave policy
* Backend storage format

Rich text HTML must not be trusted merely because it came from an editor component.

---

# Testing Requirements

## Schema Tests

Test:

* Required fields
* Boundaries
* Formats
* Cross-field rules
* Conditional rules
* File constraints
* Localized parsing
* Valid and invalid examples

## Form Component Tests

Test:

* Initial values
* Field interaction
* Validation timing
* Error presentation
* Submission pending state
* Success handling
* Failure preservation
* Reset behavior
* Dirty-state behavior

## Accessibility Tests

Test:

* Label association
* Description association
* Error association
* Keyboard order
* Focus after failed submission
* Error summary navigation
* Screen-reader status updates
* File-picker alternatives

## Integration Tests

Test:

* Form-to-mutation mapping
* Server field errors
* Form-level errors
* Session expiration
* Authorization failure
* Cache updates
* Navigation blocking
* Draft restoration
* Multi-step state

## File Tests

Test:

* Type rejection
* Size rejection
* File-count limits
* Duplicate detection
* Progress updates
* Cancellation
* Retry
* Presigned upload
* Backend confirmation
* Processing failure
* Removal and replacement

## End-to-End Tests

Test:

* Simple form success
* Client validation failure
* Backend validation failure
* Network failure and retry
* Duplicate-submit prevention
* Unsaved-changes warning
* Draft recovery
* Multi-step completion
* File upload and cancellation
* Offline file behavior
* Bilingual form layouts
* Mobile and installed PWA interaction

---

# Acceptance Criteria

The forms, validation, and file-handling architecture is complete when:

* Form state is separate from server-state caching.
* Reusable validation rules live in backend-aligned schemas.
* Client and backend validation have distinct responsibilities.
* Field, form, and global errors are mapped consistently.
* Submission lifecycle behavior is explicit.
* Duplicate submissions are prevented appropriately.
* Failed submissions preserve recoverable user input.
* Dirty state and unsaved-change behavior are defined.
* Draft persistence is restricted to approved workflows.
* Multi-step and dynamic forms use stable ownership and validation rules.
* File workflows distinguish selection, validation, transfer, processing, and confirmation.
* Upload cancellation, retry, removal, and replacement are explicitly handled.
* Form and file interfaces are accessible, bilingual, responsive, and touch-friendly.
* Sensitive values and file metadata are excluded from logs and analytics.
* Tests cover validation, lifecycle, accessibility, file transfer, localization, and recovery.

---

# Architecture Rules

1. Form state must remain separate from server-state caches and general-purpose global stores.
2. Forms must use shared, backend-aligned validation schemas rather than duplicating business rules in components.
3. Client validation must improve usability but must never replace backend validation, authorization, or security checks.
4. Field errors, form errors, workflow errors, and session errors must remain distinct.
5. Form values must be mapped explicitly into typed API request contracts.
6. Pending submissions must prevent harmful duplicates while preserving readable context.
7. Recoverable submission failures must preserve user-entered values and expose a clear retry or correction path.
8. Dirty-state, reset, discard, navigation-blocking, and successful-save behavior must be documented for every significant form.
9. Draft persistence must be explicit, versioned, context-scoped, and prohibited for sensitive fields unless approved.
10. Multi-step forms must centralize workflow state and revalidate the complete submission before final completion.
11. File selection, validation, upload, processing, confirmation, attachment, removal, and deletion must be modeled as distinct states and operations.
12. Frontend file checks must never be treated as sufficient security validation; backend verification remains authoritative.
13. Presigned uploads must be confirmed with the backend before files are treated as accepted application resources.
14. Drag-and-drop, progress, and preview interfaces must have accessible keyboard and non-visual alternatives.
15. Forms and file workflows must support bilingual text expansion, localized input, responsive layouts, PWA constraints, and future platform-specific adapters.
16. Sensitive form values, uploaded contents, private filenames, credentials, and payment data must never appear in logs or analytics.
17. Form primitives, schemas, hooks, services, types, and styles must remain in their responsibility-first folders with backend-aligned module subfolders.
18. Every significant form and file workflow must be typed, accessible, testable, recoverable, and explicit enough for reliable developer and AI-assisted implementation.
