import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Mail, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const { user, signInWithMagicLink, signInWithGoogle } = useAuth();

    // If the user happens to have an active session, auto-navigate to their library!
    if (user) {
        return <Navigate to="/decks" replace />;
    }

    const handleMagicLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        try {
            setStatus('loading');
            setErrorMessage('');
            await signInWithMagicLink(email);
            setStatus('success');
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage((err as Error).message || "Oops! Something went wrong. Make sure you typed a real email.");
        }
    };

    const handleGoogle = async () => {
        try {
            setStatus('loading');
            await signInWithGoogle();
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage((err as Error).message || "Failed to log in with Google.");
        }
    };

    return (
        <div className="min-h-screen bg-brand-cream text-foreground p-6 sm:p-12 flex flex-col md:flex-row items-center justify-center gap-12">
            
            {/* Left standard hero area */}
            <div className="flex-1 max-w-lg space-y-8 animate-in slide-in-from-left duration-500">
                <div className="inline-flex items-center gap-3 bg-brand-yellow brutal px-5 py-2 animate-float">
                    <BookOpen className="w-6 h-6 stroke-[2.5px]" />
                    <span className="font-bold tracking-tight">BrainBlox</span>
                </div>
                
                <h1 className="text-5xl md:text-7xl leading-[1.1] tracking-tight">
                    Ready to <span className="text-brand-orange drop-shadow-[3px_3px_0_hsl(var(--border))]">Level Up</span> Your Brain? 🚀
                </h1>
                
                <p className="text-xl md:text-2xl font-bold text-muted-foreground leading-relaxed">
                    Instantly turn any school PDF into smart, interactive flashcards in seconds!
                </p>
            </div>

            {/* Right log in card */}
            <div className="w-full max-w-md animate-in slide-in-from-right duration-500 delay-150">
                <div className="brutal-lg bg-card p-8 md:p-10 space-y-8 relative overflow-hidden">
                    
                    {/* Decorative element */}
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-blue rounded-full border-4 border-border opacity-20 pointer-events-none" />

                    <div className="space-y-2 relative z-10">
                        <h2 className="text-3xl">Welcome Back!</h2>
                        <p className="text-muted-foreground font-bold text-base">Let's get those neurons firing.</p>
                    </div>

                    {status === 'success' ? (
                        <div className="bg-brand-green brutal px-6 py-8 text-center space-y-4 animate-in zoom-in">
                            <div className="w-16 h-16 bg-white brutal-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-brand-green" />
                            </div>
                            <h3 className="text-2xl text-white drop-shadow-[2px_2px_0_hsl(var(--border))]">Check your email!</h3>
                            <p className="font-bold text-white/90">
                                We sent a magic link to <br/> <span className="underline decoration-2">{email}</span> 📬
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6 relative z-10">
                            
                            {status === 'error' && (
                                <div className="bg-brand-red/20 border-2 border-brand-red p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-brand-red shrink-0 mt-0.5" />
                                    <p className="text-sm font-bold text-brand-red mix-blend-multiply">{errorMessage}</p>
                                </div>
                            )}

                            <form onSubmit={handleMagicLink} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-bold inline-block ml-1">
                                        Your Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="student@school.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full brutal-sm px-4 py-3 bg-background outline-none focus:ring-4 ring-brand-purple/50 transition-shadow text-base font-bold placeholder:text-muted-foreground/60"
                                        disabled={status === 'loading'}
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full bg-brand-purple brutal-press brutal-sm px-4 py-3.5 flex items-center justify-center gap-2 group font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {status === 'loading' ? 'Sending...' : 'Send Magic Link'}
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </form>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t-2 border-border/20"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="bg-card px-4 font-bold text-muted-foreground">OR</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogle}
                                disabled={status === 'loading'}
                                className="w-full bg-white brutal-press brutal-sm px-4 py-3.5 flex items-center justify-center gap-3 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.79 15.73 17.57V20.34H19.3C21.39 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                                    <path d="M12 23C14.97 23 17.46 22.02 19.3 20.34L15.73 17.57C14.74 18.24 13.48 18.64 12 18.64C9.13 18.64 6.7 16.7 5.82 14.11H2.15V16.96C3.96 20.55 7.69 23 12 23Z" fill="#34A853"/>
                                    <path d="M5.82 14.11C5.59 13.44 5.46 12.73 5.46 12C5.46 11.27 5.59 10.56 5.82 9.89V7.04H2.15C1.41 8.52 1 10.21 1 12C1 13.79 1.41 15.48 2.15 16.96L5.82 14.11Z" fill="#FBBC05"/>
                                    <path d="M12 5.36C13.62 5.36 15.06 5.92 16.2 7.01L19.39 3.82C17.45 2.01 14.97 1 12 1C7.69 1 3.96 3.45 2.15 7.04L5.82 9.89C6.7 7.3 9.13 5.36 12 5.36Z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
