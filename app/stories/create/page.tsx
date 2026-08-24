'use client';

import {
  Anchor,
  Breadcrumbs,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconArrowLeft, IconBook, IconHome, IconSparkles } from '@tabler/icons-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { StoryCreator } from '@/components/Stories/StoryCreator';
import {
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type StoryRecord,
  type WordRecord,
} from '@/lib/db';
import { setupSupabaseReplication } from '@/lib/replication';

export default function CreateStoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract URL parameters
  const initialWordIds = useMemo(() => {
    const wordsParam = searchParams.get('words') || searchParams.get('wordIds');
    if (wordsParam) {
      return wordsParam.split(',').filter(Boolean);
    }
    return undefined;
  }, [searchParams]);

  const initialPreset = useMemo(() => {
    const presetParam = searchParams.get('preset');
    if (
      presetParam === 'due' ||
      presetParam === 'missed' ||
      presetParam === 'difficult' ||
      presetParam === 'recent' ||
      presetParam === 'random'
    ) {
      return presetParam;
    }
    return undefined;
  }, [searchParams]);

  const initialGroup = useMemo(() => {
    return searchParams.get('group') || undefined;
  }, [searchParams]);

  // Live RxDB Subscriptions
  useEffect(() => {
    let isMounted = true;
    let wordSub: { unsubscribe: () => void } | null = null;
    let groupSub: { unsubscribe: () => void } | null = null;
    let fsrsSub: { unsubscribe: () => void } | null = null;
    let missedSub: { unsubscribe: () => void } | null = null;

    const load = async () => {
      const db = await getDatabase();
      if (!isMounted) {
        return;
      }

      wordSub = db.words.find({ selector: { isDeleted: { $ne: true } } }).$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setWords(docs.map((d) => d.toJSON() as WordRecord));
        setIsLoading(false);
      });

      groupSub = db.groups.find({ selector: { isDeleted: { $ne: true } } }).$.subscribe((docs) => {
        if (!isMounted) {
          return;
        }
        setGroups(docs.map((d) => d.toJSON() as GroupRecord));
      });

      fsrsSub = db.fsrsRecords
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setFsrsRecords(docs.map((d) => d.toJSON() as FsrsRecord));
        });

      missedSub = db.missedWords
        .find({ selector: { isDeleted: { $ne: true } } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          setMissedWords(docs.map((d) => d.toJSON() as MissedWordRecord));
        });

      setupSupabaseReplication(db);
    };

    void load();

    return () => {
      isMounted = false;
      wordSub?.unsubscribe();
      groupSub?.unsubscribe();
      fsrsSub?.unsubscribe();
      missedSub?.unsubscribe();
    };
  }, []);

  const handleStoryGenerated = (story: StoryRecord) => {
    router.push(`/stories?id=${story.id}`);
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="xl">
        {/* Header Breadcrumbs & Navigation */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Breadcrumbs separator="→" separatorMargin="md">
            <Anchor component={Link} href="/" size="sm" c="dimmed">
              <Group gap={4}>
                <IconHome size={14} />
                <span>Home</span>
              </Group>
            </Anchor>
            <Anchor component={Link} href="/stories" size="sm" c="dimmed">
              <Group gap={4}>
                <IconBook size={14} />
                <span>Stories</span>
              </Group>
            </Anchor>
            <Text size="sm" fw={600} c="indigo">
              Create Story
            </Text>
          </Breadcrumbs>

          <Button
            component={Link}
            href="/stories"
            variant="default"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
          >
            Back to Stories
          </Button>
        </Group>

        {/* Page Title Card */}
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
          <Group justify="space-between" align="center">
            <Stack gap={4}>
              <Group gap="xs">
                <IconSparkles size={24} color="var(--mantine-color-indigo-6)" />
                <Title order={2}>Create AI Vocabulary Story</Title>
              </Group>
              <Text size="sm" c="dimmed">
                Choose words from smart presets, browse and multi-select from your library, or paste
                custom words to generate a contextual narrative with Cloze practice.
              </Text>
            </Stack>
          </Group>
        </Card>

        {/* Main Creation Interface */}
        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="md" color="indigo" />
          </Group>
        ) : (
          <StoryCreator
            words={words}
            groups={groups}
            fsrsRecords={fsrsRecords}
            missedWords={missedWords}
            initialSelectedWordIds={initialWordIds}
            initialPreset={initialPreset}
            initialGroup={initialGroup}
            onStoryGenerated={handleStoryGenerated}
          />
        )}
      </Stack>
    </Container>
  );
}
