# Fix: Game Progress & High Score Saving Issues

## Root Cause
In `game.js`, `checkWinCondition()` called `saveHighScore()`, `syncStatsToAuth()`, and `Auth.completeLevel()` **without awaiting any of them**. All three called `Auth.saveProgress()` which individually fired Supabase UPDATE queries. Since they ran concurrently, the Supabase queries could complete out of order — e.g., the `updateProgress` from `saveHighScore` (sending `current_level: 'easy'`) could arrive **after** `completeLevel`'s `updateProgress` (sending `current_level: 'medium'`), overwriting the correct data with stale data.

## Changes Made

### 1. `static/js/game.js` - Consolidated saves into single atomic `Auth.saveProgress()` calls

- **`saveHighScore()`**: Changed to return the `{ highScores }` object instead of directly calling `Auth.saveProgress()`. This allows the caller to include high scores in a consolidated update.
- **`syncStatsToAuth()`**: Made async (awaits `Auth.saveProgress()`).
- **`checkWinCondition()`**: Now builds a single consolidated update object containing stats, high scores (if new), and level completion flags. Calls `await Auth.saveProgress(update)` **once** — eliminating the race condition.
- **`handleGameOver()`**: Now builds a single update object with stats and high scores (if new), and calls `await Auth.saveProgress(update)` **once**.
- **`completeLevel()` logic**: Inlined into `checkWinCondition()` to avoid a separate `Auth.saveProgress()` call.

### 2. `static/js/auth.js` - No changes needed
The `saveProgress()` function already correctly updates both localStorage and Supabase tables. The issue was that it was being called multiple times concurrently from `game.js`.

## Testing
- [ ] Login → play Easy level → win → logout → relogin → verify score and level persist
- [ ] Login → play Easy level → lose → verify stats update
- [ ] Login → play Easy level → win → verify Medium is unlocked

