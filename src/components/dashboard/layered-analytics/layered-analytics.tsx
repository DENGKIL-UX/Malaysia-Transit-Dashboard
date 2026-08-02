'use client';

/**
 * LayeredAnalytics — a progressive-disclosure accordion that consolidates the
 * dashboard's analytical views into a single, de-cluttered section.
 *
 * Why this exists:
 *   The dashboard previously rendered six analytics blocks as separate,
 * always-visible sections (Day-Type, Seasonality, Growth, Mode-Share, Busiest
 * Stations, Top Routes). On long pages this created visual noise and pushed the
 * station / route analytics far down. Grouping them into collapsible "layers"
 * keeps every insight one tap away while letting readers scan the page faster.
 *
 * Design notes:
 *   - Uses the existing shadcn/Radix Accordion primitive (already in the repo).
 *   - type="multiple" with a single default-open layer — default = decluttered,
 *     but power users can open several layers at once.
 *   - Each layer renders the *existing* dashboard component unchanged, so no
 *     analytics logic is duplicated or re-implemented (lowest risk).
 *   - Demand layers (Seasonality / Growth / Mode-Share) consume the same
 *     `EnrichedDay[]` stream the parent already loads from useAnalytics().
 *   - Station / Route / Day-Type layers are self-contained (fetch their own
 *     parquet data internally), so they need no props here.
 *   - Tailwind classes are written as full static strings (no interpolation)
 *     so the JIT compiler can see and purge them correctly.
 */

import type { ComponentType } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CalendarClock,
  Flame,
  PieChart,
  Route as RouteIcon,
  TrainFront,
} from 'lucide-react';

import type { EnrichedDay } from '@/hooks/use-analytics';
import { DayTypeAnalytics } from '@/components/dashboard/day-type-analytics';
import { SeasonalityHeatmap } from '@/components/dashboard/seasonality-heatmap';
import { GrowthRankings } from '@/components/dashboard/growth-rankings';
import { ModeShareTrend } from '@/components/dashboard/mode-share-trend';
import { BusiestStationsRapidRail } from '@/components/dashboard/busiest-stations-rapid';
import { BusiestStationsKTMB } from '@/components/dashboard/busiest-stations-ktmb';
import { TopRoutesRapidRail, TopRoutesKTMB } from '@/components/dashboard/top-routes';

interface LayeredAnalyticsProps {
  /** Enriched daily ridership stream (from useAnalytics). Feeds the demand layers. */
  ridership: EnrichedDay[];
  /** Pass-through loading flag for the demand-layer components. */
  loading: boolean;
  /** className applied to the outer wrapper. */
  className?: string;
}

interface LayerDef {
  value: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: ComponentType<{ className?: string }>;
  iconWrap: string;
  iconText: string;
  badgeCls: string;
}

// ─── Layer definitions ───────────────────────────────────────────────
// Order = visual top-to-bottom. First entry is open by default.
const LAYERS: LayerDef[] = [
  {
    value: 'temporal',
    title: 'Temporal Patterns',
    subtitle: 'Weekday · Friday · weekend demand, with holiday-impact detection',
    badge: 'Day-type',
    icon: CalendarClock,
    iconWrap: 'bg-sky-400/10 border-sky-400/20',
    iconText: 'text-sky-400',
    badgeCls: 'bg-sky-400/10 text-sky-400 border-sky-400/20',
  },
  {
    value: 'seasonality',
    title: 'Seasonality & Growth',
    subtitle: 'Month × day-of-week heatmap and year-over-year service growth',
    badge: 'Trends',
    icon: Flame,
    iconWrap: 'bg-amber-400/10 border-amber-400/20',
    iconText: 'text-amber-400',
    badgeCls: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  },
  {
    value: 'modeshare',
    title: 'Mode Share',
    subtitle: 'How ridership splits across Rapid Rail + KTM services over time',
    badge: 'Mix',
    icon: PieChart,
    iconWrap: 'bg-violet-400/10 border-violet-400/20',
    iconText: 'text-violet-400',
    badgeCls: 'bg-violet-400/10 text-violet-400 border-violet-400/20',
  },
  {
    value: 'stations',
    title: 'Busiest Stations',
    subtitle: 'Top boardings by station — Rapid Rail & KTM (OD parquet data)',
    badge: 'Stations',
    icon: TrainFront,
    iconWrap: 'bg-emerald-400/10 border-emerald-400/20',
    iconText: 'text-emerald-400',
    badgeCls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  },
  {
    value: 'routes',
    title: 'Top Routes',
    subtitle: 'Busiest origin → destination pairs across the network',
    badge: 'OD pairs',
    icon: RouteIcon,
    iconWrap: 'bg-teal-400/10 border-teal-400/20',
    iconText: 'text-teal-400',
    badgeCls: 'bg-teal-400/10 text-teal-400 border-teal-400/20',
  },
];

function LayerContent({
  layer,
  ridership,
  loading,
}: {
  layer: LayerDef;
  ridership: EnrichedDay[];
  loading: boolean;
}) {
  switch (layer.value) {
    case 'temporal':
      return <DayTypeAnalytics />;
    case 'seasonality':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-7 xl:col-span-8">
            <SeasonalityHeatmap ridership={ridership} loading={loading} />
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <GrowthRankings ridership={ridership} loading={loading} />
          </div>
        </div>
      );
    case 'modeshare':
      return <ModeShareTrend ridership={ridership} loading={loading} />;
    case 'stations':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-7 xl:col-span-8">
            <BusiestStationsRapidRail />
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <BusiestStationsKTMB />
          </div>
        </div>
      );
    case 'routes':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-7 xl:col-span-8">
            <TopRoutesRapidRail />
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <TopRoutesKTMB />
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function LayeredAnalytics({
  ridership,
  loading,
  className,
}: LayeredAnalyticsProps) {
  return (
    <Accordion
      type="multiple"
      defaultValue={['temporal']}
      className={className}
    >
      {LAYERS.map((layer) => {
        const Icon = layer.icon;
        return (
          <AccordionItem
            key={layer.value}
            value={layer.value}
            className="
              mb-3 rounded-2xl border border-[var(--border-subtle)]
              bg-[var(--surface-card)] backdrop-blur-md overflow-hidden
              transition-shadow duration-300
              data-[state=open]:shadow-lg
              data-[state=open]:border-[var(--border-subtle)]
            "
          >
            <AccordionTrigger
              className="
                hover:no-underline px-4 sm:px-6 py-4
                items-center
              "
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${layer.iconWrap}`}
                >
                  <Icon className={`w-4 h-4 ${layer.iconText}`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {layer.title}
                    </h3>
                    <span
                      className={`text-[9px] uppercase tracking-wider font-medium px-1.5 py-0.5 rounded border ${layer.badgeCls}`}
                    >
                      {layer.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-faint)] mt-0.5 truncate">
                    {layer.subtitle}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 sm:px-6 pb-5">
              <LayerContent layer={layer} ridership={ridership} loading={loading} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default LayeredAnalytics;
