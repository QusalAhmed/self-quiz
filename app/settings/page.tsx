'use client';

import { Box, Container, Loader, ScrollArea, Stack, Tabs, Text } from '@mantine/core';
import {
  IconAdjustments,
  IconBell,
  IconBook,
  IconBrain,
  IconCpu,
  IconDatabase,
  IconInfoCircle,
  IconPalette,
  IconRefresh,
  IconVolume,
} from '@tabler/icons-react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useQuranVerse } from '@/components/QuranVerse';
import {
  SettingsAboutTab,
  SettingsAiTab,
  SettingsAppearanceTab,
  SettingsAudioTab,
  SettingsDataTab,
  SettingsFsrsTab,
  SettingsHeader,
  SettingsNotificationsTab,
  SettingsQuranVerseTab,
  SettingsStudyQuizTab,
  SettingsSyncTab,
} from '@/components/Settings';
import {
  type FsrsRecord,
  getDatabase,
  type GroupRecord,
  type MissedWordRecord,
  type WordFamilyMemberRecord,
  type WordRecord,
} from '@/lib/db';
import { DEFAULT_APP_SETTINGS, useAppSettings } from '@/lib/settings';

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'appearance';

  const [activeTab, setActiveTab] = useState<string | null>(initialTab);
  const { settings, updateSection, resetSettings } = useAppSettings();
  const { showNextVerseNow } = useQuranVerse();

  // RxDB Live Records for Data & Sync tabs
  const [words, setWords] = useState<WordRecord[]>([]);
  const [groups, setGroups] = useState<GroupRecord[]>([]);
  const [missedWords, setMissedWords] = useState<MissedWordRecord[]>([]);
  const [fsrsRecords, setFsrsRecords] = useState<FsrsRecord[]>([]);
  const [reviewLogsCount, setReviewLogsCount] = useState<number>(0);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});
  const [onlineStatus, setOnlineStatus] = useState(true);

  // Sync tab change with searchParams if needed
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Track Network Status
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    setOnlineStatus(navigator.onLine);
    const goOnline = () => setOnlineStatus(true);
    const goOffline = () => setOnlineStatus(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Fetch Database counts
  const loadDatabaseCounts = useCallback(async () => {
    try {
      const db = await getDatabase();
      const wordDocs = await db.words.find({ selector: { isDeleted: { $ne: true } } }).exec();
      setWords(wordDocs.map((d) => d.toJSON() as WordRecord));

      const groupDocs = await db.groups.find({ selector: { isDeleted: { $ne: true } } }).exec();
      setGroups(groupDocs.map((d) => d.toJSON() as GroupRecord));

      const missedDocs = await db.missedWords
        .find({ selector: { isDeleted: { $ne: true } } })
        .exec();
      setMissedWords(missedDocs.map((d) => d.toJSON() as MissedWordRecord));

      const fsrsDocs = await db.fsrsRecords.find({ selector: { isDeleted: { $ne: true } } }).exec();
      setFsrsRecords(fsrsDocs.map((d) => d.toJSON() as FsrsRecord));

      const logDocs = await db.reviewLogs.find({ selector: { isDeleted: { $ne: true } } }).exec();
      setReviewLogsCount(logDocs.length);

      const familyDocs = await db.wordFamilies
        .find({ selector: { isDeleted: { $ne: true } } })
        .exec();
      const map: Record<string, WordFamilyMemberRecord[]> = {};
      for (const doc of familyDocs) {
        const item = doc.toJSON() as WordFamilyMemberRecord;
        if (!map[item.wordId]) {
          map[item.wordId] = [];
        }
        map[item.wordId].push(item);
      }
      setWordFamilies(map);
    } catch (err) {
      console.error('Failed to load database records for settings:', err);
    }
  }, []);

  useEffect(() => {
    void loadDatabaseCounts();
  }, [loadDatabaseCounts]);

  const handleResetFsrs = () => {
    updateSection('fsrs', DEFAULT_APP_SETTINGS.fsrs);
  };

  return (
    <Container size="lg" px={{ base: 'xs', sm: 'md', md: 'lg' }} py={{ base: 'sm', sm: 'xl' }}>
      <Stack gap="md">
        {/* Top Header */}
        <SettingsHeader settings={settings} onResetAll={resetSettings} />

        {/* Tabbed Navigation & Content Panels */}
        <Tabs value={activeTab} onChange={setActiveTab} color="indigo" variant="pills" radius="md">
          {/* Scrollable Tab List for Mobile/Desktop */}
          <ScrollArea
            type="never"
            offsetScrollbars={false}
            styles={{
              root: {
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x',
              },
            }}
          >
            <Tabs.List
              style={{
                flexWrap: 'nowrap',
                gap: 6,
                padding: '6px 4px',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 12,
                boxShadow: 'var(--card-shadow)',
                minWidth: 'max-content',
              }}
            >
              <Tabs.Tab
                value="appearance"
                leftSection={<IconPalette size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Appearance
              </Tabs.Tab>

              <Tabs.Tab
                value="study"
                leftSection={<IconBrain size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Study & Quiz
              </Tabs.Tab>

              <Tabs.Tab
                value="audio"
                leftSection={<IconVolume size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Audio & Voice
              </Tabs.Tab>

              <Tabs.Tab
                value="fsrs"
                leftSection={<IconAdjustments size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                FSRS Algorithm
              </Tabs.Tab>

              <Tabs.Tab
                value="notifications"
                leftSection={<IconBell size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Notifications
              </Tabs.Tab>

              <Tabs.Tab
                value="quran"
                leftSection={<IconBook size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Quran Verses
              </Tabs.Tab>

              <Tabs.Tab
                value="ai"
                leftSection={<IconCpu size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                AI Models
              </Tabs.Tab>

              <Tabs.Tab
                value="sync"
                leftSection={<IconRefresh size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Cloud Sync
              </Tabs.Tab>

              <Tabs.Tab
                value="data"
                leftSection={<IconDatabase size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                Data & Storage
              </Tabs.Tab>

              <Tabs.Tab
                value="about"
                leftSection={<IconInfoCircle size={16} />}
                px={{ base: 'xs', sm: 'sm' }}
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                About
              </Tabs.Tab>
            </Tabs.List>
          </ScrollArea>

          {/* Tab Panels */}
          <Box mt="md">
            <Tabs.Panel value="appearance">
              <SettingsAppearanceTab
                settings={settings.appearance}
                onChange={(vals) => updateSection('appearance', vals)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="study">
              <SettingsStudyQuizTab
                settings={settings.studyQuiz}
                onChange={(vals) => updateSection('studyQuiz', vals)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="audio">
              <SettingsAudioTab
                settings={settings.audio}
                onChange={(vals) => updateSection('audio', vals)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="fsrs">
              <SettingsFsrsTab
                settings={settings.fsrs}
                onChange={(vals) => updateSection('fsrs', vals)}
                onResetFsrs={handleResetFsrs}
              />
            </Tabs.Panel>

            <Tabs.Panel value="notifications">
              <SettingsNotificationsTab
                settings={settings.notifications}
                onChange={(vals) => updateSection('notifications', vals)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="quran">
              <SettingsQuranVerseTab
                settings={settings.quranVerse}
                onChange={(vals) => updateSection('quranVerse', vals)}
                onTestPopup={showNextVerseNow}
              />
            </Tabs.Panel>

            <Tabs.Panel value="ai">
              <SettingsAiTab
                settings={settings.ai}
                onChange={(vals) => updateSection('ai', vals)}
              />
            </Tabs.Panel>

            <Tabs.Panel value="sync">
              <SettingsSyncTab
                onlineStatus={onlineStatus}
                isSyncing={false}
                collectionCounts={{
                  words: words.length,
                  groups: groups.length,
                  missedWords: missedWords.length,
                  wordFamilies: Object.values(wordFamilies).reduce(
                    (acc, list) => acc + list.length,
                    0
                  ),
                  fsrsRecords: fsrsRecords.length,
                  reviewLogs: reviewLogsCount,
                  settings: 1,
                }}
              />
            </Tabs.Panel>

            <Tabs.Panel value="data">
              <SettingsDataTab
                words={words}
                groups={groups}
                missedWords={missedWords}
                wordFamilies={wordFamilies}
                fsrsCount={fsrsRecords.length}
                reviewLogsCount={reviewLogsCount}
                onRefreshData={loadDatabaseCounts}
              />
            </Tabs.Panel>

            <Tabs.Panel value="about">
              <SettingsAboutTab />
            </Tabs.Panel>
          </Box>
        </Tabs>
      </Stack>
    </Container>
  );
}

export default function SettingsPage() {
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
              Loading Settings...
            </Text>
          </Stack>
        </Box>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
