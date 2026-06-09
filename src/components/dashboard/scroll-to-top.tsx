'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Fixed scroll-to-top button that appears when user scrolls past 600px.
 * Uses Framer Motion for smooth entry/exit animations.
 * Respects reduced-motion preference.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          onClick={scrollToTop}
          aria-label="Scroll to top"
          className="fixed bottom-6 right-6 z-40 flex items-center justify-center
            w-10 h-10 rounded-full
            bg-[var(--bg-elevated)] border border-[var(--border-subtle)]
            text-[var(--text-secondary)] hover:text-[var(--accent-primary)]
            hover:border-[var(--accent-primary)]/40
            shadow-lg hover:shadow-xl
            transition-colors duration-200
            backdrop-blur-sm cursor-pointer"
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
