import { fireEvent, render, screen } from '@testing-library/react';
import { GboardKeyboard } from './GboardKeyboard';

describe('GboardKeyboard component', () => {
  const defaultProps = {
    onKeyPress: jest.fn(),
    onCheckSpelling: jest.fn(),
    typedWord: '',
    disabled: false,
    docked: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Gboard keyboard with QWERTY letters', () => {
    render(<GboardKeyboard {...defaultProps} />);

    expect(screen.getByTestId('gboard-keyboard')).toBeInTheDocument();
    expect(screen.getByTestId('gboard-key-q')).toBeInTheDocument();
    expect(screen.getByTestId('gboard-key-w')).toBeInTheDocument();
    expect(screen.getByTestId('gboard-key-m')).toBeInTheDocument();
  });

  it('types lowercase letters by default when clicked', () => {
    render(<GboardKeyboard {...defaultProps} />);

    const keyH = screen.getByTestId('gboard-key-h');
    fireEvent.pointerDown(keyH);
    fireEvent.pointerUp(keyH);

    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('h');
  });

  it('handles Shift for a single capital letter then reverts to lowercase', () => {
    render(<GboardKeyboard {...defaultProps} />);

    const shiftKey = screen.getByRole('button', { name: 'Shift' });
    fireEvent.pointerDown(shiftKey);
    fireEvent.pointerUp(shiftKey);

    // Now in shift mode (uppercase)
    const keyE = screen.getByTestId('gboard-key-e');
    fireEvent.pointerDown(keyE);
    fireEvent.pointerUp(keyE);

    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('E');

    // Next letter should be lowercase again
    const keyL = screen.getByTestId('gboard-key-l');
    fireEvent.pointerDown(keyL);
    fireEvent.pointerUp(keyL);

    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('l');
  });

  it('handles double tap on Shift for Caps Lock', () => {
    render(<GboardKeyboard {...defaultProps} />);

    const shiftKey = screen.getByRole('button', { name: 'Shift' });
    // Double tap Shift
    fireEvent.pointerDown(shiftKey);
    fireEvent.pointerUp(shiftKey);
    fireEvent.pointerDown(shiftKey);
    fireEvent.pointerUp(shiftKey);

    // Both letters should be uppercase in Caps Lock
    const keyA = screen.getByTestId('gboard-key-a');
    fireEvent.pointerDown(keyA);
    fireEvent.pointerUp(keyA);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('A');

    const keyB = screen.getByTestId('gboard-key-b');
    fireEvent.pointerDown(keyB);
    fireEvent.pointerUp(keyB);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('B');
  });

  it('triggers Backspace and Space keys', () => {
    render(<GboardKeyboard {...defaultProps} />);

    const backspaceKey = screen.getByRole('button', { name: /Backspace/i });
    fireEvent.pointerDown(backspaceKey);
    fireEvent.pointerUp(backspaceKey);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('Backspace');

    const spaceKey = screen.getByRole('button', { name: /^Space$/i });
    fireEvent.pointerDown(spaceKey);
    fireEvent.pointerUp(spaceKey);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('Space');
  });

  it('switches between letters, symbols, and extended symbols modes', () => {
    render(<GboardKeyboard {...defaultProps} />);

    // Switch to symbols
    const numSwitchKey = screen.getByRole('button', { name: /Switch to numbers and symbols/i });
    fireEvent.pointerDown(numSwitchKey);
    fireEvent.pointerUp(numSwitchKey);

    // Should see numbers row
    const key1 = screen.getByTestId('gboard-key-1');
    expect(key1).toBeInTheDocument();
    fireEvent.pointerDown(key1);
    fireEvent.pointerUp(key1);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('1');

    // Switch to extended symbols
    const extSwitchKey = screen.getByRole('button', { name: /More symbols/i });
    fireEvent.pointerDown(extSwitchKey);
    fireEvent.pointerUp(extSwitchKey);

    const keyTilde = screen.getByTestId('gboard-key-~');
    expect(keyTilde).toBeInTheDocument();
    fireEvent.pointerDown(keyTilde);
    fireEvent.pointerUp(keyTilde);
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('~');

    // Switch back to letters
    const abcKey = screen.getByRole('button', { name: /Switch to letters/i });
    fireEvent.pointerDown(abcKey);
    fireEvent.pointerUp(abcKey);

    expect(screen.getByTestId('gboard-key-q')).toBeInTheDocument();
  });

  it('triggers onCheckSpelling when clicking Enter action key', () => {
    render(<GboardKeyboard {...defaultProps} typedWord="cast" />);

    const enterKey = screen.getByRole('button', { name: /Check Spelling/i });
    expect(enterKey).toBeEnabled();

    fireEvent.pointerDown(enterKey);
    fireEvent.pointerUp(enterKey);
    expect(defaultProps.onCheckSpelling).toHaveBeenCalled();
  });

  it('disables Enter key when typedWord is empty', () => {
    render(<GboardKeyboard {...defaultProps} typedWord="" />);

    const enterKey = screen.getByRole('button', { name: /Check Spelling/i });
    expect(enterKey).toBeDisabled();
  });

  it('handles physical keyboard typing events', () => {
    render(<GboardKeyboard {...defaultProps} />);

    fireEvent.keyDown(window, { key: 'c' });
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('c');

    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('Backspace');

    fireEvent.keyDown(window, { key: ' ' });
    expect(defaultProps.onKeyPress).toHaveBeenCalledWith('Space');

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(defaultProps.onCheckSpelling).toHaveBeenCalled();
  });
});
