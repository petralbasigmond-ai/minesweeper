import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://zhhvwlqyokhtsuxlmqep.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoaHZ3bHF5b2todHN1eGxtcWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjU1MTMsImV4cCI6MjEwMDc0MTUxM30.wL7nL2Gv6n44IZWAC5J2yHcg23sTABUZhkzpEOn6OjE';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);