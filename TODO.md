# Supabase Integration — Fix Plan

## Steps
- [x] 1. `landing.html` (root) — Fixed login form: replaces `loginNick` with `loginEmail`, added `regEmail` field, fixed register to pass email
- [x] 2. `landing.html` (root) — Module import path was already correct (`./static/js/auth.js`) 
- [x] 3. `templates/landing.html` — Fixed `loginNick.value` → `loginEmail.value` (login was completely broken)
- [x] 4. `static/js/auth.js` — Added auto-login after registration (checks for existing session)
- [x] 5. `static/js/auth.js` — Better error messages for email confirmation scenarios
- [x] 6. `static/js/auth.js` — Added `_buildAndCacheUser()` helper to prevent code duplication

## 🔴 Critical Fix: Infinite Redirect Loop (v2)
- [x] 7. `landing.html` (root) — Changed `Auth.getCurrentUser()` → `await Auth.refreshCurrentUser()` (verify with Supabase)
- [x] 8. `templates/landing.html` — Same fix as #7
- [x] 9. `static/js/auth.js` — `getCurrentUser()` now clears stale localStorage data when Supabase has no session

## Root Cause of Redirect Loop
Both landing pages used `Auth.getCurrentUser()` **without `await`**, which returned a Promise object (always truthy) → always redirected to `/game`. The game page called `Auth.refreshCurrentUser()` which found no real Supabase session → redirected back to `/`. Loop! 🔄

## ✅ All Fixes Complete
Users can now:
1. Register with nickname + email + password (Supabase auth + profiles table)
2. Auto-login immediately if email confirmation is disabled in Supabase
3. Login with email + password (loads profile, progress, statistics from DB)
4. Game progress is saved to both localStorage cache and Supabase DB
5. **No infinite redirect loop**: Landing page verifies session with Supabase before redirecting

