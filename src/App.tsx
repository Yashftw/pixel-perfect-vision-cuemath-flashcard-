import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "./lib/supabase";
import { Loader2 } from "lucide-react";

import { AuthGuard } from "./components/AuthGuard";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import Decks from "./pages/Decks";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";
import StudyPage from "./pages/StudyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * AuthCallback Component
 * Handles the redirect from Google/Supabase and moves the user to the dashboard.
 */
const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session) {
        navigate("/", { replace: true });
      } else if (error) {
        console.error("Auth error:", error.message);
        navigate("/login", { replace: true });
      }
    };

    handleAuth();

    // Listen for the sign-in event
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/", { replace: true });
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-brand-cream flex flex-col items-center justify-center p-6">
      <div className="brutal bg-white p-8 max-w-sm w-full text-center space-y-4 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <Loader2 className="w-12 h-12 text-brand-orange animate-spin mx-auto" />
        <h2 className="text-xl font-bold">Syncing your progress...</h2>
        <p className="text-gray-600">Setting up your brain cells.</p>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected Routes - Wrapped in AuthGuard */}
          <Route
            path="/"
            element={
              <AuthGuard>
                <Index />
              </AuthGuard>
            }
          />
          <Route
            path="/decks"
            element={
              <AuthGuard>
                <Decks />
              </AuthGuard>
            }
          />
          <Route
            path="/study/:deckId"
            element={
              <AuthGuard>
                <StudyPage />
              </AuthGuard>
            }
          />
          <Route
            path="/stats"
            element={
              <AuthGuard>
                <Stats />
              </AuthGuard>
            }
          />
          <Route
            path="/profile"
            element={
              <AuthGuard>
                <Profile />
              </AuthGuard>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;