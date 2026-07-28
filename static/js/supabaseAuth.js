import { supabase } from "./supabase.js";

export async function register(email, password) {
    return await supabase.auth.signUp({
        email,
        password
    });
}

export async function login(email, password) {
    return await supabase.auth.signInWithPassword({
        email,
        password
    });
}

export async function logout() {
    return await supabase.auth.signOut();
}

export async function getCurrentUser() {
    const {
        data: { user }
    } = await supabase.auth.getUser();

    return user;
}

export async function getSession() {
    const {
        data: { session }
    } = await supabase.auth.getSession();

    return session;
}