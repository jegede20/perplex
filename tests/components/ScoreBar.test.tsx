import { render, screen } from '@testing-library/react';
import ScoreBar from '@/components/ui/ScoreBar';

describe('ScoreBar', () => {
  it('renders purple fill bar for score 85', () => {
    render(<ScoreBar score={85} />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-primary');
    expect(screen.getByTestId('score-bar-value')).toHaveTextContent('85');
  });

  it('renders yellow fill bar for score 45', () => {
    render(<ScoreBar score={45} />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-warning');
  });

  it('renders red fill bar for score 25', () => {
    render(<ScoreBar score={25} />);
    const fill = screen.getByTestId('score-bar-fill');
    expect(fill.className).toContain('bg-danger');
  });

  it('clamps and reports aria values', () => {
    render(<ScoreBar score={140} />);
    const bar = screen.getByTestId('score-bar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
