import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { LayoutDashboard, Lock, AtSign, Eye, EyeOff, Loader2 } from 'lucide-react';
import ThemeToggle from '../layout/ThemeToggle';
import toast from 'react-hot-toast';

const AuthForm: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const mode = searchParams.get('mode');

    const [isSignUp, setIsSignUp] = useState<boolean>(mode === 'signup');
    const [loading, setLoading] = useState<boolean>(false);

    // Sync state with query param changes
    useEffect(() => {
        setIsSignUp(mode === 'signup');
    }, [mode]);
    
    const [email, setEmail] = useState<string>('');
    const [fullName, setFullName] = useState<string>(''); // New field for registration
    const [password, setPassword] = useState<string>('');
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isSignUp) {
                // Ensure name is provided for sign up
                if (!fullName.trim()) {
                    throw new Error('Please enter your full name to create an account.');
                }

                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/dashboard`,
                        data: {
                            full_name: fullName.trim()
                        }
                    }
                });
                if (signUpError) throw signUpError;
                toast.success('Sign up successful! Please check your email for confirmation.');
            } else {
                const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
                if (signInError) throw signInError;
                navigate('/dashboard');

                if (data.session) {
                    console.log("MY CLEAN TOKEN:", data.session.access_token);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
            toast.error(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative transition-colors duration-500">
            {/* Absolute Theme Toggle for Auth Page */}
            <div className="absolute top-8 right-8">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl shadow-slate-200 dark:shadow-indigo-950/50 relative overflow-hidden transition-colors duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10 transition-all duration-300 group-hover:bg-indigo-100"></div>

                    <div className="flex flex-col items-center mb-10">
                        <div className="bg-indigo-600 dark:bg-indigo-500 p-4 rounded-3xl shadow-xl shadow-indigo-200/50 dark:shadow-indigo-950/50 mb-6 group transition-all duration-300 hover:scale-110">
                            <LayoutDashboard className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight text-center">
                            {isSignUp ? 'Create your account' : 'Welcome back'}
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">FinancePulse Analytics Engine</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-medium animate-shake">
                                {error}
                            </div>
                        )}

                        {/* Full Name Field — Sign Up Only */}
                        {isSignUp && (
                            <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Full Name</label>
                                <div className="relative">
                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none rounded-2xl transition-all duration-300 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                        placeholder="Enter your name"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Email Address</label>
                            <div className="relative">
                                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none rounded-2xl transition-all duration-300 font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none rounded-2xl transition-all duration-300 font-medium text-slate-900 dark:text-slate-100"
                                    placeholder="Enter your password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-950/50 disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                            <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setSearchParams({ mode: isSignUp ? 'signin' : 'signup' })}
                            className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 py-2 px-4 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-bold"
                        >
                            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthForm;
