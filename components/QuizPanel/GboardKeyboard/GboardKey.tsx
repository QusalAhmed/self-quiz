'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import styles from './GboardKeyboard.module.css';

export interface GboardKeyProps {
  char: string;
  displayChar?: string;
  hint?: string;
  isFunction?: boolean;
  isAction?: boolean;
  isSpace?: boolean;
  isSmall?: boolean;
  isShiftActive?: boolean;
  isCapsLock?: boolean;
  isHighlighted?: boolean;
  ariaLabel?: string;
  children?: React.ReactNode;
  disabled?: boolean;
  soundType?: 'character' | 'function' | 'delete' | 'space';
  onPress: (char: string) => void;
  onLongPress?: (char: string) => void;
  triggerFeedback?: (type: 'character' | 'function' | 'delete' | 'space') => void;
}

export const GboardKey = memo(function GboardKey({
  char,
  displayChar,
  hint,
  isFunction = false,
  isAction = false,
  isSpace = false,
  isSmall = false,
  isShiftActive = false,
  isCapsLock = false,
  isHighlighted = false,
  ariaLabel,
  children,
  disabled = false,
  soundType = 'character',
  onPress,
  onLongPress,
  triggerFeedback,
}: GboardKeyProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showBalloon, setShowBalloon] = useState(false);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const repeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = useRef(false);

  // Sync physical keyboard highlight
  useEffect(() => {
    if (isHighlighted) {
      setIsPressed(true);
      if (!isFunction && !isSpace && !isAction) {
        setShowBalloon(true);
      }
      const timer = setTimeout(() => {
        setIsPressed(false);
        setShowBalloon(false);
      }, 140);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted, isFunction, isSpace, isAction]);

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) {
        return;
      }
      // Prevent default focus steal to keep native focus state stable
      e.preventDefault();

      setIsPressed(true);
      isLongPressedRef.current = false;

      // Show balloon for standard character keys
      if (!isFunction && !isSpace && !isAction) {
        setShowBalloon(true);
      }

      // Trigger audio & haptic
      if (triggerFeedback) {
        triggerFeedback(soundType);
      }

      clearTimers();

      // Long press detection (e.g. repeat backspace or secondary hint)
      longPressTimerRef.current = setTimeout(() => {
        isLongPressedRef.current = true;
        if (char === 'Backspace') {
          // Rapid repeat backspace
          repeatIntervalRef.current = setInterval(() => {
            onPress('Backspace');
            if (triggerFeedback) {
              triggerFeedback('delete');
            }
          }, 60);
        } else if (onLongPress) {
          onLongPress(hint || char);
        }
      }, 420);
    },
    [
      disabled,
      isFunction,
      isSpace,
      isAction,
      triggerFeedback,
      soundType,
      clearTimers,
      char,
      onLongPress,
      hint,
      onPress,
    ]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) {
        return;
      }
      e.preventDefault();

      clearTimers();
      setIsPressed(false);

      // Hide balloon with minimal delay for smooth visual persistence
      setTimeout(() => {
        setShowBalloon(false);
      }, 80);

      // Only trigger single click if not consumed by long press
      if (!isLongPressedRef.current) {
        onPress(char);
      }
    },
    [disabled, clearTimers, onPress, char]
  );

  const handlePointerCancel = useCallback(() => {
    clearTimers();
    setIsPressed(false);
    setShowBalloon(false);
  }, [clearTimers]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Class names based on state
  const classNames = [
    styles.key,
    isFunction ? styles.functionKey : '',
    isAction ? styles.actionKey : '',
    isSpace ? styles.spaceKey : '',
    isSmall ? styles.smallKey : '',
    isShiftActive ? styles.shiftKeyActive : '',
    isCapsLock ? styles.shiftKeyCapsLock : '',
    isPressed ? (isFunction ? styles.functionKeyPressed : styles.keyPressed) : '',
  ]
    .filter(Boolean)
    .join(' ');

  const label = ariaLabel || char;
  const characterToShow = displayChar !== undefined ? displayChar : char;

  return (
    <button
      type="button"
      className={classNames}
      aria-label={label}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      data-key={char}
      data-testid={`gboard-key-${char.toLowerCase()}`}
    >
      {/* Balloon Popup Preview */}
      {showBalloon && (
        <div className={styles.keyPopup} aria-hidden="true">
          {characterToShow}
        </div>
      )}

      {/* Secondary Character Hint */}
      {hint && !isSpace && !isFunction && <span className={styles.keyHint}>{hint}</span>}

      {/* Primary Key Content */}
      {children ? (
        children
      ) : isSpace ? (
        <span className={styles.spaceKeyLabel}>English</span>
      ) : (
        <span className={styles.keyChar}>{characterToShow}</span>
      )}
    </button>
  );
});
