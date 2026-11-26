import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Landmark,
  LockKeyhole,
  WalletCards,
} from 'lucide-react';
import editorialImage from '../assets/finance-editorial.webp';
import ThemeToggle from './layout/ThemeToggle';

const Landing: React.FC = () => (
  <div className="min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-md">
      <nav aria-label="Main navigation" className="mx-auto flex h-[72px] max-w-[1380px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" className="inline-flex items-center gap-3" aria-label="Finance Pulse home">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-white dark:text-slate-950">
            <Landmark aria-hidden="true" className="size-[17px]" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.04em]">finance pulse</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#approach" className="text-[13px] text-muted transition-colors hover:text-foreground">How it works</a>
          <a href="#privacy" className="text-[13px] text-muted transition-colors hover:text-foreground">Your privacy</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Link to="/auth?mode=signin" className="hidden px-2 py-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground sm:inline-flex">Sign in</Link>
          <Link to="/auth?mode=signup" className="motion-button inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-[13px] font-medium text-white transition-colors hover:bg-forest/90 dark:text-slate-950 sm:px-5">
            Get started <ArrowUpRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </nav>
    </header>

    <main>
      <section className="mx-auto grid max-w-[1380px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 md:grid-cols-[0.9fr_1.1fr] md:gap-10 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-[590px]">
          <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.19em] text-moss">
            <span className="h-px w-8 bg-accent" />
            A more considered view of everyday money
          </p>
          <h1 className="max-w-[590px] text-[3.45rem] leading-[0.93] tracking-[-0.06em] sm:text-[4.5rem] lg:text-[5.35rem]">
            See your money <span className="font-display italic text-primary">more clearly.</span>
          </h1>
          <p className="mt-7 max-w-[450px] text-[15px] leading-7 text-muted sm:text-base">
            Bring what comes in, what goes out, and what matters next into one calm, useful place.
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link to="/auth?mode=signup" className="motion-button group inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-forest/90 dark:text-slate-950">
              Create your account
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/auth?mode=signin" className="inline-flex min-h-12 items-center justify-center px-4 text-sm font-medium text-muted transition-colors hover:text-foreground">
              I already have an account
            </Link>
          </div>
          <div className="mt-9 inline-flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted">
            <LockKeyhole aria-hidden="true" className="size-4 text-moss" />
            Private by design. Yours to explore at your pace.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[720px] md:pl-5">
          <div className="relative overflow-hidden rounded-sm bg-secondary">
            <img src={editorialImage} alt="A paper ledger and olive branch in soft afternoon light" fetchPriority="high" decoding="async" className="aspect-[1.18/1] w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground/35 to-transparent" aria-hidden="true" />
          </div>
          <div className="absolute -bottom-7 left-2 w-[min(345px,calc(100%-20px))] border border-border bg-surface p-5 shadow-[0_16px_48px_rgba(37,42,36,0.14)] sm:bottom-8 sm:-left-7 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-muted">Inside your workspace</p>
                <p className="mt-2 font-display text-[27px] leading-none tracking-tight">The whole picture, in one place.</p>
              </div>
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                <ArrowDownRight aria-hidden="true" className="size-4" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
              <span className="pr-2">Income</span><span className="px-3">Spending</span><span className="pl-3">Balance</span>
            </div>
            <div className="mt-3 flex h-8 items-end gap-1" aria-hidden="true">
              {[36, 54, 42, 72, 50, 84, 62, 100, 68, 92, 58, 78].map((height, index) => (
                <span key={index} className={`flex-1 ${index > 8 ? 'bg-accent/70' : 'bg-moss/70'}`} style={{ height: `${height}%` }} />
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted">A visual guide to the kinds of patterns you can explore.</p>
          </div>
          <div className="absolute -right-2 -top-5 hidden size-[82px] items-center justify-center rounded-full border border-border bg-background text-center text-[9px] font-semibold uppercase leading-[1.35] tracking-[0.14em] text-primary sm:flex">
            Money,<br />in perspective
          </div>
        </div>
      </section>

      <section id="approach" className="border-y border-border bg-[#eeede4] dark:bg-[#222922]">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:gap-20 lg:px-12 lg:py-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">A little more perspective</p>
            <h2 className="mt-4 max-w-sm text-[2.5rem] leading-[0.98] sm:text-[3.2rem]">Good decisions start with a clear picture.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-7">
            <article className="border-t border-border pt-5">
              <WalletCards aria-hidden="true" className="size-5 text-primary" />
              <h3 className="mt-5 text-[22px] leading-tight">Know your flow</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">Keep everyday income and spending in one considered view.</p>
            </article>
            <article className="border-t border-border pt-5">
              <BarChart3 aria-hidden="true" className="size-5 text-primary" />
              <h3 className="mt-5 text-[22px] leading-tight">Notice the patterns</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">Explore how your activity changes and where it tends to go.</p>
            </article>
            <article id="privacy" className="border-t border-border pt-5">
              <LockKeyhole aria-hidden="true" className="size-5 text-primary" />
              <h3 className="mt-5 text-[22px] leading-tight">Keep it personal</h3>
              <p className="mt-2 text-[12px] leading-6 text-muted">Your records stay behind account-level access controls.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-12 lg:py-20">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-moss">Start where you are</p>
          <h2 className="mt-3 max-w-2xl text-[2.5rem] leading-[0.98] sm:text-[3.25rem]">Make a little room for a better money habit.</h2>
        </div>
        <Link to="/auth?mode=signup" className="motion-button inline-flex min-h-12 items-center justify-center gap-3 justify-self-start rounded-md bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-forest/90 dark:text-slate-950 md:justify-self-end">
          Get started <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </section>
    </main>

    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-3 px-5 py-6 text-[11px] text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span className="font-semibold tracking-[-0.03em] text-foreground">finance pulse</span>
        <span>Thoughtful tools for everyday financial clarity.</span>
        <Link to="/auth?mode=signin" className="transition-colors hover:text-foreground">Sign in <ArrowUpRight aria-hidden="true" className="ml-1 inline size-3.5" /></Link>
      </div>
    </footer>
  </div>
);

export default Landing;
