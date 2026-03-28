"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  computeCardBoundaries,
  type PathUnit,
  type PathRelation,
  type CardGroup,
} from "~/lib/card-boundary-algorithm";
import type { ExpertiseLevel } from "~/stores/theme-store";

/* ─── Types ─── */

export interface Bookmark {
  cardId: string;
  cardIndex: number;
  createdAt: number;
  label?: string;
}

interface FlowReadingState {
  cards: CardGroup[];
  currentCardIndex: number;
  bookmarks: Bookmark[];
  readCards: Set<number>;
}

export interface UseFlowReadingReturn {
  cards: CardGroup[];
  currentCard: CardGroup | null;
  currentCardIndex: number;
  totalCards: number;
  /** 0 to 1 progress value */
  progress: number;
  bookmarks: Bookmark[];
  readCards: Set<number>;
  isCardBookmarked: (cardIndex: number) => boolean;
  goToCard: (index: number) => void;
  goToNextCard: () => void;
  goToPreviousCard: () => void;
  toggleBookmark: (cardIndex: number, label?: string) => void;
  recompute: (
    units: PathUnit[],
    relations: PathRelation[],
    expertiseLevel: ExpertiseLevel,
  ) => void;
}

/* ─── LocalStorage helpers ─── */

const BOOKMARKS_KEY = "flowmind-reading-bookmarks";

function loadBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

/* ─── Hook ─── */

export function useFlowReading(
  initialUnits: PathUnit[] = [],
  initialRelations: PathRelation[] = [],
  expertiseLevel: ExpertiseLevel = "intermediate",
): UseFlowReadingReturn {
  const [state, setState] = useState<FlowReadingState>(() => {
    const cards = computeCardBoundaries(
      initialUnits,
      initialRelations,
      expertiseLevel,
    );
    return {
      cards,
      currentCardIndex: cards.length > 0 ? 0 : -1,
      bookmarks: loadBookmarks(),
      readCards: new Set(cards.length > 0 ? [0] : []),
    };
  });

  // Recompute cards when inputs change
  const recompute = useCallback(
    (
      units: PathUnit[],
      relations: PathRelation[],
      level: ExpertiseLevel,
    ) => {
      const cards = computeCardBoundaries(units, relations, level);
      setState((s) => ({
        ...s,
        cards,
        currentCardIndex: cards.length > 0 ? 0 : -1,
        readCards: new Set(cards.length > 0 ? [0] : []),
      }));
    },
    [],
  );

  const goToCard = useCallback((index: number) => {
    setState((s) => {
      if (index < 0 || index >= s.cards.length) return s;
      const nextRead = new Set(s.readCards);
      nextRead.add(index);
      return { ...s, currentCardIndex: index, readCards: nextRead };
    });
  }, []);

  const goToNextCard = useCallback(() => {
    setState((s) => {
      if (s.currentCardIndex >= s.cards.length - 1) return s;
      const next = s.currentCardIndex + 1;
      const nextRead = new Set(s.readCards);
      nextRead.add(next);
      return { ...s, currentCardIndex: next, readCards: nextRead };
    });
  }, []);

  const goToPreviousCard = useCallback(() => {
    setState((s) => {
      if (s.currentCardIndex <= 0) return s;
      return { ...s, currentCardIndex: s.currentCardIndex - 1 };
    });
  }, []);

  const toggleBookmark = useCallback((cardIndex: number, label?: string) => {
    setState((s) => {
      const card = s.cards[cardIndex];
      if (!card) return s;

      const existing = s.bookmarks.findIndex(
        (b) => b.cardIndex === cardIndex,
      );

      let nextBookmarks: Bookmark[];
      if (existing >= 0) {
        nextBookmarks = s.bookmarks.filter((_, i) => i !== existing);
      } else {
        nextBookmarks = [
          ...s.bookmarks,
          {
            cardId: card.id,
            cardIndex,
            createdAt: Date.now(),
            label,
          },
        ];
      }

      saveBookmarks(nextBookmarks);
      return { ...s, bookmarks: nextBookmarks };
    });
  }, []);

  const isCardBookmarked = useCallback(
    (cardIndex: number) =>
      state.bookmarks.some((b) => b.cardIndex === cardIndex),
    [state.bookmarks],
  );

  const currentCard = useMemo(
    () => state.cards[state.currentCardIndex] ?? null,
    [state.cards, state.currentCardIndex],
  );

  const progress = useMemo(() => {
    if (state.cards.length === 0) return 0;
    return state.readCards.size / state.cards.length;
  }, [state.cards.length, state.readCards.size]);

  return {
    cards: state.cards,
    currentCard,
    currentCardIndex: state.currentCardIndex,
    totalCards: state.cards.length,
    progress,
    bookmarks: state.bookmarks,
    readCards: state.readCards,
    isCardBookmarked,
    goToCard,
    goToNextCard,
    goToPreviousCard,
    toggleBookmark,
    recompute,
  };
}
