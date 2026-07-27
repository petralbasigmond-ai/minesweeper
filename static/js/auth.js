/**
 * auth.js — Client-side authentication & progress management
 * Uses localStorage for persistence (works on Vercel static hosting).
 *
 * Data structure per user in localStorage['minesweeperUsers']:
 * {
 *   nickname: string,
 *   passwordHash: string (SHA-256),
 *   currentLevel: 'easy' | 'medium' | 'hard',
 *   easyCompleted: boolean,
 *   mediumCompleted: boolean,
 *   hardCompleted: boolean,
 *   stats: { games, wins, streak, bestStreak },
 *   highScores: { easy: number, medium: number, hard: number }
 * }
 */

const LS_USERS_KEY = 'minesweeperUsers';
const LS_CURRENT_KEY = 'minesweeperCurrentUser';

const Auth = {
    /**
     * Hash a password using the Web Crypto API (SHA-256).
     * Returns a hex string.
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    /**
     * Get all users from localStorage.
     */
    getAllUsers() {
        try {
            const raw = localStorage.getItem(LS_USERS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    },

    /**
     * Save all users to localStorage.
     */
    _saveAllUsers(users) {
        localStorage.setItem(LS_USERS_KEY, JSON.stringify(users));
    },

    /**
     * Find a user by nickname.
     */
    _findUser(nickname) {
        const users = this.getAllUsers();
        return users.find(u => u.nickname === nickname) || null;
    },

    /**
     * Register a new user account.
     * @param {string} nickname
     * @param {string} password
     * @returns {{ success: boolean, error?: string }}
     */
    async register(nickname, password) {
        // Validate inputs
        if (!nickname || !nickname.trim()) {
            return { success: false, error: 'Nickname is required.' };
        }
        if (!password || password.length < 3) {
            return { success: false, error: 'Password must be at least 3 characters.' };
        }
        const trimmedNick = nickname.trim();

        // Check if nickname already exists
        if (this._findUser(trimmedNick)) {
            return { success: false, error: 'Nickname already taken. Please choose another.' };
        }

        const passwordHash = await this.hashPassword(password);

        const users = this.getAllUsers();
        const newUser = {
            nickname: trimmedNick,
            passwordHash,
            currentLevel: 'easy',
            easyCompleted: false,
            mediumCompleted: false,
            hardCompleted: false,
            stats: { games: 0, wins: 0, streak: 0, bestStreak: 0 },
            highScores: { easy: 0, medium: 0, hard: 0 }
        };
        users.push(newUser);
        this._saveAllUsers(users);

        return { success: true };
    },

    /**
     * Log in an existing user.
     * @param {string} nickname
     * @param {string} password
     * @returns {{ success: boolean, error?: string, user?: object }}
     */
    async login(nickname, password) {
        if (!nickname || !nickname.trim()) {
            return { success: false, error: 'Nickname is required.' };
        }
        if (!password) {
            return { success: false, error: 'Password is required.' };
        }

        const trimmedNick = nickname.trim();
        const user = this._findUser(trimmedNick);
        if (!user) {
            return { success: false, error: 'Account not found. Please register first.' };
        }

        const passwordHash = await this.hashPassword(password);
        if (user.passwordHash !== passwordHash) {
            return { success: false, error: 'Incorrect password.' };
        }

        // Set current user (store a sanitized copy without passwordHash)
        const currentUser = { ...user };
        delete currentUser.passwordHash;
        localStorage.setItem(LS_CURRENT_KEY, JSON.stringify(currentUser));

        return { success: true, user: currentUser };
    },

    /**
     * Log out the current user.
     */
    logout() {
        localStorage.removeItem(LS_CURRENT_KEY);
    },

    /**
     * Get the currently logged-in user's data.
     * @returns {object|null}
     */
    getCurrentUser() {
        try {
            const raw = localStorage.getItem(LS_CURRENT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) {
            return null;
        }
    },

    /**
     * Save game progress for the current user.
     * @param {object} progress - Partial data to merge into user record
     *   { currentLevel?, easyCompleted?, mediumCompleted?, hardCompleted?, stats?, highScores? }
     * @returns {boolean} success
     */
    saveProgress(progress) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        const users = this.getAllUsers();
        const index = users.findIndex(u => u.nickname === currentUser.nickname);
        if (index === -1) return false;

        // Merge progress into user data
        Object.assign(users[index], progress);

        // Ensure passwordHash is preserved
        if (!users[index].passwordHash) {
            // Re-hash from user input if needed (shouldn't happen)
            return false;
        }

        this._saveAllUsers(users);

        // Update current user in localStorage (without passwordHash)
        const updatedUser = { ...users[index] };
        delete updatedUser.passwordHash;
        localStorage.setItem(LS_CURRENT_KEY, JSON.stringify(updatedUser));

        return true;
    },

    /**
     * Check if a level is unlocked for the current user.
     * @param {'easy'|'medium'|'hard'} level
     * @returns {boolean}
     */
    isLevelUnlocked(level) {
        const user = this.getCurrentUser();
        if (!user) return false;

        if (level === 'easy') return true;
        if (level === 'medium') return user.easyCompleted;
        if (level === 'hard') return user.mediumCompleted;
        return false;
    },

    /**
     * Mark a level as completed (unlocks next level).
     * @param {'easy'|'medium'|'hard'} level
     */
    completeLevel(level) {
        const update = {};
        if (level === 'easy') {
            update.easyCompleted = true;
            update.currentLevel = 'medium';
        } else if (level === 'medium') {
            update.mediumCompleted = true;
            update.currentLevel = 'hard';
        } else if (level === 'hard') {
            update.hardCompleted = true;
        }
        this.saveProgress(update);
    }
};

export default Auth;
