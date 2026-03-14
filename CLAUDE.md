# CLAUDE.md — Quiz Frontend (Angular 18 + Tailwind CSS)

## Stack
- Framework: Angular 18
- Styling  : Tailwind CSS
- Build    : npx ng build --configuration production

## Dev Commands
```bash
cd /mnt/devarea/devarea/quiz-frontend
npm start                                        # dev server
npx ng build --configuration production         # production build
npx ng test                                     # unit tests
npx ng lint                                     # lint
```

## Project Structure
- `src/app/`          — Main app modules
- `src/app/components/` — Reusable UI components
- `src/app/pages/`    — Page-level components
- `src/app/services/` — HTTP services
- `src/environments/` — Environment configs

---

## Linear Workflow

### Before starting any ticket
- Pull ticket via `mcp__linear-server__get_issue` with issue ID
- Read comments from previous ticket with `mcp__linear-server__list_comments`
- Read full description, acceptance criteria, UI specs
- Set status to **In Progress** via `mcp__linear-server__save_issue`

### Branch naming
- Format: `{ticket-id}/{short-description}`
- Example: `ifi-21/quiz-list-page`, `ifi-22/auth-guard`
- Branch from `main` unless blocked by previous ticket

### Committing (Conventional Commits)
- `feat(frontend): description`
- `fix(frontend): description`
- `refactor(frontend): description`
- `style(frontend): description`

Use atomic commits — group related files.

### While working
- Add implementation notes via `mcp__linear-server__save_comment`

### After completing a ticket
Post comment:
```
## What was built
- {feature}

## Key files changed
- `src/app/path/file.ts` — what changed

## Testing
✅ {scenario}: works as expected
❌ {scenario}: {issue}

## Handoff notes
- {context}
```
- Set status to **In Review** or **Done**
- Push branch, open PR to `main`
- Post PR URL as comment on Linear ticket

### Finding next ticket
- Use `mcp__linear-server__list_issues` filtered by status=Todo

---

## GitHub PR Format

**Title:** `[{TICKET-ID}] {ticket title}`

**Body:**
```
## Overview
{1-2 sentences}

## Changes
- `src/app/path/file.ts` — what changed

## Testing
- npm start → navigate to {route}

## Linear
{Linear ticket URL}
```
