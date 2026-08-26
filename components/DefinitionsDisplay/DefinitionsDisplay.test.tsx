import React from 'react';
import type { WordDefinition } from '@/lib/db';
import { fireEvent, render, screen } from '@/test-utils';
import { DefinitionsDisplay } from './DefinitionsDisplay';

const mockDefinitionsWithExamples: WordDefinition[] = [
  {
    meaning: 'to make or become less',
    partOfSpeech: 'verb',
    examples: ['The storm suddenly abated.', 'We waited for the wind to abate.'],
    userExamples: ['My own custom example note.'],
  },
];

const mockDefinitionsWithoutExamples: WordDefinition[] = [
  {
    meaning: 'to make or become less',
    partOfSpeech: 'verb',
    examples: [],
    userExamples: [],
  },
];

describe('DefinitionsDisplay component', () => {
  it('renders definitions, part of speech, and fallback meaning correctly', () => {
    render(
      <DefinitionsDisplay definitions={mockDefinitionsWithExamples} fallbackMeaning="fallback" />
    );

    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('verb')).toBeInTheDocument();
    expect(screen.getByText('to make or become less')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show examples \(3\)/i })).toBeInTheDocument();
  });

  it('renders empty text when no definitions or fallback meaning provided', () => {
    render(<DefinitionsDisplay definitions={[]} fallbackMeaning="" emptyText="No def found" />);

    expect(screen.getByText('No def found')).toBeInTheDocument();
  });

  it('toggles example expansion when Show Examples button is clicked', () => {
    render(<DefinitionsDisplay definitions={mockDefinitionsWithExamples} />);

    const toggleButton = screen.getByRole('button', { name: /show examples \(3\)/i });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(screen.getByRole('button', { name: /hide examples/i })).toBeInTheDocument();
    expect(screen.getByText(/the storm suddenly abated/i)).toBeInTheDocument();
    expect(screen.getByText(/my own custom example note/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide examples/i }));
    expect(screen.getByRole('button', { name: /show examples \(3\)/i })).toBeInTheDocument();
  });

  it('renders Regenerate Examples icon button next to Show Examples when onRefreshExamples is provided', () => {
    const handleRefresh = jest.fn();
    render(
      <DefinitionsDisplay
        definitions={mockDefinitionsWithExamples}
        onRefreshExamples={handleRefresh}
      />
    );

    const showButton = screen.getByRole('button', { name: /show examples \(3\)/i });
    const regenerateButton = screen.getByRole('button', { name: /regenerate ai examples/i });

    expect(showButton).toBeInTheDocument();
    expect(regenerateButton).toBeInTheDocument();

    fireEvent.click(regenerateButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders Regenerate Examples icon button when totalExamples is 0 and onRefreshExamples is provided', () => {
    const handleRefresh = jest.fn();
    render(
      <DefinitionsDisplay
        definitions={mockDefinitionsWithoutExamples}
        onRefreshExamples={handleRefresh}
      />
    );

    expect(screen.queryByRole('button', { name: /show examples/i })).not.toBeInTheDocument();
    const regenerateButton = screen.getByRole('button', { name: /regenerate ai examples/i });
    expect(regenerateButton).toBeInTheDocument();

    fireEvent.click(regenerateButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not render Show Examples or Regenerate Examples when showExamples is false', () => {
    const handleRefresh = jest.fn();
    render(
      <DefinitionsDisplay
        definitions={mockDefinitionsWithExamples}
        showExamples={false}
        onRefreshExamples={handleRefresh}
      />
    );

    expect(screen.queryByRole('button', { name: /show examples/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /regenerate ai examples/i })
    ).not.toBeInTheDocument();
  });

  it('disables button when isGeneratingExamples is true', () => {
    const handleRefresh = jest.fn();
    render(
      <DefinitionsDisplay
        definitions={mockDefinitionsWithExamples}
        onRefreshExamples={handleRefresh}
        isGeneratingExamples
      />
    );

    const regenerateButton = screen.getByRole('button', { name: /regenerate ai examples/i });
    expect(regenerateButton).toBeDisabled();
  });
});
