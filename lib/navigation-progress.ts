import { nprogress, nprogressStore } from '@mantine/nprogress';

export { nprogress, nprogressStore };

export const startNavigationProgress = () => nprogress.start();
export const stopNavigationProgress = () => nprogress.stop();
export const resetNavigationProgress = () => nprogress.reset();
export const setNavigationProgress = (value: number) => nprogress.set(value);
export const incrementNavigationProgress = () => nprogress.increment();
export const decrementNavigationProgress = () => nprogress.decrement();
export const completeNavigationProgress = () => nprogress.complete();
export const cleanupNavigationProgress = () => nprogress.cleanup();

/**
 * Convenience aliases
 */
export const startProgress = startNavigationProgress;
export const completeProgress = completeNavigationProgress;
export const resetProgress = resetNavigationProgress;
export const setProgress = setNavigationProgress;
export const incrementProgress = incrementNavigationProgress;
export const stopProgress = stopNavigationProgress;
