# Fix: Default Game Difficulty to Easy on Login

## Steps
- [x] Plan approved by user
- [x] 1. `templates/index.html` — Move `active` class from Medium button to Easy button
- [x] 2. `static/js/game.js` — Change initial board creation from `'medium'` to `'easy'`
- [x] 3. `static/js/game.js` — Change `currentDifficulty` initial value from `'medium'` to `'easy'`
- [x] 4. `static/js/game.js` — Remove redundant `currentDifficulty = 'easy';` override at bottom

## ✅ Fixed
The game now defaults to **Easy** difficulty for all users on login. The existing level locking system (`Auth.isLevelUnlocked`, `applyLevelLocks`) remains in place to properly lock Medium/Hard behind Easy completion.

