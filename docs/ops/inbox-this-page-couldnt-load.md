# Inbox dies as "This page couldn't load" after login

Product-side note for this repo. Operator infra (Coolify/Traefik) lives in the private workspace runbook, not here.

## What the user sees

Login succeeds. Chrome then shows *This page couldn't load* with Reload / Back. That copy is **not** in this app. Chromium paints it when the inbox tree throws during load.

## Root cause

`conversation-list` pins the Jarvis desk conversation from `GET /conversations/:id`. That payload often has **no** `messages[]`. Reading `messages[0]` throws `TypeError: Cannot read properties of undefined (reading '0')` and kills the page.

A second layer: browsers cache the `/inbox` document. After a deploy they keep executing the crashing bundle (or HTML that points at missing chunk hashes). Reload on the Chrome error page does not help.

## Fixes in this repo

| Commit | Change |
|--------|--------|
| `2f8b5c1` | `window.location.assign` after login instead of `router.push` |
| `270ecd3` | `messages: conv.messages ?? []` on the Jarvis pin; list uses `messages?.[0]` |
| `674d55a` | login navigates to `/inbox?_v=20260814c`; HTML `Cache-Control: no-store` |

`GET /conversations/:id` may still omit `messages[]`. Keep the list defensive.

## If it happens again

1. Do not click Reload on the Chrome error page.
2. Incognito login, or open `/inbox?_v=<new>` (bump the query in `login-form.tsx` if the current `_v=` is already cached).
3. Reproduce with a fresh browser, JWT in `localStorage` (`access_token`, `refresh_token`, `active_org_id`), listen for `pageerror`.
4. Grep the list renderer for unguarded `messages[0]`, `contact.`, `participants[0]`.
