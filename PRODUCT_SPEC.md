# Build HomeTeam: A Shared Household Task Coordination PWA

You are building a production-quality version 1 of an application called **HomeTeam**.

HomeTeam helps people coordinate household responsibilities without forgetting tasks or accidentally performing the same task twice.

Examples include:

* Giving medicine to a child or pet
* Feeding the dog
* Letting the dog outside
* Rotating who puts the children to bed
* Completing household chores
* Coordinating one-time event tasks
* Assigning responsibilities to grandparents or caregivers

The app must work well as an installable iPhone Progressive Web App, deploy to GitHub Pages, and use Supabase as its free backend.

The intended tagline is:

**Tasks. Together. Done right.**

Use the provided HomeTeam logo and wireframes as design inspiration. Do not attempt to reproduce image-generation mistakes or illegible text exactly. Build a polished, usable interface based on the product requirements below.

---

# 1. Your role

Act as the lead engineer and product-minded architect for this application.

You are responsible for:

* Frontend architecture
* Database design
* Supabase migrations
* Row Level Security
* Authentication
* Realtime synchronization
* Transactional task operations
* Push notifications
* PWA configuration
* GitHub Pages deployment
* Automated tests
* Documentation
* Accessibility
* Mobile usability

Do not build only a visual prototype.

The result must have a real database model, real authentication, real authorization, real task behavior, and a path to production deployment.

---

# 2. Working rules

Follow these rules throughout implementation:

1. Inspect the existing repository before changing anything.
2. Preserve unrelated existing work.
3. Use current stable library versions.
4. Keep TypeScript strict mode enabled.
5. Do not use `any` unless unavoidable and documented.
6. Keep business logic outside React presentation components.
7. Use database migrations for all schema changes.
8. Enforce authorization in the database, not only in the interface.
9. Perform critical lifecycle changes through transactional PostgreSQL functions.
10. Do not expose privileged credentials in frontend code.
11. Add tests alongside important business logic.
12. Use realistic loading, empty, error, offline, and conflict states.
13. Do not silently mock unfinished functionality.
14. Clearly document anything that cannot be completed without external credentials.
15. Prefer maintainable, understandable code over clever abstractions.
16. Do not stop after scaffolding. Implement the application milestone by milestone.
17. Run linting, type checking, tests, and the production build before considering the work complete.

Begin by creating or updating an `IMPLEMENTATION_PLAN.md` file that maps these requirements to concrete milestones and files. Then implement the plan.

Do not ask broad product questions. Use the defaults in this prompt unless a true technical blocker exists.

---

# 3. Required technology

Use this general stack unless the repository already contains a compatible equivalent:

## Frontend

* React
* TypeScript
* Vite
* React Router using a GitHub Pages-safe strategy
* TanStack Query
* Supabase JavaScript client
* React Hook Form
* Zod
* Tailwind CSS
* Date utilities with explicit timezone support
* `vite-plugin-pwa` or an equivalent maintained PWA integration

Use hash routing unless the GitHub Pages deployment is explicitly configured to support another reliable routing strategy.

## Backend

Use Supabase for:

* PostgreSQL
* Authentication
* Row Level Security
* Realtime updates
* Edge Functions
* Scheduled processing
* Backend secrets

## Testing

* Vitest
* React Testing Library
* Playwright
* SQL or integration tests for database functions and RLS policies

## Deployment

* GitHub Actions
* GitHub Pages
* Supabase migrations and Edge Function deployment instructions

---

# 4. Repository structure

Use a clear structure similar to:

```text
/
├── .github/
│   └── workflows/
│       └── deploy-pages.yml
├── public/
│   ├── icons/
│   └── manifest assets
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── households/
│   │   ├── tasks/
│   │   ├── occurrences/
│   │   ├── history/
│   │   └── notifications/
│   ├── hooks/
│   ├── lib/
│   ├── routes/
│   ├── services/
│   ├── styles/
│   ├── types/
│   └── test/
├── supabase/
│   ├── functions/
│   │   ├── process-notifications/
│   │   ├── scheduled-task-processor/
│   │   └── send-invitation/
│   ├── migrations/
│   ├── tests/
│   └── seed.sql
├── e2e/
├── .env.example
├── IMPLEMENTATION_PLAN.md
└── README.md
```

Adjust this structure when necessary, but keep domain logic organized by feature.

---

# 5. Product goals

HomeTeam version 1 must:

1. Give each scheduled task occurrence one authoritative shared status.
2. Prevent two people from unknowingly completing the same task.
3. Support one-time and recurring tasks.
4. Make today’s responsibilities immediately visible.
5. Record both the assigned person and the person who actually completed a task.
6. Support fixed assignments, unassigned tasks, and round-robin assignments.
7. Let users belong to multiple households.
8. Support limited guest access for grandparents and caregivers.
9. Synchronize updates between devices in real time.
10. Deliver configurable push notifications.
11. Preserve an auditable activity history.
12. Operate online-only in version 1.
13. Remain usable on the free backend tier at normal family scale.

---

# 6. Version 1 non-goals

Do not expand version 1 to include:

* Subtasks
* Project hierarchies
* Comments
* File attachments
* Photos
* Medicine-specific structured fields
* Task-specific notification preferences
* Task priority levels
* Sign in with Apple
* Offline task mutations
* Advanced analytics
* Native iOS or Android apps
* Complex monthly recurrence builders
* AI features

The task description can contain medicine dosage, instructions, child names, pet names, or other contextual information.

Architect the app so these features could be added later, but do not delay version 1 to implement them.

---

# 7. Branding and design direction

The product name is **HomeTeam**.

The interface should feel:

* Friendly
* Calm
* Trustworthy
* Family-oriented
* Modern
* Easy to scan quickly
* Appropriate for repeated daily use
* More like a polished consumer app than enterprise task software

Use the supplied wireframes as directional inspiration.

## Suggested visual language

* Light neutral background
* White cards
* Soft shadows or subtle borders
* Rounded corners
* Blue or indigo primary color
* Green for completed
* Red for overdue
* Orange for due now
* Muted blue or purple for snoozed
* Gray for cancelled or skipped
* Large touch targets
* Clear hierarchy
* Minimal clutter

Do not depend on color alone to communicate status. Include icons and text labels.

## Mobile navigation

Use a bottom navigation bar with:

* Today
* Upcoming
* Tasks
* History
* More

Place Households, Members, Categories, Notification Settings, Profile, and PWA installation help under More.

Today must be the default authenticated route.

The layout should also work on tablets and desktop browsers, but iPhone usability is the primary target.

---

# 8. Authentication

Use Supabase passwordless email authentication.

Prefer a six-digit email one-time password flow.

Version 1 authentication must support:

* Requesting an email code
* Verifying an email code
* Persistent sessions
* Signing out
* Handling expired or invalid codes
* Returning the user to the intended invitation or route after login

Do not implement Sign in with Apple in version 1.

Create an `.env.example` with at least:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_APP_BASE_PATH=
VITE_VAPID_PUBLIC_KEY=
```

Privileged backend values must be configured only as Supabase secrets, including:

```text
SUPABASE_SERVICE_ROLE_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

Never place the service-role key or VAPID private key in frontend files, GitHub Actions logs, or committed configuration.

---

# 8A. Public-preview access approval and platform administration

The version 1 deployment may be publicly reachable, but it must operate as an administrator-approved preview.

Supabase passwordless authentication may create a valid authenticated session for a new email address. Authentication alone must not grant access to HomeTeam product data or features.

Every authenticated user has a platform access state:

* Pending
* Approved
* Rejected
* Suspended

Only an **Approved** user may:

* Create or join a household
* Accept a household invitation
* Read household, membership, category, task, occurrence, history, notification, or subscription data
* Open authorized Realtime subscriptions
* Call HomeTeam product mutation functions

A Pending, Rejected, or Suspended user may access only:

* Their own minimum profile identity
* Their own platform access status
* A clear pending, rejected, or suspended access screen
* Sign out

Do not rely only on a frontend route guard. Enforce the Approved prerequisite in Row Level Security helpers and every product security-definer function.

## Platform administrator

Platform administrator is an application-wide preview-management role. It is separate from the household roles **Full Member** and **Guest**; version 1 still has exactly those two household roles.

A platform administrator may:

* View pending access requests with the minimum identity needed to decide
* Approve a pending user
* Reject a pending user
* Suspend or restore an approved user
* View the append-only history of platform access decisions

Platform administrator status must not automatically:

* Add the administrator to a household
* Grant access to household tasks, descriptions, occurrences, history, members, or push subscriptions
* Bypass household Row Level Security

The initial administrator must be bootstrapped using the authenticated user UUID through a privileged migration or documented one-time administrative operation. Do not hard-code or guess an administrator email address in client code, migrations, or repository configuration.

Every access decision records:

* Target user
* Previous and new access state
* Administrator actor
* Decision timestamp
* Optional short administrative note

Access decision history is append-only. Users may read their own current access state but not other applicants. Only platform administrators may list or decide access requests.

When approval is revoked or suspended, the client must immediately stop Realtime subscriptions, clear protected query caches, and return to the access-status screen.

Household invitations do not bypass platform approval. An invited user may authenticate and retain the intended invitation route, but may accept the invitation only after a platform administrator approves them.

---

# 9. Households and memberships

A user may belong to multiple households.

Each household has:

* Name
* IANA timezone
* Creator
* Created timestamp
* Members
* Guests
* Categories
* Task series
* Task occurrences
* Activity history
* Soft-deletion status

The household timezone defaults to the detected timezone of the user creating the household.

All scheduling calculations use the household timezone.

A traveling user should still see task times in the household timezone. Make the timezone visible in task details when the device timezone differs.

## Roles

Support exactly two roles in version 1:

* Full member
* Guest

### Full member permissions

A full member may:

* View all household tasks
* Create tasks
* Edit tasks
* Delete tasks
* Assign tasks
* Claim unassigned tasks
* Complete any household task
* Complete a task assigned to another person
* Skip tasks
* Snooze tasks
* Reopen completed tasks
* Manage recurring series
* Manage categories
* Invite members and guests
* Remove members and guests
* View full household history
* Change household settings

All full members have equal authority.

### Guest permissions

A guest:

* Can see only occurrences explicitly assigned to them
* Can see overdue, current, and upcoming assigned occurrences
* Can complete an assigned occurrence
* Can snooze an assigned occurrence
* Can skip an assigned occurrence
* Can undo their own completion during the Undo period
* Can receive notifications about assigned occurrences

A guest cannot:

* See unassigned tasks
* See tasks assigned to another user
* Browse all household tasks
* Browse categories
* Create tasks
* Edit task definitions
* Edit schedules
* Claim tasks
* Reassign tasks
* View full household history
* Invite or remove people
* Change household settings
* Reopen a task after the Undo period

A guest may be assigned:

* One specific occurrence
* All future occurrences in a recurring series

Even when assigned a series, the guest must not gain access to unrelated tasks or other household activity.

Enforce guest restrictions through Row Level Security and transactional functions.

---

# 10. Invitations

Full members may invite people by email.

Invitation flow:

1. A full member enters an email address.
2. They select Full Member or Guest.
3. Create a time-limited invitation.
4. The recipient signs in using the invited email.
5. The recipient accepts the invitation.
6. The invitation becomes an active membership.
7. Expired, reused, revoked, or mismatched invitations fail safely.

Store only a cryptographic hash of any invitation token.

Include:

* Pending invitations
* Invitation expiration
* Invitation revocation
* Resending an invitation
* Prevention of duplicate active memberships
* Handling an invite for an existing user
* Handling an invite for a new user

---

# 11. Categories

Full members may create, rename, and soft-delete categories.

Examples:

* Kids
* Pets
* Medicine
* Cleaning
* Errands
* Home
* Events

A task may have zero or one category in version 1.

Deleting a category must not delete associated tasks. Existing tasks should become uncategorized.

Guests must not be able to browse the category list unless category information is needed to display one of their assigned occurrences.

---

# 12. Core task model

Separate reusable task definitions from actionable task occurrences.

## Task series

A task series contains:

* Household
* Title
* Optional description
* Optional category
* Recurrence configuration
* Assignment method
* Rotation roster
* Missed-task policy
* Confirmation requirement
* Optional end condition
* Active, paused, or deleted state
* Creator
* Created and updated timestamps

A one-time task may be represented as a series that generates one occurrence.

## Task occurrence

A task occurrence represents one actionable instance.

Each occurrence must contain:

* Household
* Series
* Original due start
* Original due end
* All-day status
* Assigned person
* Assignment source
* Whether assignment is manually locked
* Lifecycle state
* Snooze information
* Completion information
* Skip information
* Rotation override
* Optimistic concurrency version
* Created and updated timestamps
* Soft-deletion timestamp

Every scheduled instance must have one unique authoritative occurrence.

Use a database uniqueness constraint to prevent duplicate generated occurrences.

---

# 13. One-time tasks

A one-time task requires a due date.

The exact time is optional.

An all-day task:

* Appears in Today throughout its due date
* Becomes overdue at midnight after its due date
* Uses a sensible default notification time, such as 9:00 AM household time

A one-time task may be:

* Assigned to a full member
* Assigned to a guest
* Left unassigned

---

# 14. Recurring tasks

Version 1 must support:

## Calendar-based schedules

* Daily
* Selected weekdays
* One exact time per day
* Multiple exact times per day
* One flexible time window per day
* Multiple flexible windows per day
* All-day occurrences

Examples:

* Every day at 8:00 AM
* Monday, Wednesday, and Friday at 6:00 PM
* Daily at 8:00 AM, 2:00 PM, and 8:00 PM
* Daily between 5:00 PM and 7:00 PM
* Saturday, all day

## Completion-interval schedules

The next occurrence is scheduled relative to actual completion or skip time.

Examples:

* Eight hours after completion
* Three days after completion
* Six weeks after completion

Only one open occurrence should normally exist for a completion-interval series.

## End conditions

A recurring series may:

* Never end
* End on a date
* End after a specified number of occurrences

## Pausing

Allow a recurring series to be paused and resumed.

Pausing should stop generation of new future occurrences without deleting history.

---

# 15. Task assignment

Support three assignment modes.

## Fixed assignment

Every generated occurrence is assigned to the selected user unless manually overridden.

## Unassigned

Each occurrence begins unassigned.

Any full member may claim it.

Claiming changes the assignee and creates an audit event.

## Round-robin rotation

A full member selects an ordered roster of household participants.

Guests may be included.

Example:

```text
Chris
Kim
Chris
Kim
```

Each generated occurrence is assigned to the next eligible roster member.

Support:

* Adding rotation members
* Removing rotation members
* Reordering rotation members
* Temporarily skipping an unavailable member
* Manual assignment of one occurrence
* Locking a manually assigned occurrence
* Recalculating future unlocked occurrences when rotation changes

Do not rewrite completed or skipped historical occurrences.

---

# 16. Completing another person’s task

A full member may complete a task assigned to another person.

The app must record separately:

* Original assignee
* Actual completing user
* Completion timestamp

For a round-robin task, the actual completing person counts as having taken the turn by default.

Example:

* Chris is assigned bedtime.
* Kim completes bedtime.
* The next rotation advances from Kim.
* If the roster is Chris then Kim, the next assignment becomes Chris.

The completion interface must include a one-time control:

**Keep the original rotation**

When selected, the rotation advances from the original assignee instead of the actual completing person.

If the actual completing person is not part of the rotation roster, advance from the original assignee.

When rotation changes:

* Recalculate future automatically generated assignments
* Do not change manually locked assignments
* Do not rewrite completed or skipped occurrences
* Record the recalculation in history

---

# 17. Task lifecycle

Store authoritative lifecycle states such as:

* Open
* Completed
* Skipped
* Cancelled
* Deleted

Derive display states from lifecycle state and timestamps:

* Upcoming
* Due now
* Overdue
* Snoozed
* Completed
* Skipped
* Cancelled

## Exact-time occurrences

* Upcoming before the due time
* Due at the due time
* Overdue after the due time while open

## Flexible-window occurrences

* Upcoming before the window starts
* Due during the window
* Overdue after the window ends

For example, a task due between 5:00 PM and 7:00 PM becomes overdue after 7:00 PM.

## All-day occurrences

* Due during the selected calendar date
* Overdue at midnight after that date

Do not run database updates merely to change an occurrence from upcoming to due or due to overdue. Derive these states from timestamps.

---

# 18. Missed-task behavior

Support these per-series policies:

1. Keep every missed occurrence overdue
2. Automatically skip an old occurrence when the next occurrence begins
3. Keep only the newest occurrence and mark older open occurrences skipped

Default to:

**Keep every missed occurrence overdue**

For calendar schedules:

* Each occurrence remains separate
* Yesterday’s overdue task and today’s task can appear simultaneously
* Completing yesterday’s occurrence does not complete today’s occurrence
* Late completion does not move the calendar schedule

For completion-interval schedules:

* The next occurrence is based on actual completion time
* If skipped, the next occurrence is based on actual skip time
* Do not create a second simultaneous open occurrence under normal operation

Design the missed-policy implementation so policies can be refined later.

---

# 19. Snooze

Snooze is a shared occurrence-level action.

When an occurrence is snoozed:

* Preserve the original due time
* Store who snoozed it
* Store the snooze expiration
* Display the snooze to authorized household members in real time
* Suppress due and overdue notifications until snooze expiration
* Do not change recurrence
* Do not change rotation
* Do not erase overdue status permanently

Display wording such as:

```text
Originally due at 7:00 PM
Snoozed by Chris until 7:30 PM
```

A snooze may be applied by:

* The assignee
* The person who claimed the occurrence
* Any full member
* A guest assigned to the occurrence

Provide preset options:

* 10 minutes
* 30 minutes
* 1 hour
* Custom time

All snooze actions must create activity events.

---

# 20. Skip

Skip is separate from completion.

Skipping records:

* Person who skipped
* Skip timestamp
* Original assignee
* Optional brief reason

For calendar tasks, skipping closes only that occurrence.

For completion-interval tasks, schedule the next occurrence from the skip timestamp.

Skipping must not be visually represented as completion.

---

# 21. Completion confirmation and Undo

A task series may enable:

**Confirm before completing**

Use this for medicine, pet care, safety, or other sensitive tasks.

The confirmation dialog should display:

* Task title
* Assignee
* Original due time
* Current time
* Whether the occurrence is overdue
* Whether completing it will change the rotation
* The one-time “Keep the original rotation” control when relevant

After completion, show an Undo action for 30 seconds.

Undo must:

* Reopen the occurrence
* Create a new audit event
* Preserve the original completion event
* Recalculate the rotation when necessary
* Notify other clients in real time

After 30 seconds, a full member may reopen a completed occurrence through an explicit confirmation dialog.

A guest cannot reopen an occurrence after the Undo period.

---

# 22. Concurrency and duplicate prevention

This is a critical requirement.

All state-changing operations must be atomic backend operations:

* Claim
* Assign
* Reassign
* Complete
* Undo completion
* Reopen
* Skip
* Snooze
* Cancel
* Delete

The first valid update wins.

Use an occurrence `version` field or another reliable compare-and-swap mechanism.

Each client mutation should send the expected current version.

The backend function must update only when:

* The user is authorized
* The occurrence is in a valid lifecycle state
* The expected version matches
* No conflicting update has already won

Example:

1. Chris and Kim both open “Give medicine.”
2. Chris completes it.
3. Kim attempts to complete it.
4. Kim’s request is rejected.
5. The client refreshes the occurrence.
6. Show:

```text
Chris already completed this task at 8:02 PM.
```

Do not depend on disabled buttons or client-side checks for correctness.

---

# 23. Editing recurring tasks

When editing an occurrence that belongs to a recurring series, offer:

* Only this occurrence
* This and future occurrences
* Entire series

Rules:

* Past completed or skipped occurrences are never rewritten
* Historical events are never rewritten
* Editing one occurrence creates an exception or override
* Editing future occurrences updates the series from an effective date
* Future generated open occurrences may be cancelled and regenerated
* Manually locked assignments should be preserved when possible
* Every edit creates an audit event

---

# 24. Deletion

Use soft deletion.

Deleting a recurring series must:

* Mark the series deleted
* Cancel or mark future open occurrences deleted
* Remove it from normal task-management screens
* Preserve completed occurrences
* Preserve skipped occurrences
* Preserve audit history
* Display the deleted state when viewed through History

A full member may also cancel or delete one future occurrence without deleting the entire series.

Do not hard-delete task history from the normal application flow.

---

# 25. Activity history

Create an append-only activity log retained indefinitely.

Events include:

* Household created
* Member invited
* Member joined
* Member removed
* Task created
* Task edited
* Occurrence generated
* Assigned
* Reassigned
* Claimed
* Completed
* Completion undone
* Reopened
* Snoozed
* Snooze changed
* Skipped
* Cancelled
* Series paused
* Series resumed
* Series deleted
* Rotation changed

Corrections create new events rather than changing old events.

The History screen must support filters for:

* Household
* Date range
* Task or series
* Person
* Event type

Full members may view household-wide history.

Guests may see only relevant events for occurrences assigned to them and only when needed to understand the current state. They must not gain access to unrelated household activity.

---

# 26. Main screens

## Today

Today is the default screen.

Support a combined Today view across multiple households.

Include filters for:

* Household
* Assigned person
* Category
* Status
* Assigned to me
* Unassigned

Include date navigation for:

* Yesterday
* Today
* Tomorrow
* Arbitrary selected date

Default ordering:

1. Overdue
2. Due now
3. Snoozed items whose snooze has expired
4. Upcoming today
5. Unassigned tasks
6. Completed tasks

Completed tasks must remain visible but be:

* Collapsed by default
* Visually subdued
* Lower on the page
* Lower priority than open tasks

Overdue tasks from earlier dates should still appear at the top of Today.

Task cards should show:

* Status
* Title
* Category icon or badge
* Due time or window
* Household when viewing multiple households
* Assignee
* Snooze information
* Confirmation-sensitive indicator when enabled

## Upcoming

Show future occurrences grouped by date.

Filters:

* Household
* Assignee
* Category
* Date range

## Tasks

Show:

* Recurring series
* One-time tasks
* Active
* Paused
* Deleted when explicitly requested

Allow:

* Create
* Edit
* Pause
* Resume
* Delete
* View next occurrences

## Task details

Use tabs or sections for:

* Details
* Schedule
* History

Show:

* Title
* Description
* Category
* Assignment method
* Current rotation
* Next occurrence
* Missed-task policy
* Confirmation setting
* End condition
* Series status

## Occurrence details

Show:

* Current status
* Original due time
* Time window
* Assignee
* Actual completing person
* Snooze information
* Activity
* Complete
* Snooze
* Skip
* Reassign, for full members
* Reopen, when permitted

## History

Display a readable timeline with filters.

## Households

Show:

* All households
* Current household
* Member count
* User role
* Add household
* Join household
* Invitations
* Members and guests
* Timezone
* Categories

## Settings

Show:

* Display name
* Email
* Notification preferences
* Push permission status
* Notification privacy
* Install-to-Home-Screen instructions
* Sign out

---

# 27. Notifications

Version 1 notification preferences are global per user.

Provide toggles for:

* Newly assigned to me
* Task due soon
* Task overdue
* Task completed
* Task skipped
* Task snoozed
* New household task
* Household member or guest added

Provide due-soon lead-time options:

* 5 minutes
* 15 minutes
* 30 minutes
* 60 minutes

Default to 30 minutes.

Provide a privacy setting:

* Show task title and details
* Show only “Household task update”

Guests receive notifications only for occurrences assigned to them.

Notification behavior should generally be:

* Assignment notification: notify the assignee
* Due-soon notification: notify the assignee
* Overdue notification: notify the assignee
* Unassigned overdue task: notify eligible full members
* Completion notification: notify other authorized full members according to preferences
* Skip or snooze notification: notify other authorized full members according to preferences
* Guest: never receive notifications for unrelated tasks
* Avoid notifying the actor about their own action unless doing so is necessary for confirmation

A notification click must open the relevant occurrence.

Store push subscriptions per device.

A user may have multiple active subscriptions.

Disable invalid subscriptions without disabling notifications for the user’s other devices.

Use idempotency keys to prevent duplicate notifications.

---

# 28. iPhone PWA requirements

The application must be installable on an iPhone Home Screen.

Implement:

* Web app manifest
* Appropriate display mode
* App name and short name
* Theme color
* Background color
* Apple touch icons
* Maskable icons
* Service worker
* Offline app shell
* Install instructions
* Update handling
* Push notification subscription

Version 1 task writes are online-only.

When offline:

* Allow the user to view recently cached screens when safe
* Clearly show an offline indicator
* Disable complete, skip, snooze, assign, edit, and delete actions
* Explain that a connection is required to avoid duplicate task actions
* Do not queue sensitive task mutations for later replay

On iPhone, notification permission must be requested from a user-initiated action after installation guidance.

Create an onboarding panel that:

1. Detects whether the app is running as an installed PWA when possible.
2. Explains how to add it to the Home Screen.
3. Requests push permission only after the user presses an Enable Notifications button.
4. Shows the current notification subscription status.

---

# 29. Realtime behavior

Use Supabase realtime updates.

Clients should subscribe only to authorized household data.

Relevant updates include:

* New occurrence
* Assignment changed
* Occurrence claimed
* Completion
* Undo
* Reopen
* Skip
* Snooze
* Series edited
* Series paused
* Series deleted
* Household membership changed

When a realtime event arrives:

* Invalidate affected TanStack Query keys
* Fetch authoritative records
* Do not attempt to duplicate all business logic on the client
* Show nonintrusive feedback when another user changes the task currently being viewed

When membership is removed, the client should immediately stop subscriptions and remove inaccessible cached data.

---

# 30. Scheduled processing

Create a scheduled Supabase Edge Function or database job that runs at a sensible interval, such as once per minute.

It must:

* Generate future calendar occurrences
* Maintain a rolling generation horizon of approximately 30 days
* Process due-soon notifications
* Process overdue notifications
* Process expired snoozes
* Apply automatic missed-task policies
* Retry failed notification deliveries
* Disable invalid push subscriptions
* Avoid duplicate processing through idempotency and locking

Completion-interval occurrences must be created transactionally when the current occurrence is completed or skipped.

Do not rely on a user having the app open for schedules or notifications to work.

---

# 31. Web Push implementation

Use standards-based Web Push with VAPID.

Flow:

1. Register the service worker.
2. Request permission after a user action.
3. Create a Push API subscription.
4. Store the endpoint and encryption keys.
5. Add notification work to a durable outbox.
6. Send notifications from a Supabase Edge Function.
7. Record delivery attempts.
8. Retry temporary failures.
9. Disable expired subscriptions.

Use a Deno-compatible Web Push implementation in the Supabase Edge Function.

Do not choose a library without verifying it works in the current Supabase Edge Function runtime.

If a preferred Web Push package is incompatible, implement the smallest reliable standards-compatible alternative and document the choice.

---

# 32. Recommended database model

Create appropriate PostgreSQL enums where useful.

At minimum, implement these tables.

## `profiles`

```text
user_id
display_name
email
detected_timezone
created_at
updated_at
```

## `households`

```text
id
name
timezone
created_by
created_at
updated_at
deleted_at
```

## `household_memberships`

```text
id
household_id
user_id
role
status
invited_by
joined_at
removed_at
created_at
updated_at
```

Roles:

```text
full_member
guest
```

## `household_invitations`

```text
id
household_id
email
role
token_hash
expires_at
invited_by
accepted_by
accepted_at
revoked_at
created_at
```

## `categories`

```text
id
household_id
name
created_by
created_at
updated_at
deleted_at
```

## `task_series`

```text
id
household_id
title
description
category_id
series_type
recurrence_type
recurrence_config
assignment_mode
fixed_assignee_id
missed_policy
confirmation_required
end_type
end_at
end_after_occurrences
series_status
effective_from
created_by
created_at
updated_at
deleted_at
```

Use a validated JSONB structure for recurrence configuration only where normalization would create unnecessary complexity.

Document and validate the JSON schema.

## `task_schedule_slots`

```text
id
series_id
local_start_time
local_end_time
is_all_day
sort_order
created_at
```

## `task_rotation_members`

```text
id
series_id
user_id
rotation_position
is_active
created_at
updated_at
```

## `task_occurrences`

```text
id
series_id
household_id
occurrence_key
original_due_start
original_due_end
is_all_day
lifecycle_state
assignee_user_id
assignment_source
assignment_locked
completed_by
completed_at
skipped_by
skipped_at
skip_reason
snoozed_by
snoozed_until
rotation_override
version
created_at
updated_at
deleted_at
```

Use `occurrence_key` or another uniqueness strategy to prevent duplicate generated occurrences.

## `task_events`

```text
id
household_id
series_id
occurrence_id
actor_user_id
event_type
event_payload
created_at
```

This table is append-only.

## `notification_preferences`

```text
user_id
notify_assigned
notify_due_soon
notify_overdue
notify_completed
notify_skipped
notify_snoozed
notify_new_task
notify_membership_changes
due_soon_minutes
show_task_details
created_at
updated_at
```

## `push_subscriptions`

```text
id
user_id
endpoint
p256dh_key
auth_key
device_label
enabled
created_at
updated_at
last_success_at
last_failure_at
disabled_at
```

Protect subscription information from unrelated users.

## `notification_outbox`

```text
id
recipient_user_id
occurrence_id
notification_type
idempotency_key
payload
not_before
status
attempt_count
last_error
created_at
sent_at
```

Create a unique constraint on `idempotency_key`.

Add indexes for:

* Household membership lookups
* Open occurrences by household and due time
* Occurrences by assignee
* Occurrences by series
* Event history
* Notification outbox processing
* Active push subscriptions
* Invitation lookup

---

# 33. Row Level Security

Enable Row Level Security on every exposed table.

Write explicit policies.

Do not use overly broad policies such as allowing all authenticated users to read a table.

Required behavior:

## Full members

A full member may:

* Read household data for active memberships
* Read all household task series and occurrences
* Read household history
* Manage tasks through authorized operations
* Manage household categories
* Manage memberships and invitations

## Guests

A guest may:

* Read their own active membership
* Read minimal household identity information
* Read only occurrences assigned to their user ID
* Read only enough series information to display assigned occurrences
* Read only related events needed for their assigned occurrences
* Mutate assigned occurrences only through controlled RPC functions

A guest may not directly update assignment, schedule, series, membership, or household fields.

## Outsiders

A user without an active membership must receive no household task data.

## Removed members

Removing a membership must immediately revoke read and mutation access.

## Events

Client roles must not be allowed to update or delete `task_events`.

Use security-definer functions carefully.

Each function must:

* Set a safe `search_path`
* Verify the authenticated user
* Verify the relevant membership
* Avoid trusting client-supplied household IDs without verification

Include automated RLS tests.

---

# 34. Transactional backend functions

Implement database RPC functions or equivalently secure server operations for at least:

```text
create_household
accept_invitation
claim_occurrence
assign_occurrence
complete_occurrence
undo_completion
reopen_occurrence
skip_occurrence
snooze_occurrence
edit_task_series
pause_task_series
resume_task_series
delete_task_series
cancel_occurrence
```

Each operation must:

1. Identify the authenticated actor.
2. Verify membership and role.
3. Verify access to the specific occurrence or series.
4. Verify the expected lifecycle state.
5. Verify the expected version.
6. Apply the state change atomically.
7. Increment the occurrence version.
8. Update rotation when required.
9. Generate future interval occurrences when required.
10. Append one or more audit events.
11. Insert notification-outbox records.
12. Return the authoritative updated data.

Use structured error codes that the frontend can translate into messages such as:

* Task already completed
* Task already skipped
* Task changed by another person
* Access denied
* Invitation expired
* Cannot edit a past occurrence
* Guest cannot perform this action

---

# 35. Rotation engine

Implement the round-robin engine as a domain service with unit tests.

The engine must handle:

* Ordered roster
* Inactive roster members
* Removed household members
* Guests
* Manually locked assignments
* Actual completer differs from assignee
* One-time keep-original-rotation override
* Actual completer not in roster
* Future occurrence recalculation
* Series edits
* Undoing a completion
* Reopening an occurrence

Default behavior:

* If the actual completer is in the roster, advance after the actual completer.
* If the actual completer is not in the roster, advance after the original assignee.
* If “Keep the original rotation” is selected, advance after the original assignee.
* Do not alter manually locked future assignments.
* Never rewrite completed or skipped history.

Document this behavior in code comments and the README.

---

# 36. Timezone and date handling

Timezone correctness is critical.

Use the household’s IANA timezone for:

* Occurrence generation
* Due-state calculations
* Flexible windows
* Recurrence dates
* All-day tasks
* Notification timing
* Daylight-saving transitions

Store authoritative timestamps in UTC.

Store local recurrence rules separately.

Test:

* Spring daylight-saving transition
* Fall daylight-saving transition
* User traveling outside household timezone
* Flexible window crossing a daylight-saving change
* Multiple daily slots
* All-day task boundaries
* Completion intervals spanning timezone changes

Do not build recurrence logic using only the device’s local timezone.

---

# 37. Frontend state and forms

Use TanStack Query for server state.

Use React Hook Form and Zod for forms.

Create reusable form components for:

* Task title and description
* Category
* One-time or recurring
* Date
* Exact time
* Flexible window
* Multiple daily schedule slots
* Selected weekdays
* Completion interval
* Assignment mode
* Fixed assignee
* Rotation roster
* Missed-task policy
* Confirmation setting
* End condition

Use optimistic updates only where safe.

For completion, skip, assignment, and other concurrency-sensitive operations, prioritize authoritative backend responses over a misleading optimistic interface.

---

# 38. Accessibility

Meet reasonable WCAG AA expectations.

Include:

* Proper labels
* Keyboard support
* Focus management
* Screen-reader announcements
* Sufficient contrast
* Non-color status indicators
* Large mobile touch targets
* Accessible dialogs
* Reduced-motion support
* Error messages associated with fields
* Semantic headings and landmarks

After a realtime conflict, announce the updated task state to screen readers.

---

# 39. Testing requirements

## Unit tests

Test:

* Due-state derivation
* Exact-time tasks
* Flexible-window tasks
* All-day tasks
* Daily recurrence
* Selected weekdays
* Multiple daily times
* Completion-based intervals
* End dates
* Occurrence counts
* Household timezone handling
* Daylight-saving transitions
* Round-robin assignment
* Completion by another member
* Keep-original-rotation override
* Actual completer outside roster
* Missed-task policies
* Snooze expiration
* Completed-task ordering
* Filters

## Database tests

Test:

* Pending user cannot read or mutate any HomeTeam product data
* Rejected or suspended user cannot read or mutate any HomeTeam product data
* Approved user can proceed to household authorization
* Non-administrator cannot list or decide access requests
* Administrator can approve, reject, suspend, and restore access
* Administrator approval does not grant household data access
* Full member permissions
* Guest can read assigned occurrence
* Guest cannot read unassigned occurrence
* Guest cannot read another person’s occurrence
* Guest cannot edit a series
* Removed user loses access
* First completion wins
* Stale version fails
* Duplicate occurrence generation is prevented
* Duplicate notification is prevented
* Events are append-only
* Soft deletion preserves history
* Reopening creates a new event
* Invitation acceptance validates email

## Component tests

Test:

* Today status sections
* Filter behavior
* Completion confirmation
* Snooze dialog
* Skip dialog
* Conflict message
* Guest-restricted interface
* Completed section collapse
* Offline mutation blocking

## End-to-end tests

Test:

1. Create account with email OTP.
2. Create household.
3. Invite a full member.
4. Invite a guest.
5. Create a one-time task.
6. Create a daily recurring task.
7. Create a flexible-window task.
8. Create a completion-interval task.
9. Create a round-robin task.
10. Open two authenticated sessions.
11. Complete a task in one session.
12. Observe realtime update in the other session.
13. Attempt a second completion.
14. Confirm conflict handling.
15. Snooze a task.
16. Skip a task.
17. Complete another user’s rotating task.
18. Verify the next assignment.
19. Use the rotation override.
20. Verify guest isolation.
21. Edit this and future occurrences.
22. Soft-delete a series.
23. View preserved history.
24. Build the PWA.
25. Exercise push subscription code with documented test steps.

Use mocked email and push delivery where external delivery cannot run in CI.

---

# 40. GitHub Pages deployment

Create a GitHub Actions workflow that:

* Installs dependencies
* Runs linting
* Runs type checking
* Runs unit tests
* Builds the application
* Uploads the Pages artifact
* Deploys to GitHub Pages

Support both:

* Repository-root Pages deployments
* Custom-domain deployments

Use an environment variable or Vite base configuration for the deployed base path.

Ensure:

* Manifest paths work under a repository subpath
* Service worker scope is correct
* Icons load correctly
* Client routing works after refresh
* Asset URLs are not hard-coded to `/`

Document custom-domain setup without assuming the domain has already been configured.

---

# 41. Seed data

Create development seed data with:

* Two full members
* One guest
* Two households
* Several categories
* An overdue medicine task
* A due-now dog-feeding task
* A snoozed cleaning task
* A completed bedtime task
* An unassigned recycling task
* A fixed recurring task
* A round-robin recurring task
* A flexible-window task
* A completion-interval task
* Representative history events

Do not use real personal email addresses or sensitive medical information.

Use names such as:

* Alex
* Sam
* Grandma

---

# 42. Milestones

Implement in this order.

## Milestone 1: Project foundation

* Inspect repository
* Create implementation plan
* Configure React, TypeScript, and Vite
* Configure routing
* Add Tailwind
* Configure linting and formatting
* Add testing foundations
* Add PWA manifest
* Add GitHub Pages workflow
* Add environment validation

## Milestone 2: Supabase foundation

* Add Supabase local-development configuration
* Add migrations
* Add database enums and tables
* Add indexes
* Add seed data
* Add generated TypeScript database types
* Document local Supabase setup

## Milestone 3: Authentication and households

* Email OTP login
* Profile creation
* Household creation
* Household switching
* Invitations
* Membership management
* Full-member and guest roles
* RLS policies
* RLS tests

## Milestone 4: Task engine

* Task series
* One-time tasks
* Calendar recurrence
* Flexible windows
* Multiple daily slots
* Completion intervals
* End conditions
* Occurrence generation
* Missed policies
* Categories

## Milestone 5: Assignment and actions

* Fixed assignments
* Unassigned tasks
* Claiming
* Round-robin assignments
* Complete
* Complete for someone else
* Rotation override
* Skip
* Snooze
* Undo
* Reopen
* Concurrency protection
* Activity events

## Milestone 6: Main interface

* Today
* Filters
* Date selection
* Upcoming
* Tasks
* Task details
* Occurrence details
* History
* Households
* Settings
* Guest-specific interface
* Responsive layout

## Milestone 7: Realtime

* Authorized subscriptions
* Query invalidation
* Cross-device task updates
* Conflict feedback
* Membership revocation handling

## Milestone 8: Notifications

* Notification preferences
* Push subscription
* Service-worker notification handling
* Notification outbox
* Edge Function delivery
* Scheduled processing
* Idempotency
* Retry handling
* Install and notification onboarding

## Milestone 9: Hardening

* Complete unit tests
* Complete RLS tests
* Complete E2E tests
* Accessibility review
* Offline-state behavior
* Error handling
* Loading and empty states
* Security review
* Production build
* README
* Deployment documentation

---

# 43. README requirements

The README must include:

* Product overview
* Architecture overview
* Repository structure
* Local prerequisites
* Installation
* Environment variables
* Running the frontend
* Running Supabase locally
* Applying migrations
* Seeding development data
* Running tests
* Running Playwright
* Generating database types
* Creating a Supabase project
* Configuring email OTP
* Configuring Edge Function secrets
* Configuring VAPID
* Deploying Edge Functions
* Configuring scheduled processing
* Deploying GitHub Pages
* Configuring a custom domain
* Installing the PWA on iPhone
* Enabling push notifications
* Free-tier operational caveats
* Security assumptions
* Known limitations
* Version 2 ideas

Also include a concise explanation that HomeTeam notifications are coordination aids and should not be treated as the sole medically reliable reminder system.

---

# 44. Definition of done

HomeTeam version 1 is complete only when:

1. Two full members can authenticate on separate devices.
2. They can join the same household.
3. A guest can be invited.
4. The guest sees only assigned occurrences.
5. A full member can create a one-time task.
6. A full member can create each supported recurring-task type.
7. Occurrences are generated correctly in the household timezone.
8. The Today view groups tasks by attention state.
9. Users can filter Today by household, assignee, category, and status.
10. Completed tasks remain visible but subdued.
11. A task completed on one device updates another device in real time.
12. A second completion attempt is rejected.
13. The app records the assignee and actual completing user.
14. Round-robin assignments work.
15. Completing another person’s turn changes rotation by default.
16. The one-time rotation override works.
17. Snoozing is shared and preserves the original due time.
18. Skipping is distinct from completion.
19. Overdue occurrences can coexist with newer occurrences.
20. Completion intervals schedule from actual completion or skip.
21. Undo works for 30 seconds.
22. Full members can reopen completed tasks later.
23. All critical actions create append-only history events.
24. Series deletion is soft deletion.
25. Historical records remain visible.
26. Push subscription and notification processing are implemented.
27. The PWA can be installed on an iPhone.
28. Online-only mutations are enforced clearly.
29. RLS tests demonstrate guest isolation.
30. Lint, type checking, tests, and production build pass.
31. GitHub Pages deployment is configured.
32. No privileged secret exists in client code or the repository.
33. A new authenticated user cannot use HomeTeam until a platform administrator approves them.
34. An administrator can approve, reject, suspend, and restore preview access without gaining implicit household access.

---

# 45. Final engineering output

After completing implementation:

1. Run all available validation commands.
2. Fix failures rather than merely reporting them.
3. Review the git diff for accidental or unrelated changes.
4. Summarize:

   * Architecture
   * Major features
   * Database migrations
   * Security model
   * Test coverage
   * Deployment setup
   * Remaining manual setup
   * Known limitations
5. List the exact commands needed to run the application locally.
6. List the exact environment variables and Supabase secrets that must be supplied.
7. Clearly identify any feature that could not be fully tested without external credentials.
8. Do not describe the application as complete if any Definition of Done requirement remains unimplemented.

Build HomeTeam as a real, maintainable application—not a static mockup.
