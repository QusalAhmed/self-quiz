import userEvent from '@testing-library/user-event';
import { render, screen } from '@/test-utils';
import { AppLogo } from './AppLogo';

describe('AppLogo component', () => {
  it('renders title and subtitle correctly', () => {
    render(<AppLogo size="md" showSubtitle subtitleText="Vocabulary Companion" />);
    expect(screen.getByText('Word Memorizer')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary Companion')).toBeInTheDocument();
  });

  it('renders link when href is provided', () => {
    const { container } = render(<AppLogo href="/" />);
    const link = container.querySelector('a');
    expect(link).toHaveAttribute('href', '/');
  });

  it('handles custom click event when onClick is passed', async () => {
    const handleClick = jest.fn();
    render(<AppLogo href={null} onClick={handleClick} />);
    const title = screen.getByText('Word Memorizer');
    await userEvent.click(title);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
