'use client';

import { NavigationProgress, nprogress } from '@mantine/nprogress';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useRef } from 'react';

/**
 * Trigger immediate visual start with initial visible width (deferred out of render cycle)
 */
export function triggerProgressStart() {
  setTimeout(() => {
    nprogress.set(30);
    nprogress.start();
  }, 0);
}

/**
 * Trigger smooth finish and complete
 */
export function triggerProgressComplete() {
  nprogress.set(100);
  setTimeout(() => {
    nprogress.complete();
  }, 180);
}

/**
 * Internal route watcher that listens to pathname/searchParam updates,
 * click events, history changes, and popstate events.
 */
function RouteChangeObserver() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? '';
  const currentPath = `${pathname}?${searchParamsString}`;
  const lastPathRef = useRef(currentPath);
  const completeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startProgressAnimation = () => {
    if (completeTimeoutRef.current) {
      clearTimeout(completeTimeoutRef.current);
      completeTimeoutRef.current = null;
    }
    if (safetyTimeoutRef.current) {
      clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
    }

    // Schedule update asynchronously so it never runs synchronously inside React's useInsertionEffect
    startTimeoutRef.current = setTimeout(() => {
      nprogress.set(30);
      nprogress.start();
    }, 0);

    // Safety fallback: if navigation fails or aborts, complete after 5s
    safetyTimeoutRef.current = setTimeout(() => {
      nprogress.complete();
    }, 5000);
  };

  // Complete progress bar whenever route or search parameters change
  useEffect(() => {
    if (lastPathRef.current !== currentPath) {
      lastPathRef.current = currentPath;

      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      nprogress.set(100);

      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
      completeTimeoutRef.current = setTimeout(() => {
        nprogress.complete();
        completeTimeoutRef.current = null;
      }, 180);
    }
  }, [currentPath]);

  // Listen for global link clicks, popstate, and programmatic history changes
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Ignore non-primary clicks and modified clicks (new tab / window)
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest('a, [data-href]');
      if (!anchor) {
        return;
      }

      // Ignore external links, downloads, hash links, or explicit target
      const href = anchor.getAttribute('href') || anchor.getAttribute('data-href');
      if (
        !href ||
        /^(mailto|tel|javascript):/i.test(href) ||
        anchor.getAttribute('target') === '_blank' ||
        anchor.hasAttribute('download') ||
        anchor.getAttribute('rel')?.includes('external')
      ) {
        return;
      }

      try {
        const targetUrl = new URL(href, window.location.href);
        const activeUrl = new URL(window.location.href);

        // Ignore different origin
        if (targetUrl.origin !== activeUrl.origin) {
          return;
        }

        // Ignore hash navigation on the identical route
        const isSamePath = targetUrl.pathname === activeUrl.pathname;
        const isSameSearch = targetUrl.search === activeUrl.search;
        if (isSamePath && isSameSearch) {
          return;
        }

        startProgressAnimation();
      } catch {
        // Ignore URL parsing errors
      }
    };

    const handlePopState = () => {
      startProgressAnimation();
    };

    // Intercept programmatic history navigation (router.push / router.replace)
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const urlArg = args[2];
      if (urlArg) {
        try {
          const targetUrl = new URL(String(urlArg), window.location.href);
          const currentLoc = window.location;
          if (
            targetUrl.pathname !== currentLoc.pathname ||
            targetUrl.search !== currentLoc.search
          ) {
            startProgressAnimation();
          }
        } catch {
          // Ignore URL parsing errors
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      const urlArg = args[2];
      if (urlArg) {
        try {
          const targetUrl = new URL(String(urlArg), window.location.href);
          const currentLoc = window.location;
          if (
            targetUrl.pathname !== currentLoc.pathname ||
            targetUrl.search !== currentLoc.search
          ) {
            startProgressAnimation();
          }
        } catch {
          // Ignore URL parsing errors
        }
      }
      return originalReplaceState.apply(this, args);
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      if (startTimeoutRef.current) {
        clearTimeout(startTimeoutRef.current);
      }
      if (completeTimeoutRef.current) {
        clearTimeout(completeTimeoutRef.current);
      }
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
    };
  }, []);

  return null;
}

export interface NavigationProgressBarProps {
  color?: string;
  size?: number;
  zIndex?: number;
}

export function NavigationProgressBar({
  color = 'indigo',
  size = 3,
  zIndex = 99999,
}: NavigationProgressBarProps) {
  return (
    <>
      <NavigationProgress color={color} size={size} zIndex={zIndex} />
      <Suspense fallback={null}>
        <RouteChangeObserver />
      </Suspense>
    </>
  );
}

export default NavigationProgressBar;
