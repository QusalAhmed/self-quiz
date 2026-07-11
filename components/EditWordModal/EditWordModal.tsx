import { Modal, Text } from '@mantine/core';
import { useMemo } from 'react';
import { WordForm } from '@/components/WordForm/WordForm';
import type { WordDefinition, WordRecord } from '@/lib/db';
import { getWordDefinitions } from '@/lib/definitions';
import { getWordGroups } from '@/lib/groups';

type EditWordModalProps = {
  opened: boolean;
  onClose: () => void;
  wordRecord: WordRecord | null;
  customGroups: string[];
  onSave: (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    customGroups: string[],
    aiExampleCount: number
  ) => Promise<void> | void;
  onAddCustomGroup?: (group: string) => void;
};

export function EditWordModal({
  opened,
  onClose,
  wordRecord,
  customGroups,
  onSave,
  onAddCustomGroup,
}: EditWordModalProps) {
  const editValues = useMemo(() => {
    if (!wordRecord) {
      return null;
    }
    return {
      word: wordRecord.word,
      meaning: wordRecord.meaning,
      definitions: getWordDefinitions(wordRecord),
      groups: getWordGroups(wordRecord),
      aiExampleCount: wordRecord.aiExampleCount,
    };
  }, [wordRecord]);

  if (!wordRecord) {
    return null;
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
          Edit Word
        </Text>
      }
      centered
      radius="lg"
      size="md"
      overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
    >
      <WordForm
        variant="plain"
        customGroups={customGroups}
        onAddCustomGroup={onAddCustomGroup}
        editValues={opened ? editValues : null}
        onSubmit={async (word, meaning, definitions, groups, aiExampleCount) => {
          await onSave(wordRecord.id, word, meaning, definitions, groups, aiExampleCount);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
