import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { signInWithMagicLink, signInWithGoogle, signOut } from '../lib/auth';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        let mounted = true;

        async function getSession() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    if (session?.user) {
                        void checkAndCreateProfile(session.user);
                    }
                }
            } catch (err) {
                if (mounted) setError(err as Error);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    void checkAndCreateProfile(session.user);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    async function checkAndCreateProfile(user: User) {
        try {
            // Check if profile exists
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // Determine display name from email (everything before @)
                const displayName = user.email ? user.email.split('@')[0] : 'Explorer';
                
                // Create profile
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: user.id,
                        email: user.email,
                        display_name: displayName,
                        created_at: new Date().toISOString()
                    });

                if (insertError) {
                    console.error("Failed to create profile:", insertError);
                }
            }
        } catch (err) {
            console.error("Error checking/creating profile:", err);
        }
    }

    return {
        user,
        session,
        loading,
        error,
        signInWithMagicLink,
        signInWithGoogle,
        signOut
    };
}
