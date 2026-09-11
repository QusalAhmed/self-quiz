'use client';

import { IconArrowUp, IconBackspace, IconCheck } from '@tabler/icons-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { GboardKey } from './GboardKey';
import { useKeyboardFeedback } from './useKeyboardFeedback';
import styles from './GboardKeyboard.module.css';

export type KeyboardMode = 'letters' | 'symbols' | 'extendedSymbols';
export type ShiftState = 'off' | 'shift' | 'caps';

export interface GboardKeyboardProps {
  onKeyPress: (key: string) => void;
  onCheckSpelling: () => void;
  typedWord?: string;
  disabled?: boolean;
  docked?: boolean;
}

const LETTERS_ROW_1 = [
  { char: 'q', hint: '1' },
  { char: 'w', hint: '2' },
  { char: 'e', hint: '3' },
  { char: 'r', hint: '4' },
  { char: 't', hint: '5' },
  { char: 'y', hint: '6' },
  { char: 'u', hint: '7' },
  { char: 'i', hint: '8' },
  { char: 'o', hint: '9' },
  { char: 'p', hint: '0' },
];

const LETTERS_ROW_2 = [
  { char: 'a', hint: '@' },
  { char: 's', hint: '#' },
  { char: 'd', hint: '$' },
  { char: 'f', hint: '%' },
  { char: 'g', hint: '&' },
  { char: 'h', hint: '-' },
  { char: 'j', hint: '+' },
  { char: 'k', hint: '(' },
  { char: 'l', hint: ')' },
];

const LETTERS_ROW_3 = [
  { char: 'z', hint: '*' },
  { char: 'x', hint: '"' },
  { char: 'c', hint: "'" },
  { char: 'v', hint: ':' },
  { char: 'b', hint: ';' },
  { char: 'n', hint: '!' },
  { char: 'm', hint: '?' },
];

const SYMBOLS_ROW_1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYMBOLS_ROW_2 = ['@', '#', '$', '%', '&', '-', '+', '(', ')', '/'];
const SYMBOLS_ROW_3 = ['*', '"', "'", ':', ';', '!', '?'];

const EXTENDED_SYMBOLS_ROW_1 = ['~', '\\', '^', '|', '[', ']', '{', '}', '<', '>'];
const EXTENDED_SYMBOLS_ROW_2 = ['€', '£', '¥', '¢', '§', '=', '°', '•', '_', '-'];
const EXTENDED_SYMBOLS_ROW_3 = ['«', '»', '¡', '¿', '©', '®', '™'];

export const GboardKeyboard = memo(function GboardKeyboard({
  onKeyPress,
  onCheckSpelling,
  typedWord = '',
  disabled = false,
  docked = true,
}: GboardKeyboardProps) {
  const [mode, setMode] = useState<KeyboardMode>('letters');
  const [shiftState, setShiftState] = useState<ShiftState>('off');
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const lastShiftTapRef = useRef<number>(0);

  const { triggerFeedback } = useKeyboardFeedback();

  // Shift button handler (single tap: shift, double tap: caps lock)
  const handleShiftTap = useCallback(() => {
    triggerFeedback('function');
    const now = Date.now();
    const timeSinceLast = now - lastShiftTapRef.current;
    lastShiftTapRef.current = now;

    if (timeSinceLast < 300) {
      // Double tap -> Toggle Caps Lock
      setShiftState((prev) => (prev === 'caps' ? 'off' : 'caps'));
    } else {
      // Single tap -> Cycle shift
      setShiftState((prev) => {
        if (prev === 'caps') {
          return 'off';
        }
        return prev === 'shift' ? 'off' : 'shift';
      });
    }
  }, [triggerFeedback]);

  // Handle character typing from virtual keyboard
  const handleKeyClick = useCallback(
    (keyChar: string) => {
      if (disabled) {
        return;
      }

      let characterToSend = keyChar;

      if (mode === 'letters') {
        const isUppercase = shiftState !== 'off';
        characterToSend = isUppercase ? keyChar.toUpperCase() : keyChar.toLowerCase();

        // If one-shot shift was active, revert back to off
        if (shiftState === 'shift') {
          setShiftState('off');
        }
      }

      onKeyPress(characterToSend);
    },
    [disabled, mode, shiftState, onKeyPress]
  );

  // Handle special action keys
  const handleBackspace = useCallback(() => {
    if (disabled) {
      return;
    }
    onKeyPress('Backspace');
  }, [disabled, onKeyPress]);

  const handleSpace = useCallback(() => {
    if (disabled) {
      return;
    }
    onKeyPress('Space');
  }, [disabled, onKeyPress]);

  const handleEnter = useCallback(() => {
    if (disabled) {
      return;
    }
    onCheckSpelling();
  }, [disabled, onCheckSpelling]);

  // Physical keyboard listener for desktop parity & animations
  useEffect(() => {
    if (disabled) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl) {
        const tag = activeEl.tagName.toLowerCase();
        if (
          (tag === 'input' && !activeEl.hasAttribute('readonly')) ||
          tag === 'textarea' ||
          activeEl.hasAttribute('contenteditable')
        ) {
          return;
        }
      }

      const key = e.key;

      if (key === 'Backspace') {
        e.preventDefault();
        setHighlightedKey('Backspace');
        triggerFeedback('delete');
        handleBackspace();
      } else if (key === 'Enter') {
        e.preventDefault();
        setHighlightedKey('Enter');
        triggerFeedback('function');
        handleEnter();
      } else if (key === ' ') {
        e.preventDefault();
        setHighlightedKey('Space');
        triggerFeedback('space');
        handleSpace();
      } else if (key === 'Shift') {
        setShiftState((prev) => (prev === 'caps' ? 'off' : prev === 'shift' ? 'off' : 'shift'));
      } else if (key.length === 1) {
        // Alphanumeric and valid punctuation
        setHighlightedKey(key.toLowerCase());
        triggerFeedback('character');
        onKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, triggerFeedback, handleBackspace, handleEnter, handleSpace, onKeyPress]);

  const containerClasses = [
    styles.keyboardContainer,
    docked ? styles.dockedMobile : '',
    'gboard-virtual-keyboard',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} data-testid="gboard-keyboard">
      {/* Keyboard Grid */}
      <div className={styles.keyboardGrid}>
        {/* ===================== MODE: LETTERS ===================== */}
        {mode === 'letters' && (
          <>
            {/* Row 1 */}
            <div className={styles.keyboardRow}>
              {LETTERS_ROW_1.map(({ char, hint }) => {
                const isUpper = shiftState !== 'off';
                const displayChar = isUpper ? char.toUpperCase() : char;
                return (
                  <GboardKey
                    key={char}
                    char={char}
                    displayChar={displayChar}
                    hint={hint}
                    disabled={disabled}
                    isHighlighted={highlightedKey === char}
                    onPress={handleKeyClick}
                    onLongPress={(h) => handleKeyClick(h)}
                    triggerFeedback={triggerFeedback}
                  />
                );
              })}
            </div>

            {/* Row 2 */}
            <div className={styles.keyboardRow}>
              {LETTERS_ROW_2.map(({ char, hint }) => {
                const isUpper = shiftState !== 'off';
                const displayChar = isUpper ? char.toUpperCase() : char;
                return (
                  <GboardKey
                    key={char}
                    char={char}
                    displayChar={displayChar}
                    hint={hint}
                    disabled={disabled}
                    isHighlighted={highlightedKey === char}
                    onPress={handleKeyClick}
                    onLongPress={(h) => handleKeyClick(h)}
                    triggerFeedback={triggerFeedback}
                  />
                );
              })}
            </div>

            {/* Row 3 */}
            <div className={styles.keyboardRow}>
              {/* Shift Key */}
              <GboardKey
                char="Shift"
                isFunction
                isShiftActive={shiftState === 'shift'}
                isCapsLock={shiftState === 'caps'}
                ariaLabel={
                  shiftState === 'caps'
                    ? 'Caps lock active'
                    : shiftState === 'shift'
                      ? 'Shift active'
                      : 'Shift'
                }
                disabled={disabled}
                soundType="function"
                onPress={handleShiftTap}
                triggerFeedback={triggerFeedback}
              >
                <IconArrowUp
                  size={20}
                  stroke={shiftState !== 'off' ? 3 : 2}
                  style={{
                    transform: shiftState === 'caps' ? 'scale(1.15)' : 'none',
                    transition: 'transform 0.15s ease',
                  }}
                />
              </GboardKey>

              {/* Middle Row 3 Letters */}
              {LETTERS_ROW_3.map(({ char, hint }) => {
                const isUpper = shiftState !== 'off';
                const displayChar = isUpper ? char.toUpperCase() : char;
                return (
                  <GboardKey
                    key={char}
                    char={char}
                    displayChar={displayChar}
                    hint={hint}
                    disabled={disabled}
                    isHighlighted={highlightedKey === char}
                    onPress={handleKeyClick}
                    onLongPress={(h) => handleKeyClick(h)}
                    triggerFeedback={triggerFeedback}
                  />
                );
              })}

              {/* Backspace Key */}
              <GboardKey
                char="Backspace"
                isFunction
                ariaLabel="Backspace"
                disabled={disabled}
                soundType="delete"
                isHighlighted={highlightedKey === 'Backspace'}
                onPress={handleBackspace}
                triggerFeedback={triggerFeedback}
              >
                <IconBackspace size={20} />
              </GboardKey>
            </div>
          </>
        )}

        {/* ===================== MODE: BASIC SYMBOLS (?123) ===================== */}
        {mode === 'symbols' && (
          <>
            {/* Row 1 */}
            <div className={styles.keyboardRow}>
              {SYMBOLS_ROW_1.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}
            </div>

            {/* Row 2 */}
            <div className={styles.keyboardRow}>
              {SYMBOLS_ROW_2.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}
            </div>

            {/* Row 3 */}
            <div className={styles.keyboardRow}>
              {/* Toggle to Extended Symbols */}
              <GboardKey
                char="=\<"
                isFunction
                ariaLabel="More symbols"
                disabled={disabled}
                soundType="function"
                onPress={() => {
                  triggerFeedback('function');
                  setMode('extendedSymbols');
                }}
                triggerFeedback={triggerFeedback}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>=\&lt;</span>
              </GboardKey>

              {SYMBOLS_ROW_3.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}

              {/* Backspace Key */}
              <GboardKey
                char="Backspace"
                isFunction
                ariaLabel="Backspace"
                disabled={disabled}
                soundType="delete"
                isHighlighted={highlightedKey === 'Backspace'}
                onPress={handleBackspace}
                triggerFeedback={triggerFeedback}
              >
                <IconBackspace size={20} />
              </GboardKey>
            </div>
          </>
        )}

        {/* ===================== MODE: EXTENDED SYMBOLS (=\<) ===================== */}
        {mode === 'extendedSymbols' && (
          <>
            {/* Row 1 */}
            <div className={styles.keyboardRow}>
              {EXTENDED_SYMBOLS_ROW_1.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}
            </div>

            {/* Row 2 */}
            <div className={styles.keyboardRow}>
              {EXTENDED_SYMBOLS_ROW_2.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}
            </div>

            {/* Row 3 */}
            <div className={styles.keyboardRow}>
              {/* Toggle back to Basic Symbols */}
              <GboardKey
                char="?123"
                isFunction
                ariaLabel="Numbers and basic symbols"
                disabled={disabled}
                soundType="function"
                onPress={() => {
                  triggerFeedback('function');
                  setMode('symbols');
                }}
                triggerFeedback={triggerFeedback}
              >
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>?123</span>
              </GboardKey>

              {EXTENDED_SYMBOLS_ROW_3.map((char) => (
                <GboardKey
                  key={char}
                  char={char}
                  disabled={disabled}
                  isHighlighted={highlightedKey === char}
                  onPress={handleKeyClick}
                  triggerFeedback={triggerFeedback}
                />
              ))}

              {/* Backspace Key */}
              <GboardKey
                char="Backspace"
                isFunction
                ariaLabel="Backspace"
                disabled={disabled}
                soundType="delete"
                isHighlighted={highlightedKey === 'Backspace'}
                onPress={handleBackspace}
                triggerFeedback={triggerFeedback}
              >
                <IconBackspace size={20} />
              </GboardKey>
            </div>
          </>
        )}

        {/* ===================== BOTTOM ROW (COMMON) ===================== */}
        <div className={styles.keyboardRow}>
          {/* Mode Switcher (?123 / ABC) */}
          {mode === 'letters' ? (
            <GboardKey
              char="?123"
              isFunction
              ariaLabel="Switch to numbers and symbols"
              disabled={disabled}
              soundType="function"
              onPress={() => {
                triggerFeedback('function');
                setMode('symbols');
              }}
              triggerFeedback={triggerFeedback}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>?123</span>
            </GboardKey>
          ) : (
            <GboardKey
              char="ABC"
              isFunction
              ariaLabel="Switch to letters"
              disabled={disabled}
              soundType="function"
              onPress={() => {
                triggerFeedback('function');
                setMode('letters');
              }}
              triggerFeedback={triggerFeedback}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>ABC</span>
            </GboardKey>
          )}

          {/* Comma Key */}
          <GboardKey
            char=","
            isSmall
            disabled={disabled}
            isHighlighted={highlightedKey === ','}
            onPress={handleKeyClick}
            triggerFeedback={triggerFeedback}
          />

          {/* Spacebar Key */}
          <GboardKey
            char="Space"
            isSpace
            disabled={disabled}
            soundType="space"
            isHighlighted={highlightedKey === 'Space'}
            onPress={handleSpace}
            triggerFeedback={triggerFeedback}
          />

          {/* Period Key */}
          <GboardKey
            char="."
            isSmall
            disabled={disabled}
            isHighlighted={highlightedKey === '.'}
            onPress={handleKeyClick}
            triggerFeedback={triggerFeedback}
          />

          {/* Enter / Check Spelling Action Key */}
          <GboardKey
            char="Enter"
            isAction
            ariaLabel="Check Spelling"
            disabled={disabled || typedWord.trim().length === 0}
            soundType="function"
            isHighlighted={highlightedKey === 'Enter'}
            onPress={handleEnter}
            triggerFeedback={triggerFeedback}
          >
            <IconCheck size={22} stroke={2.6} />
          </GboardKey>
        </div>
      </div>
    </div>
  );
});
