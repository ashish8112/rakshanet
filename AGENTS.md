# AGENTS.md

This file is for any AI agent working in this repo that is not Claude Code (Antigravity, Codex, Gemini, ChatGPT and others).

## Before doing anything in every task or session

1. Read `CLAUDE.md` in the repo root completely and follow it exactly. It was written for Claude Code, but every instruction in it applies to you in the same way.
2. Then do what `CLAUDE.md` says: find out who you are working with (Ashish, Sam or Daksh), read `CONTRACT.md`, `docs/briefs/<name>.md`, `docs/RUNBOOK.md` and `docs/progress/<name>.md`, report the current step, and wait for OK.

## The rules that matter most (full list in CLAUDE.md)

- `CONTRACT.md` is law: exact field names, URLs, function names and JSON shapes. Never rename anything.
- Only edit the folders the current person owns (listed in their brief). Never touch another person's folders or the shared files.
- Never install packages without explicit permission.
- Never push to `main`. Work on the person's own branch, merge through a Pull Request.
- Never commit `.env.local` or API keys.
- One RUNBOOK step at a time: explain first, wait for OK, build, explain how to test, update the progress file, stop.
- Do not run long chains of commands or edit many files on your own. Ask before running terminal commands that change files, install things or touch git.
- Contract problem or git CONFLICT: stop and tell the user.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
