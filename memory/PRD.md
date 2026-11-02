# Habit Circle – PRD
## Original problem
Simple community habit tracker for friends/colleagues: sign up/in (display name, email, password, no email confirmation), My habits (own habits, add form with Habit name, When I do it, Share with the community unticked by default, Shared/Private badge), habit page (Last 7 days checkboxes labelled YYYY-MM-DD, owner-only, Days done, Current streak), Community (shared habits only, name, owner, when, Days done), comments (Comment + Post comment, author name visible). User said: follow the spec, keep it simple, no extra features.

## Architecture
FastAPI + MongoDB (users, habits with completions[] dates, comments). JWT (bcrypt) with a Bearer token stored in localStorage and an httpOnly cookie. React + Tailwind with a sidebar and top nav. Earthy sage design.

## Implemented (2026-06)
- Sign up, sign in and sign out; protected routes
- My habits: list and add form
- Habit page: 7-day ticks, Days done, Current streak, comments on shared habits
- Community feed of shared habits only
- Tested end-to-end: 100% backend and frontend

## Backlog
- P2: Server-side restriction of ticks to the last 7 days
- P2: Brute-force login lockout
