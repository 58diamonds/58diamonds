# 58 Diamonds: status

**Updated:** 2026-11-19 19:27 (handoff run, Mac, no code change). This file lives on branch `status-handoff`, not `main`: pushing `main` deploys Vercel, and deploys are batched.

| | |
|---|---|
| **Working branch** | `main` (Vercel deploys `main`, live at https://58diamonds.vercel.app) |
| **Last change** | 6 Nov: country picker before the phone number on the appointment form and at checkout; Belgian 0 becomes +32 in WhatsApp links. 2 Nov: ivory emails merged (#74). 28 Oct: emails sent from sales@58diamonds.com. Dated log in `docs/project-notes.md` |

## State
`origin/main` is at 7359200 and the local `main` matches it. Nothing is waiting to deploy. WhatsApp messages were abandoned on 14 Nov: PR #75 closed without merging, migration 0016 never run, no Meta setup needed from Farah.

## In progress
- Open PR #76 (branch `status-handoff-2026-11-16`, title "Update STATUS.md") carries only the old handoff file from 16 Nov. It is not a feature and has nothing to merge.
- Local branch `whatsapp-notifications` has diverged from its remote after the 14 Nov history rewrite. It is kept for reference only. Do not push it. `status-handoff-2026-11-16` exists locally too; it matches the PR.

## Needs Sacha
1. Decide whether to close PR #76. It only carries the old handoff file; nothing merges to `main` without him.
2. From the other account: confirm Farah's devices are set up on the Office 365 mailbox sales@58diamonds.com (message to Paul, 13 Oct).
3. DeepL check: in Admin > Pieces, test "Translate from English" (do not save).

## Next steps
1. Any change Sacha asks for goes on a branch with a PR. Deploys are batched.
2. Record every finished step as a dated line in `docs/project-notes.md`.
3. Note the open items in `docs/project-notes.md` once PR #76 is closed or merged.

## Watch out
- Ask before sending mail or messages, publishing, deleting, spending money or live Stripe writes.
- Farah is the client. Extra features are priced separately: flag anything beyond the agreed scope.
- Local `main` matches `origin/main` at this check (19 Nov 19:27), so nothing unpushed is at risk.
- Worktree branches are never pushed as they are: rename or merge first.
