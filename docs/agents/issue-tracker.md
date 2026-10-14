# Issue tracker: Hermes Kanban board `brackstone-site`

Specs and tickets for Brackstone's marketing site (`sidnikiwi-afk/saeed-landing`) and for site-facing dashboard work (`sidnikiwi-afk/brackstone-dashboard`) live on the Hermes Kanban board `brackstone-site`. One board covers both repos, so a feature that spans them is one spec with tickets in either repo.

Always use the safe wrapper and name the board: `~/.hermes/bin/hermes-kanban-safe --board brackstone-site <verb> ...`.

## Roles

- The **controller** (one session, normally Claude Opus 5.5 in Herdr tab `wP:t2Q`) owns the board: it creates tickets, moves statuses, links dependencies and closes work.
- **Workers** (Herdr tabs) build and review one ticket at a time. They read and comment on their ticket; they do not move tickets or pick up other `ready` work.

## Conventions

- A **spec** is one task whose title starts `Spec:`. Its body is the spec.
- A **ticket** is one task per tracer-bullet slice, titled `<NN> <short name>`, with the spec as a parent.
- **Blocking edges**: a ticket's other parents are the tickets that block it (`create --parent <id>` or `link <parent> <child>`). A ticket is unblocked when every parent is done.
- Each ticket body names its repo (`saeed-landing` or `brackstone-dashboard`), branch and worktree.
- Statuses: todo, ready, running, review, blocked, scheduled, done. Triage roles map to these in `triage-labels.md`.

## When a skill says "publish to the issue tracker"

`~/.hermes/bin/hermes-kanban-safe --board brackstone-site create "<title>" --body "<markdown>" [--parent <spec-id>] [--parent <blocker-id>]` and record the returned task id.

## When a skill says "fetch the relevant ticket"

`~/.hermes/bin/hermes-kanban-safe --board brackstone-site show <task-id>` (body, comments and events).

## Commenting and closing

- Comment: `~/.hermes/bin/hermes-kanban-safe --board brackstone-site comment <task-id> "<text>"`. Every worker hand-back and every review result is a comment.
- Close: `~/.hermes/bin/hermes-kanban-safe --board brackstone-site complete <task-id>`, only after the work is merged to the default branch or explicitly accepted by Saeed. Opening a PR is not completion.
