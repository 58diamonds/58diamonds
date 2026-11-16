# 58 Diamonds: status

**Updated:** 2026-11-16 17:06 (handoff, Mac session, Claude plan nearly used up)

## State
Live at https://58diamonds.vercel.app (Vercel, a separate account from Sacha's other projects). Vercel deploys `main` only. The last shipped change is from 2026-11-06: country picker in front of the phone number on the appointment form and at checkout, and the WhatsApp link fixed for local numbers (Belgian 0 becomes +32). Typecheck, 105 tests and the build passed on 2026-11-13.

## In progress
- Nothing half done on `main`. WhatsApp messages were abandoned on 2026-11-14 (Sacha): PR #75 closed without merging, branch `whatsapp-notifications` kept for reference, migration 0016 never run.
- This branch (`status-handoff-2026-11-16`) holds only this file, for review through a pull request.

## Needs Sacha
1. Review and merge the pull request for this status file (no deploy is triggered by a merge until a batch is approved).
2. Anything that is a deploy, publishing, mail or message to clients, deletion, spending or live Stripe write: ask first.

## Next steps
1. Nothing is planned. Wait for Sacha's next request.
2. When a batch of changes is approved, merge it to `main` (Vercel deploys then).

## Watch out
- Project rules (CLAUDE.md, docs/project-notes.md): ask before mail or messages, publishing, deleting, spending or live Stripe writes. Deploys are batched. Unapproved changes wait on a branch with a pull request.
- Dated history is in `docs/project-notes.md`. This file is the short handoff.
- Never write secrets, keys or payment details into this file.
- Never push `claude/...` branches.
