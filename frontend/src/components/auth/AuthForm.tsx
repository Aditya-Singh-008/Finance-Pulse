import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Landmark, Loader2, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
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
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-primary px-10 py-9 text-white dark:text-slate-950 lg:flex xl:px-14">
        <div aria-hidden="true" className="absolute -right-32 top-[22%] size-[420px] rounded-full border border-white/10 dark:border-slate-950/15" />
        <div aria-hidden="true" className="absolute -right-12 top-[31%] size-[260px] rounded-full border border-white/10 dark:border-slate-950/15" />
        <Link to="/" className="relative z-10 inline-flex w-fit items-center gap-3" aria-label="Finance Pulse home">
          <span className="flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/10 dark:border-slate-950/20 dark:bg-slate-950/10"><Landmark aria-hidden="true" className="size-[17px]" /></span>
          <span className="text-sm font-semibold tracking-[-0.04em]">finance pulse</span>
        </Link>

        <div className="relative z-10 mb-12 max-w-[430px]">
          <p className="mb-4 flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/70 dark:text-slate-950/70"><span className="h-px w-7 bg-accent" />A calmer view of your finances</p>
          <h1 className="text-[3.8rem] leading-[0.95] tracking-[-0.055em] xl:text-[4.5rem]">Your money, with a little more perspective.</h1>
          <p className="mt-5 max-w-sm text-[13px] leading-6 text-white/75 dark:text-slate-950/75">A private space to see what is happening and decide what matters next.</p>
        </div>

        <p className="relative z-10 text-[9px] font-medium uppercase tracking-[0.17em] text-white/55 dark:text-slate-950/55">Private by design · Finance Pulse</p>
      </aside>

      <section className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 xl:px-16">
        <header className="flex items-center justify-between">
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-medium text-muted transition-colors hover:text-foreground lg:invisible">
            <Landmark aria-hidden="true" className="size-4" /> finance pulse
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Link to="/" className="hidden items-center gap-2 text-[11px] text-muted transition-colors hover:text-foreground lg:inline-flex"><ArrowLeft aria-hidden="true" className="size-3.5" /> Back to home</Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[405px] flex-1 flex-col justify-center py-12">
          <div className="mb-8">
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-moss">{isSignUp ? 'A good place to begin' : 'Your personal finance space'}</p>
            <h2 className="text-[2.7rem] leading-[0.96] tracking-[-0.05em] sm:text-[3.2rem]">{isSignUp ? 'A clear place to begin.' : 'Welcome back.'}</h2>
            <p className="mt-4 text-[13px] leading-6 text-muted">{isSignUp ? 'Create an account to start seeing your money differently.' : 'Sign in to pick up where you left off.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && <div role="alert" aria-live="polite" className="border-l-2 border-negative bg-negative/5 px-4 py-3 text-[12px] leading-5 text-negative">{error}</div>}

            {isSignUp && (
              <div className="flex flex-col gap-2">
                <label htmlFor="full-name" className="text-[11px] font-medium text-foreground">Full name</label>
                <div className="relative">
                  <UserRound aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input id="full-name" name="name" type="text" autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} required className="min-h-12 w-full border border-border bg-surface pl-10 pr-4 text-[13px] text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Your name" />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-[11px] font-medium text-foreground">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="min-h-12 w-full border border-border bg-surface px-4 text-[13px] text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="you@example.com" />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-[11px] font-medium text-foreground">Password</label>
              <div className="relative">
                <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required className="min-h-12 w-full border border-border bg-surface pl-10 pr-12 text-[13px] text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center text-muted transition-colors hover:text-foreground">
                  {showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="motion-button group mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 text-[12px] font-medium text-white transition-colors hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-950">
              {loading && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {isSignUp ? 'Create account' : 'Sign in'}
              {!loading && <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />}
            </button>
          </form>

          <div className="mt-7 flex items-start gap-2 border-t border-border pt-5 text-[10px] leading-5 text-muted">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
            Your account is protected with secure sign-in and private data access.
          </div>

          <p className="mt-7 text-center text-[12px] text-muted">
            {isSignUp ? 'Already have an account?' : 'New to Finance Pulse?'}{' '}
            <button onClick={() => setSearchParams({ mode: isSignUp ? 'signin' : 'signup' })} className="font-semibold text-primary underline decoration-moss/50 underline-offset-4 transition-colors hover:text-accent">
              {isSignUp ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>

        <footer className="flex items-center justify-between border-t border-border pt-4 text-[9px] text-muted">
          <span>© {new Date().getFullYear()} Finance Pulse</span>
          <span className="inline-flex items-center gap-1.5"><LockKeyhole aria-hidden="true" className="size-3.5" /> Secure account access</span>
        </footer>
      </section>
    </main>
  );
};

export default AuthForm;
