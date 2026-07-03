import { Modal, Text } from '@mantine/core';
import { useMemo } from 'react';
import { WordForm } from '@/components/WordForm/WordForm';
import type { WordRecord } from '@/lib/db';
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
    userExamples: string[],
    customGroups: string[]
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
      userExamples: Array.isArray(wordRecord.userExamples) ? wordRecord.userExamples : [],
      groups: getWordGroups(wordRecord),
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
        onSubmit={async (word, meaning, userExamples, groups) => {
          await onSave(wordRecord.id, word, meaning, userExamples, groups);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
