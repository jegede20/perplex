'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const STORAGE_KEY = 'perplex-sidebar-collapsed';

function readStoredCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * App shell for the analytics workspace (/app/*):
 * collapsible sidebar + sticky navbar + footer around every dashboard page.
 * Sidebar collapse state persists in localStorage, toggles with the sidebar
 * button or Ctrl/Cmd+B, and the main column flexes to fill the freed space.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  // Hydrate persisted state after mount (avoids SSR markup mismatch).
  useEffect(() => {
    setCollapsed(readStoredCollapsed());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable — collapse state stays in-memory */
    }
  }, [collapsed, ready]);

  // Ctrl/Cmd + B toggles the sidebar (desktop only — mobile has no sidebar).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Recharts ResponsiveContainer only remeasures on window resize — fire one
  // (rAF-debounced) whenever the main content column's width actually changes,
  // e.g. while the sidebar collapse transition is running.
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'));
      });
    });
    ro.observe(el);
    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="flex w-full min-w-0 min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} animate={ready} />
      <div ref={contentRef} className="flex w-full min-w-0 min-h-screen flex-1 flex-col">
        <Navbar />
        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-6 md:pb-10 md:pt-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
