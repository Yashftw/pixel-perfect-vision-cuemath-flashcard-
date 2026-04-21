import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
                <div className="brutal bg-white p-8 max-w-sm w-full text-center space-y-4">
                    <Loader2 className="w-12 h-12 text-brand-orange animate-spin mx-auto" />
                    <h2 className="text-xl font-bold">Waking up the brain cells...</h2>
                </div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return <>{children}</>;
}
