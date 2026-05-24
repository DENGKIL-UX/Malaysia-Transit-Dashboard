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
} from 'lucide-react';
import { format, isYesterday, isSameDay } from 'date-fns';
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
import { useRidership } from '@/hooks/use-ridership';
import { useAnalytics } from '@/hooks/use-analytics';

interface DataMetadata {
  headline: {
    data_as_of: string;
    latest_date: string;
    next_update_approx: string;
    lag_days: number;
  };
  prasarana: {
    data_as_of: string;
    last_updated: string;
    next_update: string;
    source: string;
  };
}

function useDataMetadata() {
  const [meta, setMeta] = useState<DataMetadata | null>(null);
  useEffect(() => {
    fetch('/api/metadata')
      .then((r) => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);
  return meta;
}

function AboutSection() {
  const meta = useDataMetadata();
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
        {/* Data Freshness */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up">
          <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
            Data Freshness
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Latest headline data</span>
              <span className="font-medium text-[var(--text-secondary)] tabular-nums">
                {meta?.headline.latest_date ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Publication lag</span>
              <span className={`font-medium tabular-nums ${
                (meta?.headline.lag_days ?? 0) > 15 ? 'text-orange-400' :
                (meta?.headline.lag_days ?? 0) > 5 ? 'text-yellow-400' : 'text-emerald-400'
              }`}>
                ~{(meta?.headline.lag_days ?? 0)} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Next expected update</span>
              <span className={
                meta?.headline.next_update_approx
                  ? new Date(meta.headline.next_update_approx.replace('~', '')) < new Date()
                    ? 'font-medium text-orange-400'
                    : 'font-medium text-[var(--text-muted)]'
                  : 'font-medium text-[var(--text-muted)]'
              }>
                {meta?.headline.next_update_approx
                  ? new Date(meta.headline.next_update_approx.replace('~', '')) < new Date()
                    ? `⚠ Overdue (expected ${format(new Date(meta.headline.next_update_approx.replace('~', '')), 'dd MMM')})`
                    : meta.headline.next_update_approx
                  : '—'}
              </span>
            </div>
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
              { label: 'RapidKL Bus (KL)', color: 'bg-orange-400' },
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
            Two Data Pipelines
          </h3>
          <div className="space-y-3">
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Headline (Monthly, Audited)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                This dashboard uses this pipeline. Published ~12 days after
                month-end via an audit process. Used by KPI cards, chart, and analytics.
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">OD Daily (Real-time, Raw)</span>
              </div>
              <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
                Station-to-station tap-in/tap-out data. Updated ~18-24h after
                midnight. Parquet-only, millions of rows. Not currently used
                by this dashboard.
              </p>
              {meta?.prasarana.data_as_of && (
                <p className="text-[9px] text-sky-400/40 mt-1.5">
                  Available as of: {meta.prasarana.data_as_of}
                </p>
              )}
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
  const {
    ridership: analyticsData,
    analytics,
    holidayMap,
    holidaySource,
    holidayFallback,
    hasLowConfidence,
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
      <div className="fixed top-[52px] sm:top-[56px] left-0 right-0 z-20 bg-[var(--bg-elevated)] backdrop-blur-xl border-b border-[var(--border-ghost)]">
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
                  <span className="text-orange-400/60">Rapid Bus KL</span>
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
                <p className="mt-2 text-[10px] sm:text-[11px] text-[var(--text-ghost)]">
                  Data via{' '}
                  <span className="text-[var(--text-faint)]">data.gov.my</span>
                  {latest && (
                    <>
                      <span className="mx-1.5 text-[var(--text-ghost)]">·</span>
                      <span className="text-[var(--text-faint)]">
                        Last update: {latest.date}
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Dashboard Panels */}
          <div className="px-4 sm:px-6 md:px-10 pb-8">
            <div className="max-w-[1400px] mx-auto">
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

              {/* KPI Cards */}
              <div className="mb-6">
                <KpiCards />
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
                    defaultMonth={new Date(latest.date + 'T00:00:00')}
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
                  />
                )}
              </div>
            </div>
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
