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

import {
    register as supabaseRegister,
    login as supabaseLogin,
    logout as supabaseLogout,
    getCurrentUser as getSupabaseUser
} from "./supabaseAuth.js";

import {
    createProfile,
    createDefaultProgress,
    loadProfile,
    loadProgress,
    loadStatistics,
    nicknameExists,
    updateProgress,
    updateStatistics
} from "./userService.js";


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
    async register(nickname, email, password) {

    if (!nickname || !nickname.trim()) {
        return {
            success: false,
            error: "Nickname is required."
        };
    }

    if (!email || !email.trim()) {
        return {
            success: false,
            error: "Email is required."
        };
    }

    if (!password || password.length < 6) {
        return {
            success: false,
            error: "Password must be at least 6 characters."
        };
    }

    const trimmedNick = nickname.trim();
    const trimmedEmail = email.trim();

    if (await nicknameExists(trimmedNick)) {
    return {
        success: false,
        error: "Nickname already taken."
        };
    }

    const { data, error } =
        await supabaseRegister(trimmedEmail, password);

    if (error) {
        return {
            success: false,
            error: error.message
        };
    }

    const user = data.user;

    if (!user) {
        // Check if session exists (auto-confirm enabled in Supabase)
        const session = await getSupabaseUser();
        if (session) {
            // Auto-login: session was created immediately
            await createProfile(session.id, trimmedNick);
            await createDefaultProgress(session.id);
            // Load and cache the user data
            return await this._buildAndCacheUser(session);
        }
        return {
            success: false,
            error: "Registration failed. Please check your email for a confirmation link if required."
        };
    }

    

    await createProfile(user.id, trimmedNick);

    await createDefaultProgress(user.id);

    // Check if a session was created (email confirmation disabled in Supabase)
    const { data: sessionData } = await import('./supabaseAuth.js').then(m => m.getSession());
    if (sessionData?.session) {
        // Auto-login: email confirmation is disabled
        return await this._buildAndCacheUser(user);
    }

    return {
        success: true,
        emailConfirmationRequired: true
            };
    },

    async login(email, password) {

    const { data, error } =
        await supabaseLogin(email, password);

    if (error) {
        return {
            success: false,
            error: error.message
        };
    }

    const user = data.user;

    const { data: profile } =
        await loadProfile(user.id);

    const { data: progress } =
        await loadProgress(user.id);

    const { data: statistics } =
        await loadStatistics(user.id);

    const currentUser = {
        id: user.id,
        email: user.email,
        nickname: profile.nickname,

        currentLevel: progress.current_level,

        easyCompleted: progress.easy_completed,
        mediumCompleted: progress.medium_completed,
        hardCompleted: progress.hard_completed,

        stats: statistics,

        highScores: {
            easy: progress.easy_highscore,
            medium: progress.medium_highscore,
            hard: progress.hard_highscore
        }
    };

    localStorage.setItem(
        LS_CURRENT_KEY,
        JSON.stringify(currentUser)
    );

    return {
        success: true,
        user: currentUser
    };
},

async getCurrentUser() {

    const cached = localStorage.getItem(LS_CURRENT_KEY);

    if (cached) {
        return JSON.parse(cached);
    }

    // No local cache — try refreshing from Supabase
    const freshUser = await this.refreshCurrentUser();
    if (!freshUser) {
        // No valid Supabase session — clear any stale legacy data
        localStorage.removeItem(LS_CURRENT_KEY);
        localStorage.removeItem(LS_USERS_KEY);
    }
    return freshUser;

},

async logout() {

    localStorage.removeItem(LS_CURRENT_KEY);

    await supabaseLogout();

},

async saveProgress(update) {

    const current =
        await this.getCurrentUser();

    if (!current) return;

    Object.assign(current, update);

    localStorage.setItem(
        LS_CURRENT_KEY,
        JSON.stringify(current)
    );

    await updateProgress(current.id, {

        current_level: current.currentLevel,

        easy_completed: current.easyCompleted,

        medium_completed: current.mediumCompleted,

        hard_completed: current.hardCompleted,

        easy_highscore: current.highScores.easy,

        medium_highscore: current.highScores.medium,

        hard_highscore: current.highScores.hard

    });

    await updateStatistics(current.id, {

        games: current.stats.games,

        wins: current.stats.wins,

        streak: current.stats.streak,

        best_streak: current.stats.bestStreak

    });

},

async refreshCurrentUser() {

    const user = await getSupabaseUser();

    if (!user) return null;

    const { data: profile } = await loadProfile(user.id);
    const { data: progress } = await loadProgress(user.id);
    const { data: statistics } = await loadStatistics(user.id);

    const currentUser = {
        id: user.id,
        email: user.email,
        nickname: profile.nickname,

        currentLevel: progress.current_level,

        easyCompleted: progress.easy_completed,
        mediumCompleted: progress.medium_completed,
        hardCompleted: progress.hard_completed,

        stats: {
            games: statistics.games,
            wins: statistics.wins,
            streak: statistics.streak,
            bestStreak: statistics.best_streak
        },

        highScores: {
            easy: progress.easy_highscore,
            medium: progress.medium_highscore,
            hard: progress.hard_highscore
        }
    };

    localStorage.setItem(
        LS_CURRENT_KEY,
        JSON.stringify(currentUser)
    );

    return currentUser;
},

    /**
     * Build user object from Supabase user and cache to localStorage.
     * @param {object} user - Supabase user object
     * @returns {{ success: boolean, user: object }}
     */
    async _buildAndCacheUser(user) {
        const { data: profile } = await loadProfile(user.id);
        const { data: progress } = await loadProgress(user.id);
        const { data: statistics } = await loadStatistics(user.id);

        const currentUser = {
            id: user.id,
            email: user.email,
            nickname: profile?.nickname || 'Miner',

            currentLevel: progress?.current_level || 'easy',

            easyCompleted: progress?.easy_completed || false,
            mediumCompleted: progress?.medium_completed || false,
            hardCompleted: progress?.hard_completed || false,

            stats: {
                games: statistics?.games || 0,
                wins: statistics?.wins || 0,
                streak: statistics?.streak || 0,
                bestStreak: statistics?.best_streak || 0
            },

            highScores: {
                easy: progress?.easy_highscore || 0,
                medium: progress?.medium_highscore || 0,
                hard: progress?.hard_highscore || 0
            }
        };

        localStorage.setItem(
            LS_CURRENT_KEY,
            JSON.stringify(currentUser)
        );

        return {
            success: true,
            user: currentUser
        };
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

