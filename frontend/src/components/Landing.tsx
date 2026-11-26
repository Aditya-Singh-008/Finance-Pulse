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
  <div className="min-h-screen bg-paper text-ink transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
    <header className="sticky top-0 z-40 border-b border-rule/80 bg-paper/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <nav aria-label="Main navigation" className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-3 rounded-sm" aria-label="Finance Pulse home">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-white">
            <Landmark aria-hidden="true" className="h-[19px] w-[19px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.04em] text-ink dark:text-slate-100">finance pulse</span>
        </Link>

        <div className="hidden items-center gap-9 md:flex">
          <a href="#approach" className="text-[13px] text-slate-600 transition-colors hover:text-forest dark:text-slate-300 dark:hover:text-white">Our approach</a>
          <a href="#privacy" className="text-[13px] text-slate-600 transition-colors hover:text-forest dark:text-slate-300 dark:hover:text-white">Privacy</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <Link to="/auth?mode=signin" className="hidden px-2 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:text-forest dark:text-slate-200 sm:inline-flex">Sign in</Link>
          <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#344637] focus-visible:outline-offset-4 sm:px-5">
            Get started <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>

    <main>
      <section className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 md:grid-cols-[0.9fr_1.1fr] md:gap-8 md:px-8 md:pb-20 md:pt-16 lg:gap-16 lg:px-12 lg:pb-28 lg:pt-20">
        <div className="relative z-10 max-w-[580px]">
          <p className="mb-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.19em] text-moss">
            <span className="h-px w-8 bg-clay" />
            Personal finance, with perspective
          </p>
          <h1 className="max-w-[570px] text-[3.5rem] leading-[0.98] tracking-[-0.055em] text-ink dark:text-slate-100 sm:text-[4.5rem] md:text-[3.75rem] lg:text-[4.25rem] xl:text-[5.25rem]">
            See your money <span className="italic text-forest dark:text-[#adbd9e]">more clearly.</span>
          </h1>
          <p className="mt-7 max-w-[470px] text-[16px] leading-7 text-slate-600 dark:text-slate-300 sm:text-[17px]">
            A thoughtful place to follow what comes in, what goes out, and what you want to do next.
          </p>
          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link to="/auth?mode=signup" className="group inline-flex min-h-12 items-center justify-center gap-3 rounded-md bg-forest px-6 text-sm font-medium text-white transition-colors hover:bg-[#344637]">
              Create your account
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/auth?mode=signin" className="inline-flex min-h-12 items-center justify-center gap-2 px-4 text-sm font-medium text-slate-700 transition-colors hover:text-forest dark:text-slate-200 dark:hover:text-white">
              I already have an account
            </Link>
          </div>
          <div className="mt-10 flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <LockKeyhole aria-hidden="true" className="h-4 w-4 text-moss" />
            Private by design. Yours to explore at your pace.
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[680px]">
          <div className="overflow-hidden rounded-[3px] bg-[#e4dfd1]">
            <img src={editorialImage} alt="A sunlit desk with a paper ledger, olive branch, and sculptural ceramic cup" fetchPriority="high" decoding="async" className="aspect-[1.18/1] w-full object-cover" />
          </div>
          <div className="absolute -bottom-5 left-3 w-[min(330px,calc(100%-24px))] border border-rule bg-slate-50 p-5 shadow-[0_16px_60px_rgba(38,44,35,0.13)] dark:border-slate-700 dark:bg-slate-900 sm:bottom-8 sm:-left-8 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-500 dark:text-slate-400">A sample monthly view</p>
                <p className="mt-2 font-display text-[29px] leading-none tracking-tight text-ink dark:text-slate-100">A little more in balance</p>
              </div>
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef1e9] text-forest dark:bg-[#2e3a2d] dark:text-[#bdc9ae]">
                <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-5 flex h-12 items-end gap-1.5" aria-hidden="true">
              {[30, 42, 34, 62, 48, 74, 58, 86, 67, 94, 75, 100].map((height, index) => (
                <span key={index} className={`flex-1 ${index > 8 ? 'bg-clay/75' : 'bg-moss/70'}`} style={{ height: `${height}%` }} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] tracking-wide text-slate-500 dark:text-slate-400">
              <span>INCOME & SPENDING</span><span>ILLUSTRATION</span>
            </div>
          </div>
          <div className="absolute -right-2 -top-5 hidden h-[84px] w-[84px] items-center justify-center rounded-full border border-rule bg-paper text-center text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.14em] text-forest dark:border-slate-700 dark:bg-slate-900 dark:text-[#bdc9ae] sm:flex">
            Find your<br />own rhythm
          </div>
        </div>
      </section>

      <section id="approach" className="border-y border-rule bg-[#f0eee6] dark:border-slate-800 dark:bg-[#1b211b]">
        <div className="mx-auto grid max-w-[1320px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-12 lg:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">The everyday, made legible</p>
            <h2 className="mt-4 max-w-sm text-4xl leading-[1.04] text-ink dark:text-slate-100 sm:text-[3.25rem]">Good decisions start with a clear picture.</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            <article className="border-t border-[#d8d4c8] pt-5 dark:border-slate-700">
              <WalletCards aria-hidden="true" className="h-5 w-5 text-forest dark:text-[#adbd9e]" />
              <h3 className="mt-5 text-[23px] leading-tight text-ink dark:text-slate-100">Know your flow</h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-600 dark:text-slate-300">Keep income and everyday spending in one considered view.</p>
            </article>
            <article className="border-t border-[#d8d4c8] pt-5 dark:border-slate-700">
              <BarChart3 aria-hidden="true" className="h-5 w-5 text-forest dark:text-[#adbd9e]" />
              <h3 className="mt-5 text-[23px] leading-tight text-ink dark:text-slate-100">Notice the patterns</h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-600 dark:text-slate-300">See where money goes and how things shift over time.</p>
            </article>
            <article id="privacy" className="border-t border-[#d8d4c8] pt-5 dark:border-slate-700">
              <LockKeyhole aria-hidden="true" className="h-5 w-5 text-forest dark:text-[#adbd9e]" />
              <h3 className="mt-5 text-[23px] leading-tight text-ink dark:text-slate-100">Keep it personal</h3>
              <p className="mt-2 text-[13px] leading-6 text-slate-600 dark:text-slate-300">Your financial records stay behind account-level access controls.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-[1320px] flex-col gap-5 px-5 py-14 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss">A calmer way to begin</p>
          <h2 className="mt-2 text-3xl text-ink dark:text-slate-100 sm:text-4xl">Make space for a better money habit.</h2>
        </div>
        <Link to="/auth?mode=signup" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-3 self-start rounded-md bg-forest px-6 text-sm font-medium text-white transition-colors hover:bg-[#344637] md:self-center">
          Get started <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    </main>

    <footer className="border-t border-rule dark:border-slate-800">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-3 px-5 py-6 text-[12px] text-slate-500 dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <span className="font-medium text-ink dark:text-slate-200">finance pulse</span>
        <span>Thoughtful tools for everyday financial clarity.</span>
        <Link to="/auth?mode=signin" className="transition-colors hover:text-forest dark:hover:text-white">Sign in <ArrowUpRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" /></Link>
      </div>
    </footer>
  </div>
);

export default Landing;
