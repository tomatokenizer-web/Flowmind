/**
 * Action types for the undo/redo system.
 *
 * Each action stores enough data to reverse or replay the operation.
 * Designed to be extensible for future action types (relations, context moves, etc.)
 */

// ─── Unit snapshot for restoration ──────────────────────────────────

export interface UnitSnapshot {
  id: string;
  content: string;
  unitType: string;
  lifecycle: string;
  projectId: string;
  /** Additional fields needed to fully restore a unit */
  meta?: Record<string, unknown>;
}

// ─── Action type discriminated union ────────────────────────────────

export type UndoActionType =
  | "unit.create"
  | "unit.update"
  | "unit.archive"
  | "unit.delete"
  | "unit.reorder"
  | "unit.lifecycleChange";

export interface UnitCreateAction {
  type: "unit.create";
  unitId: string;
  snapshot: UnitSnapshot;
  description: string;
}

export interface UnitUpdateAction {
  type: "unit.update";
  unitId: string;
  before: Partial<UnitSnapshot>;
  after: Partial<UnitSnapshot>;
  description: string;
}

export interface UnitArchiveAction {
  type: "unit.archive";
  unitId: string;
  previousLifecycle: string;
  snapshot: UnitSnapshot;
  description: string;
}

export interface UnitDeleteAction {
  type: "unit.delete";
  unitId: string;
  snapshot: UnitSnapshot;
  description: string;
}

export interface UnitReorderAction {
  type: "unit.reorder";
  unitId: string;
  fromIndex: number;
  toIndex: number;
  description: string;
}

export interface UnitLifecycleChangeAction {
  type: "unit.lifecycleChange";
  unitId: string;
  previousState: string;
  newState: string;
  description: string;
}

export type UndoAction =
  | UnitCreateAction
  | UnitUpdateAction
  | UnitArchiveAction
  | UnitDeleteAction
  | UnitReorderAction
  | UnitLifecycleChangeAction;

// ─── Timestamped entry for the undo stack ───────────────────────────

export interface UndoEntry {
  id: string;
  action: UndoAction;
  timestamp: number;
}

// ─── Human-readable descriptions ────────────────────────────────────

const ACTION_LABELS: Record<UndoActionType, string> = {
  "unit.create": "Unit creation",
  "unit.update": "Unit edit",
  "unit.archive": "Unit archive",
  "unit.delete": "Unit deletion",
  "unit.reorder": "Unit reorder",
  "unit.lifecycleChange": "Lifecycle change",
};

export function getActionLabel(type: UndoActionType): string {
  return ACTION_LABELS[type];
}

export function getUndoDescription(action: UndoAction): string {
  return `${getActionLabel(action.type)} undone`;
}

export function getRedoDescription(action: UndoAction): string {
  return `${getActionLabel(action.type)} redone`;
}
