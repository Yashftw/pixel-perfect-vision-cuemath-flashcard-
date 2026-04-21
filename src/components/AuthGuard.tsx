import React from 'react';
import { Navigate } from 'react-router-dom'; // Changed this import
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    // 1. Handle loading state first
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

    // 2. Declarative redirect if no user
    if (!user) {
        // This instantly redirects without needing a useEffect or returning null
        return <Navigate to="/login" replace />;
    }

    // 3. User is authenticated, render the protected content
    return <>{children}</>;
}