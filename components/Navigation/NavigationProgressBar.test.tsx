import { nprogress } from '@mantine/nprogress';
import React from 'react';
import { act, fireEvent, render } from '@/test-utils';
import { NavigationProgressBar } from './NavigationProgressBar';

let currentPathname = '/';
let currentSearchParams = '';
let routeListeners: Array<() => void> = [];

function navigateTo(pathname: string, searchParams = '') {
  currentPathname = pathname;
  currentSearchParams = searchParams;
  routeListeners.forEach((fn) => fn());
}

jest.mock('next/navigation', () => ({
  usePathname: () => {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      routeListeners.push(listener);
      return () => {
        routeListeners = routeListeners.filter((l) => l !== listener);
      };
    }, []);
    return currentPathname;
  },
  useSearchParams: () => {
    const [, setTick] = React.useState(0);
    React.useEffect(() => {
      const listener = () => setTick((t) => t + 1);
      routeListeners.push(listener);
      return () => {
        routeListeners = routeListeners.filter((l) => l !== listener);
      };
    }, []);
    return new URLSearchParams(currentSearchParams);
  },
}));

describe('NavigationProgressBar component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(nprogress, 'start').mockImplementation(() => {});
    jest.spyOn(nprogress, 'complete').mockImplementation(() => {});
    jest.spyOn(nprogress, 'set').mockImplementation(() => {});
    currentPathname = '/';
    currentSearchParams = '';
    routeListeners = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders NavigationProgress without crashing', () => {
    const { container } = render(<NavigationProgressBar color="indigo" size={3} />);
    expect(container).toBeDefined();
  });

  it('triggers nprogress.start and nprogress.set when an internal link is clicked', () => {
    render(
      <div>
        <NavigationProgressBar />
        <a href="/words" id="internal-link">
          Go to Words
        </a>
      </div>
    );

    const link = document.getElementById('internal-link')!;
    fireEvent.click(link);

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.set).toHaveBeenCalledWith(30);
    expect(nprogress.start).toHaveBeenCalledTimes(1);
  });

  it('does not trigger nprogress.start for target="_blank" or external links', () => {
    render(
      <div>
        <NavigationProgressBar />
        <a href="https://example.com" id="external-link">
          External
        </a>
        <a href="/words" target="_blank" id="blank-link">
          New Tab
        </a>
        <a href="mailto:test@example.com" id="mailto-link">
          Mail
        </a>
        <a href="/#section" id="hash-link">
          Hash
        </a>
      </div>
    );

    fireEvent.click(document.getElementById('external-link')!);
    fireEvent.click(document.getElementById('blank-link')!);
    fireEvent.click(document.getElementById('mailto-link')!);

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.start).not.toHaveBeenCalled();
  });

  it('does not trigger nprogress.start on modified clicks (meta, ctrl, shift, alt)', () => {
    render(
      <div>
        <NavigationProgressBar />
        <a href="/stories" id="story-link">
          Story
        </a>
      </div>
    );

    const link = document.getElementById('story-link')!;
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { shiftKey: true });
    fireEvent.click(link, { altKey: true });

    act(() => {
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.start).not.toHaveBeenCalled();
  });

  it('triggers nprogress.start on popstate event (back/forward navigation)', () => {
    render(<NavigationProgressBar />);

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.start).toHaveBeenCalledTimes(1);
  });

  it('triggers nprogress.start on programmatic history.pushState and history.replaceState', () => {
    render(<NavigationProgressBar />);

    act(() => {
      window.history.pushState({}, '', '/words');
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.start).toHaveBeenCalledTimes(1);

    act(() => {
      window.history.replaceState({}, '', '/stories');
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.start).toHaveBeenCalledTimes(2);
  });

  it('calls nprogress.complete on subsequent pathname changes after animation delay', () => {
    render(<NavigationProgressBar />);

    // Initial render shouldn't call complete
    expect(nprogress.complete).not.toHaveBeenCalled();

    // Trigger route change via stateful next/navigation hook update
    act(() => {
      navigateTo('/analysis');
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.set).toHaveBeenCalledWith(100);

    // Fast forward animation delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(nprogress.complete).toHaveBeenCalledTimes(1);
  });

  it('calls nprogress.complete on search params changes after animation delay', () => {
    render(<NavigationProgressBar />);

    expect(nprogress.complete).not.toHaveBeenCalled();

    // Trigger search param change via stateful next/navigation hook update
    act(() => {
      navigateTo('/', 'filter=active');
      jest.advanceTimersByTime(10);
    });

    expect(nprogress.set).toHaveBeenCalledWith(100);

    // Fast forward animation delay
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(nprogress.complete).toHaveBeenCalledTimes(1);
  });
});
