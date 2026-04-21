import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export async function signInWithMagicLink(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
}

export async function signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/decks`,
        }
    });
    if (error) throw error;
}

export async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
        console.error("Error fetching user:", error);
        return null;
    }
    return user;
}
