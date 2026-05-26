'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Zap, CalendarDays } from 'lucide-react';

// ─── FeatureCard Component ──────────────────────────────────────────

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  gradient: string;
  delay: number;
}

function FeatureCard({ title, description, icon, gradient, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut', delay }}
      className="relative flex flex-col justify-start items-start w-full max-w-[260px] md:max-w-[300px] group mx-auto"
    >
      {/* Glow Background */}
      <div
        className="absolute w-full h-[260px] md:h-[300px] opacity-60 rounded-[40px] pointer-events-none"
        style={{
          background: gradient,
          filter: 'blur(45px)',
        }}
      />

      {/* Foreground Card with Gradient Border */}
      <div
        className="relative self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden"
        style={{
          border: '8px solid transparent',
          background: `linear-gradient(#0e140e, #0e140e) padding-box, ${gradient} border-box`,
        }}
      >
        {/* Content */}
        <div className="w-full h-full p-7 flex flex-col justify-between">
          {/* Icon */}
          <div className="text-white/90">{icon}</div>

          {/* Text */}
          <div>
            <h3 className="text-white font-medium text-xl mb-3 tracking-tight">
              {title}
            </h3>
            <p className="text-gray-400 text-[14px] leading-[1.6] font-normal selection:bg-emerald-500/20">
              {description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Card Data ──────────────────────────────────────────────────────

const CARDS: FeatureCardProps[] = [
  {
    title: 'Ridership Analytics',
    description:
      'Multi-modal transit tracking across MRT Kajang, MRT Putrajaya, LRT Kelana Jaya, LRT Ampang, Monorail, BRT Sunway, KTMB Komuter, ETS, and Intercity networks with stacked weekly charts and Monday-zero DOW conversion.',
    icon: <BarChart3 size={32} strokeWidth={2.5} />,
    gradient: 'linear-gradient(137deg, #059669 0%, #6EE7B7 45%, #10B981 100%)',
    delay: 0.1,
  },
  {
    title: 'Anomaly Detection',
    description:
      'Four-algorithm statistical engine running Z-Score with population variance over 30-day windows, 14-day linear regression at 0.3% threshold, exponential smoothing at α=0.3, and weekly growth rate last-7 versus previous-7.',
    icon: <Zap size={32} strokeWidth={2.5} />,
    gradient: 'linear-gradient(137deg, #B45309 0%, #FCD34D 45%, #F59E0B 100%)',
    delay: 0.2,
  },
  {
    title: 'Day-Type Intelligence',
    description:
      '90-day rolling weekday baseline with Monday-through-Friday total averaging. Weekend-to-weekday ratio computation and percentage deviation tooltips for pattern-of-life transit intelligence.',
    icon: <CalendarDays size={32} strokeWidth={2.5} />,
    gradient: 'linear-gradient(137deg, #1E40AF 0%, #93C5FD 45%, #3B82F6 100%)',
    delay: 0.3,
  },
];

// ─── Exported Section ───────────────────────────────────────────────

export function FeatureCardsSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="flex flex-col items-center justify-center px-6">
        {/* Grid of cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-3 lg:gap-3 w-full max-w-[936px]">
          {CARDS.map((card) => (
            <FeatureCard key={card.title} {...card} />
          ))}
        </div>
      </div>
    </section>
  );
}
