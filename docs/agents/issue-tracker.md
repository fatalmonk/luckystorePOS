# Issue tracker

## Source of truth

Lucky Store work is tracked in the Notion database
[✅ Tasks](https://app.notion.com/p/5e49fb6235da4f558224b3b33014be84),
under Lucky Store - Second Brain.

GitHub issues, pull requests, local TODO files, and chat messages are not the
authoritative task register unless the user explicitly changes the tracker.

## Schema

- `Name`: task title
- `Status`: `Not started`, `In progress`, or `Done`
- `Priority`: `High`, `Medium`, or `Low`
- `Area`: one or more of `Storefront`, `Admin`, `Mobile`, `Infra`, `Brand`, `Ops`
- `Owner`: responsible person
- `Due`: target date

Put the objective, acceptance criteria, dependencies, and repository or PR links
in the task page body because the database has no dedicated fields for them.

## Workflow

1. Search by task name and area before creating a task; update an existing match
   instead of duplicating it.
2. Create new work as `Not started`; set priority, area, owner, and due date when
   known.
3. Set `In progress` only when implementation begins.
4. Set `Done` only after acceptance criteria and required validation pass.
5. If Notion is unavailable, report the blocker. Do not create a shadow tracker
   elsewhere without explicit approval.
