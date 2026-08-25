'use client';

import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Drawer,
  FloatingWindow,
  Group,
  NavLink,
  Paper,
  RollingNumber,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBook,
  IconBrain,
  IconCards,
  IconChartBar,
  IconCloudUpload,
  IconHistory,
  IconMenu2,
  IconMoon,
  IconPlus,
  IconRotateClockwise,
  IconSettings,
  IconSparkles,
  IconSun,
  IconTags,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NotificationBellButton } from '@/components/NotificationSettings';
import { useSoundPreference } from '@/lib/sound';

const DEFAULT_FAB_POSITION = { right: 20, bottom: 24 } as const;

export type AppSidebarProps = {
  mode: 'study' | 'quiz';
  onSetMode: (mode: 'study' | 'quiz') => void;
  onOpenAllWordsQuiz: () => void;
  onOpenTodayQuiz: () => void;
  onOpenFsrsQuiz: () => void;
  onOpenGroupManager: () => void;
  totalWords: number;
  todayCount: number;
  fsrsDueTodayCount: number;
  colorScheme: 'light' | 'dark' | 'auto';
  onToggleTheme: () => void;
};

export function AppSidebar({
  mode,
  onSetMode,
  onOpenAllWordsQuiz,
  onOpenTodayQuiz,
  onOpenFsrsQuiz,
  onOpenGroupManager,
  totalWords,
  todayCount,
  fsrsDueTodayCount,
  colorScheme,
  onToggleTheme,
}: AppSidebarProps) {
  const { soundEnabled, toggleSound } = useSoundPreference();
  const [mobileOpened, setMobileOpened] = useState(false);
  const [fabPosition, setFabPosition] = useState<{
    top?: number;
    left?: number;
    right?: number;
    bottom?: number;
  }>(DEFAULT_FAB_POSITION);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasMovedRef = useRef(false);
  const lastMovedDragEndTimeRef = useRef<number>(0);
  const setPositionRef = useRef<
    ((pos: { top?: number; left?: number; right?: number; bottom?: number }) => void) | null
  >(null);

  // Restore saved FAB position from localStorage on client mount / drawer close
  useEffect(() => {
    try {
      const saved = localStorage.getItem('self_quiz_mobile_fab_position');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.max(12, Math.min(window.innerWidth - 64, parsed.x));
          const clampedY = Math.max(12, Math.min(window.innerHeight - 64, parsed.y));
          setFabPosition({ left: clampedX, top: clampedY });
          setPositionRef.current?.({ left: clampedX, top: clampedY });
          requestAnimationFrame(() => {
            setPositionRef.current?.({ left: clampedX, top: clampedY });
          });
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [mobileOpened]);

  const handleDragStart = useCallback(() => {
    hasMovedRef.current = false;
    dragStartPosRef.current = null;
  }, []);

  const handlePositionChange = useCallback((pos: { x: number; y: number }) => {
    if (!dragStartPosRef.current) {
      dragStartPosRef.current = pos;
    } else {
      const dx = Math.abs(pos.x - dragStartPosRef.current.x);
      const dy = Math.abs(pos.y - dragStartPosRef.current.y);
      if (dx > 6 || dy > 6) {
        hasMovedRef.current = true;
      }
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (hasMovedRef.current) {
      lastMovedDragEndTimeRef.current = Date.now();
      try {
        const el = document.getElementById('mobile-sidebar-toggle-btn');
        if (el) {
          const rect = el.getBoundingClientRect();
          localStorage.setItem(
            'self_quiz_mobile_fab_position',
            JSON.stringify({ x: rect.left, y: rect.top })
          );
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    setTimeout(() => {
      hasMovedRef.current = false;
      dragStartPosRef.current = null;
    }, 150);
  }, []);

  const handleFabClick = useCallback((e: React.MouseEvent) => {
    // If the user dragged the button (>6px movement), ignore click to prevent accidental drawer opening
    if (hasMovedRef.current || Date.now() - lastMovedDragEndTimeRef.current < 300) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setMobileOpened(true);
  }, []);
  const router = useRouter();
  const pathname = usePathname();
  const isWordsPage = pathname === '/words';
  const isStoriesPage = pathname === '/stories';
  const isAnalysisPage = pathname === '/analysis';
  const isReviewLogPage = pathname === '/review-log';
  const isSettingsPage = pathname === '/settings';

  const handleLinkClick = (action: () => void) => {
    action();
    setMobileOpened(false);
  };

  const scrollToSection = (id: string) => {
    if (isWordsPage || isStoriesPage || isAnalysisPage || isReviewLogPage || isSettingsPage) {
      router.push(`/#${id}`);
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const renderNavContent = () => (
    <ScrollArea style={{ height: '100%' }} type="auto" offsetScrollbars>
      <Stack justify="space-between" style={{ minHeight: '100%', padding: '16px 12px 36px 12px' }}>
        {/* Top Branding Section */}
        <Stack gap="sm">
          <Group
            justify="flex-start"
            align="center"
            style={{ cursor: 'pointer' }}
            onClick={() => handleLinkClick(() => router.push('/'))}
          >
            <Box
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              <IconBrain size={22} />
            </Box>
            <Stack gap={0}>
              <Title order={4} style={{ fontSize: '1.02rem', lineHeight: 1.2 }}>
                <span className="text-gradient">Word Memorizer</span>
              </Title>
              <Text size="xs" c="dimmed" style={{ fontSize: '0.7rem' }}>
                Vocabulary Companion
              </Text>
            </Stack>
          </Group>

          <Divider my="xs" style={{ borderColor: 'var(--card-border)' }} />

          {/* Navigation Section */}
          <Stack gap={4}>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em', paddingLeft: 8 }}>
              NAVIGATION
            </Text>

            <NavLink
              label="Dictionary Explorer"
              description="Virtual list & full details"
              leftSection={<IconBook size={18} />}
              rightSection={
                <Badge size="xs" variant="filled" color="indigo">
                  <RollingNumber value={totalWords} thousandSeparator />
                </Badge>
              }
              active={isWordsPage}
              onClick={() => handleLinkClick(() => router.push('/words'))}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="AI Story Mode"
              description="Contextual reader & Cloze"
              leftSection={<IconSparkles size={18} />}
              active={isStoriesPage}
              onClick={() => handleLinkClick(() => router.push('/stories'))}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Learning Analysis"
              description="FSRS retention & memory health"
              leftSection={<IconChartBar size={18} />}
              active={isAnalysisPage}
              onClick={() => handleLinkClick(() => router.push('/analysis'))}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Review Log"
              description="Historical audit & inspect"
              leftSection={<IconHistory size={18} />}
              active={isReviewLogPage}
              onClick={() =>
                handleLinkClick(() => {
                  if (isAnalysisPage) {
                    const el = document.getElementById('review-log');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  } else {
                    router.push('/analysis#review-log');
                  }
                })
              }
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Study & Practice"
              description="Manage & add words"
              leftSection={<IconCards size={18} />}
              active={!isWordsPage && !isStoriesPage && !isAnalysisPage && mode === 'study'}
              onClick={() =>
                handleLinkClick(() => {
                  if (isWordsPage || isStoriesPage || isAnalysisPage) {
                    router.push('/');
                  } else {
                    onSetMode('study');
                  }
                })
              }
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Quiz & Flashcards"
              description="Interactive review session"
              leftSection={<IconBrain size={18} />}
              active={!isWordsPage && !isStoriesPage && !isAnalysisPage && mode === 'quiz'}
              childrenOffset={24}
              defaultOpened
              style={{ borderRadius: 8 }}
            >
              <NavLink
                label="All Words Quiz"
                leftSection={<IconCards size={16} />}
                onClick={() =>
                  handleLinkClick(() => {
                    if (isWordsPage || isStoriesPage || isAnalysisPage) {
                      router.push('/');
                    }
                    onOpenAllWordsQuiz();
                  })
                }
                style={{ borderRadius: 6 }}
              />
              <NavLink
                label="Today's Words"
                leftSection={<IconPlus size={16} />}
                rightSection={
                  todayCount > 0 ? (
                    <Badge size="xs" color="teal">
                      <RollingNumber value={todayCount} thousandSeparator />
                    </Badge>
                  ) : null
                }
                onClick={() =>
                  handleLinkClick(() => {
                    if (isWordsPage || isAnalysisPage) {
                      router.push('/');
                    }
                    onOpenTodayQuiz();
                  })
                }
                style={{ borderRadius: 6 }}
              />
              <NavLink
                label="FSRS Review"
                leftSection={<IconRotateClockwise size={16} />}
                rightSection={
                  fsrsDueTodayCount > 0 ? (
                    <Badge size="xs" color="violet">
                      <RollingNumber value={fsrsDueTodayCount} suffix=" due" thousandSeparator />
                    </Badge>
                  ) : null
                }
                onClick={() =>
                  handleLinkClick(() => {
                    if (isWordsPage || isAnalysisPage) {
                      router.push('/');
                    }
                    onOpenFsrsQuiz();
                  })
                }
                style={{ borderRadius: 6 }}
              />
            </NavLink>

            <Divider my={6} style={{ borderColor: 'var(--card-border)' }} />

            <Text
              size="xs"
              fw={700}
              c="dimmed"
              style={{ letterSpacing: '0.05em', paddingLeft: 8, marginTop: 4 }}
            >
              PREFERENCES & TOOLS
            </Text>

            <NavLink
              label="Settings & Config"
              description="AI, audio, FSRS & data"
              leftSection={<IconSettings size={18} />}
              active={isSettingsPage}
              onClick={() => handleLinkClick(() => router.push('/settings'))}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Group Manager"
              leftSection={<IconTags size={18} />}
              onClick={() => handleLinkClick(onOpenGroupManager)}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Dashboard & Stats"
              leftSection={<IconChartBar size={18} />}
              onClick={() => handleLinkClick(() => router.push('/analysis'))}
              style={{ borderRadius: 8 }}
            />

            <NavLink
              label="Cloud Sync"
              leftSection={<IconCloudUpload size={18} />}
              onClick={() => handleLinkClick(() => scrollToSection('cloud-sync-card'))}
              style={{ borderRadius: 8 }}
            />
          </Stack>
        </Stack>

        {/* Bottom Footer Section */}
        <Stack gap="xs">
          <Divider style={{ borderColor: 'var(--card-border)' }} />
          <Paper
            p="xs"
            radius="md"
            style={{
              background: 'rgba(99, 102, 241, 0.05)',
              border: '1px solid var(--card-border)',
            }}
          >
            <Group justify="space-between" align="center">
              <Stack
                gap={0}
                style={{ cursor: 'pointer' }}
                onClick={() => handleLinkClick(() => router.push('/settings'))}
              >
                <Text size="xs" fw={700}>
                  Settings
                </Text>
                <Text size="xs" c="dimmed" style={{ fontSize: '0.7rem' }}>
                  {colorScheme === 'dark' ? 'Dark' : 'Light'} •{' '}
                  {soundEnabled ? 'Sound ON' : 'Muted'}
                </Text>
              </Stack>

              <Group gap={6} align="center">
                <NotificationBellButton size="md" variant="subtle" />

                <Tooltip label={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}>
                  <ActionIcon
                    variant="subtle"
                    color={soundEnabled ? 'indigo' : 'gray'}
                    size="md"
                    radius="md"
                    onClick={toggleSound}
                    aria-label={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
                  >
                    {soundEnabled ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Toggle Theme">
                  <ActionIcon
                    variant="subtle"
                    color="indigo"
                    size="md"
                    radius="md"
                    onClick={onToggleTheme}
                    aria-label="Toggle Theme"
                  >
                    {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Paper>
        </Stack>
      </Stack>
    </ScrollArea>
  );

  return (
    <>
      {/* Permanent Desktop Sidebar */}
      <Box component="aside" className="desktop-sidebar glass-panel" id="app-desktop-sidebar">
        {renderNavContent()}
      </Box>

      {/* Draggable Floating Action Button on Mobile (hidden when drawer is open) */}
      {!mobileOpened && (
        <FloatingWindow
          initialPosition={fabPosition}
          constrainToViewport
          constrainOffset={12}
          zIndex={999}
          bg="transparent"
          p={0}
          shadow="none"
          withBorder={false}
          withinPortal={false}
          className="mobile-fab-window"
          setPositionRef={setPositionRef}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onPositionChange={handlePositionChange}
        >
          <Tooltip label="Open Navigation Menu" position="top">
            <ActionIcon
              className="mobile-fab-btn btn-premium"
              size="xl"
              radius="xl"
              aria-label="Open Navigation"
              id="mobile-sidebar-toggle-btn"
              onClick={handleFabClick}
            >
              <IconMenu2 size={24} />
            </ActionIcon>
          </Tooltip>
        </FloatingWindow>
      )}

      {/* Mobile Sidebar Drawer */}
      <Drawer
        opened={mobileOpened}
        onClose={() => setMobileOpened(false)}
        size="285px"
        padding={0}
        withCloseButton={false}
        styles={{
          content: {
            background: 'var(--card-bg)',
            backdropFilter: 'blur(16px)',
          },
        }}
      >
        {renderNavContent()}
      </Drawer>
    </>
  );
}
