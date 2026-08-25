import {
  completeNavigationProgress,
  completeProgress,
  decrementNavigationProgress,
  incrementNavigationProgress,
  incrementProgress,
  nprogress,
  resetNavigationProgress,
  resetProgress,
  setNavigationProgress,
  setProgress,
  startNavigationProgress,
  startProgress,
  stopNavigationProgress,
  stopProgress,
} from './navigation-progress';

describe('navigation-progress utility helpers', () => {
  beforeEach(() => {
    jest.spyOn(nprogress, 'start').mockImplementation(() => {});
    jest.spyOn(nprogress, 'complete').mockImplementation(() => {});
    jest.spyOn(nprogress, 'reset').mockImplementation(() => {});
    jest.spyOn(nprogress, 'set').mockImplementation(() => {});
    jest.spyOn(nprogress, 'increment').mockImplementation(() => {});
    jest.spyOn(nprogress, 'decrement').mockImplementation(() => {});
    jest.spyOn(nprogress, 'stop').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delegates startNavigationProgress and startProgress to nprogress.start', () => {
    startNavigationProgress();
    expect(nprogress.start).toHaveBeenCalledTimes(1);

    startProgress();
    expect(nprogress.start).toHaveBeenCalledTimes(2);
  });

  it('delegates completeNavigationProgress and completeProgress to nprogress.complete', () => {
    completeNavigationProgress();
    expect(nprogress.complete).toHaveBeenCalledTimes(1);

    completeProgress();
    expect(nprogress.complete).toHaveBeenCalledTimes(2);
  });

  it('delegates resetNavigationProgress and resetProgress to nprogress.reset', () => {
    resetNavigationProgress();
    expect(nprogress.reset).toHaveBeenCalledTimes(1);

    resetProgress();
    expect(nprogress.reset).toHaveBeenCalledTimes(2);
  });

  it('delegates setNavigationProgress and setProgress to nprogress.set', () => {
    setNavigationProgress(40);
    expect(nprogress.set).toHaveBeenCalledWith(40);

    setProgress(80);
    expect(nprogress.set).toHaveBeenCalledWith(80);
  });

  it('delegates incrementNavigationProgress and incrementProgress to nprogress.increment', () => {
    incrementNavigationProgress();
    expect(nprogress.increment).toHaveBeenCalledTimes(1);

    incrementProgress();
    expect(nprogress.increment).toHaveBeenCalledTimes(2);
  });

  it('delegates stopNavigationProgress and stopProgress to nprogress.stop', () => {
    stopNavigationProgress();
    expect(nprogress.stop).toHaveBeenCalledTimes(1);

    stopProgress();
    expect(nprogress.stop).toHaveBeenCalledTimes(2);
  });

  it('delegates decrementNavigationProgress to nprogress.decrement', () => {
    decrementNavigationProgress();
    expect(nprogress.decrement).toHaveBeenCalledTimes(1);
  });
});
