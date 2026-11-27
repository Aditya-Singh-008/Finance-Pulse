import React, { useEffect, useRef, useState } from 'react';
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

type MonthlySample = {
  month: string;
  income: number;
  spending: number;
};

type SampleScenario = 'balanced' | 'seasonal';

const sampleMonths: Record<SampleScenario, MonthlySample[]> = {
  balanced: [
    { month: 'Jan', income: 4800, spending: 3520 },
    { month: 'Feb', income: 4650, spending: 3410 },
    { month: 'Mar', income: 5050, spending: 3680 },
    { month: 'Apr', income: 4900, spending: 3590 },
    { month: 'May', income: 5200, spending: 3760 },
    { month: 'Jun', income: 5100, spending: 3620 },
    { month: 'Jul', income: 4950, spending: 3540 },
    { month: 'Aug', income: 5350, spending: 3810 },
    { month: 'Sep', income: 5000, spending: 3650 },
    { month: 'Oct', income: 5200, spending: 3890 },
    { month: 'Nov', income: 4850, spending: 3600 },
    { month: 'Dec', income: 5500, spending: 3980 },
  ],
  seasonal: [
    { month: 'Jan', income: 4600, spending: 3550 },
    { month: 'Feb', income: 4600, spending: 3400 },
    { month: 'Mar', income: 4700, spending: 3650 },
    { month: 'Apr', income: 4700, spending: 3500 },
    { month: 'May', income: 4800, spending: 3850 },
    { month: 'Jun', income: 4800, spending: 4300 },
    { month: 'Jul', income: 4950, spending: 4050 },
    { month: 'Aug', income: 4950, spending: 3900 },
    { month: 'Sep', income: 4700, spending: 3750 },
    { month: 'Oct', income: 4700, spending: 3900 },
    { month: 'Nov', income: 5250, spending: 4200 },
    { month: 'Dec', income: 5250, spending: 4800 },
  ],
};

const formatSampleCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);

const useLandingReveals = (rootRef: React.RefObject<HTMLDivElement | null>) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const revealItems = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!revealItems.length) return;

    revealItems.forEach((item) => {
      const siblings = Array.from(item.parentElement?.children ?? []).filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element.hasAttribute('data-reveal'),
      );
      const siblingIndex = Math.max(0, siblings.indexOf(item));
      item.style.setProperty('--fp-reveal-delay', `${Math.min(siblingIndex * 60, 240)}ms`);
      item.classList.add('fp-reveal');
    });

    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [rootRef]);
};

const MonthlyViewCard: React.FC = () => {
  const [scenario, setScenario] = useState<SampleScenario>('balanced');
  const [activeIndex, setActiveIndex] = useState(0);
  const months = sampleMonths[scenario];
  const activeMonth = months[activeIndex];
  const maxAmount = Math.max(...months.flatMap(({ income, spending }) => [income, spending]));

  return (
    <div className="relative z-10 mx-auto -mt-20 w-[calc(100%-1rem)] border border-[#e3dfd4] bg-[#fbf9f4] p-4 shadow-[0_18px_56px_rgba(37,42,36,0.14)] dark:border-[#333b32] dark:bg-[#202620] sm:ml-[-2rem] sm:mr-0 sm:w-[min(100%,34rem)] sm:p-4 lg:absolute lg:bottom-[-3.5rem] lg:left-[-2rem] lg:mt-0 lg:ml-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.17em] text-[#73776d] dark:text-[#a5aa9f]">
            A sample monthly view
          </p>
          <h2 className="mt-1.5 font-serif text-[27px] leading-none tracking-[-0.035em] text-[#252a24] dark:text-[#f2efe7] sm:text-[30px]">
            A little more in balance
          </h2>
        </div>
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center border border-[#e3dfd4] text-[#3e5140] dark:border-[#3a4239] dark:text-[#8da385]">
          <ArrowDownRight aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex min-h-7 items-center bg-[#b87555] px-2.5 text-[9px] font-semibold tracking-[0.13em] text-white">
          SAMPLE ILLUSTRATION
        </span>
        <div
          aria-label="Sample view scenario"
          className="inline-flex rounded-sm bg-[#ede9de] p-0.5 dark:bg-[#171b17]"
          role="group"
        >
          <button
            aria-pressed={scenario === 'balanced'}
            className={`min-h-8 px-2.5 text-[10px] font-medium transition-colors focus-visible:outline-offset-2 sm:px-3 ${
              scenario === 'balanced'
                ? 'bg-[#3e5140] text-white dark:bg-[#8da385] dark:text-[#171b17]'
                : 'text-[#5c6258] hover:text-[#252a24] dark:text-[#a5aa9f] dark:hover:text-[#f2efe7]'
            }`}
            onClick={() => {
              setScenario('balanced');
              setActiveIndex(0);
            }}
            type="button"
          >
            Balanced Year
          </button>
          <button
            aria-pressed={scenario === 'seasonal'}
            className={`min-h-8 px-2.5 text-[10px] font-medium transition-colors focus-visible:outline-offset-2 sm:px-3 ${
              scenario === 'seasonal'
                ? 'bg-[#3e5140] text-white dark:bg-[#8da385] dark:text-[#171b17]'
                : 'text-[#5c6258] hover:text-[#252a24] dark:text-[#a5aa9f] dark:hover:text-[#f2efe7]'
            }`}
            onClick={() => {
              setScenario('seasonal');
              setActiveIndex(0);
            }}
            type="button"
          >
            Seasonal Shift
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-12 gap-1" role="group" aria-label="Interactive monthly income and spending chart">
        {months.map(({ month, income, spending }, index) => {
          const isActive = activeIndex === index;
          const incomeHeight = Math.max(16, (income / maxAmount) * 56);
          const spendingHeight = Math.max(16, (spending / maxAmount) * 56);

          return (
            <button
              key={month}
              aria-label={`${month}: sample income ${formatSampleCurrency(income)}, sample spending ${formatSampleCurrency(spending)}. Show this month.`}
              aria-pressed={isActive}
              className={`group/month flex min-w-0 flex-col items-center gap-1.5 px-0.5 pt-1 transition-opacity duration-150 focus-visible:outline-offset-1 ${
                isActive ? 'bg-[#78866a]/10 opacity-100 dark:bg-[#8da385]/10' : 'opacity-45 hover:opacity-100 focus-visible:opacity-100'
              }`}
              onClick={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              type="button"
            >
              <span className="flex h-[62px] w-full items-end justify-center gap-[2px]" aria-hidden="true">
                <span className="w-[36%] bg-[#78866a] transition-[height] duration-300 dark:bg-[#8da385]" style={{ height: `${incomeHeight}px` }} />
                <span className="w-[36%] bg-[#b87555] transition-[height] duration-300" style={{ height: `${spendingHeight}px` }} />
              </span>
              <span className={`fp-num text-[9px] leading-none ${isActive ? 'font-semibold text-[#252a24] dark:text-[#f2efe7]' : 'text-[#73776d] dark:text-[#a5aa9f]'}`}>
                {month}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[9px] font-medium text-[#73776d] dark:text-[#a5aa9f]">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 bg-[#78866a] dark:bg-[#8da385]" />INCOME</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2 w-2 bg-[#b87555]" />SPENDING</span>
        <span className="ml-auto tracking-[0.1em]">INCOME &amp; SPENDING</span>
      </div>

      <div aria-atomic="true" aria-live="polite" className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-[#e3dfd4] pt-3 dark:border-[#3a4239] sm:grid-cols-4">
        <div>
          <p className="whitespace-nowrap text-[8px] uppercase tracking-[0.08em] text-[#73776d] dark:text-[#a5aa9f]">Month</p>
          <p className="fp-num mt-1 text-[12px] font-semibold text-[#252a24] dark:text-[#f2efe7]">{activeMonth.month}</p>
        </div>
        <div>
          <p className="whitespace-nowrap text-[8px] uppercase tracking-[0.08em] text-[#73776d] dark:text-[#a5aa9f]">Sample Income</p>
          <p className="fp-num mt-1 text-[12px] font-semibold text-[#526d59] dark:text-[#a6c4a1]">{formatSampleCurrency(activeMonth.income)}</p>
        </div>
        <div>
          <p className="whitespace-nowrap text-[8px] uppercase tracking-[0.08em] text-[#73776d] dark:text-[#a5aa9f]">Sample Spending</p>
          <p className="fp-num mt-1 text-[12px] font-semibold text-[#a6664b] dark:text-[#d59a7e]">{formatSampleCurrency(activeMonth.spending)}</p>
        </div>
        <div>
          <p className="whitespace-nowrap text-[8px] uppercase tracking-[0.08em] text-[#73776d] dark:text-[#a5aa9f]">Net Balance</p>
          <p className="fp-num mt-1 text-[12px] font-semibold text-[#252a24] dark:text-[#f2efe7]">{formatSampleCurrency(activeMonth.income - activeMonth.spending)}</p>
        </div>
      </div>
      <p className="mt-3 border-t border-[#e3dfd4] pt-2 font-serif text-[14px] italic text-[#5c6258] dark:border-[#3a4239] dark:text-[#c3c8bd]">
        Find your own rhythm
      </p>
    </div>
  );
};

const LandingPillars: React.FC = () => {
  const pillars = [
    {
      index: '01',
      title: 'Know your flow',
      description: 'Keep income and everyday spending in one considered view.',
      Icon: WalletCards,
    },
    {
      index: '02',
      title: 'Notice the patterns',
      description: 'See where money goes and how things shift over time.',
      Icon: BarChart3,
    },
    {
      index: '03',
      title: 'Keep it personal',
      description: 'Your financial records stay behind account-level access controls.',
      Icon: LockKeyhole,
    },
  ];

  return (
    <section id="approach" className="scroll-mt-16 border-y border-[#e3dfd4] bg-[#f0eee6] dark:border-[#333b32] dark:bg-[#1b211b]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:py-20">
        <div className="lg:col-span-4" data-reveal>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78866a] dark:text-[#a4b198]">The everyday, made legible</p>
          <h2 className="mt-4 max-w-sm font-serif text-[clamp(2.5rem,5vw,3.5rem)] leading-[0.98] text-[#252a24] dark:text-[#f2efe7]">
            Good decisions start with a clear picture.
          </h2>
        </div>
        <div className="grid divide-y divide-[#d8d4c8] sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:divide-[#d8d4c8] lg:col-span-8 dark:divide-[#3a4239]">
          {pillars.map(({ index, title, description, Icon }, pillarIndex) => (
            <article
              key={title}
              className={`py-6 sm:px-5 sm:py-2 lg:px-7 ${pillarIndex === 0 ? 'sm:pl-0' : ''}`}
              data-reveal
              id={pillarIndex === 2 ? 'privacy' : undefined}
            >
              <p className="fp-num text-[10px] font-medium tracking-[0.12em] text-[#78866a] dark:text-[#a4b198]">{index}</p>
              <Icon aria-hidden="true" className="mt-6 h-[18px] w-[18px] text-[#3e5140] dark:text-[#8da385]" />
              <h3 className="mt-4 font-serif text-[25px] leading-tight text-[#252a24] dark:text-[#f2efe7]">{title}</h3>
              <p className="mt-2 max-w-[240px] text-[13px] leading-6 text-[#5c6258] dark:text-[#c3c8bd]">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

const Landing: React.FC = () => {
  const landingRef = useRef<HTMLDivElement>(null);
  useLandingReveals(landingRef);

  return (
    <div ref={landingRef} className="min-h-screen bg-[#f5f2ea] text-[#252a24] transition-colors duration-300 dark:bg-[#171b17] dark:text-[#f2efe7]">
      <header className="sticky top-0 z-40 border-b border-[#e3dfd4]/90 bg-[#f5f2ea]/95 backdrop-blur-md dark:border-[#333b32] dark:bg-[#171b17]/95">
        <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8 lg:px-12">
          <Link to="/" aria-label="Finance Pulse home" className="flex shrink-0 items-center gap-2.5 rounded-sm">
            <span className="flex h-8 w-8 items-center justify-center border border-[#78866a]/40 text-[#3e5140] dark:border-[#8da385]/40 dark:text-[#8da385]">
              <Landmark aria-hidden="true" className="h-[17px] w-[17px]" />
            </span>
            <span className="text-[14px] font-semibold tracking-[-0.04em] text-[#252a24] dark:text-[#f2efe7] max-[360px]:hidden">finance pulse</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <a href="#approach" className="text-[12px] text-[#5c6258] transition-colors hover:text-[#3e5140] dark:text-[#c3c8bd] dark:hover:text-[#f2efe7]">Our approach</a>
            <a href="#privacy" className="text-[12px] text-[#5c6258] transition-colors hover:text-[#3e5140] dark:text-[#c3c8bd] dark:hover:text-[#f2efe7]">Privacy</a>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <Link to="/auth?mode=signin" className="inline-flex whitespace-nowrap px-1.5 py-2 text-[11px] font-medium text-[#5c6258] transition-colors hover:text-[#3e5140] dark:text-[#c3c8bd] dark:hover:text-[#f2efe7] sm:px-2 sm:text-[12px]">Sign in</Link>
            <Link to="/auth?mode=signup" className="inline-flex min-h-9 items-center gap-1.5 bg-[#3e5140] px-3 text-[11px] font-medium text-white transition-colors hover:bg-[#344637] focus-visible:outline-offset-4 dark:bg-[#8da385] dark:text-[#171b17] dark:hover:bg-[#a0b397] sm:px-4 sm:text-[12px]">
              Get started <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1440px] grid-cols-1 gap-y-12 px-5 pb-24 pt-12 sm:px-8 sm:pt-16 md:pt-12 md:grid-cols-12 md:items-start md:gap-x-6 md:gap-y-0 lg:gap-x-8 lg:px-12 lg:pb-36 lg:pt-20">
          <div className="relative z-10 md:col-span-6" data-reveal>
            <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#78866a] dark:text-[#a4b198]">
              <span aria-hidden="true" className="h-px w-8 bg-[#b87555]" />
              Personal finance, with perspective
            </p>
            <h1 className="max-w-[620px] font-serif text-[clamp(3.4rem,7.4vw,6.5rem)] leading-[0.91] tracking-[-0.055em] text-[#252a24] dark:text-[#f2efe7] md:text-[clamp(2.9rem,5.6vw,5.25rem)] lg:text-[clamp(3.4rem,5.2vw,5.7rem)] xl:text-[clamp(3.4rem,7vw,6.5rem)]">
              See your money <span className="font-serif italic text-[#3e5140] dark:text-[#aab99f]">more</span> clearly.
            </h1>
            <p className="mt-7 max-w-[460px] text-[15px] leading-7 text-[#5c6258] dark:text-[#c3c8bd] sm:text-[16px]">
              A thoughtful place to follow what comes in, what goes out, and what you want to do next.
            </p>
            <div className="mt-8 flex flex-col items-start gap-2.5 sm:flex-row sm:items-center">
              <Link to="/auth?mode=signup" className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#3e5140] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#344637] focus-visible:outline-offset-4 dark:bg-[#8da385] dark:text-[#171b17] dark:hover:bg-[#a0b397]">
                Create your account
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-[180ms] group-hover:translate-x-[3px]" />
              </Link>
              <Link to="/auth?mode=signin" className="inline-flex min-h-12 items-center justify-center px-3 text-[13px] font-medium text-[#5c6258] transition-colors hover:text-[#3e5140] dark:text-[#c3c8bd] dark:hover:text-[#f2efe7]">
                I already have an account
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-[11px] text-[#73776d] dark:text-[#a5aa9f]">
              <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-[#78866a] dark:text-[#8da385]" />
              Private by design. Yours to explore at your pace.
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[680px] md:col-span-6 md:mt-2" data-reveal>
            <div className="overflow-hidden bg-[#e4dfd1]">
              <img
                src={editorialImage}
                alt="A sunlit desk with a paper ledger, olive branch, and sculptural ceramic cup"
                fetchPriority="high"
                decoding="async"
                className="aspect-[1.08/1] w-full object-cover sm:aspect-[1.3/1]"
              />
            </div>
            <MonthlyViewCard />
          </div>
        </section>

        <LandingPillars />

        <section className="mx-auto grid max-w-[1440px] gap-6 px-5 py-14 sm:px-8 sm:py-16 md:grid-cols-12 md:items-center lg:px-12 lg:py-20">
          <div className="md:col-span-8" data-reveal>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#78866a] dark:text-[#a4b198]">A calmer way to begin</p>
            <h2 className="mt-2 font-serif text-[clamp(2rem,4vw,3.15rem)] leading-[1.04] text-[#252a24] dark:text-[#f2efe7]">Make space for a better money habit.</h2>
          </div>
          <div className="md:col-span-4 md:justify-self-end" data-reveal>
            <Link to="/auth?mode=signup" className="inline-flex min-h-12 items-center justify-center gap-3 bg-[#3e5140] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#344637] focus-visible:outline-offset-4 dark:bg-[#8da385] dark:text-[#171b17] dark:hover:bg-[#a0b397]">
              Get started <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e3dfd4] dark:border-[#333b32]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-6 text-[11px] text-[#73776d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12 dark:text-[#a5aa9f]">
          <span className="font-semibold tracking-[-0.03em] text-[#252a24] dark:text-[#f2efe7]">finance pulse</span>
          <span>Thoughtful tools for everyday financial clarity.</span>
          <Link to="/auth?mode=signin" className="transition-colors hover:text-[#3e5140] dark:hover:text-[#f2efe7]">Sign in <ArrowUpRight aria-hidden="true" className="ml-1 inline h-3.5 w-3.5" /></Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
