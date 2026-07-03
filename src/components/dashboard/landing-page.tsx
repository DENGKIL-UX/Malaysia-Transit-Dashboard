'use client';

import { useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Train,
  TrendingUp,
  BarChart3,
  Zap,
  ChevronRight,
  Activity,
  Database,
  Clock,
  Shield,
} from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

// ponytail: static stat values, could fetch from /api/metadata for live numbers
const STATS = [
  { value: '14', label: 'Transit Services', icon: Train },
  { value: 'T-1', label: 'Data Freshness', icon: Clock },
  { value: '3', label: 'Data Pipelines', icon: Database },
  { value: '24/7', label: 'Auto Refresh', icon: Zap },
];

const FEATURES = [
  {
    title: 'Daily Ridership Tracking',
    desc: 'Rail and bus ridership across Klang Valley, updated within 1-3 days of publication.',
    icon: BarChart3,
  },
  {
    title: 'Multi-Source Pipeline',
    desc: 'KTMB OD, Prasarana OD, and DOSM Headline — three independent data streams merged in real-time.',
    icon: Database,
  },
  {
    title: 'Anomaly Detection',
    desc: 'Z-score based alerts detect unusual ridership patterns, holidays, and data gaps automatically.',
    icon: Shield,
  },
  {
    title: 'Period Comparison',
    desc: 'Compare any two dates side-by-side with per-service breakdowns and visual diff highlights.',
    icon: TrendingUp,
  },
];

const featureVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.8 + i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function LandingPage({ onEnter }: LandingPageProps) {
  const [exiting, setExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Client-only: avoid hydration mismatch for video element
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const handleEnter = useCallback(() => {
    setExiting(true);
    // Pause video to save resources
    videoRef.current?.pause();
    // Delay to let exit animation play
    setTimeout(onEnter, 600);
  }, [onEnter]);

  // Keyboard: Enter or Space triggers enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleEnter();
      }
    },
    [handleEnter]
  );

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 bg-[#070e07] overflow-y-auto overflow-x-hidden"
        >
          {/* ═══ HERO SECTION ═══ */}
          <section className="relative w-full h-screen min-h-[600px] max-h-[900px] overflow-hidden">
            {/* Fallback gradient before video loads */}
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#070e07] via-[#0a1a0e] to-[#070e07]" />

            {/* Ambient glow orbs */}
            <div className="absolute inset-0 pointer-events-none z-[1]" aria-hidden="true">
              <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full bg-[#336443]/25 blur-[120px] animate-pulse-glow" />
              <div
                className="absolute bottom-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-[#85AB8B]/15 blur-[100px] animate-pulse-glow"
                style={{ animationDelay: '2000ms' }}
              />
            </div>

            {/* Video background */}
            {isClient && (
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
                className="absolute inset-0 z-[2] w-full h-full object-cover object-center opacity-60"
              >
                <source src="/hero-bg.mp4" type="video/mp4" />
              </video>
            )}

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 z-[3] bg-gradient-to-b from-[#070e07]/70 via-[#070e07]/40 to-[#070e07]/90" />
            <div className="absolute inset-0 z-[3] bg-gradient-to-r from-[#070e07]/50 via-transparent to-[#070e07]/50" />

            {/* Scanline effect — subtle */}
            <div
              className="absolute inset-0 z-[3] opacity-[0.03]"
              aria-hidden="true"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(133,171,139,0.15) 2px, rgba(133,171,139,0.15) 4px)',
              }}
            />

            {/* Hero content */}
            <div className="relative z-[4] flex flex-col items-center justify-center h-full px-6 text-center max-w-3xl mx-auto">
              {/* Logo mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="mb-6"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#85AB8B]/10 border border-[#85AB8B]/20 backdrop-blur-md flex items-center justify-center">
                  <Activity className="w-7 h-7 sm:w-8 sm:h-8 text-[#85AB8B]" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-4"
              >
                <span className="text-white">Rapid</span>
                <span className="text-[#85AB8B]">Stats</span>
                <span className="text-white/40 text-2xl sm:text-3xl md:text-4xl lg:text-5xl align-super ml-1 font-semibold">
                  MY
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-base sm:text-lg text-white/70 max-w-xl mb-2"
              >
                Malaysia Transit Ridership Analytics
              </motion.p>

              {/* Data source badge */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="text-xs text-white/35 mb-8"
              >
                Sourced from DOSM Open Data Portal &middot; data.gov.my
              </motion.p>

              {/* Service line pills */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.5 }}
                className="flex flex-wrap items-center justify-center gap-1.5 mb-10 max-w-md"
              >
                {[
                  { label: 'MRT Kajang', color: 'bg-amber-400' },
                  { label: 'MRT Putrajaya', color: 'bg-sky-400' },
                  { label: 'LRT Ampang', color: 'bg-rose-400' },
                  { label: 'LRT Kelana Jaya', color: 'bg-violet-400' },
                  { label: 'Monorail', color: 'bg-emerald-400' },
                  { label: 'KTM Komuter', color: 'bg-teal-400' },
                  { label: 'ETS', color: 'bg-cyan-400' },
                  { label: 'RapidKL Bus', color: 'bg-orange-400' },
                ].map((s) => (
                  <span
                    key={s.label}
                    className="text-[9px] sm:text-[10px] font-medium text-white/50 px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.06]"
                  >
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color} mr-1`} />
                    {s.label}
                  </span>
                ))}
              </motion.div>

              {/* CTA button */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                <button
                  type="button"
                  onClick={handleEnter}
                  onKeyDown={handleKeyDown}
                  className="group relative inline-flex items-center gap-2.5 rounded-full bg-[#85AB8B] px-7 py-3.5 text-sm font-semibold text-[#070e07] shadow-lg shadow-[#85AB8B]/20 hover:bg-[#9bc2a1] hover:shadow-xl hover:shadow-[#85AB8B]/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85AB8B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070e07]"
                  aria-label="Enter the dashboard"
                >
                  Enter Dashboard
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 animate-shimmer opacity-30" />
                  </div>
                </button>
                <p className="mt-3 text-[10px] text-white/25">
                  Data refreshes automatically &middot; No sign-in required
                </p>
              </motion.div>

              {/* Scroll hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-[9px] text-white/20 uppercase tracking-[0.2em]">
                    Scroll to explore
                  </span>
                  <div className="w-px h-6 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
              </motion.div>
            </div>
          </section>

          {/* ═══ STATS BAR ═══ */}
          <section className="relative z-[4] bg-[#0a120a] border-y border-white/[0.04]">
            <div className="max-w-5xl mx-auto px-6 py-8 sm:py-10">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
                {STATS.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: i * 0.08, duration: 0.4 }}
                    className="text-center"
                  >
                    <stat.icon className="w-4 h-4 text-[#85AB8B]/50 mx-auto mb-2" />
                    <p className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      {stat.value}
                    </p>
                    <p className="text-[10px] sm:text-xs text-white/40 mt-0.5">
                      {stat.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FEATURES GRID ═══ */}
          <section className="relative z-[4] bg-[#070e07]">
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#336443]/10 blur-[150px] pointer-events-none" aria-hidden="true" />

            <div className="max-w-5xl mx-auto px-6 py-16 sm:py-24 relative">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-12"
              >
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#85AB8B]/50 mb-3">
                  Capabilities
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                  Analytics that move with the network
                </h2>
                <p className="text-sm text-white/50 max-w-lg mx-auto">
                  Real-time ridership patterns, anomaly detection, and multi-source data fusion
                  for Malaysia&apos;s public transit ecosystem.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {FEATURES.map((feature, i) => (
                  <motion.div
                    key={feature.title}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={featureVariant}
                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-6 hover:bg-white/[0.04] hover:border-[#85AB8B]/20 transition-all duration-300"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#85AB8B]/10 border border-[#85AB8B]/15 flex items-center justify-center mb-4 group-hover:bg-[#85AB8B]/15 transition-colors">
                      <feature.icon className="w-4 h-4 text-[#85AB8B]" />
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-white/45 leading-relaxed">
                      {feature.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ BOTTOM CTA ═══ */}
          <section className="relative z-[4] bg-[#070e07]">
            <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20 text-center">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5 }}
              >
                <div className="w-12 h-px bg-gradient-to-r from-transparent via-[#85AB8B]/40 to-transparent mx-auto mb-8" />
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                  Ready to explore?
                </h2>
                <p className="text-sm text-white/45 mb-8 max-w-md mx-auto">
                  Dive into daily ridership data, compare periods, and discover
                  patterns across 14 Malaysian transit services.
                </p>
                <button
                  type="button"
                  onClick={handleEnter}
                  onKeyDown={handleKeyDown}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-[#85AB8B] px-7 py-3.5 text-sm font-semibold text-[#070e07] shadow-lg shadow-[#85AB8B]/20 hover:bg-[#9bc2a1] hover:shadow-xl hover:shadow-[#85AB8B]/30 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#85AB8B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070e07]"
                  aria-label="Enter the dashboard"
                >
                  Enter Dashboard
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </motion.div>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="relative z-[4] border-t border-white/[0.04] bg-[#070e07]">
            <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-[#85AB8B]/20 flex items-center justify-center">
                  <Activity className="w-3 h-3 text-[#85AB8B]" />
                </div>
                <span className="text-[10px] font-medium text-white/30">
                  RapidStats<sup className="text-[7px] text-[#85AB8B]/60">MY</sup>
                </span>
              </div>
              <p className="text-[10px] text-white/20">
                Built with Next.js 16 &middot; Recharts &middot; Tailwind CSS
              </p>
              <p className="text-[10px] text-white/20">
                CC-BY 4.0 &middot; data.gov.my
              </p>
            </div>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
}