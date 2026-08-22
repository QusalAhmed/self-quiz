'use client';

import { Container } from '@mantine/core';
import React, { useEffect, useState } from 'react';
import { getDatabase, type WordFamilyMemberRecord } from '@/lib/db';
import { computeFsrs, createReviewLogEvent, type FsrsRating, type FsrsRecord } from '@/lib/fsrs';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  answerCard,
  loadDeck,
  resetSession,
  revealAnswer,
  selectCanUndo,
  selectCardCounts,
  selectCurrentCard,
  selectCurrentIntervals,
  selectFsrsState,
  selectIsDeckComplete,
  selectLastHistoryCardBefore,
  syncFsrsReviewLog,
  tickTimer,
  undoAnswer,
} from '@/lib/redux/slices/fsrsSlice';
import { notifyQuizCompleted } from '@/lib/system-notifications';
import { FsrsCardViewer } from './FsrsCardViewer';
import { FsrsCompletionState } from './FsrsCompletionState';

export type FsrsReviewSessionProps = {
  /** Array of initial FSRS records to review */
  initialDeck: FsrsRecord[];
  /** Optional speech synthesis handler for word pronunciation */
  onPronounceWord?: (text: string) => void;
  /** Optional callback when returning to library */
  onReturnToLibrary?: () => void;
};

export function FsrsReviewSession({
  initialDeck,
  onPronounceWord,
  onReturnToLibrary,
}: FsrsReviewSessionProps) {
  const dispatch = useAppDispatch();
  const currentCard = useAppSelector(selectCurrentCard);
  const currentIntervals = useAppSelector(selectCurrentIntervals);
  const isRevealed = useAppSelector((state) => state.fsrs.isRevealed);
  const isDeckComplete = useAppSelector(selectIsDeckComplete);
  const canUndo = useAppSelector(selectCanUndo);
  const lastHistoryCardBefore = useAppSelector(selectLastHistoryCardBefore);
  const { newCount, learningCount, reviewCount } = useAppSelector(selectCardCounts);
  const { reviewLogsCount } = useAppSelector(selectFsrsState);
  const [wordFamilies, setWordFamilies] = useState<Record<string, WordFamilyMemberRecord[]>>({});

  const cardPresentedAtRef = React.useRef<number>(Date.now());

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    void getDatabase().then((db) => {
      if (!isMounted) {
        return;
      }
      subscription = db.wordFamilies
        .find({ selector: { isDeleted: false } })
        .$.subscribe((docs) => {
          if (!isMounted) {
            return;
          }
          const map: Record<string, WordFamilyMemberRecord[]> = {};
          for (const doc of docs) {
            const member = doc.toJSON() as WordFamilyMemberRecord;
            if (!map[member.wordId]) {
              map[member.wordId] = [];
            }
            map[member.wordId].push(member);
          }
          setWordFamilies(map);
        });
    });

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // 1. Load initial deck into Redux client state
  useEffect(() => {
    if (initialDeck && initialDeck.length > 0) {
      dispatch(loadDeck(initialDeck));
    }
  }, [initialDeck, dispatch]);

  // Track card presentation time
  useEffect(() => {
    cardPresentedAtRef.current = Date.now();
  }, [currentCard?.id]);

  // 2. Real-Time Due Timer: Client-side ticker running every 1 second.
  // When a card's due timestamp <= current time (e.g. 1-minute learning step),
  // automatically adds it to the current queue without requiring a page reload!
  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch(tickTimer(new Date().toISOString()));
    }, 1000);

    return () => {
      clearInterval(timerId);
    };
  }, [dispatch]);

  const completionNotifiedRef = React.useRef(false);
  useEffect(() => {
    if (isDeckComplete && reviewLogsCount > 0 && !completionNotifiedRef.current) {
      completionNotifiedRef.current = true;
      void notifyQuizCompleted({
        modeName: 'FSRS Review Session',
        totalCards: reviewLogsCount,
      });
    } else if (!isDeckComplete) {
      completionNotifiedRef.current = false;
    }
  }, [isDeckComplete, reviewLogsCount]);

  // Handle rating a card

  const handleRate = (rating: FsrsRating) => {
    if (!currentCard) {
      return;
    }

    const cardId = currentCard.id;
    // Compute the post-rating updated card locally (same computation the reducer applies)
    // so we can sync the correct updated state to the server.
    const now = new Date();
    const durationMs = Math.max(0, Date.now() - cardPresentedAtRef.current);
    const updatedCard = computeFsrs(currentCard, rating, now);

    // Optimistic Local State Update (0ms latency, no page refresh!)
    dispatch(answerCard({ cardId, rating, nowIso: now.toISOString() }));

    // Create and persist historical review log in RxDB
    const reviewLog = createReviewLogEvent({
      currentState: currentCard,
      updatedCard,
      rating,
      durationMs,
      now,
    });

    void import('@/lib/db')
      .then(async ({ getDatabase }) => {
        const db = await getDatabase();
        await db.reviewLogs.insert(reviewLog);
        await db.fsrsRecords.upsert(updatedCard);
      })
      .catch((err) => {
        console.error('Failed to persist review log in FsrsReviewSession:', err);
      });

    // Background Sync: Sends the updated (post-rating) card to the backend API.
    dispatch(syncFsrsReviewLog(updatedCard));
  };

  const handleUndo = () => {
    if (!canUndo || !lastHistoryCardBefore) {
      return;
    }
    const cardToRestore = lastHistoryCardBefore;
    dispatch(undoAnswer());
    dispatch(syncFsrsReviewLog(cardToRestore));
  };

  const handleReveal = () => {
    dispatch(revealAnswer());
  };

  const handleRestart = () => {
    dispatch(resetSession());
  };

  return (
    <Container size="sm" py="md">
      {isDeckComplete || !currentCard ? (
        <FsrsCompletionState
          reviewedCount={reviewLogsCount}
          onRestartSession={handleRestart}
          onReturnToLibrary={onReturnToLibrary}
          canUndo={canUndo}
          onUndo={handleUndo}
        />
      ) : (
        <FsrsCardViewer
          card={currentCard}
          isRevealed={isRevealed}
          intervals={currentIntervals}
          newCount={newCount}
          learningCount={learningCount}
          reviewCount={reviewCount}
          canUndo={canUndo}
          wordFamilyMembers={currentCard ? wordFamilies[currentCard.wordId] || [] : []}
          onReveal={handleReveal}
          onRate={handleRate}
          onUndo={handleUndo}
          onPronounce={onPronounceWord}
        />
      )}
    </Container>
  );
}
