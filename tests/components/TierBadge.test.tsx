import { render, screen } from '@testing-library/react';
import TierBadge from '@/components/ui/TierBadge';

describe('TierBadge', () => {
  it('renders 🐋 and "WHALE" for WHALE tier', () => {
    render(<TierBadge tier="WHALE" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveTextContent('WHALE');
    expect(badge).toHaveTextContent('🐋');
    expect(badge.dataset.tier).toBe('WHALE');
  });

  it('renders 🦈 and "SHARK" for SHARK tier', () => {
    render(<TierBadge tier="SHARK" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveTextContent('SHARK');
    expect(badge).toHaveTextContent('🦈');
    expect(badge.dataset.tier).toBe('SHARK');
  });

  it('renders 🐟 and "FISH" for FISH tier', () => {
    render(<TierBadge tier="FISH" />);
    const badge = screen.getByTestId('tier-badge');
    expect(badge).toHaveTextContent('FISH');
    expect(badge).toHaveTextContent('🐟');
    expect(badge.dataset.tier).toBe('FISH');
  });
});
