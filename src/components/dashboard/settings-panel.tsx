'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Settings, Sun, Moon, Monitor, Type } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';

const fontSizes = [
  { value: 'small', label: 'Small', scale: '14px' },
  { value: 'medium', label: 'Medium', scale: '16px' },
  { value: 'large', label: 'Large', scale: '18px' },
] as const;

type FontSize = 'small' | 'medium' | 'large';

function useStoredFontSize() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    () => {
      const stored = localStorage.getItem('rs-font-size') as FontSize;
      if (stored && fontSizes.some((f) => f.value === stored)) return stored;
      return 'medium';
    },
    () => 'medium'
  );
}

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const storedFontSize = useStoredFontSize();
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Read stored font size on mount (without useEffect)
  const mounted = typeof window !== 'undefined';

  useEffect(() => {
    setFontSize(storedFontSize);
  }, [storedFontSize]);

  // Apply font scale when fontSize changes
  useEffect(() => {
    const scale = fontSizes.find((f) => f.value === fontSize)?.scale;
    if (scale) {
      document.documentElement.style.fontSize = scale;
    }
  }, [fontSize]);

  const handleFontChange = (value: FontSize) => {
    setFontSize(value);
    localStorage.setItem('rs-font-size', value);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] transition-all duration-200"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="bg-[var(--bg-surface-1)] border-[var(--border-subtle)] sm:max-w-sm"
        >
          <SheetHeader>
            <SheetTitle className="text-[var(--accent-primary)] text-sm font-semibold">
              Display Preferences
            </SheetTitle>
            <SheetDescription className="text-[var(--text-muted)] text-[11px]">
              Customize the dashboard appearance
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-6 pb-6">
            {/* Theme Toggle */}
            <div className="flex flex-col gap-3">
              <Label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                Theme
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'dark', icon: Moon, label: 'Dark' },
                  { value: 'light', icon: Sun, label: 'Light' },
                  { value: 'system', icon: Monitor, label: 'System' },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                      flex flex-col items-center gap-2 py-3 px-2 rounded-xl border transition-all duration-200
                      ${mounted && theme === value
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="flex flex-col gap-3">
              <Label className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest">
                Font Size
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {fontSizes.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleFontChange(value)}
                    className={`
                      flex items-center justify-center py-2.5 px-3 rounded-xl border transition-all duration-200
                      ${fontSize === value
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)]/30 text-[var(--accent-primary)]'
                        : 'bg-[var(--surface-card)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)]'
                      }
                    `}
                  >
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Data Source Info */}
            <div className="pt-4 border-t border-[var(--border-faint)]">
              <div className="flex items-center gap-2 mb-2">
                <Type className="w-3.5 h-3.5 text-[var(--text-faint)]" />
                <span className="text-[10px] font-semibold text-[var(--text-faint)] uppercase tracking-widest">
                  Data Source
                </span>
              </div>
              <p className="text-xs text-[var(--accent-primary)] font-medium">
                data.gov.my · CC-BY 4.0
              </p>
              <p className="text-[10px] text-[var(--text-faint)] mt-1">
                Department of Statistics Malaysia (DOSM)
              </p>
              <p className="text-[10px] text-[var(--text-ghost)] mt-2">
                Ridership data is monthly audited. Published ~12 days after
                month-end. Not real-time.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
