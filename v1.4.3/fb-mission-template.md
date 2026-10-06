# FB Group Mission Card Template

> **PROCESS GATE — DO NOT POST.** This template routes through **Brand
> Consistency** before the first post (engagement-gates.md, item #8 Gate B).
> No mission goes live without their sign-off on this template. Posting is a
> MANUAL hand-step: Shane or a group admin posts the card in the Facebook
> group — facebook-cli has NO group-post write; do NOT attempt to automate it.
>
> Standing copy rules on every mission card: never "donate", never names
> anyone (no real names — the network runs on callsigns), share assets carry
> **JOIN THE FIGHT.** in red bold. Code-word rotates per mission.

---

## Card format (copy/paste into the group)

```
🔥 GROUP MISSION — [MISSION NAME] 🔥

[1-2 sentence brief. Invitation tone: what to do, why it matters.]

HOW TO PLAY:
1. Do the thing: [concrete action — e.g. "post your best class-war meme as a
   new post in this group"]
2. Include the code-word somewhere in your post or comment:
   👉 CODE-WORD: [ROTATED CODE-WORD, e.g. BRICKHOUSE]
3. Check in on the site: mtcstw.com → Group Missions → paste your proof
   permalink → CHECK IN

PAYOUT: +5 XP when your proof verifies (2/day cap, standard share rules).
Proof = your post/comment permalink in THIS group containing the code-word.
Verification runs after you post — give it up to a day.

JOIN THE FIGHT.
```

## Code-word rules

- One code-word per mission, rotated every mission. Short, shoutable, all
  caps (e.g. `BRICKHOUSE`, `TROWEL`, `SABOT`).
- The code-word is printed ON the mission card (group members see it) but is
  NEVER exposed by the site's mission list endpoint — the on-site check-in
  auto-matches it server-side against the proof content.
- The verifier checks: (a) the permalink resolves, (b) it's in the target
  group, (c) the text contains the code-word (case-insensitive).

## Mission registry fields (for whoever seeds `fb_missions`)

| Field | Example |
|---|---|
| `id` | `fbm-2026-10-12-a` |
| `code_word` | `BRICKHOUSE` |
| `group_id` | group vanity or numeric ID (must match the `/groups/<g>/` URL segment) |
| `group_permalink` | the mission card's own permalink in the group |
| `brief` | the 1-2 sentence brief (mirrors the card) |
| `window_start` / `window_end` | epoch ms — the check-in window |
| `status` | `live` |

## Brand Consistency sign-off

- [ ] Template tone approved (date: ______, reviewer: ______)
- [ ] First mission card copy approved (date: ______, reviewer: ______)

Once signed, missions can be posted on the standing template without
per-mission review unless the format changes.
