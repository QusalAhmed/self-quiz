import React from 'react';
import type { UnifiedSyncState } from '@/lib/replication';
import { fireEvent, render, screen } from '@/test-utils';
import { CloudSyncCard } from './CloudSyncCard';

describe('CloudSyncCard component', () => {
  const defaultProps = {
    unsyncedCount: 0,
    onlineStatus: true,
    isSyncing: false,
    onSyncNow: jest.fn(),
    onTogglePause: jest.fn(),
    onVerifyInSync: jest.fn().mockResolvedValue(true),
    onSyncCollection: jest.fn(),
    onClearActivities: jest.fn(),
    collectionCounts: {
      words: 10,
      groups: 2,
      missedWords: 0,
      wordFamilies: 5,
      fsrsRecords: 8,
      reviewLogs: 20,
    },
  };

  it('renders CLOUD SYNC card with in-sync status when online', () => {
    render(<CloudSyncCard {...defaultProps} />);

    expect(screen.getByText('CLOUD SYNC')).toBeInTheDocument();
    expect(screen.getByText('Fully Synced')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /details/i })).toBeInTheDocument();
  });

  it('renders offline mode when onlineStatus is false', () => {
    render(<CloudSyncCard {...defaultProps} onlineStatus={false} />);

    expect(screen.getByText('CLOUD SYNC')).toBeInTheDocument();
    expect(screen.getByText('Offline Mode')).toBeInTheDocument();
  });

  it('renders pending count badge and status when unsyncedCount > 0', () => {
    render(<CloudSyncCard {...defaultProps} unsyncedCount={4} />);

    expect(screen.getByText('4 Pending')).toBeInTheDocument();
  });

  it('renders session traffic badges when data has been transferred', () => {
    const syncState: UnifiedSyncState = {
      status: 'in_sync',
      isActive: false,
      isPaused: false,
      error: null,
      lastSyncedAt: new Date().toISOString(),
      pendingCount: 0,
      totalSent: 12,
      totalReceived: 34,
      isInitialSyncComplete: true,
      collections: {} as any,
      activities: [],
    };

    render(<CloudSyncCard {...defaultProps} syncState={syncState} />);

    expect(screen.getByText(/↑ 12/)).toBeInTheDocument();
    expect(screen.getByText(/↓ 34/)).toBeInTheDocument();
  });

  it('triggers onSyncNow when sync button is clicked', () => {
    const onSyncNow = jest.fn();
    render(<CloudSyncCard {...defaultProps} onSyncNow={onSyncNow} />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    expect(onSyncNow).toHaveBeenCalledTimes(1);
  });

  it('opens RxDB Cloud Sync Hub modal on Details click and displays tabs', () => {
    render(<CloudSyncCard {...defaultProps} />);

    const detailsButton = screen.getByRole('button', { name: /details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText('RxDB Cloud Sync Hub')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /collections/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /activity/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /replication info/i })).toBeInTheDocument();
  });
});
