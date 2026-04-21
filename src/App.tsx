import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuth } from "./hooks/useAuth";
import { AuthGuard } from "./components/AuthGuard";

import Index from "./pages/Index";
import LoginPage from "./pages/LoginPage";
import Decks from "./pages/Decks";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";
import StudyPage from "./pages/StudyPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected Routes */}
          <Route path="/decks" element={<AuthGuard><Decks /></AuthGuard>} />
          <Route path="/study/:deckId" element={<AuthGuard><StudyPage /></AuthGuard>} />
          <Route path="/stats" element={<AuthGuard><Stats /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
