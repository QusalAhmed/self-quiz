'use client';

import { Badge, Card, Group, Text, Tooltip } from '@mantine/core';
import { IconClock } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { getDatabase, type DailyUsageRecord } from '@/lib/db';

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

// How often (in seconds) we persist local usage to RxDB (which triggers remote sync)
const SAVE_INTERVAL_SECS = 30;

export function DailyUsageTimer() {
  const [mounted, setMounted] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [secondsToday, setSecondsToday] = useState(0);

  // Track active date to handle midnight rollover cleanly
  const currentDateRef = useRef(getTodayDateString());
  const deviceIdRef = useRef('');
  const localSecondsRef = useRef(0); // in-memory seconds for THIS device today
  const lastSavedSecondsRef = useRef(0); // last seconds value persisted to DB
  const allDeviceSecondsRef = useRef<Map<string, number>>(new Map()); // all devices today
  const secondsSinceLastSaveRef = useRef(0);
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Helper to persist in-memory usage to local RxDB (which triggers replication)
  const flushUsageToDb = async () => {
    const deviceId = deviceIdRef.current;
    if (!deviceId) return;
    const today = currentDateRef.current;
    const recordId = `${today}:${deviceId}`;
    const currentSecs = localSecondsRef.current;

    // Skip if nothing new to save
    if (currentSecs === lastSavedSecondsRef.current) {
      return;
    }
    lastSavedSecondsRef.current = currentSecs;

    try {
      const db = await getDatabase();
      const timestamp = new Date().toISOString();
      const record: DailyUsageRecord = {
        id: recordId,
        date: today,
        deviceId,
        seconds: currentSecs,
        updatedAt: timestamp,
        lastSyncedAt: '',
        isDeleted: false,
      };
      await db.dailyUsage.upsert(record);
    } catch (err) {
      console.error('Failed to save daily usage to local DB:', err);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to load and subscribe to RxDB dailyUsage for a specific date string
  const setupSubscriptionForDate = async (targetDate: string, deviceId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    try {
      const db = await getDatabase();
      const todayQuery = db.dailyUsage.find({
        selector: { date: targetDate, isDeleted: { $ne: true } },
      });

      subscriptionRef.current = todayQuery.$.subscribe((docs) => {
        const deviceMap = new Map<string, number>();
        for (const doc of docs) {
          const rec = doc.toJSON() as DailyUsageRecord;
          if (rec.date === targetDate && !rec.isDeleted) {
            deviceMap.set(rec.deviceId, rec.seconds);
          }
        }
        allDeviceSecondsRef.current = deviceMap;

        // Keep the local count as the maximum of stored and in-flight in-memory seconds
        const storedLocalSecs = deviceMap.get(deviceId) ?? 0;
        localSecondsRef.current = Math.max(localSecondsRef.current, storedLocalSecs);
        lastSavedSecondsRef.current = Math.max(lastSavedSecondsRef.current, storedLocalSecs);

        // Display is the sum of other devices + current local seconds
        let total = 0;
        for (const [dId, s] of deviceMap.entries()) {
          total += dId === deviceId ? localSecondsRef.current : s;
        }
        if (!deviceMap.has(deviceId)) {
          total += localSecondsRef.current;
        }
        setSecondsToday(total);
      });
    } catch (err) {
      console.error('Failed to subscribe to daily usage RxDB query:', err);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    const deviceId = getOrCreateDeviceId();
    deviceIdRef.current = deviceId;
    const today = getTodayDateString();
    currentDateRef.current = today;

    void setupSubscriptionForDate(today, deviceId);

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
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
      if (!currentlyActive) {
        // Save immediately when switching from active to idle/hidden/blurred
        void flushUsageToDb();
      }
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

    const handleActivity = () => {
      resetIdleTimeout();
    };
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === 'visible';
      if (isVisible) {
        resetIdleTimeout();
      }
      checkState();
    };
    const handleFocus = () => {
      isFocused = true;
      resetIdleTimeout();
      checkState();
    };
    const handleBlur = () => {
      isFocused = false;
      checkState();
    };

    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'click', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Timer interval: updates UI every 1s in memory, throttles DB saves to every SAVE_INTERVAL_SECS
    const intervalId = setInterval(() => {
      const deviceId = deviceIdRef.current;
      if (!deviceId) return;

      const nowToday = getTodayDateString();

      // MIDNIGHT ROLLOVER CHECK: If date changed (e.g. 11:59:59 PM -> 12:00:00 AM)
      if (nowToday !== currentDateRef.current) {
        console.log(
          `Midnight rollover detected: Resetting study timer from ${currentDateRef.current} to ${nowToday}`
        );

        // 1. Flush previous day's final record
        void flushUsageToDb();

        // 2. Update active date ref and reset local counts for the new day
        currentDateRef.current = nowToday;
        localSecondsRef.current = 0;
        lastSavedSecondsRef.current = 0;
        secondsSinceLastSaveRef.current = 0;
        allDeviceSecondsRef.current.clear();
        allDeviceSecondsRef.current.set(deviceId, 0);

        // 3. Reset UI display
        setSecondsToday(0);

        // 4. Switch RxDB live subscription to the new date
        void setupSubscriptionForDate(nowToday, deviceId);
        return;
      }

      const currentlyActive = !isUserIdle && isVisible && isFocused;
      if (!currentlyActive) return;

      const nextSecs = localSecondsRef.current + 1;
      localSecondsRef.current = nextSecs;

      // Update in-memory map & UI display immediately
      allDeviceSecondsRef.current.set(deviceId, nextSecs);
      let total = 0;
      for (const s of allDeviceSecondsRef.current.values()) {
        total += s;
      }
      setSecondsToday(total);

      // Throttled persistence to DB / remote replication (every SAVE_INTERVAL_SECS)
      secondsSinceLastSaveRef.current += 1;
      if (secondsSinceLastSaveRef.current >= SAVE_INTERVAL_SECS) {
        secondsSinceLastSaveRef.current = 0;
        void flushUsageToDb();
      }
    }, 1000);

    // Save immediately on page hide / unload
    const handlePageHide = () => {
      void flushUsageToDb();
    };
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      // Flush any unsaved seconds on unmount
      void flushUsageToDb();

      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
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
