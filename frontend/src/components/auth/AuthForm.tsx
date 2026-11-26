import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, AtSign, Eye, EyeOff, Landmark, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import editorialImage from '../../assets/finance-editorial.webp';
import ThemeToggle from '../layout/ThemeToggle';
import toast from 'react-hot-toast';

const AuthForm: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        if (!fullName.trim()) throw new Error('Please enter your full name to create an account.');

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim() },
          },
        });
        if (signUpError) throw signUpError;
        toast.success('Sign up successful. Please check your email for confirmation.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        navigate('/dashboard');
      }
    } catch (submissionError: unknown) {
      const message = submissionError instanceof Error ? submissionError.message : 'Authentication failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="finance-auth min-h-screen bg-paper text-ink dark:bg-slate-950 dark:text-slate-100 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#e4dfd1] lg:block" aria-label="Finance Pulse introduction">
        <img src={editorialImage} alt="Sunlight falls across a paper ledger and olive branch" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#20281f]/85 via-[#20281f]/15 to-transparent" />
        <Link to="/" className="absolute left-10 top-9 z-10 inline-flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm"><Landmark aria-hidden="true" className="h-[18px] w-[18px]" /></span>
          <span className="text-[15px] font-semibold tracking-[-0.04em]">finance pulse</span>
        </Link>
        <div className="absolute bottom-12 left-10 right-10 z-10 max-w-[520px] text-white xl:bottom-16 xl:left-14">
          <p className="mb-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/75"><span className="h-px w-7 bg-[#d8a180]" />A calmer view of your finances</p>
          <h1 className="text-5xl leading-[0.98] tracking-[-0.04em] xl:text-6xl">Make room for a little more clarity.</h1>
          <p className="mt-5 max-w-sm text-[14px] leading-6 text-white/80">Bring everyday money decisions into focus, one small habit at a time.</p>
        </div>
        <span className="absolute bottom-5 right-7 text-[9px] font-medium uppercase tracking-[0.17em] text-white/60">A personal finance workspace</span>
      </section>

      <section className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[-0.03em] text-ink dark:text-slate-100 lg:invisible">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-forest text-white"><Landmark aria-hidden="true" className="h-4 w-4" /></span>
            finance pulse
          </Link>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>

        <div className="mx-auto flex w-full max-w-[410px] flex-1 flex-col justify-center py-10">
          <div className="mb-9">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Your personal finance space</p>
            <h2 className="text-[42px] leading-[0.98] tracking-[-0.04em] text-ink dark:text-slate-100 sm:text-5xl">{isSignUp ? 'A clear place to begin.' : 'Welcome back.'}</h2>
            <p className="mt-4 text-[14px] leading-6 text-slate-600 dark:text-slate-300">{isSignUp ? 'Create an account to start seeing your money differently.' : 'Sign in to pick up where you left off.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {error && (
              <div role="alert" aria-live="polite" className="border-l-2 border-red-500 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-800 dark:bg-red-950/30 dark:text-red-200">
                {error}
              </div>
            )}

            {isSignUp && (
              <div className="space-y-2">
                <label htmlFor="full-name" className="block text-[12px] font-medium text-slate-700 dark:text-slate-200">Full name</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="full-name" name="name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required className="min-h-12 w-full border border-rule bg-slate-50 pl-10 pr-4 text-[14px] text-ink placeholder:text-slate-400 focus:border-moss focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800" placeholder="Your name" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-[12px] font-medium text-slate-700 dark:text-slate-200">Email address</label>
              <div className="relative">
                <AtSign aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="min-h-12 w-full border border-rule bg-slate-50 pl-10 pr-4 text-[14px] text-ink placeholder:text-slate-400 focus:border-moss focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800" placeholder="you@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-[12px] font-medium text-slate-700 dark:text-slate-200">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-12 w-full border border-rule bg-slate-50 pl-10 pr-12 text-[14px] text-ink placeholder:text-slate-400 focus:border-moss focus:bg-white focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-800" placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-slate-500 transition-colors hover:text-ink dark:text-slate-300 dark:hover:text-white">
                  {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="group mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-forest px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#344637] disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              {isSignUp ? 'Create account' : 'Sign in'}
              {!loading && <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <div className="mt-7 flex items-start gap-2 border-t border-rule pt-5 text-[11px] leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
            Your account is protected with secure sign-in and private data access.
          </div>

          <p className="mt-7 text-center text-[13px] text-slate-600 dark:text-slate-300">
            {isSignUp ? 'Already have an account?' : "New to Finance Pulse?"}{' '}
            <button onClick={() => setSearchParams({ mode: isSignUp ? 'signin' : 'signup' })} className="font-semibold text-forest underline decoration-[#b9c2ae] underline-offset-4 transition-colors hover:text-clay dark:text-[#c0cdb2] dark:hover:text-white">
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-rule pt-4 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>© {new Date().getFullYear()} Finance Pulse</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Secure account access</span>
        </div>
      </section>
    </main>
  );
};

export default AuthForm;
