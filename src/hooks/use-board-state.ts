"use client";

import * as React from "react";

/* ─── Types ─── */

export interface CardPosition {
  x: number;
  y: number;
  pinned: boolean;
}

export interface BoardZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface BoardState {
  positions: Map<string, CardPosition>;
  zones: BoardZone[];
  viewport: ViewportState;
}

interface BoardActions {
  setCardPosition: (id: string, x: number, y: number) => void;
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
  getCardPosition: (id: string) => CardPosition | undefined;

  addZone: (zone: BoardZone) => void;
  updateZone: (id: string, updates: Partial<Omit<BoardZone, "id">>) => void;
  removeZone: (id: string) => void;

  setViewport: (viewport: Partial<ViewportState>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: (cardIds: string[]) => void;

  runAutoLayout: (
    unitIds: string[],
    relations: { sourceId: string; targetId: string; strength: number }[],
  ) => void;
  snapToRelation: (
    unitIds: string[],
    relations: { sourceId: string; targetId: string; strength: number }[],
  ) => void;

  saveToSession: (contextId: string) => void;
  loadFromSession: (contextId: string) => boolean;
  clearPositions: () => void;
}

export type UseBoardStateReturn = BoardState & BoardActions;

/* ─── Constants ─── */

const MIN_SCALE = 0.15;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;
const CARD_WIDTH = 240;
const CARD_HEIGHT = 160;
const SESSION_KEY_PREFIX = "flowmind-board-";

/* ─── Simple force layout ─── */

function forceLayout(
  unitIds: string[],
  relations: { sourceId: string; targetId: string; strength: number }[],
  existingPositions: Map<string, CardPosition>,
  respectPinned: boolean,
): Map<string, CardPosition> {
  const positions = new Map<string, CardPosition>();

  // Initialize positions: keep existing or assign grid positions
  const cols = Math.max(1, Math.ceil(Math.sqrt(unitIds.length)));
  unitIds.forEach((id, i) => {
    const existing = existingPositions.get(id);
    if (existing && respectPinned && existing.pinned) {
      positions.set(id, { ...existing });
    } else if (existing) {
      positions.set(id, { ...existing });
    } else {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions.set(id, {
        x: col * (CARD_WIDTH + 60) + 100,
        y: row * (CARD_HEIGHT + 60) + 100,
        pinned: false,
      });
    }
  });

  // Build adjacency
  const idSet = new Set(unitIds);
  const validRelations = relations.filter(
    (r) => idSet.has(r.sourceId) && idSet.has(r.targetId),
  );

  // Run simple force iterations
  const iterations = 80;
  const repulsion = 8000;
  const attraction = 0.005;
  const damping = 0.9;

  const velocities = new Map<string, { vx: number; vy: number }>();
  for (const id of unitIds) {
    velocities.set(id, { vx: 0, vy: 0 });
  }

  for (let iter = 0; iter < iterations; iter++) {
    const temperature = 1 - iter / iterations;

    // Repulsion between all pairs
    for (let i = 0; i < unitIds.length; i++) {
      for (let j = i + 1; j < unitIds.length; j++) {
        const a = unitIds[i]!;
        const b = unitIds[j]!;
        const pa = positions.get(a)!;
        const pb = positions.get(b)!;

        let dx = pa.x - pb.x;
        let dy = pa.y - pb.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = (repulsion * temperature) / (dist * dist);
        dx = (dx / dist) * force;
        dy = (dy / dist) * force;

        if (!(respectPinned && pa.pinned)) {
          const va = velocities.get(a)!;
          va.vx += dx;
          va.vy += dy;
        }
        if (!(respectPinned && pb.pinned)) {
          const vb = velocities.get(b)!;
          vb.vx -= dx;
          vb.vy -= dy;
        }
      }
    }

    // Attraction along edges
    for (const rel of validRelations) {
      const pa = positions.get(rel.sourceId)!;
      const pb = positions.get(rel.targetId)!;
      if (!pa || !pb) continue;

      let dx = pb.x - pa.x;
      let dy = pb.y - pa.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = attraction * dist * rel.strength * temperature;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;

      if (!(respectPinned && pa.pinned)) {
        const va = velocities.get(rel.sourceId)!;
        va.vx += dx;
        va.vy += dy;
      }
      if (!(respectPinned && pb.pinned)) {
        const vb = velocities.get(rel.targetId)!;
        vb.vx -= dx;
        vb.vy -= dy;
      }
    }

    // Apply velocities
    for (const id of unitIds) {
      const pos = positions.get(id)!;
      if (respectPinned && pos.pinned) continue;

      const vel = velocities.get(id)!;
      vel.vx *= damping;
      vel.vy *= damping;

      pos.x += vel.vx;
      pos.y += vel.vy;
    }
  }

  return positions;
}

/* ─── Hook ─── */

export function useBoardState(): UseBoardStateReturn {
  const [positions, setPositions] = React.useState<Map<string, CardPosition>>(
    () => new Map(),
  );
  const [zones, setZones] = React.useState<BoardZone[]>([]);
  const [viewport, setViewportState] = React.useState<ViewportState>({
    x: 0,
    y: 0,
    scale: 1,
  });

  /* ─── Card positions ─── */

  const setCardPosition = React.useCallback((id: string, x: number, y: number) => {
    setPositions((prev) => {
      const next = new Map(prev);
      const existing = prev.get(id);
      next.set(id, { x, y, pinned: existing?.pinned ?? false });
      return next;
    });
  }, []);

  const togglePin = React.useCallback((id: string) => {
    setPositions((prev) => {
      const next = new Map(prev);
      const existing = prev.get(id);
      if (existing) {
        next.set(id, { ...existing, pinned: !existing.pinned });
      }
      return next;
    });
  }, []);

  const isPinned = React.useCallback(
    (id: string) => positions.get(id)?.pinned ?? false,
    [positions],
  );

  const getCardPosition = React.useCallback(
    (id: string) => positions.get(id),
    [positions],
  );

  /* ─── Zones ─── */

  const addZone = React.useCallback((zone: BoardZone) => {
    setZones((prev) => [...prev, zone]);
  }, []);

  const updateZone = React.useCallback(
    (id: string, updates: Partial<Omit<BoardZone, "id">>) => {
      setZones((prev) =>
        prev.map((z) => (z.id === id ? { ...z, ...updates } : z)),
      );
    },
    [],
  );

  const removeZone = React.useCallback((id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
  }, []);

  /* ─── Viewport ─── */

  const setViewport = React.useCallback((updates: Partial<ViewportState>) => {
    setViewportState((prev) => {
      const next = { ...prev, ...updates };
      next.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next.scale));
      return next;
    });
  }, []);

  const zoomIn = React.useCallback(() => {
    setViewportState((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP),
    }));
  }, []);

  const zoomOut = React.useCallback(() => {
    setViewportState((prev) => ({
      ...prev,
      scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP),
    }));
  }, []);

  const fitToScreen = React.useCallback(
    (cardIds: string[]) => {
      if (cardIds.length === 0) return;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const id of cardIds) {
        const pos = positions.get(id);
        if (!pos) continue;
        if (pos.x < minX) minX = pos.x;
        if (pos.y < minY) minY = pos.y;
        if (pos.x + CARD_WIDTH > maxX) maxX = pos.x + CARD_WIDTH;
        if (pos.y + CARD_HEIGHT > maxY) maxY = pos.y + CARD_HEIGHT;
      }

      if (!isFinite(minX)) return;

      const padding = 80;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;

      // Assume a reasonable viewport size; the canvas component handles the actual centering
      const vw = typeof window !== "undefined" ? window.innerWidth * 0.7 : 1000;
      const vh = typeof window !== "undefined" ? window.innerHeight * 0.8 : 700;

      const scale = Math.min(vw / contentWidth, vh / contentHeight, 1.5);
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      setViewportState({
        x: vw / 2 - cx * scale,
        y: vh / 2 - cy * scale,
        scale,
      });
    },
    [positions],
  );

  /* ─── Layout algorithms ─── */

  const runAutoLayout = React.useCallback(
    (
      unitIds: string[],
      relations: { sourceId: string; targetId: string; strength: number }[],
    ) => {
      const newPositions = forceLayout(unitIds, relations, positions, true);
      setPositions(newPositions);
    },
    [positions],
  );

  const snapToRelation = React.useCallback(
    (
      unitIds: string[],
      relations: { sourceId: string; targetId: string; strength: number }[],
    ) => {
      const newPositions = forceLayout(
        unitIds,
        relations,
        new Map(),
        true,
      );
      // Preserve pinned positions from existing state
      setPositions((prev) => {
        const merged = new Map(newPositions);
        for (const [id, pos] of prev) {
          if (pos.pinned) {
            merged.set(id, pos);
          }
        }
        return merged;
      });
    },
    [],
  );

  /* ─── Session persistence ─── */

  const saveToSession = React.useCallback(
    (contextId: string) => {
      try {
        const key = SESSION_KEY_PREFIX + contextId;
        const data = {
          positions: Array.from(positions.entries()),
          zones,
          viewport,
        };
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch {
        // sessionStorage quota exceeded or unavailable
      }
    },
    [positions, zones, viewport],
  );

  const loadFromSession = React.useCallback((contextId: string): boolean => {
    try {
      const key = SESSION_KEY_PREFIX + contextId;
      const raw = sessionStorage.getItem(key);
      if (!raw) return false;

      const data = JSON.parse(raw) as {
        positions: [string, CardPosition][];
        zones: BoardZone[];
        viewport: ViewportState;
      };

      setPositions(new Map(data.positions));
      setZones(data.zones);
      setViewportState(data.viewport);
      return true;
    } catch {
      return false;
    }
  }, []);

  const clearPositions = React.useCallback(() => {
    setPositions(new Map());
  }, []);

  return {
    positions,
    zones,
    viewport,

    setCardPosition,
    togglePin,
    isPinned,
    getCardPosition,

    addZone,
    updateZone,
    removeZone,

    setViewport,
    zoomIn,
    zoomOut,
    fitToScreen,

    runAutoLayout,
    snapToRelation,

    saveToSession,
    loadFromSession,
    clearPositions,
  };
}
