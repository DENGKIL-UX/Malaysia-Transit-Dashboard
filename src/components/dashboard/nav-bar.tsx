'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu, X, Activity, Github } from 'lucide-react';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { NotificationBell } from '@/components/dashboard/notification-bell';
import { SettingsPanel } from '@/components/dashboard/settings-panel';
import { ExportDropdown } from '@/components/dashboard/export-dropdown';

const navLinks = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'about', label: 'About' },
];

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('dashboard');

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { threshold: 0.2, rootMargin: '-80px 0px -40% 0px' }
    );

    const timer = setTimeout(() => {
      for (const link of navLinks) {
        const el = document.getElementById(link.id);
        if (el) observer.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  const scrollTo = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      }
      setActive(id);
      setMenuOpen(false);
    },
    []
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-5">
        {/* Logo */}
        <button
          onClick={() => scrollTo('dashboard')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#85AB8B]/20 border border-[#85AB8B]/30 flex items-center justify-center transition-colors duration-200 group-hover:bg-[#85AB8B]/30">
            <Activity className="w-4 h-4 text-[#85AB8B]" />
          </div>
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            RapidStats
            <sup className="text-[10px] font-medium text-[#85AB8B] ml-0.5">
              MY
            </sup>
          </span>
        </button>

        {/* Desktop pill nav */}
        <div className="hidden lg:flex items-center gap-1 bg-[var(--surface-hover)] backdrop-blur-md rounded-full pl-1 pr-1.5 py-1.5 border border-[var(--border-subtle)]">
          {navLinks.map((link) => {
            const isActive = active === link.id;
            return (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`
                  text-sm px-4 py-2 rounded-full transition-all duration-300
                  ${
                    isActive
                      ? 'font-semibold text-[#1f2a1d] bg-[#85AB8B] shadow-lg shadow-[#85AB8B]/20'
                      : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-card)]'
                  }
                `}
              >
                {link.label}
              </button>
            );
          })}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <CommandPalette />
          <NotificationBell />
          <ExportDropdown />
          <SettingsPanel />
          <a
            href="https://github.com/data-gov-my/datagovmy-meta"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-hover)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-active)] transition-all duration-200"
            aria-label="View on GitHub"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-hover)] backdrop-blur-md border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-active)] transition-all duration-300"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Menu
              className={`w-5 h-5 absolute transition-all duration-300 ${
                menuOpen
                  ? 'opacity-0 rotate-90 scale-50'
                  : 'opacity-100 rotate-0 scale-100'
              }`}
            />
            <X
              className={`w-5 h-5 absolute transition-all duration-300 ${
                menuOpen
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-50'
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${
          menuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" />
      </div>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-[var(--bg-surface-1)]/95 backdrop-blur-xl shadow-2xl border-l border-[var(--border-faint)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-24 px-8 pb-8">
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => {
              const isActive = active === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => scrollTo(link.id)}
                  className="text-left text-2xl font-semibold py-4 border-b border-[var(--border-faint)] transition-all duration-500"
                  style={{
                    transform: menuOpen ? 'translateX(0)' : 'translateX(2rem)',
                    opacity: menuOpen ? 1 : 0,
                    transitionDelay: menuOpen ? `${150 + i * 70}ms` : '0ms',
                    color: isActive ? '#85AB8B' : 'var(--text-primary)',
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
          <div
            className="mt-8 flex flex-col gap-3 transition-all duration-500"
            style={{
              transform: menuOpen ? 'translateX(0)' : 'translateX(2rem)',
              opacity: menuOpen ? 1 : 0,
              transitionDelay: menuOpen ? '400ms' : '0ms',
            }}
          >
            <a
              href="https://github.com/data-gov-my/datagovmy-meta"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-3 transition-colors"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
