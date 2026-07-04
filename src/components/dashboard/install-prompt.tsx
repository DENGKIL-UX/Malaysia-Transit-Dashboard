'use client';

import { useEffect, useState, useCallback } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Custom A2HS install prompt.
 *
 * Chrome fires `beforeinstallprompt` when all installability criteria are met.
 * We capture the event and show our own branded install UI instead of the
 * default mini-infobar (which many users miss).
 *
 * iOS Safari doesn't fire this event — it uses the Share sheet instead.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only show on mobile (Chrome Android)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Check if previously dismissed (persist for 7 days)
    const dismissedAt = localStorage.getItem('a2hs-dismissed');
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 7 * 24 * 60 * 60 * 1000) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay so user isn't interrupted on first load
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('a2hs-dismissed', String(Date.now()));
  }, []);

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-6 sm:w-[340px] z-50 animate-fade-in-up">
      <div className="rounded-2xl bg-[var(--bg-elevated)]/95 backdrop-blur-xl border border-[var(--border-subtle)] shadow-2xl shadow-black/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/25 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 text-[#10b981]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Install TransitMY
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Add to home screen for quick access
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-[var(--surface-active)] transition-colors -mr-1 -mt-1"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-[var(--text-ghost)]" />
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] py-2.5 px-4 rounded-xl border border-[var(--border-faint)] transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
