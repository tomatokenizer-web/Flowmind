"use client";

import * as React from "react";
import { cn } from "~/lib/utils";
import type { GraphNode as GraphNodeType, GraphViewMode, TooltipTarget } from "./graph-types";
import {
  UNIT_TYPE_ACCENT_COLORS,
  UNIT_TYPE_BG_COLORS,
  DEFAULT_NODE_COLOR,
} from "./graph-types";

/* ─── Props ─── */

interface GraphNodeProps {
  node: GraphNodeType;
  viewMode: GraphViewMode;
  isActive: boolean;
  onSetActive: (id: string) => void;
  onDoubleClick: (id: string) => void;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onShowTooltip: (target: TooltipTarget) => void;
  onHideTooltip: () => void;
}

/* ─── Component ─── */

export const GraphNodeComponent = React.memo(function GraphNodeComponent({
  node,
  viewMode,
  isActive,
  onSetActive,
  onDoubleClick,
  onDragStart,
  onShowTooltip,
  onHideTooltip,
}: GraphNodeProps) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;
  const accentColor = UNIT_TYPE_ACCENT_COLORS[node.primaryType] ?? DEFAULT_NODE_COLOR;
  const bgColor = UNIT_TYPE_BG_COLORS[node.primaryType] ?? "var(--bg-secondary)";

  // Node radius based on ThoughtRank (global: 8-12, local: 16-24)
  const baseMin = viewMode === "global" ? 8 : 16;
  const baseMax = viewMode === "global" ? 12 : 24;
  const radius = baseMin + node.thoughtRank * (baseMax - baseMin);

  // Opacity by lifecycle and archived state
  const opacity = node.isArchived ? 0.3 : node.lifecycle === "draft" ? 0.6 : 0.85 + node.thoughtRank * 0.15;

  const handleMouseEnter = React.useCallback(
    (e: React.MouseEvent) => {
      onShowTooltip({ kind: "node", node, x: e.clientX, y: e.clientY });
    },
    [node, onShowTooltip],
  );

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      onShowTooltip({ kind: "node", node, x: e.clientX, y: e.clientY });
    },
    [node, onShowTooltip],
  );

  const handleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSetActive(node.id);
    },
    [node.id, onSetActive],
  );

  const handleDoubleClick = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick(node.id);
    },
    [node.id, onDoubleClick],
  );

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        onDragStart(node.id, e);
      }
    },
    [node.id, onDragStart],
  );

  if (viewMode === "local") {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        style={{ cursor: "grab", willChange: "transform" }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={onHideTooltip}
        role="button"
        tabIndex={0}
        aria-label={`${node.primaryType} unit: ${node.content.slice(0, 40)}`}
      >
        {/* Card background */}
        <rect
          x={-80}
          y={-32}
          width={160}
          height={64}
          rx={8}
          fill={bgColor}
          stroke={isActive ? accentColor : "var(--border-default)"}
          strokeWidth={isActive ? 2 : 1}
          opacity={opacity}
        />

        {/* Active ring */}
        {isActive && (
          <rect
            x={-84}
            y={-36}
            width={168}
            height={72}
            rx={10}
            fill="none"
            stroke={accentColor}
            strokeWidth={1.5}
            opacity={0.5}
          >
            <animate
              attributeName="opacity"
              values="0.5;0.2;0.5"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Type indicator dot */}
        <circle
          cx={-66}
          cy={-18}
          r={4}
          fill={accentColor}
        />

        {/* Type label */}
        <text
          x={-58}
          y={-14}
          fontSize={9}
          fontWeight={600}
          fill={accentColor}
          textAnchor="start"
          style={{ textTransform: "capitalize", pointerEvents: "none" }}
        >
          {node.primaryType}
        </text>

        {/* Content preview */}
        <text
          x={-70}
          y={4}
          fontSize={11}
          fill="var(--text-primary)"
          textAnchor="start"
          style={{ pointerEvents: "none" }}
        >
          {node.content.length > 30
            ? node.content.slice(0, 28) + "\u2026"
            : node.content}
        </text>

        {/* Relation count */}
        <text
          x={70}
          y={22}
          fontSize={9}
          fill="var(--text-tertiary)"
          textAnchor="end"
          style={{ pointerEvents: "none" }}
        >
          {node.relationCount} rel
        </text>
      </g>
    );
  }

  // Global view — small circle
  return (
    <g
      transform={`translate(${x}, ${y})`}
      style={{ cursor: "grab", willChange: "transform" }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={onHideTooltip}
      role="button"
      tabIndex={0}
      aria-label={`${node.primaryType} unit: ${node.content.slice(0, 40)}`}
    >
      {/* Glow effect */}
      <circle
        r={radius + 3}
        fill="none"
        stroke={accentColor}
        strokeWidth={0.5}
        opacity={0.15 + node.thoughtRank * 0.2}
      />

      {/* Main dot */}
      <circle
        r={radius}
        fill={accentColor}
        opacity={opacity}
      />

      {/* Active selection ring — pulsing */}
      {isActive && (
        <circle
          r={radius + 5}
          fill="none"
          stroke={accentColor}
          strokeWidth={2}
          opacity={0.7}
        >
          <animate
            attributeName="r"
            values={`${radius + 4};${radius + 7};${radius + 4}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.7;0.3;0.7"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Evergreen indicator */}
      {node.isEvergreen && (
        <circle
          cx={radius * 0.7}
          cy={-radius * 0.7}
          r={2.5}
          fill="var(--accent-success)"
        />
      )}
    </g>
  );
});

GraphNodeComponent.displayName = "GraphNode";
