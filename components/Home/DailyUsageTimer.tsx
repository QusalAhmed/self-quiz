'use client';

import { Card, Group, Text, Badge, Tooltip } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { getDatabase, type DailyUsageRecord } from '@/lib/db';
import { pushDailyUsageToRemote } from '@/lib/sync';

const DEVICE_ID_KEY = 'self_quiz_device_id';

function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

const getTodayDateString = () => {
  return new Date().toLocaleDateString('en-CA');
};

const formatDuration = (totalSeconds: number) => {
  if (totalSeconds <= 0) {
    return '0s';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
};

// How often (in seconds) we push local usage record to remote
const REMOTE_PUSH_INTERVAL_SECS = 30;

export function DailyUsageTimer() {
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [secondsToday, setSecondsToday] = useState(0);

  // Refs holding mutable state that doesn't need re-renders
  const deviceIdRef = useRef('');
  const localSecondsRef = useRef(0); // seconds for THIS device today
  const allDeviceSecondsRef = useRef<Map<string, number>>(new Map()); // all devices today
  const secondsSinceLastPushRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const deviceId = getOrCreateDeviceId();
    deviceIdRef.current = deviceId;
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const init = async () => {
      const today = getTodayDateString();
      const db = await getDatabase();

      // Query all daily usage records for today to aggregate all devices
      const todayQuery = db.dailyUsage.find({
        selector: { date: today, isDeleted: { $ne: true } },
      });

      // Subscribe to live updates (picks up remote sync changes in real-time)
      subscription = todayQuery.$.subscribe((docs) => {
        if (!isMounted) return;
        const deviceMap = new Map<string, number>();
        for (const doc of docs) {
          const rec = doc.toJSON() as DailyUsageRecord;
          deviceMap.set(rec.deviceId, rec.seconds);
        }
        allDeviceSecondsRef.current = deviceMap;

        // Update local device seconds from DB
        const storedLocalSecs = deviceMap.get(deviceId) ?? 0;
        localSecondsRef.current = storedLocalSecs;

        // Display is the SUM of all devices
        const total = Array.from(deviceMap.values()).reduce((acc, s) => acc + s, 0);
        setSecondsToday(total);
      });
    };

    void init();

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    let isUserIdle = false;
    let isVisible = document.visibilityState === 'visible';
    let isFocused = document.hasFocus();

    const checkState = () => {
      const currentlyActive = !isUserIdle && isVisible && isFocused;
      setIsActive(currentlyActive);
    };

    let idleTimeoutId: NodeJS.Timeout;
    const resetIdleTimeout = () => {
      if (isUserIdle) {
        isUserIdle = false;
        checkState();
      }
      clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => {
        isUserIdle = true;
        checkState();
      }, 30000); // 30 seconds idle threshold
    };

    resetIdleTimeout();

    const handleActivity = () => { resetIdleTimeout(); };
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) resetIdleTimeout();
      checkState();
    };
    const handleFocus = () => { isFocused = true; resetIdleTimeout(); checkState(); };
    const handleBlur = () => { isFocused = false; checkState(); };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'click', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Push local device record to remote (throttled to every REMOTE_PUSH_INTERVAL_SECS)
    const pushToRemote = async () => {
      const deviceId = deviceIdRef.current;
      if (!deviceId) return;
      const today = getTodayDateString();
      const recordId = `${today}:${deviceId}`;
      try {
        const db = await getDatabase();
        const existing = await db.dailyUsage.findOne(recordId).exec();
        const currentSecs = existing
          ? (existing.toJSON() as DailyUsageRecord).seconds
          : localSecondsRef.current;
        const record: DailyUsageRecord = {
          id: recordId,
          date: today,
          deviceId,
          seconds: currentSecs,
          updatedAt: new Date().toISOString(),
          lastSyncedAt: '',
          isDeleted: false,
        };
        await pushDailyUsageToRemote(db.dailyUsage, record);
      } catch (err) {
        console.error('Failed to push daily usage to remote:', err);
      }
      secondsSinceLastPushRef.current = 0;
    };

    // Persist to local DB every second, push to remote every REMOTE_PUSH_INTERVAL_SECS seconds
    const intervalId = setInterval(() => {
      const currentlyActive = !isUserIdle && isVisible && isFocused;
      if (!currentlyActive) return;

      const deviceId = deviceIdRef.current;
      if (!deviceId) return;

      const today = getTodayDateString();
      const recordId = `${today}:${deviceId}`;
      const nextSecs = localSecondsRef.current + 1;
      localSecondsRef.current = nextSecs;

      // Update all-devices map for display
      allDeviceSecondsRef.current.set(deviceId, nextSecs);
      const total = Array.from(allDeviceSecondsRef.current.values()).reduce((acc, s) => acc + s, 0);
      setSecondsToday(total);

      // Persist to local RxDB
      void (async () => {
        try {
          const db = await getDatabase();
          const timestamp = new Date().toISOString();
          const record: DailyUsageRecord = {
            id: recordId,
            date: today,
            deviceId,
            seconds: nextSecs,
            updatedAt: timestamp,
            lastSyncedAt: '',
            isDeleted: false,
          };
          await db.dailyUsage.upsert(record);
        } catch (err) {
          console.error('Failed to persist daily usage to local DB:', err);
        }
      })();

      // Throttled remote push
      secondsSinceLastPushRef.current += 1;
      if (secondsSinceLastPushRef.current >= REMOTE_PUSH_INTERVAL_SECS) {
        void pushToRemote();
      }
    }, 1000);

    // Push to remote immediately on page hide / unload
    const handlePageHide = () => { void pushToRemote(); };
    const handleDocVisChange = () => {
      if (document.visibilityState === 'hidden') {
        void pushToRemote();
      }
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleDocVisChange);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('visibilitychange', handleDocVisChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      clearTimeout(idleTimeoutId);
      clearInterval(intervalId);
    };
  }, [mounted]);

  // Loading / SSR safe state skeleton
  if (!mounted) {
    return (
      <Card className="glass-panel" radius="lg" padding="md">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
              }}
            >
              <IconClock size={20} />
            </div>
            <div>
              <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
                DAILY STUDY TIME
              </Text>
              <Text size="lg" fw={800} style={{ fontFamily: 'var(--font-title)' }}>
                --
              </Text>
            </div>
          </Group>
        </Group>
      </Card>
    );
  }

  return (
    <Card className="glass-panel" radius="lg" padding="md">
      <Group justify="space-between" align="center" wrap="nowrap">
        <Group gap="sm">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
            }}
          >
            <IconClock size={20} />
          </div>
          <div>
            <Text size="xs" fw={700} c="dimmed" style={{ letterSpacing: '0.05em' }}>
              DAILY STUDY TIME
            </Text>
            <Text
              size="lg"
              fw={800}
              style={{
                fontFamily: 'var(--font-title)',
                color: isActive ? '#6366f1' : 'var(--text-secondary)',
                transition: 'color 0.3s ease',
              }}
            >
              {formatDuration(secondsToday)}
            </Text>
          </div>
        </Group>

        <Tooltip label={isActive ? 'Timer is active' : 'Paused (idle or tab in background)'}>
          <Badge
            color={isActive ? 'teal' : 'gray'}
            variant="light"
            radius="md"
            leftSection={
              <span
                className={isActive ? 'timer-pulse-dot' : undefined}
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isActive ? '#0ca678' : '#868e96',
                  marginRight: '2px',
                }}
              />
            }
          >
            {isActive ? 'Active' : 'Idle (Paused)'}
          </Badge>
        </Tooltip>
      </Group>
    </Card>
  );
}
