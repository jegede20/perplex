import { render, screen } from '@testing-library/react';
import PnLTag from '@/components/ui/PnLTag';

describe('PnLTag', () => {
  it('renders green styling and "+" prefix for positive values', () => {
    render(<PnLTag value={12_000} />);
    const tag = screen.getByTestId('pnl-tag');
    expect(tag).toHaveAttribute('data-sign', 'positive');
    expect(tag.className).toContain('text-success');
    expect(tag).toHaveTextContent('+$12.0K');
  });

  it('renders red styling and "-" prefix for negative values', () => {
    render(<PnLTag value={-12_000} />);
    const tag = screen.getByTestId('pnl-tag');
    expect(tag).toHaveAttribute('data-sign', 'negative');
    expect(tag.className).toContain('text-danger');
    expect(tag).toHaveTextContent('-$12.0K');
  });

  it('renders neutral styling for zero', () => {
    render(<PnLTag value={0} />);
    const tag = screen.getByTestId('pnl-tag');
    expect(tag).toHaveAttribute('data-sign', 'zero');
    expect(tag.className).toContain('text-textSecondary');
    expect(tag).toHaveTextContent('$0');
  });
});
