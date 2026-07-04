const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, PageNumber, PageBreak,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  ShadingType, TableOfContents, NumberFormat, SectionType,
  ImageRun,
} = require("docx");

// ── Palette: DS-1 Deep Sea (Tech) ──
const P = {
  primary: "0B1C2C",
  body: "1A2B40",
  secondary: "5B6B7D",
  accent: "529286",
  surface: "F0F4F3",
  bg: "0B1C2C",
  white: "FFFFFF",
  black: "000000",
};
const c = (hex) => hex.replace("#", "");

// ── Borders ──
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const accentBorder = { style: BorderStyle.SINGLE, size: 4, color: c(P.accent) };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" };

// ── Helpers ──
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { name: "Calibri" }, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 160 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { name: "Calibri" }, size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 120 },
    keepNext: true,
    children: [new TextRun({ text, bold: true, color: c(P.body), font: { name: "Calibri" }, size: 24 })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    ...opts,
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { name: "Calibri" } })],
  });
}

function bodyRuns(runs, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    ...opts,
    children: runs,
  });
}

function bold(label, text) {
  return bodyRuns([
    new TextRun({ text: label, bold: true, size: 22, color: c(P.body), font: { name: "Calibri" } }),
    new TextRun({ text, size: 22, color: c(P.body), font: { name: "Calibri" } }),
  ]);
}

function code(text) {
  return new Paragraph({
    spacing: { line: 276, after: 60 },
    indent: { left: 480 },
    shading: { type: ShadingType.CLEAR, fill: "F5F7FA" },
    children: [new TextRun({ text, size: 18, color: "334155", font: { name: "Courier New" } })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { line: 312, after: 60 },
    indent: { left: 480, hanging: 240 },
    children: [
      new TextRun({ text: "\u2022  ", size: 22, color: c(P.accent), font: { name: "Calibri" } }),
      new TextRun({ text, size: 22, color: c(P.body), font: { name: "Calibri" } }),
    ],
  });
}

function spacer(twips = 120) {
  return new Paragraph({ spacing: { after: twips }, children: [] });
}

// ── Table helper ──
function makeTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: accentBorder,
      bottom: accentBorder,
      left: NB, right: NB,
      insideHorizontal: thinBorder,
      insideVertical: NB,
    },
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((h) =>
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: c(P.accent) },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, color: c(P.white), font: { name: "Calibri" } })] })],
          })
        ),
      }),
      ...rows.map((r, i) =>
        new TableRow({
          cantSplit: true,
          children: r.map((cell) =>
            new TableCell({
              shading: i % 2 === 0 ? { type: ShadingType.CLEAR, fill: c(P.surface) } : { type: ShadingType.CLEAR, fill: "FFFFFF" },
              margins: { top: 50, bottom: 50, left: 120, right: 120 },
              children: [new Paragraph({ spacing: { line: 276 }, children: [new TextRun({ text: cell, size: 20, color: c(P.body), font: { name: "Calibri" } })] })],
            })
          ),
        })
      ),
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════
// COVER (R1: Pure Paragraph Left)
// ══════════════════════════════════════════════════════════════════════

function buildCover() {
  return new Table({
    borders: allNoBorders,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        height: { value: 16838, rule: "exact" },
        verticalAlign: "top",
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: c(P.bg) },
            borders: allNoBorders,
            margins: { left: 1200, right: 1200, top: 0, bottom: 0 },
            children: [
              // Accent bar
              new Paragraph({
                spacing: { before: 3600 },
                border: { left: { style: BorderStyle.SINGLE, size: 36, color: c(P.accent), space: 12 } },
                indent: { left: 200 },
                children: [],
              }),
              // Title
              new Paragraph({
                spacing: { before: 600, line: 1100, lineRule: "atLeast" },
                indent: { left: 200 },
                children: [new TextRun({ text: "Malaysia Transit", bold: true, size: 72, color: c(P.white), font: { name: "Calibri" } })],
              }),
              new Paragraph({
                spacing: { before: 80, line: 1100, lineRule: "atLeast" },
                indent: { left: 200 },
                children: [new TextRun({ text: "Dashboard", bold: true, size: 72, color: c(P.accent), font: { name: "Calibri" } })],
              }),
              // Subtitle
              new Paragraph({
                spacing: { before: 400 },
                indent: { left: 220 },
                border: { top: { style: BorderStyle.SINGLE, size: 6, color: c(P.accent), space: 12 } },
                children: [new TextRun({ text: "  ", size: 6 })],
              }),
              new Paragraph({
                spacing: { before: 200 },
                indent: { left: 220 },
                children: [new TextRun({ text: "Technical Architecture Report", size: 32, color: c(P.secondary), font: { name: "Calibri" } })],
              }),
              new Paragraph({
                spacing: { before: 120 },
                indent: { left: 220 },
                children: [new TextRun({ text: "Build Stack, Data Pipelines, ML Engine, and Formula Reference", size: 24, color: c(P.secondary), font: { name: "Calibri" } })],
              }),
              // Meta
              new Paragraph({
                spacing: { before: 1800 },
                indent: { left: 220 },
                children: [new TextRun({ text: "RapidStats MY", size: 22, color: "687078", font: { name: "Calibri" } })],
              }),
              new Paragraph({
                spacing: { before: 80 },
                indent: { left: 220 },
                children: [new TextRun({ text: "Version 0.2.0  |  May 2026", size: 20, color: "687078", font: { name: "Calibri" } })],
              }),
              new Paragraph({
                spacing: { before: 80 },
                indent: { left: 220 },
                children: [new TextRun({ text: "Data via data.gov.my  |  CC-BY 4.0", size: 20, color: "687078", font: { name: "Calibri" } })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// ══════════════════════════════════════════════════════════════════════
// DOCUMENT
// ══════════════════════════════════════════════════════════════════════

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { name: "Calibri" }, size: 22, color: c(P.body) },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: { run: { font: { name: "Calibri" }, size: 32, bold: true, color: c(P.primary) } },
      heading2: { run: { font: { name: "Calibri" }, size: 28, bold: true, color: c(P.primary) } },
      heading3: { run: { font: { name: "Calibri" }, size: 24, bold: true, color: c(P.body) } },
    },
  },
  sections: [
    // ── SECTION 1: Cover ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [buildCover()],
    },

    // ── SECTION 2: TOC ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: { name: "Calibri" } })],
          })],
        }),
      },
      children: [
        new Paragraph({
          spacing: { before: 200, after: 300 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: c(P.primary), font: { name: "Calibri" } })],
        }),
        new TableOfContents("TOC", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: "Tip: Right-click the table above and select \"Update Field\" to refresh page numbers after opening in Word.", italics: true, size: 18, color: "90989F", font: { name: "Calibri" } })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ── SECTION 3: Body ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
          pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "RapidStats MY \u2014 Technical Architecture Report", size: 16, color: "808080", font: { name: "Calibri" }, italics: true })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: { name: "Calibri" } })],
          })],
        }),
      },
      children: [
        // ══════════════════════════════════════════════════════════════
        // 1. EXECUTIVE SUMMARY
        // ══════════════════════════════════════════════════════════════
        h1("1. Executive Summary"),

        body("RapidStats MY is a production-grade, real-time transit analytics dashboard built with Next.js 16. It visualizes daily ridership data for 14 transit lines across Malaysia, sourced from three independent data pipelines managed by the Department of Statistics Malaysia (DOSM) via data.gov.my. The system processes approximately 57 days of high-granularity origin-destination parquet data and serves it through a responsive, client-rendered single-page application."),

        body("The dashboard comprises 7,160+ lines of TypeScript/React code across 21 dashboard components, 9 custom hooks, and 8 API routes. It implements an on-device ML engine for anomaly detection, trend analysis, and 3-day ridership forecasting using Z-score analysis, linear regression, and exponential smoothing. All dynamic elements\u2014the hero update badge, data status bar, analytics timestamps, and notification bell\u2014are synchronized through a single metadata API and a Zustand state management layer."),

        body("This report documents the complete technical architecture: the build stack, data pipeline mechanics, chart computation formulas, ML algorithms, component hierarchy, and synchronization patterns. It is intended for software engineers who need to understand, maintain, or extend the system."),

        // ══════════════════════════════════════════════════════════════
        // 2. BUILD STACK & ARCHITECTURE
        // ══════════════════════════════════════════════════════════════
        h1("2. Build Stack and Architecture"),

        h2("2.1 Core Framework"),

        makeTable(
          ["Technology", "Version", "Role"],
          [
            ["Next.js", "16", "App Router, SSR/API routes, Turbopack bundler"],
            ["React", "19", "UI rendering, hooks, concurrent features"],
            ["TypeScript", "5", "Strict typing, interface contracts"],
            ["Tailwind CSS", "4", "Utility-first styling, CSS variables"],
            ["shadcn/ui", "New York style", "Pre-built accessible UI primitives"],
            ["Recharts", "2.x", "Declarative charting (Bar, Line, Area, Tooltip)"],
            ["Zustand", "5.x", "Lightweight client state management"],
            ["TanStack Query", "5.x", "Server-state caching and refetching"],
            ["date-fns", "3.x", "Immutable date manipulation"],
            ["Lucide Icons", "latest", "Consistent icon set (200+ icons used)"],
            ["Prisma ORM", "6.x", "Database schema and client (SQLite)"],
            ["Apache Arrow", "21.x", "Parquet columnar data processing"],
          ]
        ),
        spacer(),

        h2("2.2 Deployment Architecture"),

        body("The application is designed for deployment on Cloudflare Pages using OpenNext. The build pipeline transforms the Next.js application into a Cloudflare-compatible format through the @opennextjs/cloudflare adapter. Caddy serves as the reverse proxy with a built-in gateway that routes API requests through XTransformPort query parameters for multi-service support."),

        bullet("Runtime: Cloudflare Workers (edge deployment)"),
        bullet("Build: opennextjs-cloudflare build \u2192 wrangler deploy"),
        bullet("Gateway: Caddy reverse proxy with XTransformPort routing"),
        bullet("Static assets: JSON data files served from public/ directory"),
        bullet("Database: SQLite (local, file-based via Prisma ORM)"),
        spacer(),

        h2("2.3 Project Structure"),

        makeTable(
          ["Directory", "Contents"],
          [
            ["src/app/", "Next.js App Router \u2014 page.tsx, api/ routes"],
            ["src/components/dashboard/", "21 React dashboard components"],
            ["src/hooks/", "9 custom hooks (ridership, analytics, notifications)"],
            ["src/lib/", "Zustand store, utility functions"],
            ["public/", "Static JSON data (ktmb-daily, prasarana-daily, stations, routes)"],
            ["prisma/", "Database schema (SQLite)"],
            ["mini-services/", "Optional WebSocket/bun microservices on separate ports"],
          ]
        ),

        // ══════════════════════════════════════════════════════════════
        // 3. DATA PIPELINE ARCHITECTURE
        // ══════════════════════════════════════════════════════════════
        h1("3. Data Pipeline Architecture"),

        h2("3.1 Four Data Sources"),

        body("The dashboard consumes data from four independent pipelines, each with different update cadences, granularity, and lag characteristics:"),

        makeTable(
          ["Pipeline", "Granularity", "Update Frequency", "Lag", "Data Format"],
          [
            ["Headline (Audited)", "13 lines, daily totals", "Monthly (post-audit)", "~12 days after month-end", "API (data.gov.my)"],
            ["KTMB OD (Parquet)", "5 services, daily totals", "Daily", "~1 day", "Local JSON from Parquet"],
            ["Rapid Rail OD (Parquet)", "5 lines + BRT, daily totals", "Daily", "~1 day", "Local JSON from Parquet"],
            ["Prasarana Meta", "Aggregated metadata", "On data.gov.my update", "Variable", "GitHub JSON (datagovmy-meta)"],
          ]
        ),
        spacer(),

        h2("3.2 Parquet-to-JSON Processing Pipeline"),

        body("KTMB and Prasarana origin-destination parquet files are processed server-side using a Python script (process_parquet.py) that reads parquet columns and pivots them into daily time-series JSON. The pipeline:"),

        bullet("Reads parquet files from data.gov.my origin-destination datasets"),
        bullet("Extracts per-service/per-line daily passenger counts"),
        bullet("Pivots long-format OD records into wide-format daily rows"),
        bullet("Outputs JSON arrays to public/ directory for static serving"),
        bullet("Cleans station names (removes prefix artifacts from raw data)"),
        spacer(),

        h2("3.3 Data Files Schema"),

        h3("3.3.1 KTMB Daily (ktmb-daily.json)"),
        code('{ "date": "2026-05-24 00:00:00", "ets": 69084, "intercity": 13860,'),
        code('  "komuter": 37544, "komuter_utara": 56806, "tebrau": 7272, "total": 184566 }'),
        spacer(),

        h3("3.3.2 Prasarana Daily (prasarana-daily.json)"),
        code('{ "date": "2026-05-23", "brt": 30576, "lrt_ampang": 210708,'),
        code('  "lrt_kj": 275486, "monorail": 87434, "mrt_pjy": 379218, "total": 983422 }'),
        spacer(),

        h2("3.4 Metadata Synchronization (Single Source of Truth)"),

        body("The /api/metadata endpoint is the single synchronization point for all dynamic timestamps in the dashboard. It scans local JSON files, probes the data.gov.my API for headline data, and fetches the Prasarana meta repository. It computes the freshest date across all sources and returns a unified metadata object."),

        body("The metadata response schema:"),
        code('{ "headline": { "latest_date": "2026-04-30", "lag_days": 25 },'),
        code('  "ktmb": { "latest_date": "2026-05-24", "lag_days": 1 },'),
        code('  "prasarana_od": { "latest_date": "2026-05-23", "lag_days": 2 },'),
        code('  "freshest_date": "2026-05-24", "freshest_source": "KTMB OD" }'),
        spacer(),

        body("Three components consume this metadata: the DynamicUpdateBadge (hero), the DataStatusBar (fixed bar), and the DayTypeAnalytics chart. Each independently fetches /api/metadata and renders the freshest date with appropriate lag coloring (green < 48h, amber < 15d, orange > 15d)."),

        // ══════════════════════════════════════════════════════════════
        // 4. COMPONENT ARCHITECTURE
        // ══════════════════════════════════════════════════════════════
        h1("4. Component Architecture"),

        h2("4.1 Component Hierarchy"),

        body("The dashboard follows a flat component architecture with all 21 components rendered in a single page.tsx file. Components are organized into functional groups:"),

        makeTable(
          ["Component", "Purpose", "Data Source"],
          [
            ["NavBar", "Navigation + NotificationBell + SettingsPanel", "Zustand store"],
            ["DataStatusBar", "3-source freshness indicators (fixed top bar)", "/api/metadata"],
            ["DynamicUpdateBadge", "Hero freshest date with pulsing indicator", "/api/metadata"],
            ["KpiCards", "4 key performance indicator cards", "/api/ridership"],
            ["RidershipChart", "30-day area chart (all 13 lines)", "/api/ridership"],
            ["TransitBreakdown", "Donut chart of line composition", "/api/ridership"],
            ["KtmbWeeklyChart", "Mon\u2013Sun stacked bars (5 KTMB services)", "/api/ridership-ktmb-daily"],
            ["PrasaranaWeeklyChart", "Mon\u2013Sun stacked bars (5 lines + BRT)", "/prasarana-daily.json"],
            ["DayTypeAnalytics", "90-day day-of-week averages, baseline", "Both JSON files + /api/metadata"],
            ["BusiestStationsRapidRail", "Top 10 Rapid Rail stations by OD flow", "/prasarana-stations.json"],
            ["BusiestStationsKTMB", "Top 10 KTMB stations by OD flow", "/ktmb-stations.json"],
            ["TopRoutesRapidRail", "Top 8 Rapid Rail OD routes", "/prasarana-routes.json"],
            ["TopRoutesKTMB", "Top 8 KTMB OD routes", "/ktmb-routes.json"],
            ["AnalyticsTable", "Holiday vs weekday ridership comparison", "/api/holidays + /api/ridership-extended"],
            ["CalendarPicker", "Date picker with holiday dot overlay", "useAnalytics() holiday map"],
            ["ComparisonChart", "Side-by-side bar chart for 2 dates", "useRidership() selected data"],
            ["DataIntegrityBanner", "Holiday source confidence banner", "useAnalytics() source info"],
            ["AboutSection", "Data sources, methodology, coverage info", "/api/metadata"],
          ]
        ),

        // ══════════════════════════════════════════════════════════════
        // 5. CHART FORMULAS AND COMPUTATIONS
        // ══════════════════════════════════════════════════════════════
        h1("5. Chart Formulas and Computations"),

        h2("5.1 KTMB Weekly Chart (Mon\u2013Sun Stacked Bars)"),

        h3("5.1.1 Week Identification"),
        body("The chart identifies the current ISO week (Monday = start) and the previous week using date-fns startOfWeek() with weekStartsOn: 1. Each day is assigned a day-of-week index (0 = Monday, 6 = Sunday) by converting getDay() (where 0 = Sunday):"),
        code('dow = dt.getDay() === 0 ? 6 : dt.getDay() - 1;'),
        spacer(),

        h3("5.1.2 Stacked Bar Aggregation"),
        body("For each day in the current and previous weeks, the chart reads per-service values from the KtmbDay data model. The five KTMB services are stacked in order: Komuter (bottom) \u2192 ETS \u2192 Komuter Utara \u2192 Intercity \u2192 Shuttle Tebrau (top). The total bar height equals:"),
        code('total = komuter + ets + komuterUtara + intercity + tebrau'),
        spacer(),

        h3("5.1.3 Week-over-Week Delta"),
        body("The percentage change between the current and previous week is computed as:"),
        code('weekDelta = ((currentTotal - previousTotal) / previousTotal) * 100'),
        body("This drives the trend indicator (green up-arrow for positive, red down-arrow for negative)."),
        spacer(),

        h3("5.1.4 Daily Average"),
        body("The daily average is computed over only the days that have data in the current week:"),
        code('dailyAvg = Math.round(sum(currentWeekTotals) / count(currentWeekTotals))'),
        spacer(),

        h2("5.2 Prasarana Weekly Chart"),

        h3("5.2.1 Line Breakdown"),
        body("The Prasarana chart follows the same week identification and stacking pattern but uses five Rapid Rail lines: MRT Putrajaya (mrt_pjy), LRT Kelana Jaya (lrt_kj), LRT Ampang (lrt_ampang), Monorail (monorail), and BRT Sunway (brt)."),
        spacer(),

        h3("5.2.2 BRT Sunway Isolation"),
        body("The BRT Sunway line gets special treatment with a dedicated stat card showing its weekly total separately, since BRT operates on a different model (bus rapid transit) from the rail lines."),
        spacer(),

        h2("5.3 Day-Type Analytics (90-Day Averages)"),

        h3("5.3.1 Rolling Window Computation"),
        body("The DayTypeAnalytics component computes per-day-of-week averages over a 90-day rolling window. The computation algorithm:"),

        body("1. Filter data to only include records where the date is within the last 90 days:"),
        code('cutoff = subDays(new Date(), 90)'),
        code('filtered = data.filter(d => new Date(d.date.split(" ")[0]) >= cutoff)'),
        spacer(),

        body("2. Group filtered records into 7 buckets by day-of-week (Mon=0 through Sun=6)."),
        spacer(),

        body("3. For each bucket, compute the arithmetic mean of each service/line:"),
        code('avg = sum(values) / count(values)'),
        spacer(),

        body("4. Compute the total for each day by summing all services:"),
        code('total = sum(perServiceAvg for all services in that day)'),
        spacer(),

        h3("5.3.2 Weekday Baseline (Reference Line)"),
        body("The weekday average baseline is the mean of Monday through Friday totals:"),
        code('weekdayAvg = sum(Mon_avg + Tue_avg + Wed_avg + Thu_avg + Fri_avg) / 5'),
        body("This is rendered as a dashed green reference line across the chart, allowing visual comparison of each day's total against the weekday norm."),
        spacer(),

        h3("5.3.3 Weekend-Weekday Ratio"),
        body("This metric quantifies the ridership drop on weekends:"),
        code('weekendAvg = (Sat_avg + Sun_avg) / 2'),
        code('weekendWeekdayRatio = weekendAvg / weekdayAvg'),
        body("A typical value of 0.55\u20130.65 indicates weekend ridership is 55\u201365% of weekday levels."),
        spacer(),

        h3("5.3.4 Per-Day Percentage Deviation (Tooltip)"),
        body("Each bar's tooltip shows the percentage deviation from the weekday baseline:"),
        code('pctDev = (dayTotal - weekdayAvg) / weekdayAvg * 100'),
        spacer(),

        h2("5.4 KPI Cards"),

        body("The four KPI cards display headline ridership metrics derived from the /api/ridership endpoint:"),

        makeTable(
          ["KPI", "Formula", "Description"],
          [
            ["Latest Ridership", "data[last].total", "Total passengers on the most recent headline date"],
            ["30-Day Average", "sum(data[last30].total) / 30", "Rolling 30-day mean of all rail passengers"],
            ["Top Line", "max(mrtKajang, mrtPutrajaya)", "Which MRT line had higher ridership on latest date"],
            ["Data Points", "count(data)", "Total number of days tracked in headline dataset"],
          ]
        ),

        // ══════════════════════════════════════════════════════════════
        // 6. ML ENGINE
        // ══════════════════════════════════════════════════════════════
        h1("6. Machine Learning Engine"),

        h2("6.1 Overview"),

        body("The ML engine runs server-side in the /api/notifications route. It processes KTMB and Prasarana daily data through three algorithms: Z-Score Anomaly Detection, Linear Regression Trend Analysis, and Exponential Smoothing Forecasting. Results are packaged as notifications and analytics state, delivered to the client via the Zustand store."),

        h2("6.2 Z-Score Anomaly Detection"),

        h3("6.2.1 Algorithm"),
        body("For each numerical field (total, komuter, ets, komuter_utara, lrt_kj, mrt_pjy, etc.), the engine maintains a sliding window of the past 30 values and computes the rolling mean and standard deviation:"),

        code('mean = sum(window) / windowSize        // windowSize = 30'),
        code('variance = sum((x - mean)^2) / windowSize'),
        code('stddev = sqrt(variance)'),
        code('zScore = (currentValue - mean) / stddev'),
        spacer(),

        h3("6.2.2 Detection Thresholds"),
        makeTable(
          ["|Z-Score|", "Severity", "Classification", "Action"],
          [
            ["> 3.0", "Critical", "Strong anomaly", "Critical notification pushed"],
            ["2.0 \u2013 3.0", "Warning", "Moderate deviation", "Warning notification pushed"],
            ["< 2.0", "\u2014", "Normal variation", "No notification"],
          ]
        ),
        spacer(),

        h3("6.2.3 Scope"),
        body("Anomaly detection runs on the following time series: KTMB total, KTMB komuter, KTMB komuter_utara, KTMB ets, Prasarana total, Prasarana mrt_pjy, Prasarana lrt_kj, and Prasarana lrt_ampang. The top 10 anomalies (sorted by severity then recency) are surfaced as notifications."),
        spacer(),

        h2("6.3 Linear Regression Trend Analysis"),

        h3("6.3.1 Algorithm"),
        body("The engine fits a least-squares linear regression to the last 14 days of KTMB total ridership values:"),

        code('slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX^2)'),
        code('intercept = (sumY - slope * sumX) / n'),
        spacer(),

        h3("6.3.2 Trend Classification"),
        body("The slope is compared against the mean value to determine directionality:"),
        code('threshold = mean * 0.003    // 0.3% of mean'),
        code('trend = |slope| < threshold ? "stable" : (slope > 0 ? "up" : "down")'),
        spacer(),

        h3("6.3.3 Weekly Growth Rate"),
        code('last7Avg = mean(last 7 days of data)'),
        code('prev7Avg = mean(days -14 to -7)'),
        code('weeklyGrowthRate = ((last7Avg - prev7Avg) / prev7Avg) * 100'),
        spacer(),

        h2("6.4 Exponential Smoothing Forecast"),

        h3("6.4.1 Algorithm"),
        body("The 3-day ridership forecast uses simple exponential smoothing (SES) with alpha = 0.3:"),

        code('S[0] = values[0]'),
        code('S[t] = alpha * values[t] + (1 - alpha) * S[t-1]   // alpha = 0.3'),
        code('forecast = S[last]   // Level model: constant forecast'),
        spacer(),

        h3("6.4.2 Confidence Interval"),
        body("The forecast standard deviation is computed from the residuals between actual values and smoothed values:"),
        code('residuals[i] = values[i] - S[i]'),
        code('stddev = sqrt(mean((residual - mean_residual)^2))'),
        body("The forecast is reported as: ~{forecast[0]} \u00b1 {stddev} for the next day, repeated for 3 days."),
        spacer(),

        h3("6.4.3 Model Limitations"),
        bullet("SES assumes no trend or seasonality \u2014 suitable for short-range (1\u20133 day) forecasts only"),
        bullet("Alpha = 0.3 gives moderate responsiveness to recent changes"),
        bullet("The model does not capture weekly seasonality (Fri/Sat patterns)"),
        bullet("Forecast accuracy degrades beyond 3 days"),
        spacer(),

        h2("6.5 Day-of-Week Pattern Mining"),

        body("The engine also computes peak/low day patterns across all available data:"),

        code('dayBuckets[0..6] = group all data by day-of-week'),
        code('dayAvgs[i] = mean(dayBuckets[i].values)'),
        code('peakDay = argmax(dayAvgs)'),
        code('lowDay = argmin(dayAvgs)'),
        spacer(),

        // ══════════════════════════════════════════════════════════════
        // 7. STATE MANAGEMENT & SYNC
        // ══════════════════════════════════════════════════════════════
        h1("7. State Management and Synchronization"),

        h2("7.1 Zustand Store Architecture"),

        body("A single Zustand store (useAppStore in src/lib/store.ts) manages all cross-component state. The store holds:"),

        makeTable(
          ["State Slice", "Type", "Description"],
          [
            ["notifications", "NotificationItem[]", "ML-generated alerts, data updates, system health"],
            ["unreadCount", "number", "Derived: count of unread notifications"],
            ["freshness", "DataFreshness", "Per-source latest dates and lag days"],
            ["analyticsState", "AnalyticsState", "Anomaly count, trend direction, forecasts"],
            ["lastSynced", "string (ISO)", "Timestamp of last /api/notifications fetch"],
            ["loadingNotifications", "boolean", "Loading state for notification fetch"],
          ]
        ),
        spacer(),

        h2("7.2 Notification Types"),

        body("The /api/notifications endpoint generates five types of notifications, each with a specific source badge and severity level:"),

        makeTable(
          ["Type", "Icon", "Source Badge", "Trigger"],
          [
            ["data_update", "Database", "KTMB OD / Rapid Rail OD", "New data detected in local JSON files"],
            ["anomaly", "AlertTriangle", "KTMB OD / Rapid Rail OD", "Z-score > 2.0 on any time series"],
            ["insight", "Brain", "ML Engine", "Trend direction or pattern change detected"],
            ["forecast", "TrendingUp", "ML Engine", "3-day forecast computed"],
            ["system", "Settings", "System", "Pipeline health check (X/3 active)"],
          ]
        ),
        spacer(),

        h2("7.3 Refresh Cycle"),

        body("The useNotifications() hook implements a 5-minute auto-refresh cycle:"),
        code('const REFRESH_INTERVAL = 5 * 60 * 1000;  // 5 minutes'),
        code('useEffect(() => {'),
        code('  fetchNotifications();'),
        code('  const interval = setInterval(fetchNotifications, REFRESH_INTERVAL);'),
        code('  return () => clearInterval(interval);'),
        code('}, [fetchNotifications]);'),
        spacer(),

        h2("7.4 Synchronization Pattern"),

        body("All dynamic elements in the dashboard share a consistent view of data freshness through the following synchronization pattern:"),

        bullet("On mount: useNotifications() fetches /api/notifications, populating Zustand store with notifications, analytics state, and freshness data"),
        bullet("DynamicUpdateBadge: independently fetches /api/metadata (not through Zustand) for hero freshest date display"),
        bullet("DataStatusBar: independently fetches /api/metadata for the 3-source fixed bar"),
        bullet("DayTypeAnalytics: independently fetches both JSON files and /api/metadata for chart data + timestamps"),
        bullet("All three independent fetches converge on the same freshest_date value since they all read from the same source files"),
        spacer(),

        // ══════════════════════════════════════════════════════════════
        // 8. HOOKS ARCHITECTURE
        // ══════════════════════════════════════════════════════════════
        h1("8. Hooks Architecture"),

        body("The dashboard uses 9 custom hooks that encapsulate data fetching, state management, and business logic. Each hook manages its own loading/error state and is independently fetchable:"),

        makeTable(
          ["Hook", "Data Source", "Returns", "Used By"],
          [
            ["useRidership()", "/api/ridership", "data[], loading, error", "KPI Cards, RidershipChart, Summary Stats"],
            ["useAnalytics()", "/api/holidays + /api/ridership-extended", "ridership[], analytics, holidayMap", "AnalyticsTable, CalendarPicker"],
            ["useNotifications()", "/api/notifications", "notifications, freshness, analyticsState", "NotificationBell, global sync"],
            ["useKtmbDaily(weeks)", "/api/ridership-ktmb-daily", "KtmbDay[], loading, error", "KtmbWeeklyChart"],
            ["usePrasaranaDaily()", "/prasarana-daily.json", "PrasaranaDay[], loading, error", "PrasaranaWeeklyChart"],
            ["useDataMetadata()", "/api/metadata", "DataMetadata", "DynamicUpdateBadge, AboutSection"],
            ["useKtmbStations()", "/ktmb-stations.json", "Station[], loading", "BusiestStationsKTMB"],
            ["usePrasaranaStations()", "/prasarana-stations.json", "Station[], loading", "BusiestStationsRapidRail"],
            ["useMobile()", "Window.matchMedia", "isMobile boolean", "Responsive layout logic"],
          ]
        ),

        // ══════════════════════════════════════════════════════════════
        // 9. HOLIDAY CLASSIFICATION
        // ══════════════════════════════════════════════════════════════
        h1("9. Holiday Classification System"),

        h2("9.1 Multi-Source Holiday Resolution"),

        body("The /api/holidays endpoint implements a 3-tier holiday resolution strategy:"),

        makeTable(
          ["Priority", "Source", "Coverage", "Confidence"],
          [
            ["1 (Primary)", "Malaysia Calendar API (mycal)", "Federal + Selangor state holidays, JAKIM-determined Islamic dates", "High"],
            ["2 (Fallback)", "Nager.Date API", "Federal holidays only", "Medium"],
            ["3 (Last resort)", "Day-of-week heuristic", "Weekend detection only", "Unverified"],
          ]
        ),
        spacer(),

        h2("9.2 Day Classification Logic"),

        body("Each date is classified into one of four day types, which drives the analytics comparison logic:"),

        makeTable(
          ["Day Type", "Criteria", "Typical Ridership Impact"],
          [
            ["holiday", "Date matches confirmed or estimated holiday", "~40\u201360% of weekday baseline"],
            ["friday", "Day-of-week = 5 (Friday)", "~90\u201395% of weekday baseline"],
            ["weekend", "Day-of-week = 0 or 6 (Sat/Sun)", "~55\u201370% of weekday baseline"],
            ["weekday", "Day-of-week = 1\u20134 (Mon\u2013Thu)", "Baseline (100%)"],
          ]
        ),
        spacer(),

        h2("9.3 Confidence Levels"),

        body("Each holiday date carries a confidence rating that affects how comparisons are displayed:"),
        bullet("High: Confirmed by official gazette or JAKIM ruling"),
        bullet("Medium: From secondary source, likely correct"),
        bullet("Low: Estimated \u2014 pending rukyah (moon sighting) confirmation for Islamic festivals"),
        bullet("Unverified: Weekend detection only, no holiday API available"),
        spacer(),

        // ══════════════════════════════════════════════════════════════
        // 10. API ROUTE SUMMARY
        // ══════════════════════════════════════════════════════════════
        h1("10. API Route Summary"),

        makeTable(
          ["Route", "Method", "Purpose", "Response Time"],
          [
            ["/api/ridership", "GET", "Headline ridership data (13 lines, 90 days)", "~500ms (external API)"],
            ["/api/ridership-extended", "GET", "Extended ridership with all line breakdowns", "~600ms (external API)"],
            ["/api/ridership-ktmb-daily", "GET", "KTMB daily pivot (5 services)", "~200ms (local JSON)"],
            ["/api/holidays", "GET", "Holiday classifications for a given year", "~1s (external API)"],
            ["/api/metadata", "GET", "Unified freshness metadata from all sources", "~2s (3 external probes)"],
            ["/api/notifications", "GET", "ML-generated notifications + analytics state", "~100ms (local JSON)"],
            ["/api/mcp", "POST", "MCP server integration endpoint", "Variable"],
          ]
        ),

        // ══════════════════════════════════════════════════════════════
        // 11. NOTIFICATION BELL
        // ══════════════════════════════════════════════════════════════
        h1("11. Notification Bell System"),

        h2("11.1 Dynamic Notification Generation"),

        body("The NotificationBell component reads from the Zustand store which is populated by the /api/notifications endpoint. Notifications are dynamically generated each time the endpoint is called (every 5 minutes). The notification set includes:"),

        bullet("2 data update notifications (KTMB OD + Rapid Rail OD freshness)"),
        bullet("Up to 10 anomaly notifications (Z-score > 2.0, sorted by severity)"),
        bullet("1 trend insight notification (up/down/stable direction)"),
        bullet("1 forecast notification (3-day SES prediction)"),
        bullet("1 system health notification (pipeline count)"),
        spacer(),

        h2("11.2 Time Grouping"),

        body("Notifications are grouped into three temporal buckets:"),
        bullet("\"Just now\" \u2014 notifications less than 10 minutes old"),
        bullet("\"Today\" \u2014 notifications between 10 minutes and 24 hours old"),
        bullet("\"Earlier\" \u2014 notifications older than 24 hours"),
        spacer(),

        h2("11.3 Read State Management"),

        body("Each notification has a boolean read flag stored in Zustand. The bell icon displays a red badge with the unread count. Users can mark individual notifications as read or mark all as read simultaneously. Read state is ephemeral (resets on page reload)."),

        // ══════════════════════════════════════════════════════════════
        // 12. TRANSIT COVERAGE
        // ══════════════════════════════════════════════════════════════
        h1("12. Transit Coverage"),

        body("The dashboard covers 14 transit lines across Malaysia's rail and bus rapid transit network:"),

        makeTable(
          ["Operator", "Line", "Service Type", "Data Source"],
          [
            ["Rapid Rail (Prasarana)", "MRT Kajang Line (SBK)", "Heavy Rail Metro", "Headline + Parquet OD"],
            ["Rapid Rail (Prasarana)", "MRT Putrajaya Line (SSP)", "Heavy Rail Metro", "Headline + Parquet OD"],
            ["Rapid Rail (Prasarana)", "LRT Kelana Jaya Line", "Light Rail Transit", "Headline + Parquet OD"],
            ["Rapid Rail (Prasarana)", "LRT Ampang Line", "Light Rail Transit", "Headline + Parquet OD"],
            ["Rapid Rail (Prasarana)", "Monorail Line", "Monorail", "Headline + Parquet OD"],
            ["Rapid Rail (Prasarana)", "BRT Sunway Line", "Bus Rapid Transit", "Headline + Parquet OD"],
            ["KTM Berhad", "KTM Komuter", "Commuter Rail", "Headline + Parquet OD"],
            ["KTM Berhad", "ETS", "Intercity High-Speed", "Headline + Parquet OD"],
            ["KTM Berhad", "KTM Intercity", "Intercity Rail", "Headline + Parquet OD"],
            ["KTM Berhad", "KTM Komuter Utara", "Commuter Rail (Northern)", "Headline + Parquet OD"],
            ["KTM Berhad", "Shuttle Tebrau", "Cross-Border Shuttle", "Headline + Parquet OD"],
            ["Rapid Bus", "RapidKL Bus (KL)", "Public Bus", "Headline only"],
            ["Rapid Bus", "Rapid Bus (Kuantan)", "Public Bus", "Headline only"],
            ["Rapid Bus", "Rapid Bus (Penang)", "Public Bus", "Headline only"],
          ]
        ),
        spacer(),

        // ══════════════════════════════════════════════════════════════
        // 13. STYLING AND THEME
        // ══════════════════════════════════════════════════════════════
        h1("13. Styling and Theme System"),

        h2("13.1 Design Tokens"),

        body("The dashboard uses a comprehensive CSS custom property system for theming. Key tokens include:"),

        makeTable(
          ["Token", "Value", "Usage"],
          [
            ["--bg-base", "#0C0E12", "Main background"],
            ["--bg-elevated", "#141722", "Elevated cards, nav"],
            ["--surface-card", "#1A1D2B", "Card backgrounds"],
            ["--surface-hover", "#252836", "Hover states"],
            ["--surface-active", "#2E3140", "Active states"],
            ["--border-subtle", "rgba(255,255,255,0.06)", "Card borders"],
            ["--border-faint", "rgba(255,255,255,0.04)", "Subtle dividers"],
            ["--text-primary", "#F1F5F9", "Headings, primary text"],
            ["--text-secondary", "#94A3B8", "Secondary text"],
            ["--text-muted", "#64748B", "Muted labels"],
            ["--accent", "#85AB8B", "Brand green accent"],
          ]
        ),
        spacer(),

        h2("13.2 Animation System"),

        body("The dashboard uses Tailwind CSS animations with custom keyframes:"),
        bullet("animate-fade-in-up: Opacity 0\u21921 + translateY 16px\u21920, with staggered delays via style={{ animationDelay: 'Xms' }}"),
        bullet("animate-pulse-glow: Subtle scale(1) + opacity pulse on ambient background orbs"),
        bullet("animate-ping: Pulsing ring effect on live indicator dots"),
        bullet("All transitions use duration-150 to duration-200 for snappy UI feedback"),
        spacer(),

        // ══════════════════════════════════════════════════════════════
        // 14. CODE STATISTICS
        // ══════════════════════════════════════════════════════════════
        h1("14. Code Statistics"),

        makeTable(
          ["Metric", "Value"],
          [
            ["Total lines of code (dashboard + hooks + API + lib)", "7,160+"],
            ["Dashboard components", "21"],
            ["Custom hooks", "9"],
            ["API routes", "8"],
            ["Lib modules", "2 (store, utils)"],
            ["Recharts chart instances", "8"],
            ["Zustand store slices", "3 (notifications, freshness, analytics)"],
            ["CSS custom properties", "25+"],
            ["Transit lines covered", "14"],
            ["Data pipelines", "4"],
            ["ML algorithms", "3 (Z-Score, Linear Regression, SES)"],
          ]
        ),
      ],
    },
  ],
});

// ── Generate ──
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("Malaysia-Transit-Dashboard-Technical-Report.docx", buf);
  console.log("Report generated: Malaysia-Transit-Dashboard-Technical-Report.docx");
});
