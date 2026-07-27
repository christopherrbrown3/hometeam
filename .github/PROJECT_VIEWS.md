# HomeTeam v1 Project views

All 90 Project items are repository issues and all required fields are configured. GitHub does not expose Project view creation through the CLI or public GraphQL mutation used by this planning workflow. The available automated browser session was not authenticated for this private repository, so the following UI-only views remain to be created by a signed-in owner.

## Board

- Layout: Board
- Name: `Board`
- Column field: `Status`
- Columns in order: Backlog, Ready, In Progress, In Review, Blocked, Done
- Show closed items in Done

## Roadmap

- Layout: Roadmap
- Name: `Roadmap`
- Group by: `Milestone`
- Date source: milestone dates when Christopher assigns them
- Sort: milestone number, then Priority

## By Area

- Layout: Table
- Name: `By Area`
- Group by: `Area`
- Sort: Priority ascending, issue number ascending
- Visible fields: Status, Milestone, Area, Type, Priority, Complexity, Dependency Status, Estimated Effort, Acceptance Status

## By Model Tier

- Layout: Table
- Name: `By Model Tier`
- Group by: `Model Tier`
- Sort: Dependency Status, Priority, issue number
- Visible fields: Status, Milestone, Model Tier, Complexity, Estimated Effort, Dependency Status, Acceptance Status

No draft cards should be created while configuring these views.
