import React from 'react';
import { fireEvent, render, screen } from '@/test-utils';
import { ExportWordsModal } from './ExportWordsModal';

const mockRawItems = [
  {
    id: 'w1',
    word: 'serendipity',
    meaning: 'fortunate discovery',
    definitions: [
      {
        partOfSpeech: 'noun',
        meaning: 'fortunate discovery',
        examples: ['Found by serendipity.'],
        userExamples: [],
      },
    ],
    customGroups: ['GRE'],
    notes: 'A wonderful concept',
    usageFrequency: 'common',
  },
  {
    id: 'w2',
    word: 'ubiquitous',
    meaning: 'present everywhere',
    definitions: [
      {
        partOfSpeech: 'adjective',
        meaning: 'present everywhere',
        examples: ['Smartphones are ubiquitous.'],
        userExamples: [],
      },
    ],
    customGroups: ['GRE'],
  },
];

describe('ExportWordsModal component', () => {
  it('renders title, word count, and preview correctly', () => {
    render(
      <ExportWordsModal
        opened
        onClose={jest.fn()}
        title="Export Quiz Words"
        rawItems={mockRawItems}
      />
    );

    expect(screen.getByText('Export Quiz Words')).toBeInTheDocument();
    expect(screen.getByText('2 words')).toBeInTheDocument();
    expect(screen.getByText(/serendipity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download csv/i })).toBeInTheDocument();
  });

  it('allows format switching between CSV, JSON, and Text', () => {
    render(
      <ExportWordsModal
        opened
        onClose={jest.fn()}
        title="Export Quiz Words"
        rawItems={mockRawItems}
      />
    );

    const jsonRadio = screen.getByText('JSON');
    fireEvent.click(jsonRadio);
    expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument();

    const txtRadio = screen.getByText('Plain Text');
    fireEvent.click(txtRadio);
    expect(screen.getByRole('button', { name: /download txt/i })).toBeInTheDocument();
  });

  it('allows choosing which data fields to include in the export', () => {
    render(
      <ExportWordsModal
        opened
        onClose={jest.fn()}
        title="Export Quiz Words"
        rawItems={mockRawItems}
      />
    );

    expect(screen.getByLabelText(/meaning \/ definitions/i)).toBeChecked();
    expect(screen.getByLabelText(/part of speech/i)).toBeChecked();
    expect(screen.getByLabelText(/example sentences/i)).toBeChecked();
    expect(screen.getByLabelText(/custom groups \/ tags/i)).toBeChecked();
    expect(screen.getByLabelText(/personal notes/i)).toBeChecked();

    // Click "Words Only" preset
    const wordsOnlyBtn = screen.getByText('Words Only');
    fireEvent.click(wordsOnlyBtn);

    expect(screen.getByLabelText(/meaning \/ definitions/i)).not.toBeChecked();
    expect(screen.getByLabelText(/part of speech/i)).not.toBeChecked();

    // Toggle back on
    const meaningCheckbox = screen.getByLabelText(/meaning \/ definitions/i);
    fireEvent.click(meaningCheckbox);
    expect(meaningCheckbox).toBeChecked();
  });
});
