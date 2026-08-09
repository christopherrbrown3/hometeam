# HomeTeam v1 Project views

This file records the intended GitHub Project views used during the version 1 build. It is a configuration reference, not a live count of issues or view state. Check the public repository's GitHub Project UI for current status.

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
