# 58 Diamonds: status

Read this first, update it last. Every session, on any computer or account.

| | |
|---|---|
| **Working branch** | `main` (Vercel deploys `main` only, live on https://58diamonds.vercel.app) |
| **Last change** | 2026-11-06: country picker in front of the phone number on the appointment form and at checkout; WhatsApp link to clients with a local number fixed (Belgian 0 becomes +32). 2026-11-02: ivory emails merged (PR #74). 2026-10-28: holding page lines removed, emails sent from sales@58diamonds.com |
| **Next step** | WhatsApp messages: Farah creates the Meta business portfolio and starts verification (business.facebook.com), then the WhatsApp app directly at developers.facebook.com/apps, no partner. Number: a new dedicated prepaid SIM is being considered, not decided; if site-only, add a "Message Farah" button to the templates (not built). Then templates, keys in Vercel, run migration 0016, merge PR #75 (branch `whatsapp-notifications`). Steps and costs in `docs/whatsapp.md`. Test "Translate from English" in Admin > Pieces (do not save). Confirm Farah's iPhone and PC have the sales@58diamonds.com mailbox |
| **History** | Dated log in `docs/project-notes.md` |
| **Last session** | 2026-11-13, Mac session: PR #75 (`whatsapp-notifications`) brought up to date with main (rebased; conflicts were docs only, main's newer STATUS, notes and `docs/whatsapp.md` kept); typecheck, 105 tests and build pass. Not merged, nothing deployed, migration 0016 not run. Before that: 2026-11-12, web chat (szaidman@gmail.com): added the handoff rule (now in this file). Before that: 2026-11-06, cloud session from iPhone (account: sacha@eighteendiamonds.com): WhatsApp number fix, country picker on the appointment form and checkout, then automatic WhatsApp messages on branch `whatsapp-notifications` (waiting for Meta setup), then setup questions: direct with Meta, new number, costs. Before that: 2026-11-05, cloud session (account: szaidman@gmail.com): added "From the other account" below. Before that: 2026-11-05, cloud session (account: sacha@eighteendiamonds.com): added this file |

## Handoff (every session, any account, device or cloud session)

STATUS.md on main is the shared handoff between Sacha's accounts, devices (iPhone, PC, Mac) and cloud sessions.

1. **First:** `git pull` main, read this file, and check `git log` on main since the date in **Last session** (another session may have worked since). Don't ask Sacha to re-explain anything this file already says.
2. **While working:** keep a short running note of what changes, what was decided and what is left unfinished.
3. **Last:** update this file and commit it to main when a task is finished, before stopping or handing off, when Sacha switches account or device, before usage runs out, and whenever the session ends. Never skip this because the task felt small.

Keep this file short: overwrite stale parts instead of only appending. It holds the date and which account/device wrote it, the current state (what works, what shipped, version/build numbers), what was done, next steps in order, blockers and things only Sacha can do (Mac-only steps, sign-ins, store uploads), and decisions and rules to keep.

Never write secrets here. If pushing to main is not possible, give Sacha the exact text of this file to paste.

## General

- Ask before sending mail or messages, publishing, deleting, spending money or live Stripe writes.
- If a connector or API is missing, say which one and help set it up rather than giving manual steps.

## Project facts

- Paid client site for Farah (she receives the appointment requests). Extra features are priced separately: flag anything that goes beyond the agreed scope.
- Deploys from main on Vercel, under a separate Vercel account from Sacha's other projects.

## Rules

1. `git pull` before starting. Read this file, then `docs/project-notes.md`.
2. Work on `main`. Deploys are batched: changes Sacha has not approved yet wait on one branch with an open pull request.
3. After each decision or finished step: add a dated line to `docs/project-notes.md`, update the table above, commit and push.
4. Fill in **Last session** with the date, device (iPhone / PC / Mac / cloud) and account, so the next session knows where you were.

## From the other account (2026-11-05)

What the szaidman@gmail.com account held about 58 Diamonds (details as dated lines in `docs/project-notes.md`):

- **Mailbox:** 2026-10-13 message to Paul to check the Office 365 mailbox (sales@58diamonds.com) and set it up on Farah's iPhone and PC. Open: confirm Farah's devices are set up.
- **DeepL test still unconfirmed:** the scheduled "deploy and test Translate" check-in was switched off before it ran. Open: test "Translate from English" in Admin > Pieces (do not save).
- **Not confirmed as 58 Diamonds** (could be 18 Diam. or a resale): 2026-11-04 cleaned product photo and 360 video of a gold ring with stones for an online shop (fingerprints removed; the hallmark inside the band got smoothed away and can be put back); 2026-10-11 ChatGPT prompts for emerald-cut engagement ring product photos (12 variants, white and rose gold). Files are in those chats only.
- No other branches exist on GitHub.
