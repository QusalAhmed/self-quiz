'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconPlus, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { StoryGeneratorModal, StoryLibraryList, StoryReader } from '@/components/Stories';
import {
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type StoryRecord,
  type WordRecord,
} from '@/lib/db';
import { setupSupabaseReplication } from '@/lib/replication';

function StoriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [stories, setStories] = useState<StoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Story & UI Views
  const [activeStory, setActiveStory] = useState<StoryRecord | null>(null);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [initialWordIds, setInitialWordIds] = useState<string[]>([]);
  const [initialPreset, setInitialPreset] = useState<
    'due' | 'missed' | 'difficult' | 'recent' | undefined
  >(undefined);

  // Check URL query parameters for pre-selected words or story
  useEffect(() => {
    const wordsParam = searchParams.get('words');
    if (wordsParam) {
      const ids = wordsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        setInitialWordIds(ids);
        setGeneratorModalOpen(true);
      }
    }

    const presetParam = searchParams.get('preset');
    if (
      presetParam === 'due' ||
      presetParam === 'missed' ||
      presetParam === 'difficult' ||
      presetParam === 'recent'
    ) {
      setInitialPreset(presetParam);
      setGeneratorModalOpen(true);
    }
  }, [searchParams]);

  // RxDB Live Subscriptions
  useEffect(() => {
    let isMounted = true;
    let wordSubscription: { unsubscribe: () => void } | null = null;
    let groupSubscription: { unsubscribe: () => void } | null = null;
    let fsrsSubscription: { unsubscribe: () => void } | null = null;
    let missedSubscription: { unsubscribe: () => void } | null = null;
    let storySubscription: { unsubscribe: () => void } | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      wordSubscription = db.words
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setWords(docs.map((d) => d.toJSON() as WordRecord));
        });

      groupSubscription = db.groups
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setGroups(docs.map((d) => d.toJSON() as GroupRecord));
        });

      fsrsSubscription = db.fsrsRecords
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setFsrsRecords(docs.map((d) => d.toJSON() as FsrsRecord));
        });

      missedSubscription = db.missedWords
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setMissedWords(docs.map((d) => d.toJSON() as MissedWordRecord));
        });

      storySubscription = db.stories
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          const loadedStories = docs.map((d) => d.toJSON() as StoryRecord);
          setStories(loadedStories);
          setIsLoading(false);

          // Check if there is an active story requested via URL (id or storyId)
          const storyIdParam = searchParams.get('id') || searchParams.get('storyId');
          if (storyIdParam) {
            const found = loadedStories.find((s) => s.id === storyIdParam);
            if (found) {
              setActiveStory(found);
            }
          }
        });

      // Background replication
      setupSupabaseReplication(db);
    };

    void load();

    return () => {
      isMounted = false;
      wordSubscription?.unsubscribe();
      groupSubscription?.unsubscribe();
      fsrsSubscription?.unsubscribe();
      missedSubscription?.unsubscribe();
      storySubscription?.unsubscribe();
    };
  }, [searchParams]);

  // Statistics
  const activeStoriesCount = useMemo(() => stories.filter((s) => !s.isDeleted).length, [stories]);
  const totalWordsInStories = useMemo(() => {
    const set = new Set<string>();
    for (const s of stories) {
      if (s.isDeleted) {
        continue;
      }
      for (const w of s.targetWords || []) {
        set.add(w.word.toLowerCase());
      }
    }
    return set.size;
  }, [stories]);

  const handleStoryGenerated = useCallback((newStory: StoryRecord) => {
    setActiveStory(newStory);
  }, []);

  const handleSelectStory = useCallback((story: StoryRecord) => {
    setActiveStory(story);
  }, []);

  const handleBackToList = useCallback(() => {
    setActiveStory(null);
  }, []);

  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        {/* Page Header Banner */}
        <Card
          withBorder
          padding="lg"
          radius="lg"
          style={{
            background:
              'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
            borderColor: 'var(--mantine-color-indigo-2)',
          }}
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Stack gap={4}>
              <Group gap="xs">
                <IconSparkles size={24} color="var(--mantine-color-indigo-6)" />
                <Title order={2}>AI Story Mode & Contextual Reader</Title>
              </Group>
              <Text size="sm" c="dimmed">
                Generate creative narratives with your vocabulary words, practice in context with
                Cloze mode, and listen with audio narration.
              </Text>
            </Stack>

            <Group gap="sm">
              <Badge variant="light" color="indigo" size="lg" radius="sm">
                {activeStoriesCount} Saved {activeStoriesCount === 1 ? 'Story' : 'Stories'}
              </Badge>
              <Badge variant="light" color="teal" size="lg" radius="sm">
                {totalWordsInStories} Words Contextualized
              </Badge>
              <Button
                component={Link}
                href="/stories/create"
                color="indigo"
                leftSection={<IconPlus size={16} />}
              >
                Create Story
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Loading Indicator */}
        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="md" color="indigo" />
          </Group>
        ) : activeStory ? (
          /* Active Story Reader View */
          <StoryReader
            story={activeStory}
            words={words}
            onBackToList={handleBackToList}
            onUpdateStory={(updated) => setActiveStory(updated)}
            onDeleteStory={() => setActiveStory(null)}
            onGenerateNewClick={() => router.push('/stories/create')}
          />
        ) : (
          /* Saved Story Library List View */
          <StoryLibraryList
            stories={stories}
            onSelectStory={handleSelectStory}
            onGenerateNewClick={() => router.push('/stories/create')}
            onDeleteStory={(id) => {
              setActiveStory((curr) => (curr?.id === id ? null : curr));
            }}
          />
        )}

        {/* Story Generator Modal */}
        <StoryGeneratorModal
          opened={generatorModalOpen}
          onClose={() => {
            setGeneratorModalOpen(false);
            setInitialPreset(undefined);
          }}
          words={words}
          groups={groups}
          fsrsRecords={fsrsRecords}
          missedWords={missedWords}
          onStoryGenerated={handleStoryGenerated}
          initialSelectedWordIds={initialWordIds}
          initialPreset={initialPreset}
        />
      </Stack>
    </Container>
  );
}

export default function StoriesPage() {
  return (
    <Suspense
      fallback={
        <Box
          style={{
            display: 'flex',
            minHeight: '80vh',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Stack align="center" gap="sm">
            <Loader color="indigo" size="md" />
            <Text size="sm" c="dimmed">
              Loading Stories...
            </Text>
          </Stack>
        </Box>
      }
    >
      <StoriesPageContent />
    </Suspense>
  );
}
