import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import type { WordRecord } from '@/lib/db';
import type { WordVerificationIssue } from '@/lib/word-verification';
import { render } from '@/test-utils/render';
import { WordVerificationWarningCard } from './WordVerificationWarningCard';

describe('WordVerificationWarningCard', () => {
  const mockWord: WordRecord = {
    id: 'w-1',
    word: 'definately',
    meaning: 'without doubt',
    definitions: [
      {
        meaning: 'without doubt',
        partOfSpeech: 'adverb',
        examples: [],
        userExamples: [],
      },
    ],
    aiExampleCount: 5,
    createdAt: '2026-09-07T00:00:00.000Z',
    updatedAt: '2026-09-07T00:00:00.000Z',
    isDeleted: false,
    lastSyncedAt: '',
    customGroups: [],
  };

  const mockIssue: WordVerificationIssue = {
    status: 'warning',
    word: 'definately',
    isWordValid: false,
    wordSpellingSuggestion: 'definitely',
    wordFeedback: 'Possible misspelling.',
    overallStatus: 'warning',
    definitions: [
      {
        index: 0,
        isAccurate: false,
        partOfSpeechMatches: false,
        detectedPartOfSpeech: 'adverb',
        feedback: 'Meaning should be more precise.',
        suggestedDefinition: 'without doubt; certainly',
        suggestedPartOfSpeech: 'adverb',
      },
    ],
    suggestedNewDefinition: {
      meaning: 'in a clear and definite manner',
      partOfSpeech: 'adverb',
    },
    generatorAiDetails: 'Google Gemini 2.5 Flash',
    verifiedAt: '2026-09-07T01:00:00.000Z',
  };

  it('renders warning banner with full details and action buttons', () => {
    render(
      <WordVerificationWarningCard
        word={mockWord}
        issue={mockIssue}
        onFixSpelling={jest.fn()}
        onFixDefinition={jest.fn()}
        onAddSuggestedDefinition={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByTestId('word-verification-warning-card')).toBeInTheDocument();
    expect(screen.getByText(/AI Verification/i)).toBeInTheDocument();
    expect(screen.getByText('Google Gemini 2.5 Flash')).toBeInTheDocument();

    // Spelling suggestion
    expect(screen.getByText(/Spelling Suggestion/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fix spelling to definitely/i })).toBeInTheDocument();

    // Definition feedback
    expect(screen.getByText(/Meaning should be more precise/i)).toBeInTheDocument();
    expect(screen.getByText(/without doubt; certainly/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply suggested meaning/i)).toBeInTheDocument();

    // Suggested new definition
    expect(screen.getByText(/Suggested Definition/i)).toBeInTheDocument();
    expect(screen.getByText(/in a clear and definite manner/i)).toBeInTheDocument();
    expect(screen.getByText(/Add this definition/i)).toBeInTheDocument();
  });

  it('triggers onFixSpelling when user clicks Change word button', async () => {
    const onFixSpelling = jest.fn();
    render(
      <WordVerificationWarningCard
        word={mockWord}
        issue={mockIssue}
        onFixSpelling={onFixSpelling}
      />
    );

    const fixBtn = screen.getByRole('button', { name: /Fix spelling to definitely/i });
    await act(async () => {
      fireEvent.click(fixBtn);
    });
    expect(onFixSpelling).toHaveBeenCalledWith('definitely');
  });

  it('triggers onFixDefinition when user clicks Apply suggested meaning', async () => {
    const onFixDefinition = jest.fn();
    render(
      <WordVerificationWarningCard
        word={mockWord}
        issue={mockIssue}
        onFixDefinition={onFixDefinition}
      />
    );

    const applyDefBtn = screen.getByRole('button', {
      name: /Apply suggested meaning for definition 1/i,
    });
    await act(async () => {
      fireEvent.click(applyDefBtn);
    });
    expect(onFixDefinition).toHaveBeenCalledWith(0, 'without doubt; certainly', 'adverb');
  });

  it('triggers onAddSuggestedDefinition when user clicks Add this definition', async () => {
    const onAddSuggestedDef = jest.fn();
    render(
      <WordVerificationWarningCard
        word={mockWord}
        issue={mockIssue}
        onAddSuggestedDefinition={onAddSuggestedDef}
      />
    );

    const addDefBtn = screen.getByRole('button', { name: /Add suggested definition to word/i });
    await act(async () => {
      fireEvent.click(addDefBtn);
    });
    expect(onAddSuggestedDef).toHaveBeenCalledWith({
      meaning: 'in a clear and definite manner',
      partOfSpeech: 'adverb',
    });
  });

  it('triggers onDismiss when user clicks Dismiss Warning button', async () => {
    const onDismiss = jest.fn();
    render(<WordVerificationWarningCard word={mockWord} issue={mockIssue} onDismiss={onDismiss} />);

    const dismissBtn = screen.getByRole('button', { name: 'Dismiss Warning' });
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('triggers onReverify when user clicks Re-verify button', async () => {
    const onReverify = jest.fn();
    render(
      <WordVerificationWarningCard word={mockWord} issue={mockIssue} onReverify={onReverify} />
    );

    const reverifyBtn = screen.getByRole('button', { name: /Re-verify word/i });
    await act(async () => {
      fireEvent.click(reverifyBtn);
    });
    expect(onReverify).toHaveBeenCalled();
  });

  it('renders invalid word alert when word has no spelling suggestion and is invalid', () => {
    const invalidIssue: WordVerificationIssue = {
      status: 'invalid',
      word: 'zzzzqqqq',
      isWordValid: false,
      wordFeedback: 'Word not found in any dictionary.',
      overallStatus: 'invalid',
      definitions: [],
      generatorAiDetails: 'Cloudflare Llama 3.3 70B',
      verifiedAt: '2026-09-07T01:00:00.000Z',
    };

    render(
      <WordVerificationWarningCard word={{ ...mockWord, word: 'zzzzqqqq' }} issue={invalidIssue} />
    );

    expect(screen.getByText(/AI Verification: Invalid Word \/ Issue/i)).toBeInTheDocument();
    expect(screen.getByText(/Unrecognized Word/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Word not found in any dictionary/i).length).toBeGreaterThanOrEqual(
      1
    );
  });
});
