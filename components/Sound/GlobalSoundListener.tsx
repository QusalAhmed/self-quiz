'use client';

import { useEffect } from 'react';
import { isSoundEnabled, playClickSound } from '@/lib/sound';

/**
 * Single mounted event delegation listener that triggers a subtle UI click
 * sound for buttons, role="button", and interactive elements.
 *
 * Honors:
 * - Disabled buttons/ActionIcons/NavLinks
 * - data-skip-click-sound="true" (for buttons with custom audio feedback like review rating buttons)
 */
export function GlobalSoundListener() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!isSoundEnabled()) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      // Find closest interactive element
      const interactiveEl = target.closest<HTMLElement>(
        'button, [role="button"], a.mantine-NavLink-root, .mantine-ActionIcon-root, .mantine-Button-root, .mantine-SegmentedControl-control, .mantine-Tabs-tab'
      );

      if (!interactiveEl) {
        return;
      }

      // Check if button explicitly opts out of generic click sound
      if (
        interactiveEl.getAttribute('data-skip-click-sound') === 'true' ||
        interactiveEl.closest('[data-skip-click-sound="true"]')
      ) {
        return;
      }

      // Check if disabled
      const isButtonDisabled =
        (interactiveEl as HTMLButtonElement).disabled ||
        interactiveEl.hasAttribute('disabled') ||
        interactiveEl.getAttribute('aria-disabled') === 'true' ||
        interactiveEl.getAttribute('data-disabled') === 'true' ||
        interactiveEl.classList.contains('mantine-Button-disabled') ||
        interactiveEl.classList.contains('mantine-ActionIcon-disabled') ||
        interactiveEl.classList.contains('mantine-NavLink-disabled');

      if (isButtonDisabled) {
        return;
      }

      playClickSound();
    };

    // Use capture phase so we catch clicks even ifstopPropagation is called later
    document.addEventListener('click', handleClick, { capture: true, passive: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);

  return null;
}
