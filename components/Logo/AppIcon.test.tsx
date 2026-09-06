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

  it('generates unique gradient and filter IDs for multiple instances', () => {
    const { container } = render(
      <div>
        <AppIcon />
        <AppIcon />
      </div>
    );
    const svgs = container.querySelectorAll('svg[aria-label="Word Memorizer Icon"]');
    expect(svgs).toHaveLength(2);

    const gradient1 = svgs[0].querySelector('linearGradient');
    const gradient2 = svgs[1].querySelector('linearGradient');
    expect(gradient1).toBeInTheDocument();
    expect(gradient2).toBeInTheDocument();
    expect(gradient1?.id).not.toEqual(gradient2?.id);

    const rect1 = svgs[0].querySelector('rect[fill^="url(#logoBgGrad"]');
    expect(rect1).toHaveAttribute('fill', `url(#${gradient1?.id})`);
  });
});
