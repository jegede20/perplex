'use client';

import { useEffect, useRef, useState } from 'react';
import TierBadge from '@/components/ui/TierBadge';
import ScoreBar from '@/components/ui/ScoreBar';
import BehaviorTags from '@/components/wallet/BehaviorTags';
import { cn } from '@/lib/utils/cn';

interface ScoreComponent {
  label: string;
  points: number;
  description: string;
}

const COMPONENTS: ScoreComponent[] = [
  { label: 'Win Rate', points: 40, description: 'Accounts for 40% of total score' },
  { label: 'PnL Size', points: 30, description: 'Grows with realized profit up to $10K+' },
  { label: 'Volume', points: 15, description: 'Scales with total volume up to $500K+' },
  { label: 'Consistency', points: 15, description: 'Win streak relative to total trades' },
];

function useInView(): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setSeen(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, seen];
}

/**
 * Smart Money Score explainer — animated formula breakdown (fills on
 * scroll via IntersectionObserver) + a live-looking example wallet.
 */
export default function SmartMoneySection() {
  const [ref, seen] = useInView();

  return (
    <section id="smart-money-score" className="py-24" style={{ background: '#0A0A0F' }}>
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Smart Money Score
        </p>
        <h2 className="mt-2 max-w-2xl text-[30px] font-bold text-white md:text-[36px]">
          Our proprietary algorithm that separates whales from fish.
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* left: formula */}
          <div ref={ref}>
            <h3 className="text-[18px] font-semibold text-white">How we score wallets</h3>
            <div className="mt-6 space-y-5">
              {COMPONENTS.map((component, i) => (
                <div key={component.label}>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="font-medium text-textPrimary">{component.label}</span>
                    <span className="tabular font-semibold text-primary">
                      {component.points} pts
                    </span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
                      style={{
                        width: seen ? `${(component.points / 40) * 100}%` : '0%',
                        transitionDelay: `${i * 150}ms`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-textMuted">{component.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-textMuted">
                Tier thresholds
              </p>
              <div className="mt-3 space-y-2 text-[13px]">
                <p className="flex items-center gap-2">
                  <span aria-hidden>🐋</span>
                  <span className="font-semibold text-white">Whale</span>
                  <span className="text-textSecondary">→ Score ≥ 75 AND Volume ≥ $500K</span>
                </p>
                <p className="flex items-center gap-2">
                  <span aria-hidden>🦈</span>
                  <span className="font-semibold text-white">Shark</span>
                  <span className="text-textSecondary">→ Score ≥ 50 OR Volume ≥ $100K</span>
                </p>
                <p className="flex items-center gap-2">
                  <span aria-hidden>🐟</span>
                  <span className="font-semibold text-white">Fish</span>
                  <span className="text-textSecondary">→ Everything else</span>
                </p>
              </div>
            </div>
          </div>

          {/* right: example wallet card */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2">
              <TierBadge tier="WHALE" size="md" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="font-mono text-[15px] font-semibold text-white">0xA3...4f2e</p>
              <div className="flex items-center gap-1.5">
                <span className="rounded-lg border border-border px-2.5 py-1 text-[10px] text-textMuted">
                  Copy
                </span>
                <span className="rounded-lg border border-border px-2.5 py-1 text-[10px] text-textMuted">
                  ↗ MonadScan
                </span>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-textMuted">
                Smart Money Score
              </p>
              <div className="mt-1 flex items-end gap-2">
                <span className="tabular text-[28px] font-bold leading-none text-white">82</span>
                <span className="mb-0.5 text-[12px] text-textMuted">/ 100</span>
              </div>
              <div className="mt-2">
                <ScoreBar score={82} height="md" />
              </div>
              <p className="mt-1.5 text-[11px] text-textMuted">Top 8% of all tracked wallets</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2.5">
              {[
                ['Win Rate', '78%', 'text-success'],
                ['Realized PnL', '+$142.4K', 'text-success'],
                ['Total Volume', '$2.1M', 'text-white'],
                ['Avg Leverage', '12x', 'text-white'],
                ['Total Trades', '142', 'text-white'],
                ['Active Since', 'Sept 1, 2026', 'text-white'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[11px] text-textMuted">{label}</span>
                  <span className={cn('tabular text-[12px] font-semibold', color)}>{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-textMuted">
                Behavior Profile
              </p>
              <div className="mt-2">
                <BehaviorTags tags={['HIGH_LEVERAGE', 'SCALPER', 'BTC_MAXI', 'CONSISTENT']} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
