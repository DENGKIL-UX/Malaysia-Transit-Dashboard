'use client';

export function CinematicTrain() {
  return (
    <>
      {/* Deep platform ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#85AB8B]/6 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)]/80 via-transparent to-[var(--bg-base)]/60" />

      {/* Track bed — positioned in the lower portion of the hero */}
      <div className="absolute bottom-8 left-0 right-0">
        <div className="absolute bottom-12 left-0 right-0 h-px bg-[var(--border-faint)]" />
        <div className="absolute bottom-20 left-0 right-0 h-px bg-[var(--border-ghost)]" />
        <div className="absolute bottom-0 left-8 right-8 flex flex-col gap-1.5">
          <div className="h-px bg-[var(--border-subtle)] w-full" />
          <div className="flex gap-[3px]">
            {Array.from({ length: 60 }).map((_, i) => (
              <div key={i} className="flex-1 h-px bg-[var(--border-faint)]" />
            ))}
          </div>
          <div className="h-px bg-[var(--border-subtle)] w-full" />
        </div>
      </div>

      {/* Passing train — positioned in the lower portion, below the subtitle text */}
      <div className="absolute bottom-16 left-0 right-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-80 h-20 animate-train-pass">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--surface-hover)] to-transparent rounded-xl" />
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-amber-400/40 rounded-full blur-[1px]" />
          <div className="absolute top-[3px] left-8 right-8 h-[1px] bg-amber-400/15 rounded-full blur-[2px]" />
          <div className="absolute top-4 left-8 right-8 flex gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-6 bg-amber-400/12 rounded-sm border border-amber-400/[0.08]"
              />
            ))}
          </div>
          <div className="absolute bottom-4 left-6 right-6 h-[1px] bg-[var(--border-subtle)] rounded-full" />
          <div className="absolute bottom-3 left-[45%] w-8 h-8 border border-[var(--border-faint)] rounded-sm" />
          <div className="absolute bottom-1 left-8 flex gap-10">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-4 h-2.5 bg-[var(--border-faint)] rounded-full border border-[var(--border-ghost)]" />
            ))}
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-5 h-8 bg-amber-400/25 rounded-full blur-[2px]" />
          <div className="absolute top-1/2 -translate-y-1/2 -right-3 w-3 h-6 bg-red-400/15 rounded-full blur-[2px]" />
        </div>
      </div>

      {/* Simple loop indicator — no fake station names */}
      <div className="absolute bottom-5 left-5 flex items-center gap-2 pointer-events-none">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#85AB8B] opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#85AB8B]/70" />
        </span>
        <span className="text-[9px] font-medium text-[#85AB8B]/30 uppercase tracking-[0.15em]">
          Train Loop — 12s cycle
        </span>
      </div>

      {/* Bottom fade into dashboard */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-base)] to-transparent pointer-events-none" />
    </>
  );
}
