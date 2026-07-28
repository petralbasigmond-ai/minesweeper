import { supabase } from "./supabase.js";

export async function createProfile(userId, nickname) {
    return await supabase
        .from("profiles")
        .insert({
            id: userId,
            nickname
        });
}

export async function createDefaultProgress(userId) {
    await supabase
        .from("game_progress")
        .insert({
            user_id: userId
        });

    await supabase
        .from("game_statistics")
        .insert({
            user_id: userId
        });

    await supabase
        .from("user_settings")
        .insert({
            user_id: userId
        });
}

export async function loadProfile(userId) {
    return await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
}

export async function loadProgress(userId) {
    return await supabase
        .from("game_progress")
        .select("*")
        .eq("user_id", userId)
        .single();
}

export async function loadStatistics(userId) {
    return await supabase
        .from("game_statistics")
        .select("*")
        .eq("user_id", userId)
        .single();
}

export async function loadSettings(userId) {
    return await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .single();
}


export async function nicknameExists(nickname) {
    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", nickname)
        .maybeSingle();

    if (error && error.code !== "PGRST116") {
        throw error;
    }

    return !!data;
}


export async function updateProgress(userId, updates) {
    return await supabase
        .from("game_progress")
        .update(updates)
        .eq("user_id", userId);
}

export async function updateStatistics(userId, updates) {
    return await supabase
        .from("game_statistics")
        .update(updates)
        .eq("user_id", userId);
}

export async function updateSettings(userId, updates) {
    return await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", userId);
}