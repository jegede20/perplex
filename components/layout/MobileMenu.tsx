'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { NAV_ITEMS, isNavItemActive } from '@/components/layout/navItems';

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Mobile slide-in menu (below md): a full-height drawer from the right with
 * a dark backdrop. Lists the same nav items/routes as the desktop sidebar
 * via the shared NAV_ITEMS config. Closes on nav tap, backdrop tap, or
 * Escape; locks body scroll while open; safe-area padded for notch and
 * gesture bar.
 */
export default function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while the menu is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Backdrop — tap to close */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right drawer */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal={open}
        aria-label="Navigation menu"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-[min(320px,85vw)] flex-col border-l border-border bg-surface transition-transform duration-200 ease-out md:hidden',
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        )}
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-sm font-semibold text-textPrimary">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            tabIndex={open ? undefined : -1}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-textSecondary transition-colors duration-150 hover:bg-surface2 hover:text-textPrimary"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
          {NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? 'page' : undefined}
                tabIndex={open ? undefined : -1}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors duration-150',
                  active
                    ? 'bg-primary/15 text-primary shadow-[inset_0_0_0_1px_rgba(123,94,167,0.25)]'
                    : 'text-textSecondary hover:bg-surface2 hover:text-textPrimary'
                )}
              >
                <item.icon size={19} aria-hidden />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
