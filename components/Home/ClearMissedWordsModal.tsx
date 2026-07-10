import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { IconBookmarkOff } from '@tabler/icons-react';

type ClearMissedWordsModalProps = {
  opened: boolean;
  count: number;
  quizDirectionLabel: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export function ClearMissedWordsModal({
  opened,
  count,
  quizDirectionLabel,
  onClose,
  onConfirm,
}: ClearMissedWordsModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} size="md" style={{ fontFamily: 'var(--font-title)' }}>
          Clear All Missed Words?
        </Text>
      }
      centered
      radius="lg"
      size="sm"
      overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
    >
      <Stack gap="lg">
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
          This will permanently remove{' '}
          <Text component="span" fw={700} c="red">
            {count} missed word{count !== 1 ? 's' : ''}
          </Text>{' '}
          from the <strong>{quizDirectionLabel}</strong> mode list. This action cannot be undone.
        </Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="subtle" color="gray" radius="md" onClick={onClose}>
            Cancel
          </Button>
          <Button
            color="red"
            radius="md"
            leftSection={<IconBookmarkOff size={16} />}
            onClick={() => void onConfirm()}
          >
            Clear All
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
