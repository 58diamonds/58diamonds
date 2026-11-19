# 58 Diamonds: status

**Updated:** 2026-11-19 17:25 (handoff run, Mac, no code change). This file lives on branch `status-handoff`, not `main`: pushing `main` deploys Vercel, and deploys are batched.

| | |
|---|---|
| **Working branch** | `main` (Vercel deploys `main`, live at https://58diamonds.vercel.app) |
| **Last session** | 2026-11-19, Mac, scheduled handoff run: checked the repo and wrote this file only |
| **Last change** | 6 Nov: country picker before the phone number on the appointment form and at checkout; Belgian 0 becomes +32 in WhatsApp links. 2 Nov: ivory emails merged (#74). 28 Oct: emails sent from sales@58diamonds.com. Dated log in `docs/project-notes.md` |

## State
`origin/main` is at 7359200 and the local `main` matches it. Nothing is waiting to deploy. WhatsApp messages were abandoned on 14 Nov: PR #75 closed without merging, migration 0016 never run, no Meta setup needed from Farah.

## In progress
- Open PR #76 (listed as open in the 19 Nov checks log). Not reviewed in this run.
- Local branch `whatsapp-notifications` has diverged from its remote after the 14 Nov history rewrite. It is kept for reference only. Do not push it. `status-handoff-2026-11-16` exists only on the Mac.

## Needs Sacha
1. Decide on open PR #76 (merge or close). Nothing merges to `main` without him.
2. From the other account: confirm Farah's devices are set up on the Office 365 mailbox sales@58diamonds.com (message to Paul, 13 Oct).
3. DeepL check: in Admin > Pieces, test "Translate from English" (do not save).

## Next steps
1. Read PR #76 on GitHub and note what it does in `docs/project-notes.md`.
2. Any change Sacha asks for goes on a branch with a PR. Deploys are batched.
3. Record every finished step as a dated line in `docs/project-notes.md`.

## Watch out
- Ask before sending mail or messages, publishing, deleting, spending money or live Stripe writes.
- Farah is the client. Extra features are priced separately: flag anything beyond the agreed scope.
- Local `main` matches `origin/main` at this check.
- Worktree branches are never pushed as they are: rename or merge first.
