import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { WordVerificationResult } from '@/lib/word-verification';
import { render } from '@/test-utils/render';
import { WordVerificationBadge } from './WordVerificationBadge';

describe('WordVerificationBadge', () => {
  it('renders loading state when isVerifying is true', () => {
    render(
      <WordVerificationBadge result={null} isVerifying onApplySpellingSuggestion={jest.fn()} />
    );

    expect(screen.getByTestId('ai-verification-loading')).toBeInTheDocument();
    expect(screen.getByText(/Verifying word & definition with AI/i)).toBeInTheDocument();
  });

  it('renders valid badge when overallStatus is valid', () => {
    const mockResult: WordVerificationResult = {
      word: 'eloquent',
      isWordValid: true,
      wordFeedback: 'Valid word',
      overallStatus: 'valid',
      definitions: [],
      generatorAiDetails: 'Google Gemini 2.5 Flash',
    };

    render(
      <WordVerificationBadge
        result={mockResult}
        isVerifying={false}
        onApplySpellingSuggestion={jest.fn()}
      />
    );

    expect(screen.getByTestId('ai-verification-badge-valid')).toBeInTheDocument();
    expect(screen.getByText('Verified with AI')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini 2.5 Flash')).toBeInTheDocument();
  });

  it('renders spelling suggestion alert and triggers apply callback', () => {
    const onApplySpelling = jest.fn();
    const mockResult: WordVerificationResult = {
      word: 'definately',
      isWordValid: false,
      wordSpellingSuggestion: 'definitely',
      wordFeedback: 'Possible misspelling.',
      overallStatus: 'warning',
      definitions: [],
      generatorAiDetails: 'Groq Qwen 3.6 27B',
    };

    render(
      <WordVerificationBadge
        result={mockResult}
        isVerifying={false}
        onApplySpellingSuggestion={onApplySpelling}
      />
    );

    expect(screen.getByTestId('spelling-suggestion-alert')).toBeInTheDocument();
    expect(screen.getAllByText(/definitely/i).length).toBeGreaterThan(0);

    const changeButton = screen.getByRole('button', {
      name: /Fix spelling to definitely/i,
    });
    fireEvent.click(changeButton);
    expect(onApplySpelling).toHaveBeenCalledWith('definitely');
  });

  it('renders suggested definition card when definition is empty', () => {
    const onApplyNewDefinition = jest.fn();
    const mockResult: WordVerificationResult = {
      word: 'serendipity',
      isWordValid: true,
      wordFeedback: 'Valid word',
      overallStatus: 'valid',
      definitions: [],
      suggestedNewDefinition: {
        meaning: 'the occurrence of events by chance in a happy or beneficial way',
        partOfSpeech: 'noun',
      },
      generatorAiDetails: 'Google Gemma 4 26B',
    };

    render(
      <WordVerificationBadge
        result={mockResult}
        isVerifying={false}
        hasEmptyDefinitions
        onApplyNewDefinition={onApplyNewDefinition}
      />
    );

    expect(screen.getByTestId('suggested-definition-card')).toBeInTheDocument();
    expect(
      screen.getByText(/the occurrence of events by chance in a happy or beneficial way/i)
    ).toBeInTheDocument();

    const useDefButton = screen.getByRole('button', { name: /Use AI Definition/i });
    fireEvent.click(useDefButton);
    expect(onApplyNewDefinition).toHaveBeenCalledWith({
      meaning: 'the occurrence of events by chance in a happy or beneficial way',
      partOfSpeech: 'noun',
    });
  });

  it('calls onReverify when reverify icon button is clicked', () => {
    const onReverify = jest.fn();
    const mockResult: WordVerificationResult = {
      word: 'lucid',
      isWordValid: true,
      wordFeedback: 'Valid word',
      overallStatus: 'valid',
      definitions: [],
      generatorAiDetails: 'Google Gemma 4 26B',
    };

    render(
      <WordVerificationBadge result={mockResult} isVerifying={false} onReverify={onReverify} />
    );

    const reverifyBtn = screen.getByRole('button', { name: /Re-verify with AI/i });
    fireEvent.click(reverifyBtn);
    expect(onReverify).toHaveBeenCalled();
  });
});
