import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { render } from '@/test-utils/render';
import { WordForm } from './WordForm';

describe('WordForm with AI Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setTimeout(15000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders word input and Verify with AI button', () => {
    render(<WordForm customGroups={[]} onSubmit={jest.fn()} />);

    expect(screen.getByPlaceholderText(/e\.g\. eloquent, pragmatic/i)).toBeInTheDocument();
    expect(screen.getByTestId('verify-with-ai-btn')).toBeInTheDocument();
  }, 20000);

  it('triggers verification when Verify with AI button is clicked', async () => {
    const mockVerificationResponse = {
      word: 'eloquent',
      isWordValid: true,
      wordFeedback: 'Valid English word',
      overallStatus: 'valid',
      definitions: [
        {
          index: 0,
          isAccurate: true,
          partOfSpeechMatches: true,
          feedback: 'Accurate definition',
        },
      ],
      generatorAiDetails: 'Google Gemini 2.5 Flash',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVerificationResponse,
    } as any);

    render(<WordForm customGroups={[]} onSubmit={jest.fn()} />);

    const wordInput = screen.getByPlaceholderText(/e\.g\. eloquent, pragmatic/i);
    fireEvent.change(wordInput, { target: { value: 'eloquent' } });

    const verifyBtn = screen.getByTestId('verify-with-ai-btn');
    fireEvent.click(verifyBtn);

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/verify-word',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"word":"eloquent"'),
        })
      );
    });

    expect(screen.getByText('Verified with AI')).toBeInTheDocument();
  }, 20000);

  it('does not automatically trigger verification while typing', async () => {
    global.fetch = jest.fn();

    render(<WordForm customGroups={[]} onSubmit={jest.fn()} />);

    const wordInput = screen.getByPlaceholderText(/e\.g\. eloquent, pragmatic/i);
    fireEvent.change(wordInput, { target: { value: 'pragmatic' } });

    // Advance past any debounce time
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });

    // fetch should NOT have been called while typing
    expect(global.fetch).not.toHaveBeenCalled();
  }, 20000);

  it('allows applying spelling suggestion to the word input', async () => {
    const mockVerificationResponse = {
      word: 'definately',
      isWordValid: false,
      wordSpellingSuggestion: 'definitely',
      wordFeedback: 'Did you mean "definitely"?',
      overallStatus: 'warning',
      definitions: [],
      generatorAiDetails: 'Google Gemma 4 26B',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVerificationResponse,
    } as any);

    render(<WordForm customGroups={[]} onSubmit={jest.fn()} />);

    const wordInput = screen.getByPlaceholderText(/e\.g\. eloquent, pragmatic/i);
    fireEvent.change(wordInput, { target: { value: 'definately' } });

    const verifyBtn = screen.getByTestId('verify-with-ai-btn');
    fireEvent.click(verifyBtn);

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(screen.getByTestId('spelling-suggestion-alert')).toBeInTheDocument();
    });

    const applySpellingBtn = screen.getByRole('button', {
      name: /Fix spelling to definitely/i,
    });
    fireEvent.click(applySpellingBtn);

    expect(wordInput).toHaveValue('definitely');
  }, 20000);

  it('allows applying suggested AI definition when definitions are empty', async () => {
    const mockVerificationResponse = {
      word: 'ephemeral',
      isWordValid: true,
      wordFeedback: 'Valid word',
      overallStatus: 'valid',
      definitions: [],
      suggestedNewDefinition: {
        meaning: 'lasting for a very short time',
        partOfSpeech: 'adjective',
      },
      generatorAiDetails: 'Google Gemma 4 26B',
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockVerificationResponse,
    } as any);

    render(<WordForm customGroups={[]} onSubmit={jest.fn()} />);

    const wordInput = screen.getByPlaceholderText(/e\.g\. eloquent, pragmatic/i);
    fireEvent.change(wordInput, { target: { value: 'ephemeral' } });

    const verifyBtn = screen.getByTestId('verify-with-ai-btn');
    fireEvent.click(verifyBtn);

    await act(async () => {
      jest.advanceTimersByTime(800);
    });

    await waitFor(() => {
      expect(screen.getByTestId('suggested-definition-card')).toBeInTheDocument();
    });

    const useDefBtn = screen.getByRole('button', { name: /Use AI Definition/i });
    fireEvent.click(useDefBtn);

    const definitionInput = screen.getByPlaceholderText('Type ...');
    expect(definitionInput).toHaveValue('lasting for a very short time');
  }, 20000);
});
