'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Database,
  Shield,
  Scale,
  ExternalLink,
  Train,
  Bus,
  Code,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { format, isYesterday, isSameDay, differenceInHours } from 'date-fns';
import { NavBar } from '@/components/dashboard/nav-bar';
import { KpiCards } from '@/components/dashboard/kpi-cards';
import { RidershipChart } from '@/components/dashboard/ridership-chart';
import { CinematicTrain } from '@/components/dashboard/cinematic-train';
import { TransitBreakdown } from '@/components/dashboard/transit-breakdown';
import { CalendarPicker } from '@/components/dashboard/calendar-picker';
import { ComparisonChart } from '@/components/dashboard/comparison-chart';
import { AnalyticsTable } from '@/components/dashboard/analytics-table';
import { DataIntegrityBanner } from '@/components/dashboard/data-integrity-banner';
import { DataStatusBar } from '@/components/dashboard/data-status-bar';
import { KtmbWeeklyChart } from '@/components/dashboard/ktmb-weekly-chart';
import { PrasaranaWeeklyChart } from '@/components/dashboard/prasarana-weekly-chart';
import { BusiestStationsRapidRail } from '@/components/dashboard/busiest-stations-rapid';
import { BusiestStationsKTMB } from '@/components/dashboard/busiest-stations-ktmb';
import { TopRoutesRapidRail, TopRoutesKTMB } from '@/components/dashboard/top-routes';
import { DayTypeAnalytics } from '@/components/dashboard/day-type-analytics';
import { FeatureCardsSection } from '@/components/dashboard/feature-cards';
import { OfflineBanner } from '@/components/dashboard/offline-banner';
import { InstallPrompt } from '@/components/dashboard/install-prompt';
import { PipelineStatusPanel } from '@/components/dashboard/pipeline-status';
import { useRidership } from '@/hooks/use-ridership';
import { useAnalytics } from '@/hooks/use-analytics';
import { useNotifications } from '@/hooks/use-notifications';
import { useDataMetadata } from '@/hooks/use-data-metadata';
import type { DataMetadata } from '@/hooks/use-data-metadata';

/**
 * Dynamic update badge — shows the freshest date across ALL data sources,
 * with a live indicator and lag label. Falls back to headline date if
 * metadata hasn't loaded yet.
 */
function DynamicUpdateBadge({
  meta,
  headlineLatest,
}: {
  meta: DataMetadata | null;
  headlineLatest?: string;
}) {
  // Determine what to show
  const freshestDate = meta?.freshest_date || headlineLatest || '';
  const freshestSource = meta?.freshest_source || '';

  if (!freshestDate) return null;

  // Compute lag
  let lagLabel = '';
  let lagColor = 'text-[var(--text-faint)]';
  try {
    const dateMs = new Date(freshestDate + 'T00:00:00').getTime();
    const nowMs = Date.now();
    const hoursAgo = differenceInHours(nowMs, dateMs);
    if (hoursAgo < 24) {
      lagLabel = `${hoursAgo}h ago`;
      lagColor = 'text-[#85AB8B]';
    } else if (hoursAgo < 48) {
      lagLabel = `${Math.round(hoursAgo / 24)}d ago`;
      lagColor = 'text-[#85AB8B]';
    } else {
      const days = Math.round(hoursAgo / 24);
      lagLabel = `${days}d ago`;
      lagColor = days > 15 ? 'text-orange-400' : 'text-amber-400';
    }
  } catch {
    lagLabel = freshestDate;
  }

  return (
    <p className="mt-2 text-[10px] sm:text-[11px] text-[var(--text-ghost)] flex items-center justify-center gap-2 flex-wrap">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#85AB8B] opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#85AB8B]" />
        </span>
        <span className="text-[var(--text-faint)]">
          Data via <span className="text-[var(--text-muted)]">data.gov.my</span>
        </span>
      </span>
      <span className="text-[var(--text-ghost)]">·</span>
      <span className="flex items-center gap-1.5">
        <RefreshCw className="w-3 h-3 text-[var(--text-ghost)]" />
        <span className={`font-medium tabular-nums ${lagColor}`}>
          {freshestDate}
        </span>
        {freshestSource && (
          <span className="text-[var(--text-ghost)]">
            ({freshestSource} · {lagLabel})
          </span>
        )}
      </span>
    </p>
  );
}

function AboutSection() {
  const { metadata: meta } = useDataMetadata();
  return (
    <div id="about" className="scroll-mt-20 pt-8 pb-16">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8 animate-fade-in-up">
        <div className="w-1 h-6 rounded-full bg-[#85AB8B]/40" />
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">About</h2>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Data sources, methodology, and data integrity
          </p>
        </div>
      </div>

      {/* About grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Data Freshness — now holiday-aware */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Data Freshness
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Latest headline</span>
              <span className="font-medium text-[var(--text-secondary)] tabular-nums">
                {meta?.headline.latest_date ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Headline lag</span>
              <span className={`font-medium tabular-nums ${
                (meta?.headline.lag_days ?? 0) > 30 ? 'text-red-400' :
                (meta?.headline.lag_days ?? 0) > 15 ? 'text-orange-400' :
                (meta?.headline.lag_days ?? 0) > 5 ? 'text-yellow-400' : 'text-emerald-400'
              }`}>
                ~{(meta?.headline.lag_days ?? 0)}d
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Freshest OD data</span>
              <span className="font-medium text-emerald-400 tabular-nums">
                {meta?.freshest_date ?? '—'}
                <span className="ml-1 text-[9px] text-[var(--text-faint)]">
                  ({meta?.freshest_source})
                </span>
              </span>
            </div>
            {meta?.holiday_context && (
              <div className="pt-2 border-t border-[var(--border-faint)]">
                <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-faint)]">
                  <Clock className="w-3 h-3" />
                  <span>Next batch expected: <span className="text-[var(--text-muted)] font-medium tabular-nums">{meta.holiday_context.nextWorkingDay}</span></span>
                </div>
                {meta.holiday_context.todayIsBlackout && (
                  <div className="flex items-center gap-1.5 text-[10px] text-orange-400 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Today is a non-working day</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Data Source */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '80ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-[#85AB8B]/10 border border-[#85AB8B]/20 flex items-center justify-center mb-4">
            <Database className="w-4 h-4 text-[#85AB8B]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Data Source
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Ridership data is sourced from{' '}
            <span className="text-[#85AB8B]">
              Department of Statistics Malaysia (DOSM)
            </span>{' '}
            via the official{' '}
            <span className="text-[#85AB8B]">data.gov.my</span> open data
            portal. The <code className="text-[var(--text-secondary)] text-[10px]">ridership_headline</code> dataset
            provides daily passenger counts. It is{' '}
            <span className="text-amber-400/80">monthly audited</span> — published ~12 days
            after month-end following audit.
          </p>
        </div>

        {/* Coverage */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '80ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
            <Train className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Transit Coverage
          </h3>
          <div className="space-y-2">
            {[
              { label: 'MRT Kajang Line (SBK)', color: 'bg-amber-400' },
              { label: 'MRT Putrajaya Line (SSP)', color: 'bg-sky-400' },
              { label: 'LRT Kelana Jaya Line', color: 'bg-violet-400' },
              { label: 'LRT Ampang Line', color: 'bg-rose-400' },
              { label: 'Monorail Line', color: 'bg-emerald-400' },
              { label: 'KTM Komuter', color: 'bg-teal-400' },
              { label: 'ETS', color: 'bg-cyan-400' },
              { label: 'KTM Intercity', color: 'bg-lime-400' },
              { label: 'KTM Komuter Utara', color: 'bg-pink-400' },
              { label: 'Shuttle Tebrau', color: 'bg-yellow-400' },
              { label: 'RapidKL Bus (KL)', color: 'bg-orange-400' },
              { label: 'Rapid Bus (Kuantan)', color: 'bg-fuchsia-400' },
              { label: 'Rapid Bus (Penang)', color: 'bg-stone-400' },
              { label: 'BRT Sunway Line', color: 'bg-orange-300' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${item.color}`} />
                <span className="text-[11px] text-[var(--text-muted)]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Info */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '160ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mb-4">
            <AlertCircle className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Four Data Pipelines
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Headline (Monthly, Audited)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                13 transit lines — rail + bus. Published ~12 days after
                month-end via audit. Used by KPI cards, line breakdown, and comparison chart.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">KTMB Daily (Daily Batch, Parquet)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                5 KTMB rail services + 158 stations. Origin-destination parquet from data.gov.my.
                Used by KTMB Mon–Sun chart, Busiest Stations, and Top Routes.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-300" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Prasarana Daily (Daily Batch, Parquet)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                5 Rapid Rail lines + BRT Sunway + 150+ stations. Origin-destination parquet from
                data.gov.my. Used by Rapid Rail chart, Busiest Stations, and Top Routes.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">OD Datasets (Exploratory)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                7 origin-destination datasets covering every station pair across all services.
                Available as per-year Parquet files from data.gov.my. Raw data for advanced analysis.
              </p>
            </div>
          </div>
        </div>

        {/* Holiday Scope */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '240ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mb-4">
            <Scale className="w-4 h-4 text-sky-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Holiday Scope
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Analytics are scoped to{' '}
            <span className="text-[var(--text-secondary)]">Selangor + KL Federal Territory</span>{' '}
            — the RapidKL operational area. This includes federal holidays, state
            holidays (Sultan of Selangor&apos;s Birthday), and Federal Territory Day.
            Sunday holidays trigger Monday replacement (cuti ganti).
          </p>
        </div>

        {/* Data Integrity */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '320ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mb-4">
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Data Integrity
          </h3>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Holiday classifications are sourced from the{' '}
            <span className="text-[#85AB8B]">Malaysia Calendar API</span>{' '}
            with Nager.Date as fallback. Islamic festival dates (Raya, Haji) are
            declared by the Keeper of the Rulers&apos; Seal based on moon sighting
            (rukyah) — not Gregorian projection. Dates pending confirmation are
            flagged with ⚠ and shown in orange.
          </p>
        </div>

        {/* Confidence Levels */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '400ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center mb-4">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            Confidence Levels
          </h3>
          <div className="space-y-2.5">
            {[
              { label: 'High', desc: 'Confirmed by official gazette or JAKIM', color: 'bg-emerald-400' },
              { label: 'Medium', desc: 'From secondary source, likely correct', color: 'bg-yellow-400' },
              { label: 'Low', desc: 'Estimated — pending rukyah confirmation', color: 'bg-orange-400' },
              { label: 'Unverified', desc: 'Fallback mode, weekend detection only', color: 'bg-red-400' },
            ].map((level) => (
              <div key={level.label} className="flex items-start gap-2.5">
                <span className={`w-2 h-2 rounded-full ${level.color} mt-1 shrink-0`} />
                <div>
                  <span className="text-[11px] font-medium text-[var(--text-secondary)]">{level.label}</span>
                  <p className="text-[10px] text-[var(--text-faint)]">{level.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Technology */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up" style={{ animationDelay: '400ms', opacity: 0 }}>
          <div className="w-9 h-9 rounded-xl bg-violet-400/10 border border-violet-400/20 flex items-center justify-center mb-4">
            <Code className="w-4 h-4 text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Built With
          </h3>
          <div className="flex flex-wrap gap-2 mt-3">
            {[
              'Next.js 16',
              'React 19',
              'TypeScript',
              'Tailwind CSS',
              'Recharts',
              'date-fns',
              'Lucide Icons',
              'Python',
              'Pandas',
              'Parquet',
            ].map((tech) => (
              <span
                key={tech}
                className="text-[10px] font-medium text-[var(--text-muted)] px-2.5 py-1 rounded-full bg-[var(--surface-card)] border border-[var(--border-subtle)]"
              >
                {tech}
              </span>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--border-faint)]">
            <a
              href="https://github.com/data-gov-my/datagovmy-meta"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] text-[var(--text-faint)] hover:text-[#85AB8B] transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              datagovmy-meta on GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data, loading } = useRidership();
  const { metadata: meta } = useDataMetadata();
  useNotifications(); // triggers initial fetch + auto-refresh, syncs to Zustand store
  const {
    ridership: analyticsData,
    analytics,
    holidayMap,
    holidaySource,
    holidayFallback,
    hasLowConfidence,
    availableDates,
    dataRange,
    loading: analyticsLoading,
  } = useAnalytics();
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Find the ridership data for selected dates
  const selectedDateA = selectedDates[0];
  const selectedDateB = selectedDates[1];
  const dataA = useMemo(
    () =>
      selectedDateA
        ? analyticsData.find((d) =>
            isSameDay(new Date(d.date), selectedDateA)
          )
        : undefined,
    [analyticsData, selectedDateA]
  );
  const dataB = useMemo(
    () =>
      selectedDateB
        ? analyticsData.find((d) =>
            isSameDay(new Date(d.date), selectedDateB)
          )
        : undefined,
    [analyticsData, selectedDateB]
  );
  const latest = data[data.length - 1];
  const totalRail = latest?.total ?? 0;

  const avgDaily =
    data.length > 0
      ? Math.round(data.reduce((sum, d) => sum + d.total, 0) / data.length)
      : 0;

  // Honest label — show the actual date, not "Today" if it's stale
  const latestLabel = latest
    ? isYesterday(new Date(latest.date))
      ? 'Yesterday'
      : format(new Date(latest.date), 'd MMM')
    : 'Latest';

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-[var(--bg-base)]">
      {/* Offline banner */}
      <OfflineBanner />

      {/* A2HS install prompt (Chrome Android only) */}
      <InstallPrompt />

      {/* Ambient orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#336443]/20 blur-[140px] animate-pulse-glow" />
        <div
          className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#1f2a1d]/30 blur-[140px] animate-pulse-glow"
          style={{ animationDelay: '2000ms' }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-[#85AB8B]/8 blur-[100px] animate-pulse-glow"
          style={{ animationDelay: '4000ms' }}
        />
      </div>

      {/* ═══ NAV ═══ */}
      <NavBar />

      {/* ═══ HONEST DATA STATUS BAR ═══ */}
      <div className="fixed top-[62px] sm:top-[68px] left-0 right-0 z-20 bg-[var(--bg-elevated)] backdrop-blur-xl border-b border-[var(--border-ghost)]">
        <div className="px-4 sm:px-6 md:px-10">
          <DataStatusBar />
        </div>
      </div>

      <main className="relative z-10">
        {/* ═══ DASHBOARD SECTION ═══ */}
        <div id="dashboard" className="scroll-mt-20">
          {/* Hero — honest, centered, no fake live elements */}
          <div className="relative w-full h-[420px] sm:h-[460px] md:h-[480px] overflow-hidden">
            <CinematicTrain />

            <div className="relative z-10 flex flex-col items-center justify-end h-full px-4 sm:px-6 md:px-10 pb-10 sm:pb-14">
              <div className="max-w-2xl mx-auto text-center animate-fade-in-up" style={{ opacity: 0 }}>
                {/* Coverage line */}
                <p className="text-[10px] sm:text-[11px] text-[var(--text-faint)] tracking-wide uppercase mb-4">
                  <span className="text-[#85AB8B]/70">SBK</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-sky-400/60">SSP</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Ampang</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Kelana Jaya</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Monorail</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Komuter</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">ETS</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Intercity</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Komuter Utara</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Tebrau</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-orange-400/60">Bus KL</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Bus Kuantan</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-[var(--text-muted)]">Bus Penang</span>
                  <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                  <span className="text-orange-300/60">BRT Sunway</span>
                </p>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-[var(--text-primary)] leading-[1.02] tracking-tight">
                  Malaysia{' '}
                  <span className="text-[#85AB8B]">Transit</span>{' '}
                  Dashboard
                </h1>

                <p className="mt-3 text-[#6b7f68] text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                  Daily ridership analytics from the Department of Statistics
                  Malaysia open data portal.
                </p>

                {/* Source attribution */}
                <DynamicUpdateBadge meta={meta} headlineLatest={latest?.date} />
              </div>
            </div>
          </div>

          {/* Dashboard Panels */}
          <div className="px-4 sm:px-6 md:px-10 pb-8">
            <div className="max-w-[1400px] mx-auto">

              {/* Glowing Feature Cards */}
              <div className="mb-10">
                <FeatureCardsSection />
              </div>

              {/* Summary Stats */}
              <div
                className="-mt-4 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up"
                style={{ animationDelay: '150ms', opacity: 0 }}
              >
                {[
                  {
                    label: latestLabel,
                    value: loading ? '—' : totalRail.toLocaleString(),
                    sub: latest?.date ?? 'total rail passengers',
                  },
                  {
                    label: '30-Day Avg',
                    value: loading ? '—' : avgDaily.toLocaleString(),
                    sub: 'all rail lines combined',
                  },
                  {
                    label: 'Top Line',
                    value: loading
                      ? '—'
                      : latest
                        ? (latest.mrtKajang >= latest.mrtPutrajaya
                            ? 'SBK'
                            : 'SSP')
                        : '—',
                    sub: latest ? `highest on ${latest.date}` : 'top rail line',
                  },
                  {
                    label: 'Data Points',
                    value: loading ? '—' : String(data.length),
                    sub: latest ? `as of ${latest.date}` : 'days tracked',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-faint)] px-4 py-3 shadow-lg"
                  >
                    <span className="text-[10px] text-[var(--text-faint)] uppercase tracking-widest font-medium">
                      {stat.label}
                    </span>
                    <div className="text-lg font-semibold text-[var(--text-primary)] tabular-nums tracking-tight mt-0.5">
                      {stat.value}
                    </div>
                    <span className="text-[10px] text-[var(--text-faint)]">
                      {stat.sub}
                    </span>
                  </div>
                ))}
              </div>

              {/* KPI Cards — data passed as props to avoid duplicate fetch */}
              <div className="mb-6">
                <KpiCards data={data} loading={loading} />
              </div>

              {/* Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 mb-6">
                <div className="lg:col-span-7 xl:col-span-8">
                  <RidershipChart />
                </div>
                <div className="lg:col-span-5 xl:col-span-4">
                  <TransitBreakdown />
                </div>
              </div>

              {/* KTMB Daily/Weekly Chart */}
              <div className="mb-6">
                <KtmbWeeklyChart />
              </div>

              {/* Prasarana Daily/Weekly Chart */}
              <div className="mb-6">
                <PrasaranaWeeklyChart />
              </div>

              {/* Day-Type Analytics */}
              <div className="mb-6">
                <DayTypeAnalytics />
              </div>

              {/* Busiest Stations Section */}
              <div className="flex items-center gap-3 mb-5 mt-10 animate-fade-in-up">
                <div className="w-1 h-6 rounded-full bg-amber-400/40" />
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    Station Analytics
                  </h2>
                  <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                    Busiest stations & routes · From parquet origin-destination data
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-6">
                <BusiestStationsRapidRail />
                <BusiestStationsKTMB />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 mb-6">
                <TopRoutesRapidRail />
                <TopRoutesKTMB />
              </div>
            </div>
          </div>
        </div>

        {/* ═══ ANALYTICS SECTION ═══ */}
        <div id="analytics" className="scroll-mt-20 px-4 sm:px-6 md:px-10 pb-8">
          <div className="max-w-[1400px] mx-auto">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5 animate-fade-in-up">
              <div className="w-1 h-6 rounded-full bg-[#85AB8B]/40" />
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  Analytics
                </h2>
                <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
                  Holiday patterns · Confidence flags
                </p>
              </div>
            </div>

            {/* Data integrity banners */}
            {hasLowConfidence && !holidayFallback && (
              <div className="mb-4 animate-fade-in-up">
                <div className="rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs px-4 py-3 flex items-start gap-3">
                  <Activity className="w-4 h-4 mt-0.5 shrink-0 text-orange-400" />
                  <p className="text-[11px] leading-relaxed text-orange-300/70">
                    Some holiday dates are estimated pending official rukyah
                    confirmation. Comparisons marked ⚠ may shift.
                  </p>
                </div>
              </div>
            )}
            <DataIntegrityBanner
              holidayFallback={holidayFallback}
              holidaySource={holidaySource}
            />

            {/* Analytics grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 mt-4">
              {/* Left column: Analytics table */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-5">
                <AnalyticsTable
                  analytics={analytics}
                  loading={analyticsLoading}
                />
                {/* Holiday source info */}
                {!holidayFallback && holidaySource && (
                  <div className="text-[9px] text-[var(--text-ghost)] flex items-center gap-2">
                    <span>Holiday source:</span>
                    <span className="text-[#85AB8B]/50">
                      {holidaySource === 'mycal'
                        ? 'Malaysia Calendar API (JAKIM + Federal Gazette)'
                        : holidaySource === 'nager'
                          ? 'Nager.Date API (federal holidays only)'
                          : holidaySource}
                    </span>
                  </div>
                )}
              </div>

              {/* Right column: Calendar + Comparison */}
              <div className="lg:col-span-5 xl:col-span-4 space-y-5">
                {latest ? (
                  <CalendarPicker
                    selected={selectedDates}
                    onSelect={setSelectedDates}
                    holidayMap={holidayMap}
                    availableDates={availableDates}
                    defaultMonth={new Date(latest.date + 'T00:00:00')}
                    dataRange={dataRange}
                  />
                ) : (
                  <div className="h-[340px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md animate-pulse" />
                )}
                {selectedDates.length === 2 && (
                  <ComparisonChart
                    dateA={selectedDates[0]}
                    dateB={selectedDates[1]}
                    dataA={dataA}
                    dataB={dataB}
                    availableDates={availableDates}
                    headlineThrough={dataRange?.headlineThrough}
                    prasaranaThrough={dataRange?.prasaranaThrough}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ PIPELINE STATUS SECTION ═══ */}
        <div className="px-4 sm:px-6 md:px-10">
          <div className="max-w-[1400px] mx-auto">
            <PipelineStatusPanel meta={meta} />
          </div>
        </div>

        {/* ═══ ABOUT SECTION ═══ */}
        <div className="px-4 sm:px-6 md:px-10">
          <div className="max-w-[1400px] mx-auto">
            <AboutSection />
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <footer
          className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--border-faint)] px-4 sm:px-6 md:px-10 pt-6 pb-8 animate-fade-in-up"
          style={{ animationDelay: '650ms', opacity: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[#85AB8B]/20 flex items-center justify-center">
                <Activity className="w-3 h-3 text-[#85AB8B]" />
              </div>
              <span className="text-xs font-medium text-[var(--text-faint)]">
                RapidStats
                <sup className="text-[8px] text-[#85AB8B]">MY</sup>
              </span>
            </div>
            <span className="w-px h-3 bg-[var(--surface-active)]" />
            <span className="text-[10px] text-[var(--text-ghost)]">
              Built with Next.js 16 · Recharts · Tailwind CSS
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[var(--text-ghost)]">
              Headline data: monthly audited · CC-BY 4.0 · data.gov.my
            </span>
            <a
              href="https://github.com/data-gov-my/datagovmy-meta"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[var(--text-ghost)] hover:text-[var(--text-muted)] transition-colors"
            >
              datagovmy-meta
            </a>
          </div>
        </footer>
      </main>
    </section>
  );
}
