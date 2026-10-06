# SHARE-IN — let the outside world flow into the site

**Module:** `v1.4.3/core/35-sharein.js` · **Kill switch:** `?pf_off=35-sharein`
(or localStorage `pf_disabled_v1='["35-sharein"]'`)
**Status:** CEO directive 2026-10-06 ("Share in and out the site integrations"), Direction 2.

Share-in is the inbound half of the site's share system. Any external link,
the OS share sheet, or a "link in bio" can land a visitor on the site with
a payload — and every payload opens as a **draft in the "SEND THIS INTEL"
composer. Nothing posts, publishes, or uploads without the user's explicit
confirm tap.** Drafts are device-local (`localStorage pf_sharein_drafts_v1`);
confirmed actions reuse existing flows only. **Zero XP for sharing in, by
design** — the module never touches the XP ledger or the backend.

## The deep-link format

```
https://www.mtcstw.com/?sharein=<encoded-url>&text=<encoded>&title=<encoded>
```

| Param     | Required | Meaning |
|-----------|----------|---------|
| `sharein` | yes      | The shared URL (percent-encoded). Also the trigger flag. |
| `text`    | no       | Shared text / commentary. Becomes part of the editable caption. |
| `title`   | no       | Page title / label. Shows on the draft card. |
| `type`    | no       | Photo context: `photo` (show the picker), or `receipt` / `price` / `propaganda` (skip the picker, go straight to that hand-off). |

Rules:
- On load the module **consumes the share-in params and strips them** from
  the address bar (`history.replaceState`), preserving all other params.
- Bad or missing payload = the composer opens with **empty fields** (fail-open,
  never a crash). A URL that doesn't look like `http(s)://` or `www.` is dropped.
- Everything is capped (URL 2000 chars, text/caption 500, title 160).

Examples:

```
https://www.mtcstw.com/?sharein=https%3A%2F%2Fexample.com%2Farticle&title=Read%20this
https://www.mtcstw.com/?sharein=&text=Just%20a%20note%20to%20self&title=Note
https://www.mtcstw.com/?sharein=https%3A%2F%2Fexample.com%2Fpic.jpg&type=photo
https://www.mtcstw.com/?sharein=https%3A%2F%2Fexample.com%2Freceipt.jpg&type=receipt
```

## PWA Web Share Target behavior

`v1.4.3/pwa/manifest.json` declares:

```json
"share_target": {
  "action": "https://www.mtcstw.com/?sharein=1",
  "method": "GET",
  "enctype": "application/x-www-form-urlencoded",
  "params": { "title": "title", "text": "text", "url": "url" }
}
```

When a user picks **MTCSTW** in their phone's OS share sheet, the browser
navigates to `/?sharein=1&title=…&text=…&url=…`. The deep-link handler sees
`sharein=1` (Web Share Target mode) and reads the payload off the
`title`/`text`/`url` params instead of `sharein`.

**Why `sw.js` was not touched:** this is a GET flow — a plain navigation,
not a POST. The service worker's existing navigation passthrough handles it;
the composer (in `35-sharein.js`, which runs on every page via the core
bundle) consumes the params on load. There is no request body to intercept
and no special fetch handling to add.

**Known follow-up (not this release):** true photo file-share requires
`method: "POST"` + `share_target.files` + an SW `fetch` handler that can
hold a `FormData` body across a page load. That is a separate, spec'd change —
today, photos ride the deep link with `&type=photo` (and the composer still
requires the user's confirm before anything happens to them).

## The composer ("SEND THIS INTEL")

Red/black, Arial, branded. Two entry kinds:

**Shared URL or text** → prefilled share-intel draft card (URL preview +
editable caption) with a destination picker:
- **POST TO MY CELL** — saves a cell-feed draft on this device; confirm panel
  links out to `/cells` where the user posts it.
- **SHARE PUBLIC** — saves the draft, then renders the **existing outward
  share pipeline** (`PFShareEverywhere.networks`) prefilled with the user's
  caption + URL, as a user-authored card.

**Shared photo** → context picker (shown only when `type` is ambiguous):
- **RECEIPT BOUNTY** — hands the draft to the Data Bounties workshop tool
  (`PFWorkshop.open('data-bounties')`), or scrolls to the price check-in card
  if already on the page.
- **PRICE REPORT** — routes to the People's Index price check-in with the
  photo draft attached.
- **PROPAGANDA UPLOAD** — opens the Create workshop (`poster-forge`).
- **WILD FIND 📸** (2026-10-06) — opens the wild-find type picker
  (`PF.wildFinds`, one source of truth with the backend `WILDFIND_TYPES`
  registry): protest signs, street art, stickers, price tags, landlord
  absurdity, mutual aid, union, billboards, food deserts, marquees, ICE
  watch, and more. Routes to the bounty board with the type preselected;
  the type's safety rules show before confirm.

A **MY DRAFTS** list in the composer re-opens or deletes saved drafts.
Emits `pf-sharein-confirmed` (CustomEvent, `{id, dest}`) for future surfaces.

## Copy-paste snippets for the social team

**Link in bio (share the site with a preloaded intel drop):**
```
https://www.mtcstw.com/?sharein=https%3A%2F%2Fwww.mtcstw.com%2F&title=MTCSTW
```

**Browser bookmarklet — "SEND TO MTCSTW"** (drag to the bookmarks bar;
tapping it on any page opens the site's composer with that page prefilled):
```js
javascript:(function(){location.href='https://www.mtcstw.com/?sharein='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title);})();
```

**Facebook/IG/TikTok post footer template:**
```
Spotted something? SEND IT IN. ↓
https://www.mtcstw.com/?sharein=<PASTE-THE-LINK-HERE>
```
(Replace `<PASTE-THE-LINK-HERE>` with the percent-encoded URL.)

**QR / flyer line:**
```
Got intel? Share it in: mtcstw.com — tap the share sheet, or use
https://www.mtcstw.com/?sharein=<link>
```

## Testing

```
node scripts/verify-sharein.js
```

Static + vm-sandbox runtime tests: param parsing (deep-link, WST mode,
fail-open bad params), kill switch, composer render, the no-auto-publish
guarantee (open ≠ draft saved), confirm writes localStorage only, photo
picker vs declared-type routing, manifest.json share_target shape.
