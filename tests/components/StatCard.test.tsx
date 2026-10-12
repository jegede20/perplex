import { render, screen } from '@testing-library/react';
import StatCard from '@/components/ui/StatCard';

describe('StatCard', () => {
  it('renders label and value correctly', () => {
    render(<StatCard label="Total Volume" value="$142.4M" />);
    expect(screen.getByText('Total Volume')).toBeInTheDocument();
    expect(screen.getByText('$142.4M')).toBeInTheDocument();
  });

  it('shows change arrow up for positive change', () => {
    render(<StatCard label="Volume" value="$1M" change={12.4} />);
    const arrow = screen.getByTestId('change-arrow');
    expect(arrow).toHaveAttribute('data-direction', 'up');
  });

  it('shows change arrow down for negative change', () => {
    render(<StatCard label="Volume" value="$1M" change={-8.2} />);
    const arrow = screen.getByTestId('change-arrow');
    expect(arrow).toHaveAttribute('data-direction', 'down');
  });

  it('applies correct color for highlight prop', () => {
    const { rerender } = render(<StatCard label="OI" value="$28M" highlight="PURPLE" />);
    let card = screen.getByTestId('stat-card');
    expect(card.dataset.highlight).toBe('PURPLE');
    expect(card.className).toContain('glass-glow');

    rerender(<StatCard label="OI" value="$28M" highlight="LONG" />);
    card = screen.getByTestId('stat-card');
    expect(card.dataset.highlight).toBe('LONG');
    expect(card.className).toContain('border-success/30');

    rerender(<StatCard label="OI" value="$28M" highlight="SHORT" />);
    card = screen.getByTestId('stat-card');
    expect(card.className).toContain('border-danger/30');
  });

  it('renders subValue when provided', () => {
    render(<StatCard label="TVL" value="$34M" subValue="+$2.1M net inflow" />);
    expect(screen.getByText('+$2.1M net inflow')).toBeInTheDocument();
  });
});
