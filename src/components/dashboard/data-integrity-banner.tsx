'use client';

import { AlertTriangle } from 'lucide-react';

interface Props {
  holidayFallback: boolean;
  holidaySource: string;
}

export function DataIntegrityBanner({ holidayFallback, holidaySource }: Props) {
  if (!holidayFallback) return null;

  return (
    <div
      className="rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs px-4 py-3 flex items-start gap-3 animate-fade-in-up"
      role="alert"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-orange-400" />
      <div>
        <p className="font-medium text-orange-200">
          Limited holiday accuracy
        </p>
        <p className="mt-1 text-orange-300/70 text-[11px] leading-relaxed">
          Holiday classification service is unavailable. Calendar markers show
          weekends only — public holiday comparisons may be inaccurate. Islamic
          festival dates (Raya, Haji) are not detected in fallback mode.
          {holidaySource !== 'fallback' && (
            <span className="mt-1 block">
              Source: {holidaySource}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
