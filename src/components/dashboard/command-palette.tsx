'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Calendar, Train, ChevronRight, Keyboard, Sun, Moon, Home, LayoutDashboard, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { useTheme } from 'next-themes';
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
  { id: 'ets', label: 'ETS', abbr: 'ETS' },
  { id: 'intercity', label: 'KTM Intercity', abbr: 'IC' },
  { id: 'komuter-utara', label: 'KTM Komuter Utara', abbr: 'KU' },
  { id: 'tebrau', label: 'Shuttle Tebrau', abbr: 'ST' },
  { id: 'bus-kl', label: 'Rapid Bus (KL)', abbr: 'BKL' },
  { id: 'bus-kuantan', label: 'Rapid Bus (Kuantan)', abbr: 'BKN' },
  { id: 'bus-penang', label: 'Rapid Bus (Penang)', abbr: 'BRP' },
];

const shortcuts = [
  { key: '⌘K / Ctrl+K', label: 'Open this palette', icon: Search },
  { key: 'D', label: 'Jump to Dashboard', icon: LayoutDashboard },
  { key: 'A', label: 'Jump to Analytics', icon: BarChart3 },
  { key: '?', label: 'Show shortcuts', icon: Keyboard },
  { key: 'T', label: 'Toggle theme', icon: Sun },
  { key: 'R', label: 'Return to Hero', icon: Home },
];

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const top = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { data } = useRidership();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K — toggle palette
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Don't intercept when palette is open and user is typing in input
      if (open) return;

      // D — Jump to Dashboard
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        scrollToId('dashboard');
        return;
      }

      // A — Jump to Analytics
      if (e.key === 'a' || e.key === 'A') {
        // Don't intercept if user is typing in an input/textarea
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        e.preventDefault();
        scrollToId('analytics');
        return;
      }

      // ? — Open palette with shortcuts
      if (e.key === '?') {
        // Don't intercept if user is typing in an input/textarea
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        e.preventDefault();
        setShowShortcuts(true);
        setOpen(true);
        return;
      }

      // T — Toggle theme
      if (e.key === 't' || e.key === 'T') {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        e.preventDefault();
        setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
        return;
      }

      // R — Return to Hero
      if (e.key === 'r' || e.key === 'R') {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        e.preventDefault();
        localStorage.removeItem('rapidstats-landing-dismissed');
        window.location.reload();
        return;
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, theme, setTheme]);

  const jumpToDate = useCallback((date: string) => {
    setOpen(false);
    setShowShortcuts(false);
    const el = document.getElementById('analytics');
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const jumpToSection = useCallback((id: string) => {
    setOpen(false);
    setShowShortcuts(false);
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark');
  }, [theme, setTheme]);

  const returnToHero = useCallback(() => {
    setOpen(false);
    setShowShortcuts(false);
    localStorage.removeItem('rapidstats-landing-dismissed');
    window.location.reload();
  }, []);

  const handleInputChange = useCallback((value: string) => {
    const q = value.toLowerCase().trim();
    setShowShortcuts(q === '?' || q === 'shortcuts');
  }, []);

  return (
    <>
      <button
        onClick={() => { setOpen(true); setShowShortcuts(false); }}
        className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:border-[var(--border-subtle)] transition-all duration-200 pl-3 pr-2 py-1.5 h-9 min-w-[36px] group"
        aria-label="Search (⌘K)"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden lg:inline text-xs font-medium text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors">
          Search...
        </span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] font-medium text-[var(--text-ghost)] bg-[var(--surface-card)] border border-[var(--border-faint)] rounded px-1 py-0.5 leading-none">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setShowShortcuts(false); }}>
        <CommandInput placeholder="Search dates, lines, or sections..." onValueChange={handleInputChange} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Keyboard Shortcuts — shown on ? or "shortcuts" query */}
          {showShortcuts && (
            <>
              <CommandGroup heading="Keyboard Shortcuts">
                {shortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <CommandItem
                      key={s.key}
                      onSelect={() => {
                        if (s.key === 'D') jumpToSection('dashboard');
                        else if (s.key === 'A') jumpToSection('analytics');
                        else if (s.key === 'T') toggleTheme();
                        else if (s.key === 'R') returnToHero();
                        else if (s.key === '?') { /* already showing */ }
                        else setOpen(false);
                      }}
                    >
                      <Icon className="w-4 h-4 text-[var(--text-faint)]" />
                      <span className="flex-1">{s.label}</span>
                      <kbd className="text-[10px] font-medium text-[var(--text-ghost)] bg-[var(--surface-card)] border border-[var(--border-faint)] rounded px-1.5 py-0.5 leading-none tabular-nums">
                        {s.key}
                      </kbd>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

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
                  ets: 'ets',
                  intercity: 'intercity',
                  'komuter-utara': 'komuterUtara',
                  tebrau: 'tebrau',
                  'bus-kl': 'busKl',
                  'bus-kuantan': 'busKuantan',
                  'bus-penang': 'busRpn',
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