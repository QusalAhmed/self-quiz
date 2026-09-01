import { render, screen } from '@/test-utils';
import { AppIcon } from './AppIcon';

describe('AppIcon component', () => {
  it('renders SVG icon with role and aria-label', () => {
    render(<AppIcon size={40} radius={12} withGlow />);
    const svg = screen.getByLabelText('Word Memorizer Icon');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('viewBox', '0 0 512 512');
  });

  it('applies custom dimensions and glow styles', () => {
    const { container } = render(<AppIcon size={48} radius={14} withGlow={false} />);
    const iconContainer = container.querySelector(
      '[aria-label="Word Memorizer Icon"]'
    )?.parentElement;
    expect(iconContainer).toBeInTheDocument();
    expect(iconContainer).toHaveStyle({ width: '48px', height: '48px', borderRadius: '14px' });
  });
});
