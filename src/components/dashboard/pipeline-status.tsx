'use client';

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
  Moon,
  Server,
} from 'lucide-react';
import type { DataMetadata, PipelineFreshness, HolidayContext } from '@/hooks/use-data-metadata';

// ── Status badge colors ────────────────────────────────────────────

const STATUS_CONFIG = {
  fresh: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
    label: 'Fresh',
  },
  expected: {
    icon: Clock,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    label: 'On Schedule',
  },
  delayed: {
    icon: AlertTriangle,
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
    label: 'Delayed',
  },
  overdue: {
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
    label: 'Overdue',
  },
  unknown: {
    icon: Info,
    color: 'text-[var(--text-faint)]',
    bg: 'bg-[var(--surface-card)]',
    border: 'border-[var(--border-faint)]',
    label: 'Unknown',
  },
} as const;

// ── Pipeline row ───────────────────────────────────────────────────

function PipelineRow({
  label,
  sublabel,
  freshness,
  icon,
  dotColor,
  showExpected = true,
}: {
  label: string;
  sublabel: string;
  freshness: PipelineFreshness;
  icon: React.ElementType;
  dotColor: string;
  showExpected?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[freshness.status] ?? STATUS_CONFIG.unknown;
  const StatusIcon = cfg.icon;

  if (!freshness.latest_date) {
    return (
      <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3 opacity-60">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
        </div>
        <p className="text-[10px] text-[var(--text-faint)] mt-1">No data available</p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${cfg.bg} ${cfg.border}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
          <div className="min-w-0">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
            <p className="text-[9px] text-[var(--text-faint)] truncate">{sublabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-semibold tabular-nums text-[var(--text-primary)]">
            {freshness.latest_date}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
            {freshness.lag_days}d
          </span>
          <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
        </div>
      </div>

      {showExpected && freshness.lag_explained_by.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[9px] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors w-full text-left"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{expanded ? 'Hide' : 'Show'} lag analysis</span>
        </button>
      )}

      {expanded && showExpected && (
        <div className="mt-2 pt-2 border-t border-[var(--border-faint)] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-faint)]">Actual lag</span>
            <span className="text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
              T-{freshness.lag_days}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-faint)]">Expected lag</span>
            <span className="text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
              T-{freshness.expected_lag}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[var(--text-faint)] shrink-0">Explained by:</span>
            <div className="flex flex-wrap gap-1">
              {freshness.lag_explained_by.map((reason, i) => (
                <span
                  key={i}
                  className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-[var(--surface-card)] border border-[var(--border-faint)] text-[var(--text-muted)]"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>
          {freshness.is_overdue && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-300">
                Data overdue — upstream batch may be delayed
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Lag Factor Explanation ─────────────────────────────────────────

function LagFactorsCard({ holidayContext }: { holidayContext: HolidayContext | null }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] backdrop-blur-md p-5 sm:p-6 animate-fade-in-up">
      <div className="w-9 h-9 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mb-4">
        <Zap className="w-4 h-4 text-sky-400" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
        Lag Factors
      </h3>
      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
        Data freshness is limited by three stacked factors in the national open data pipeline.
      </p>

      <div className="space-y-2.5">
        <div className="flex items-start gap-2.5">
          <Server className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">ETL Batch Window</span>
            <p className="text-[10px] text-[var(--text-faint)]">
              Prasarana/KTMB batch-close transactional logs at ~01:00–03:00 MYT.
              Parquet files publish at ~03:31–03:45 MYT. Physical floor: T-1.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Calendar className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Calendar Blackout</span>
            <p className="text-[10px] text-[var(--text-faint)]">
              If T-1 is Sunday or public holiday, batch slides to next working day.
              Weekend/holiday stretches T-1 → T-2 or T-3.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Moon className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
          <div>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Islamic Calendar Uncertainty</span>
            <p className="text-[10px] text-[var(--text-faint)]">
              Hari Raya dates shift yearly via rukyah. data.gov.my may hold batches
              pending official confirmation.
            </p>
          </div>
        </div>
      </div>

      {holidayContext && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>Current calendar status</span>
          </button>

          {expanded && (
            <div className="mt-2 pt-3 border-t border-[var(--border-faint)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-faint)]">Today</span>
                <span className={`text-[10px] font-medium ${
                  holidayContext.todayIsBlackout ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  {holidayContext.todayIsBlackout ? 'Non-working day' : 'Working day'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-faint)]">Prev. working day</span>
                <span className="text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
                  {holidayContext.prevWorkingDay}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-faint)]">Next working day</span>
                <span className="text-[10px] font-medium tabular-nums text-[var(--text-secondary)]">
                  {holidayContext.nextWorkingDay}
                </span>
              </div>

              {holidayContext.upcomingHolidays.length > 0 && (
                <div className="mt-2">
                  <span className="text-[10px] text-[var(--text-faint)] block mb-1">Upcoming holidays:</span>
                  <div className="space-y-1">
                    {holidayContext.upcomingHolidays.slice(0, 5).map((h) => (
                      <div key={h.date} className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {h.name}
                          {h.isMajor && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20">
                              major
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] tabular-nums text-[var(--text-faint)]">{h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Pipeline Status Panel ─────────────────────────────────────

export function PipelineStatusPanel({ meta }: { meta: DataMetadata | null }) {
  if (!meta) return null;

  const ktmbStatus = meta.ktmb;
  const prasaranaOdStatus = meta.prasarana_od;
  const headlineStatus = meta.headline;

  return (
    <div id="pipeline-status" className="scroll-mt-20 pt-8 pb-4">
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
        <div className="w-1 h-6 rounded-full bg-amber-400/40" />
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Pipeline Status
          </h2>
          <p className="text-[10px] text-[var(--text-faint)] mt-0.5">
            Holiday-aware data freshness · Real-time lag analysis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* OD Pipelines */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">
            Daily OD Pipelines
          </p>
          <PipelineRow
            label="KTMB OD (Parquet)"
            sublabel="5 services · T-1 batch floor"
            freshness={ktmbStatus}
            icon={CheckCircle2}
            dotColor="bg-teal-400"
          />
          <PipelineRow
            label="Rapid Rail OD (Parquet)"
            sublabel="MRT/LRT/Monorail/BRT · T-1 batch floor"
            freshness={prasaranaOdStatus}
            icon={CheckCircle2}
            dotColor="bg-orange-300"
          />
        </div>

        {/* Headline Pipeline */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-wider">
            Monthly Audit Pipeline
          </p>
          <PipelineRow
            label="Headline Audit"
            sublabel="All 14 services · ~12 days post-month-end"
            freshness={headlineStatus}
            icon={Clock}
            dotColor="bg-amber-400"
            showExpected={false}
          />

          {/* Headline expected update */}
          {headlineStatus.latest_date && (
            <div className="rounded-lg bg-[var(--surface-card)] border border-[var(--border-faint)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-faint)]">Next expected publish</span>
                <span className={`text-[10px] font-medium ${
                  headlineStatus.is_overdue ? 'text-red-400' : 'text-[var(--text-muted)]'
                }`}>
                  {headlineStatus.lag_explained_by[0] || '~12th of following month'}
                </span>
              </div>
            </div>
          )}

          {/* Pipeline insights */}
          {meta.pipeline_insights.length > 0 && (
            <div className="rounded-lg bg-emerald-400/5 border border-emerald-400/10 p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  {meta.pipeline_insights.map((insight, i) => (
                    <p key={i} className="text-[10px] text-emerald-300/80 leading-relaxed">
                      {insight}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lag Factors Card */}
        <LagFactorsCard holidayContext={meta.holiday_context} />
      </div>
    </div>
  );
}
