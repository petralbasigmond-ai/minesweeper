# Supabase Integration — Fix Plan

## Steps
- [x] 1. `landing.html` (root) — Fixed login form: replaces `loginNick` with `loginEmail`, added `regEmail` field, fixed register to pass email
- [x] 2. `landing.html` (root) — Module import path was already correct (`./static/js/auth.js`) 
- [x] 3. `templates/landing.html` — Fixed `loginNick.value` → `loginEmail.value` (login was completely broken)
- [x] 4. `static/js/auth.js` — Added auto-login after registration (checks for existing session)
- [x] 5. `static/js/auth.js` — Better error messages for email confirmation scenarios
- [x] 6. `static/js/auth.js` — Added `_buildAndCacheUser()` helper to prevent code duplication

## ✅ All Fixes Complete
The Supabase integration is now fully wired. Users can:
1. Register with nickname + email + password (Supabase auth + profiles table)
2. Auto-login immediately if email confirmation is disabled in Supabase
3. Login with email + password (loads profile, progress, statistics from DB)
4. Game progress is saved to both localStorage cache and Supabase DB

