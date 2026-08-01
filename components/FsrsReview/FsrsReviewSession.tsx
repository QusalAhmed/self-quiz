'use client';

import { Container } from '@mantine/core';
import React, { useEffect } from 'react';
import type { FsrsRating, FsrsRecord } from '@/lib/fsrs';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  answerCard,
  loadDeck,
  resetSession,
  revealAnswer,
  selectCardCounts,
  selectCurrentCard,
  selectCurrentIntervals,
  selectFsrsState,
  selectIsDeckComplete,
  syncFsrsReviewLog,
  tickTimer,
} from '@/lib/redux/slices/fsrsSlice';
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
  const { newCount, learningCount, reviewCount } = useAppSelector(selectCardCounts);
  const { reviewLogsCount } = useAppSelector(selectFsrsState);

  // 1. Load initial deck into Redux client state
  useEffect(() => {
    if (initialDeck && initialDeck.length > 0) {
      dispatch(loadDeck(initialDeck));
    }
  }, [initialDeck, dispatch]);

  // 2. Real-Time Due Timer: Client-side ticker running every 1 second.
  // When a card's due timestamp <= current time (e.g. 1-minute learning step),
  // automatically adds it to the current queue without requiring a page reload!
  useEffect(() => {
    const timerId = setInterval(() => {
      dispatch(tickTimer(new Date().toISOString()));
    }, 1000);

    return () => clearInterval(timerId);
  }, [dispatch]);

  // Handle rating a card
  const handleRate = (rating: FsrsRating) => {
    if (!currentCard) return;

    const cardId = currentCard.id;
    // Optimistic Local State Update (0ms latency, no page refresh!)
    dispatch(answerCard({ cardId, rating }));

    // Background Sync: Sends updated review log asynchronously to backend API
    dispatch(syncFsrsReviewLog(currentCard));
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
        />
      ) : (
        <FsrsCardViewer
          card={currentCard}
          isRevealed={isRevealed}
          intervals={currentIntervals}
          newCount={newCount}
          learningCount={learningCount}
          reviewCount={reviewCount}
          onReveal={handleReveal}
          onRate={handleRate}
          onPronounce={onPronounceWord}
        />
      )}
    </Container>
  );
}
