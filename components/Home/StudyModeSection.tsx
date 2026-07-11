import {
  Badge,
  Button,
  Card,
  CloseButton,
  Grid,
  Group,
  Menu,
  Pagination,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconBook, IconCheck, IconSearch, IconTags } from '@tabler/icons-react';
import { GroupManager } from '@/components/GroupManager/GroupManager';
import { WordForm } from '@/components/WordForm/WordForm';
import { WordList } from '@/components/WordList/WordList';
import type { GroupRecord, WordDefinition, WordRecord } from '@/lib/db';

type StudyModeSectionProps = {
  isLoading: boolean;
  customGroups: string[];
  words: WordRecord[];
  pagedWords: WordRecord[];
  filteredWordsCount: number;
  totalPages: number;
  page: number;
  searchQuery: string;
  searchScope: 'word' | 'wordAndDefinition';
  groupFilter: string;
  groupManagerOpen: boolean;
  groups: GroupRecord[];
  generatingExampleWordIds: Record<string, boolean>;
  onSubmitWord: (
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    selectedGroups: string[],
    aiExampleCount: number
  ) => Promise<void> | void;
  onAddCustomGroup: (group: string) => void;
  onEditExisting: (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    groups: string[],
    aiExampleCount: number
  ) => Promise<void> | void;
  onDeleteWord: (id: string) => Promise<void> | void;
  onEditWord: (
    id: string,
    word: string,
    meaning: string,
    definitions: WordDefinition[],
    groups: string[],
    aiExampleCount: number
  ) => Promise<void> | void;
  onRefreshExamples: (id: string) => Promise<void> | void;
  onCreateGroup: (name: string) => Promise<void> | void;
  onRenameGroup: (id: string, newName: string) => Promise<void> | void;
  onDeleteGroup: (id: string) => Promise<void> | void;
  onOpenGroupManager: () => void;
  onCloseGroupManager: () => void;
  onSetSearchQuery: (value: string) => void;
  onSetSearchScope: (value: 'word' | 'wordAndDefinition') => void;
  onSetGroupFilter: (value: string) => void;
  onSetPage: (value: number | ((prev: number) => number)) => void;
};

export function StudyModeSection({
  isLoading,
  customGroups,
  words,
  pagedWords,
  filteredWordsCount,
  totalPages,
  page,
  searchQuery,
  searchScope,
  groupFilter,
  groupManagerOpen,
  groups,
  generatingExampleWordIds,
  onSubmitWord,
  onAddCustomGroup,
  onEditExisting,
  onDeleteWord,
  onEditWord,
  onRefreshExamples,
  onCreateGroup,
  onRenameGroup,
  onDeleteGroup,
  onOpenGroupManager,
  onCloseGroupManager,
  onSetSearchQuery,
  onSetSearchScope,
  onSetGroupFilter,
  onSetPage,
}: StudyModeSectionProps) {
  return (
    <Stack gap="lg">
      <WordForm
        onSubmit={onSubmitWord}
        disabled={isLoading}
        customGroups={customGroups}
        onAddCustomGroup={onAddCustomGroup}
        existingWords={words}
        onEditExisting={onEditExisting}
      />

      <Card
        className="glass-panel"
        radius="lg"
        padding="lg"
        style={{
          borderLeft: '4px solid #a855f7',
          overflow: 'hidden',
        }}
      >
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconBook size={22} style={{ color: '#a855f7' }} />
              <Title
                order={3}
                style={{
                  fontFamily: 'var(--font-title)',
                  fontSize: '1.25rem',
                  color: 'var(--text-primary)',
                }}
              >
                Your Workspace
              </Title>
            </Group>
            <Group gap="xs">
              <Button
                variant="light"
                color="grape"
                size="xs"
                radius="md"
                leftSection={<IconTags size={16} />}
                onClick={onOpenGroupManager}
              >
                Manage Groups
              </Button>
              <Badge
                variant="gradient"
                gradient={{ from: 'indigo', to: 'purple' }}
                size="md"
                radius="md"
                style={{ fontWeight: 700 }}
              >
                {filteredWordsCount} word{filteredWordsCount !== 1 ? 's' : ''}
              </Badge>
            </Group>
          </Group>

          <Grid gap="sm">
            <Grid.Col span={{ base: 12, sm: 8 }}>
              <Stack gap="xs">
                <TextInput
                  placeholder={
                    searchScope === 'wordAndDefinition'
                      ? 'Search words or definitions...'
                      : 'Search vocabulary by keyword...'
                  }
                  leftSection={
                    <Menu withArrow closeOnItemClick trigger="click-hover">
                      <Menu.Target>
                        <IconSearch size={18} style={{ opacity: 0.55, color: '#a855f7' }} />
                      </Menu.Target>

                      <Menu.Dropdown>
                        <Menu.Label>Search Type</Menu.Label>
                        <Menu.Item
                          value="word"
                          onClick={() => {
                            onSetSearchScope('word');
                            onSetPage(1);
                          }}
                        >
                          {searchScope === 'word' ? (
                            <IconCheck size={16} style={{ marginRight: 4 }} />
                          ) : null}
                          Word only
                        </Menu.Item>
                        <Menu.Item
                          value="wordAndDefinition"
                          onClick={() => {
                            onSetSearchScope('wordAndDefinition');
                            onSetPage(1);
                          }}
                        >
                          {searchScope === 'wordAndDefinition' ? (
                            <IconCheck size={16} style={{ marginRight: 4 }} />
                          ) : null}
                          Word + Definition
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  }
                  rightSection={
                    searchQuery ? (
                      <CloseButton
                        size="sm"
                        aria-label="Clear search"
                        onClick={() => {
                          onSetSearchQuery('');
                          onSetPage(1);
                        }}
                      />
                    ) : null
                  }
                  value={searchQuery}
                  size="md"
                  radius="md"
                  onChange={(event) => {
                    onSetSearchQuery(event.currentTarget.value);
                    onSetPage(1);
                  }}
                />
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <Select
                placeholder="Filter by Group"
                value={groupFilter}
                onChange={(value) => {
                  onSetGroupFilter(value ?? 'all');
                  onSetPage(1);
                }}
                data={[
                  { value: 'all', label: 'All Groups' },
                  { value: 'none', label: 'No Group' },
                  ...customGroups.map((g) => ({ value: g, label: g })),
                ]}
                size="md"
                radius="md"
                allowDeselect={false}
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Card>

      <WordList
        words={pagedWords}
        onDelete={onDeleteWord}
        onEdit={onEditWord}
        onRefreshExamples={onRefreshExamples}
        customGroups={customGroups}
        onAddCustomGroup={onAddCustomGroup}
        generatingExampleWordIds={generatingExampleWordIds}
      />

      <GroupManager
        opened={groupManagerOpen}
        onClose={onCloseGroupManager}
        groups={groups}
        onRename={onRenameGroup}
        onDelete={onDeleteGroup}
        onAdd={onCreateGroup}
      />

      {totalPages > 1 && (
        <Group justify="center" mt="sm">
          <div className="desktop-only">
            <Pagination
              value={page}
              onChange={(value) => onSetPage(value)}
              total={totalPages}
              radius="md"
              color="indigo"
              size="sm"
              siblings={1}
              boundaries={1}
              withEdges
            />
          </div>
          <div className="mobile-only">
            <Group gap="sm" align="center">
              <Button
                variant="subtle"
                color="indigo"
                size="xs"
                radius="md"
                disabled={page === 1}
                onClick={() => onSetPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Text
                size="xs"
                fw={700}
                c="dimmed"
                style={{ minWidth: 60, textAlign: 'center' }}
              >
                {page} / {totalPages}
              </Text>
              <Button
                variant="subtle"
                color="indigo"
                size="xs"
                radius="md"
                disabled={page === totalPages}
                onClick={() => onSetPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </Group>
          </div>
        </Group>
      )}
    </Stack>
  );
}
