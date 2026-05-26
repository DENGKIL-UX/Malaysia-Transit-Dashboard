import { NextRequest, NextResponse } from 'next/server';
import { format, differenceInDays } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────

interface KtmbDay {
  date: string;
  ets: number;
  intercity: number;
  komuter: number;
  komuter_utara: number;
  tebrau: number;
  total: number;
}

interface PrasaranaDay {
  date: string;
  brt: number;
  lrt_ampang: number;
  lrt_kj: number;
  monorail: number;
  mrt_pjy: number;
  total: number;
}

interface NotificationItem {
  id: string;
  type: 'data_update' | 'anomaly' | 'insight' | 'projection' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  source: 'KTMB OD' | 'Rapid Rail OD' | 'Headline Audit' | 'Analytics Engine' | 'System';
  severity: 'info' | 'warning' | 'success' | 'critical';
  meta?: Record<string, unknown>;
}

interface DataFreshness {
  ktmb: { latest_date: string; lag_days: number };
  prasarana_od: { latest_date: string; lag_days: number };
  headline: { latest_date: string; lag_days: number };
  freshest_date: string;
  freshest_source: string;
  lastChecked: string;
}

interface AnomalyInfo {
  date: string;
  source: 'KTMB OD' | 'Rapid Rail OD';
  field: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'warning' | 'critical';
}

interface AnalyticsState {
  lastComputed: string;
  anomalyCount: number;
  trendDirection: 'up' | 'down' | 'stable';
  weeklyGrowthRate: number;
  peakDayOfWeek: string;
  lowDayOfWeek: string;
  weekendWeekdayRatio: number;
  forecastNext: number | null;
  forecastNext2: number | null;
  forecastNext3: number | null;
  forecastStdDev: number | null;
  anomalies: AnomalyInfo[];
  insights: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function readJsonFile<T>(baseUrl: string, filename: string): Promise<T[]> {
  try {
    // Use fetch for Cloudflare Pages compatibility (no filesystem access)
    const url = `${baseUrl}/${filename}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Z-Score Anomaly Detection ───────────────────────────────────

function detectAnomalies(values: { date: string; value: number; field: string }[], windowSize = 30): AnomalyInfo[] {
  if (values.length < windowSize + 1) return [];

  const anomalies: AnomalyInfo[] = [];

  for (let i = windowSize; i < values.length; i++) {
    const window = values.slice(i - windowSize, i);
    const mean = window.reduce((s, v) => s + v.value, 0) / windowSize;
    const variance = window.reduce((s, v) => s + (v.value - mean) ** 2, 0) / windowSize;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) continue;

    const current = values[i];
    const zScore = (current.value - mean) / stddev;
    const absZ = Math.abs(zScore);

    if (absZ > 2) {
      anomalies.push({
        date: current.date,
        source: current.field === 'komuter' || current.field === 'komuter_utara' || current.field === 'ets' || current.field === 'intercity' || current.field === 'tebrau'
          ? 'KTMB OD' as const
          : 'Rapid Rail OD' as const,
        field: current.field,
        value: current.value,
        expected: Math.round(mean),
        deviation: Math.round((zScore * 100)) / 100,
        severity: absZ > 3 ? 'critical' : 'warning',
      });
    }
  }

  return anomalies;
}

// ─── Linear Regression Trend ─────────────────────────────────────

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// ─── Exponential Smoothing Forecast ──────────────────────────────

function exponentialSmoothingForecast(
  values: number[],
  alpha = 0.3,
  forecastDays = 3
): { forecast: number[]; stddev: number } {
  if (values.length === 0) return { forecast: [], stddev: 0 };

  // Compute smoothed values
  let smoothed = values[0];
  const smoothedValues = [smoothed];

  for (let i = 1; i < values.length; i++) {
    smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    smoothedValues.push(smoothed);
  }

  // Compute residuals stddev
  const residuals = values.map((v, i) => v - smoothedValues[i]);
  const meanResidual = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const variance = residuals.reduce((s, r) => s + (r - meanResidual) ** 2, 0) / residuals.length;
  const stddev = Math.sqrt(variance);

  // Forecast: last smoothed value repeated (level model)
  const lastLevel = smoothedValues[smoothedValues.length - 1];
  const forecast = Array.from({ length: forecastDays }, () => Math.round(lastLevel));

  return { forecast, stddev: Math.round(stddev) };
}

// ─── Main GET handler ───────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const todayMs = new Date(todayStr + 'T00:00:00').getTime();
  const notifications: NotificationItem[] = [];

  // ── Read local JSON data (fetch for Cloudflare compatibility) ──
  const ktmbData = await readJsonFile<KtmbDay>(baseUrl, 'ktmb-daily.json');
  const prasaranaData = await readJsonFile<PrasaranaDay>(baseUrl, 'prasarana-daily.json');

  // ── Compute freshness ──
  const ktmbLatest = ktmbData.length > 0
    ? ktmbData[ktmbData.length - 1].date.split(' ')[0]
    : '';
  const prasaranaLatest = prasaranaData.length > 0
    ? prasaranaData[prasaranaData.length - 1].date
    : '';

  const ktmbLag = ktmbLatest ? differenceInDays(todayMs, new Date(ktmbLatest + 'T00:00:00').getTime()) : 999;
  const prasaranaLag = prasaranaLatest ? differenceInDays(todayMs, new Date(prasaranaLatest + 'T00:00:00').getTime()) : 999;

  // Headline lag estimate
  const headlineLatest = ktmbLatest ? ktmbLatest : todayStr; // headline is ~12d behind parquet
  const headlineLag = ktmbLatest ? differenceInDays(todayMs, new Date(ktmbLatest + 'T00:00:00').getTime()) + 12 : 999;

  const freshnessCandidates: Array<{ date: string; source: string }> = [];
  if (ktmbLatest) freshnessCandidates.push({ date: ktmbLatest, source: 'KTMB OD' });
  if (prasaranaLatest) freshnessCandidates.push({ date: prasaranaLatest, source: 'Rapid Rail OD' });
  freshnessCandidates.sort((a, b) => b.date.localeCompare(a.date));

  const freshness: DataFreshness = {
    ktmb: { latest_date: ktmbLatest, lag_days: ktmbLag },
    prasarana_od: { latest_date: prasaranaLatest, lag_days: prasaranaLag },
    headline: { latest_date: headlineLatest, lag_days: headlineLag },
    freshest_date: freshnessCandidates[0]?.date || '',
    freshest_source: freshnessCandidates[0]?.source || '',
    lastChecked: now.toISOString(),
  };

  // ── Data update notifications ──
  if (ktmbLatest) {
    const ktmbLagLabel = ktmbLag <= 1 ? `${ktmbLag}d ago` : `${ktmbLag}d ago`;
    notifications.push({
      id: uid(),
      type: 'data_update',
      title: 'KTMB OD data updated',
      description: `Latest: ${ktmbLatest} (${ktmbLagLabel}) · ${ktmbData.length} days of data`,
      timestamp: now.toISOString(),
      read: false,
      source: 'KTMB OD',
      severity: ktmbLag <= 2 ? 'success' : ktmbLag <= 7 ? 'info' : 'warning',
    });
  }

  if (prasaranaLatest) {
    const prasaranaLagLabel = prasaranaLag <= 1 ? `${prasaranaLag}d ago` : `${prasaranaLag}d ago`;
    notifications.push({
      id: uid(),
      type: 'data_update',
      title: 'Rapid Rail OD data updated',
      description: `Latest: ${prasaranaLatest} (${prasaranaLagLabel}) · ${prasaranaData.length} days of data`,
      timestamp: now.toISOString(),
      read: false,
      source: 'Rapid Rail OD',
      severity: prasaranaLag <= 2 ? 'success' : prasaranaLag <= 7 ? 'info' : 'warning',
    });
  }

  // ── Analytics ──
  const anomalies: AnomalyInfo[] = [];
  const insights: string[] = [];

  // Build combined total series for trend analysis
  const ktmbTotals = ktmbData.map((d) => ({
    date: d.date.split(' ')[0],
    value: d.total,
    field: 'total',
  }));
  const prasaranaTotals = prasaranaData.map((d) => ({
    date: d.date,
    value: d.total,
    field: 'total',
  }));

  // Anomaly detection on totals
  const ktmbAnomalies = detectAnomalies(ktmbTotals);
  const prasaranaAnomalies = detectAnomalies(prasaranaTotals);

  // Also check sub-fields
  const ktmbSubFields: Array<{ field: string; key: keyof KtmbDay }> = [
    { field: 'komuter', key: 'komuter' },
    { field: 'komuter_utara', key: 'komuter_utara' },
    { field: 'ets', key: 'ets' },
  ];
  for (const { field, key } of ktmbSubFields) {
    const subValues = ktmbData.map((d) => ({
      date: d.date.split(' ')[0],
      value: d[key] as number,
      field,
    }));
    anomalies.push(...detectAnomalies(subValues));
  }

  const prasaranaSubFields: Array<{ field: string; key: keyof PrasaranaDay }> = [
    { field: 'mrt_pjy', key: 'mrt_pjy' },
    { field: 'lrt_kj', key: 'lrt_kj' },
    { field: 'lrt_ampang', key: 'lrt_ampang' },
  ];
  for (const { field, key } of prasaranaSubFields) {
    const subValues = prasaranaData.map((d) => ({
      date: d.date,
      value: d[key] as number,
      field,
    }));
    anomalies.push(...detectAnomalies(subValues));
  }

  anomalies.push(...ktmbAnomalies.map(a => ({ ...a, source: 'KTMB OD' as const })));
  anomalies.push(...prasaranaAnomalies.map(a => ({ ...a, source: 'Rapid Rail OD' as const })));

  // Deduplicate by date+field+source
  const seen = new Set<string>();
  const uniqueAnomalies = anomalies.filter(a => {
    const key = `${a.date}-${a.field}-${a.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by severity (critical first) then by date desc
  uniqueAnomalies.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
    return b.date.localeCompare(a.date);
  });

  // Keep top 10 anomalies
  const topAnomalies = uniqueAnomalies.slice(0, 10);

  // ── Trend analysis on KTMB total (last 14 days) ──
  const ktmbLast14 = ktmbTotals.slice(-14);
  const ktmbRegression = linearRegression(ktmbLast14.map(d => d.value));
  const ktmbMean = ktmbLast14.reduce((s, d) => s + d.value, 0) / ktmbLast14.length;
  const trendDirection: 'up' | 'down' | 'stable' =
    Math.abs(ktmbRegression.slope) < ktmbMean * 0.003 ? 'stable'
    : ktmbRegression.slope > 0 ? 'up' : 'down';

  // Weekly growth rate
  const ktmbValues = ktmbTotals.map(d => d.value);
  const last7 = ktmbValues.slice(-7);
  const prev7 = ktmbValues.slice(-14, -7);
  const last7Avg = last7.reduce((s, v) => s + v, 0) / last7.length;
  const prev7Avg = prev7.length > 0 ? prev7.reduce((s, v) => s + v, 0) / prev7.length : last7Avg;
  const weeklyGrowthRate = prev7Avg > 0
    ? Math.round(((last7Avg - prev7Avg) / prev7Avg) * 10000) / 100
    : 0;

  // ── Weekly pattern mining ──
  interface DayBucket {
    day: number;
    dayName: string;
    values: number[];
  }
  const dayBuckets: DayBucket[] = DAY_NAMES.map((name, i) => ({
    day: i,
    dayName: name,
    values: [],
  }));

  for (const d of ktmbData) {
    const dateStr = d.date.split(' ')[0];
    const dow = new Date(dateStr + 'T00:00:00').getDay();
    dayBuckets[dow].values.push(d.total);
  }

  const dayAvgs = dayBuckets.map(b => ({
    day: b.day,
    dayName: b.dayName,
    avg: b.values.length > 0 ? b.values.reduce((s, v) => s + v, 0) / b.values.length : 0,
    count: b.values.length,
  })).filter(d => d.count >= 2); // need at least 2 data points

  dayAvgs.sort((a, b) => b.avg - a.avg);
  const peakDayOfWeek = dayAvgs[0]?.dayName ?? 'N/A';
  const lowDayOfWeek = dayAvgs[dayAvgs.length - 1]?.dayName ?? 'N/A';

  // Weekend vs weekday ratio
  // NOTE: DOW uses JS getDay() convention: 0=Sunday, 6=Saturday
  const weekdayAvgs = dayAvgs.filter(d => d.day >= 1 && d.day <= 5);
  const weekendAvgs = dayAvgs.filter(d => d.day === 0 || d.day === 6);
  const overallWeekdayAvg = weekdayAvgs.length > 0
    ? weekdayAvgs.reduce((s, d) => s + d.avg, 0) / weekdayAvgs.length : 0;
  const overallWeekendAvg = weekendAvgs.length > 0
    ? weekendAvgs.reduce((s, d) => s + d.avg, 0) / weekendAvgs.length : 0;
  // Ratio = weekend average / weekday average (< 1.0 = less ridership on weekends)
  const weekendWeekdayRatio = overallWeekdayAvg > 0
    ? Math.round((overallWeekendAvg / overallWeekdayAvg) * 100) / 100 : 0;

  // ── Forecasting ──
  const { forecast, stddev } = exponentialSmoothingForecast(ktmbValues);

  // ── Generate anomaly notifications ──
  for (const a of topAnomalies) {
    const pctDev = Math.round(a.deviation * 100) / 100;
    const direction = a.deviation > 0 ? '+' : '';
    notifications.push({
      id: uid(),
      type: 'anomaly',
      title: `${a.severity === 'critical' ? 'Critical' : 'Warning'}: ${a.field} anomaly`,
      description: `${a.date} · ${a.source} ${a.field} was ${direction}${pctDev}σ from norm (${a.value.toLocaleString()} vs expected ${a.expected.toLocaleString()})`,
      timestamp: now.toISOString(),
      read: false,
      source: a.source,
      severity: a.severity === 'critical' ? 'critical' : 'warning',
      meta: { anomaly: a },
    });
  }

  // ── Trend insight notifications ──
  if (trendDirection !== 'stable') {
    notifications.push({
      id: uid(),
      type: 'insight',
      title: `KTMB ridership trend: ${trendDirection === 'up' ? '↑ Upward' : '↓ Downward'}`,
      description: `14-day regression shows ${trendDirection} trend. Weekly growth: ${weeklyGrowthRate > 0 ? '+' : ''}${weeklyGrowthRate}%`,
      timestamp: now.toISOString(),
      read: false,
      source: 'Analytics Engine',
      severity: trendDirection === 'up' ? 'success' : 'warning',
    });
  } else {
    notifications.push({
      id: uid(),
      type: 'insight',
      title: 'KTMB ridership trend: → Stable',
      description: `14-day regression shows stable trend. Weekly growth: ${weeklyGrowthRate > 0 ? '+' : ''}${weeklyGrowthRate}%`,
      timestamp: now.toISOString(),
      read: false,
      source: 'Analytics Engine',
      severity: 'info',
    });
  }

  // Weekly pattern insight
  if (peakDayOfWeek !== 'N/A') {
    insights.push(`Peak ridership: ${peakDayOfWeek}`);
    insights.push(`Lowest ridership: ${lowDayOfWeek}`);
    insights.push(`Weekend/weekday ratio: ${weekendWeekdayRatio.toFixed(2)}`);
  }

  // ── Projection notification ──
  if (forecast.length >= 1) {
    const lastDate = ktmbLatest;
    const fmtNext = (daysOffset: number) => {
      if (!lastDate) return 'N/A';
      const d = new Date(lastDate + 'T00:00:00');
      d.setDate(d.getDate() + daysOffset);
      return format(d, 'dd MMM');
    };

    notifications.push({
      id: uid(),
      type: 'projection',
      title: '3-day ridership projection (KTMB)',
      description: `${fmtNext(1)}: ~${forecast[0]?.toLocaleString()} · ${fmtNext(2)}: ~${forecast[1]?.toLocaleString()} · ${fmtNext(3)}: ~${forecast[2]?.toLocaleString()} (±${stddev.toLocaleString()})`,
      timestamp: now.toISOString(),
      read: false,
      source: 'Analytics Engine',
      severity: 'info',
      meta: { forecast, stddev },
    });
  }

  // ── System health notification ──
  const pipelineCount = (ktmbLatest ? 1 : 0) + (prasaranaLatest ? 1 : 0) + 1; // +1 for headline
  notifications.push({
    id: uid(),
    type: 'system',
    title: `${pipelineCount}/3 data pipelines active`,
    description: `KTMB OD: ${ktmbLatest ? '● active' : '○ inactive'} · Rapid Rail OD: ${prasaranaLatest ? '● active' : '○ inactive'} · Headline: ● active`,
    timestamp: now.toISOString(),
    read: false,
    source: 'System',
    severity: pipelineCount >= 3 ? 'success' : pipelineCount >= 2 ? 'info' : 'warning',
  });

  // ── Build analytics state ──
  const analyticsState: AnalyticsState = {
    lastComputed: now.toISOString(),
    anomalyCount: topAnomalies.length,
    trendDirection,
    weeklyGrowthRate,
    peakDayOfWeek,
    lowDayOfWeek,
    weekendWeekdayRatio,
    forecastNext: forecast[0] ?? null,
    forecastNext2: forecast[1] ?? null,
    forecastNext3: forecast[2] ?? null,
    forecastStdDev: stddev,
    anomalies: topAnomalies,
    insights,
  };

  return NextResponse.json({
    notifications,
    analytics: analyticsState,
    freshness,
    generatedAt: now.toISOString(),
  });
}
