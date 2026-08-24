'use client';

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Modal,
  Pagination,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  IconBook,
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconSearch,
  IconSparkles,
  IconTrash,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';
import { getDatabase, type StoryRecord } from '@/lib/db';
import { STORY_GENRES } from '@/lib/story';

export type StoryLibraryListProps = {
  stories: StoryRecord[];
  onSelectStory: (story: StoryRecord) => void;
  onGenerateNewClick: () => void;
  onDeleteStory?: (id: string) => void;
  onToggleFavorite?: (story: StoryRecord) => void;
};

const ITEMS_PER_PAGE = 8;

export function StoryLibraryList({
  stories,
  onSelectStory,
  onGenerateNewClick,
  onDeleteStory,
  onToggleFavorite,
}: StoryLibraryListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [page, setPage] = useState(1);
  const [storyToDelete, setStoryToDelete] = useState<StoryRecord | null>(null);

  // Filter & sort stories
  const filteredStories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return stories
      .filter((s) => {
        if (s.isDeleted) {
          return false;
        }
        if (favoritesOnly && !s.isFavorite) {
          return false;
        }
        if (genreFilter !== 'all' && s.genre !== genreFilter) {
          return false;
        }

        if (q) {
          const matchTitle = s.title.toLowerCase().includes(q);
          const matchContent = s.content.toLowerCase().includes(q);
          const matchWords = (s.targetWords || []).some((w) => w.word.toLowerCase().includes(q));
          if (!matchTitle && !matchContent && !matchWords) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        }
        if (sortBy === 'oldest') {
          return (a.createdAt || '').localeCompare(b.createdAt || '');
        }
        return a.title.localeCompare(b.title);
      });
  }, [stories, searchQuery, genreFilter, favoritesOnly, sortBy]);

  const totalPages = Math.ceil(filteredStories.length / ITEMS_PER_PAGE);
  const paginatedStories = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredStories.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStories, page]);

  const handleFavoriteClick = async (e: React.MouseEvent, story: StoryRecord) => {
    e.stopPropagation();
    const updated: StoryRecord = {
      ...story,
      isFavorite: !story.isFavorite,
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = await getDatabase();
      await db.stories.upsert(updated);
      onToggleFavorite?.(updated);
    } catch (err) {
      console.error('Failed to toggle story favorite:', err);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, story: StoryRecord) => {
    e.stopPropagation();
    setStoryToDelete(story);
  };

  const handleConfirmDelete = async () => {
    if (!storyToDelete) {
      return;
    }
    const storyId = storyToDelete.id;
    setStoryToDelete(null);

    try {
      const db = await getDatabase();
      await db.stories.upsert({
        ...storyToDelete,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      });
      onDeleteStory?.(storyId);
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  return (
    <Stack gap="lg">
      {/* Search and Filters Strip */}
      <Card withBorder p="md" radius="md">
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 5 }}>
            <TextInput
              placeholder="Search stories by title or target word..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 4, md: 3 }}>
            <Select
              placeholder="Genre Filter"
              data={[
                { value: 'all', label: 'All Genres' },
                ...STORY_GENRES.map((g) => ({ value: g, label: g })),
              ]}
              value={genreFilter}
              onChange={(val) => {
                setGenreFilter(val || 'all');
                setPage(1);
              }}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 6, sm: 4, md: 2 }}>
            <Select
              placeholder="Sort by"
              data={[
                { value: 'newest', label: 'Newest First' },
                { value: 'oldest', label: 'Oldest First' },
                { value: 'title', label: 'Title (A-Z)' },
              ]}
              value={sortBy}
              onChange={(val) => setSortBy((val as any) || 'newest')}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 4, md: 2 }}>
            <Button
              variant={favoritesOnly ? 'filled' : 'light'}
              color="red"
              leftSection={favoritesOnly ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
              onClick={() => {
                setFavoritesOnly((prev) => !prev);
                setPage(1);
              }}
              fullWidth
            >
              Favorites
            </Button>
          </Grid.Col>
        </Grid>
      </Card>

      {/* Stories Grid */}
      {paginatedStories.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
          {paginatedStories.map((story) => {
            const wordsList = story.targetWords || [];
            const previewWords = wordsList.slice(0, 4);
            const extraWordsCount = Math.max(0, wordsList.length - 4);

            return (
              <Card
                key={story.id}
                withBorder
                padding="md"
                radius="md"
                style={{
                  cursor: 'pointer',
                  transition: 'transform 150ms ease, box-shadow 150ms ease',
                }}
                onClick={() => onSelectStory(story)}
              >
                <Stack justify="space-between" style={{ height: '100%' }} gap="sm">
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <Stack gap={2} style={{ flex: 1 }}>
                        <Title order={4} lineClamp={1}>
                          {story.title}
                        </Title>
                        <Group gap={6}>
                          {story.genre && (
                            <Badge size="xs" variant="light" color="indigo">
                              {story.genre}
                            </Badge>
                          )}
                          {story.difficulty && (
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                story.difficulty === 'beginner'
                                  ? 'teal'
                                  : story.difficulty === 'advanced'
                                    ? 'violet'
                                    : 'blue'
                              }
                            >
                              {story.difficulty.charAt(0).toUpperCase() + story.difficulty.slice(1)}
                            </Badge>
                          )}
                          <Text size="xs" c="dimmed">
                            {new Date(story.createdAt).toLocaleDateString()}
                          </Text>
                        </Group>
                      </Stack>

                      <Group gap={4}>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color={story.isFavorite ? 'red' : 'gray'}
                          onClick={(e) => handleFavoriteClick(e, story)}
                        >
                          {story.isFavorite ? (
                            <IconHeartFilled size={16} />
                          ) : (
                            <IconHeart size={16} />
                          )}
                        </ActionIcon>
                        <ActionIcon
                          size="sm"
                          variant="subtle"
                          color="red"
                          onClick={(e) => handleDeleteClick(e, story)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <Text size="sm" c="dimmed" lineClamp={2} style={{ fontStyle: 'italic' }}>
                      &ldquo;{story.content}&rdquo;
                    </Text>
                  </Stack>

                  {/* Words Badges Footer */}
                  <Stack gap="xs">
                    <Group gap={4} wrap="wrap">
                      {previewWords.map((tw) => (
                        <Badge
                          key={tw.wordId || tw.word}
                          size="xs"
                          variant="outline"
                          color="indigo"
                        >
                          {tw.word}
                        </Badge>
                      ))}
                      {extraWordsCount > 0 && (
                        <Badge size="xs" variant="subtle" color="gray">
                          +{extraWordsCount} more
                        </Badge>
                      )}
                    </Group>

                    <Group justify="flex-end">
                      <Button
                        size="xs"
                        variant="light"
                        color="indigo"
                        rightSection={<IconEye size={14} />}
                        onClick={() => onSelectStory(story)}
                      >
                        Read Story
                      </Button>
                    </Group>
                  </Stack>
                </Stack>
              </Card>
            );
          })}
        </SimpleGrid>
      ) : (
        <Card withBorder padding="xl" radius="md" style={{ textAlign: 'center' }}>
          <Stack align="center" gap="md">
            <IconBook size={48} color="var(--mantine-color-indigo-4)" />
            <Stack gap="xs">
              <Title order={4}>No Stories Found</Title>
              <Text size="sm" c="dimmed" style={{ maxWidth: 400 }}>
                {stories.length === 0
                  ? "You haven't generated any AI stories yet. Create your first story using your due or difficult words!"
                  : 'No stories matched your current search and filters.'}
              </Text>
            </Stack>
            <Button
              color="indigo"
              leftSection={<IconSparkles size={16} />}
              onClick={onGenerateNewClick}
            >
              Generate AI Story
            </Button>
          </Stack>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination value={page} onChange={setPage} total={totalPages} color="indigo" />
        </Group>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        opened={Boolean(storyToDelete)}
        onClose={() => setStoryToDelete(null)}
        title={
          <Group gap="xs">
            <IconTrash size={20} color="var(--mantine-color-red-6)" />
            <Title order={4}>Delete Story</Title>
          </Group>
        }
        centered
        radius="md"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete &ldquo;{storyToDelete?.title}&rdquo;?
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setStoryToDelete(null)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
