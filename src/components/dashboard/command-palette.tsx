'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Train, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useRidership } from '@/hooks/use-ridership';

const transitLines = [
  { id: 'kajang', label: 'MRT Kajang Line', abbr: 'SBK' },
  { id: 'putrajaya', label: 'MRT Putrajaya Line', abbr: 'SSP' },
  { id: 'kelana-jaya', label: 'LRT Kelana Jaya Line', abbr: 'KJ' },
  { id: 'ampang', label: 'LRT Ampang Line', abbr: 'AG' },
  { id: 'monorail', label: 'Monorail Line', abbr: 'MR' },
  { id: 'komuter', label: 'KTM Komuter', abbr: 'KT' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { data } = useRidership();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const jumpToDate = useCallback((date: string) => {
    setOpen(false);
    const el = document.getElementById('analytics');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const jumpToSection = useCallback((id: string) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] transition-all duration-200"
        aria-label="Search (⌘K)"
      >
        <Search className="w-4 h-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search dates, lines, or sections..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Sections */}
          <CommandGroup heading="Sections">
            {[
              { id: 'dashboard', label: 'Dashboard', desc: 'KPI cards and ridership chart' },
              { id: 'analytics', label: 'Analytics', desc: 'Holiday patterns and date comparison' },
              { id: 'about', label: 'About', desc: 'Data sources and methodology' },
            ].map((section) => (
              <CommandItem
                key={section.id}
                onSelect={() => jumpToSection(section.id)}
              >
                <ChevronRight className="w-4 h-4 text-[var(--text-faint)]" />
                <div>
                  <div className="text-sm">{section.label}</div>
                  <div className="text-[10px] text-[var(--text-faint)]">{section.desc}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* Recent dates */}
          {data.length > 0 && (
            <CommandGroup heading="Recent Data Points">
              {data.slice(-7).reverse().map((d) => (
                <CommandItem
                  key={d.date}
                  onSelect={() => jumpToDate(d.date)}
                >
                  <Calendar className="w-4 h-4 text-[var(--text-faint)]" />
                  <div className="flex-1">
                    <span>{format(new Date(d.date + 'T00:00:00'), 'dd MMM yyyy')}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-faint)] tabular-nums">
                    {d.total.toLocaleString()}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Transit lines */}
          <CommandGroup heading="Transit Lines">
            {transitLines.map((line) => {
              const latest = data[data.length - 1];
              const value = latest
                ? (latest as Record<string, unknown>)[{
                  kajang: 'mrtKajang',
                  putrajaya: 'mrtPutrajaya',
                  'kelana-jaya': 'lrtKelanaJaya',
                  ampang: 'lrtAmpang',
                  monorail: 'monorail',
                  komuter: 'komuter',
                }[line.id]] as number ?? 0
                : 0;
              return (
                <CommandItem
                  key={line.id}
                  onSelect={() => jumpToSection('dashboard')}
                >
                  <Train className="w-4 h-4 text-[var(--text-faint)]" />
                  <span>{line.label}</span>
                  <span className="ml-auto text-[10px] text-[var(--text-faint)] tabular-nums">
                    {value > 0 ? value.toLocaleString() : '—'}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
