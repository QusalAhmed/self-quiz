import { Group, Paper, Stack, Text } from '@mantine/core';
import { IconNotes } from '@tabler/icons-react';
import React from 'react';

type RichNoteViewerProps = {
  content: string;
  title?: string;
};

export function RichNoteViewer({ content, title = 'Note' }: RichNoteViewerProps) {
  if (!content || content.trim() === '' || content === '<p></p>') {
    return null;
  }

  return (
    <Paper
      radius="md"
      p="sm"
      style={{
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        width: '100%',
      }}
    >
      <Stack gap={6}>
        <Group gap={6} align="center">
          <IconNotes size={16} style={{ color: '#6366f1' }} />
          <Text size="xs" fw={700} c="indigo" style={{ letterSpacing: '0.04em' }}>
            {title.toUpperCase()}
          </Text>
        </Group>
        <div
          className="rich-note-content"
          style={{
            fontSize: '0.875rem',
            lineHeight: '1.6',
            color: 'var(--text-primary)',
            overflowX: 'auto',
          }}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </Stack>
    </Paper>
  );
}
