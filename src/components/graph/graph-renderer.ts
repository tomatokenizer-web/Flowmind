import type { SimNode, SimLink, RenderOptions } from "./graph-types";
import {
  UNIT_TYPE_COLORS,
  RELATION_TYPE_COLORS,
  RELATION_TYPE_WEIGHT,
  WEIGHT_STROKE,
  RELATION_TYPE_CATEGORY,
  NODE_RADIUS_MIN,
  NODE_RADIUS_MAX,
  LABEL_ZOOM_THRESHOLD,
  FOCUS_RING_COLOR,
  FOCUS_RING_WIDTH,
  DIMMED_OPACITY,
} from "./graph-constants";

/**
 * Compute node radius based on relation count.
 * 0 relations = NODE_RADIUS_MIN, maxRelations = NODE_RADIUS_MAX.
 */
export function getNodeRadius(relationCount: number, maxRelations = 10): number {
  const t = Math.min(relationCount / Math.max(maxRelations, 1), 1);
  return NODE_RADIUS_MIN + t * (NODE_RADIUS_MAX - NODE_RADIUS_MIN);
}

/**
 * Darken a hex color by a given factor (0-1, where 0 = black).
 */
function darkenColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/**
 * Render one frame of the graph onto the given canvas context.
 *
 * The caller is responsible for sizing the canvas (width/height/devicePixelRatio)
 * before calling this function; the renderer only handles the drawing logic.
 */
export function renderGraph(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  nodes: SimNode[],
  links: SimLink[],
  options: RenderOptions,
): void {
  const {
    panOffset,
    zoomLevel,
    hiddenRelationTypes,
    connectedNodeIds,
    hoveredNodeId,
    focusedNodeId,
    prefersReducedMotion,
  } = options;

  const { width, height } = canvas.getBoundingClientRect();
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
  ctx.scale(zoomLevel, zoomLevel);

  const now = performance.now();
  const hId = hoveredNodeId;
  const hasHover = hId !== null;

  // Compute max relation count across all nodes for radius scaling
  const maxRelations = Math.max(1, ...nodes.map((n) => n.relationCount));

  // ── Draw links ────────────────────────────────────────────────────

  for (const link of links) {
    const source = link.source as SimNode;
    const target = link.target as SimNode;
    if (source.x == null || source.y == null || target.x == null || target.y == null)
      continue;

    // Hide edges whose relation type is deselected
    if (hiddenRelationTypes.has(link.type)) continue;

    // Hover highlight: connected edges bright, others nearly invisible
    const isConnected = !hasHover || source.id === hId || target.id === hId;

    const edgeColor = RELATION_TYPE_COLORS[link.type] ?? "rgba(156, 163, 175, 1)";

    // Weight (thickness) based on relation importance
    const weight = RELATION_TYPE_WEIGHT[link.type] ?? "medium";
    const baseLineWidth = WEIGHT_STROKE[weight]!;

    // Dash style based on purpose category
    const category = RELATION_TYPE_CATEGORY[link.type] ?? "argument";
    let lineDash: number[];
    let edgeAlpha: number;
    if (category === "argument") {
      lineDash = [];
      edgeAlpha = 0.75;
    } else if (category === "creative_research") {
      lineDash = [6, 4];
      edgeAlpha = 0.55;
    } else {
      lineDash = [2, 3];
      edgeAlpha = 0.4;
    }

    // Fade unconnected edges when hovering a node
    if (hasHover && !isConnected) {
      edgeAlpha = 0.06;
    }

    // Contradicts: animated pulsing dash
    const isContradicts = link.type === "contradicts";
    let dashOffset = 0;
    if (isContradicts && !prefersReducedMotion) {
      lineDash = [8, 5];
      dashOffset = (now / 40) % 13;
      if (isConnected) edgeAlpha = 0.85;
    }

    if (link.isLoopback) {
      const sourceRadius = getNodeRadius(source.relationCount, maxRelations);
      const loopRadius = sourceRadius * 3;
      ctx.beginPath();
      ctx.arc(source.x, source.y - loopRadius, loopRadius, 0, Math.PI * 2);
      ctx.setLineDash(lineDash.length ? lineDash : [4, 3]);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeStyle = edgeColor;
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = baseLineWidth;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;
    } else {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue; // degenerate

      // Shorten line to stop at node boundary (using per-node radius)
      const sourceRadius = getNodeRadius(source.relationCount, maxRelations);
      const targetRadius = getNodeRadius(target.relationCount, maxRelations);
      const ux = dx / dist;
      const uy = dy / dist;
      const sx = source.x + ux * sourceRadius;
      const sy = source.y + uy * sourceRadius;
      const tx = target.x - ux * (targetRadius + 6); // leave room for arrowhead
      const ty = target.y - uy * (targetRadius + 6);

      // Curved line — offset perpendicular for visual separation
      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      // Curve offset: use link index hash for consistent but varied curves
      const curveOffset = ((link.id.charCodeAt(0) % 5) - 2) * 12;
      const cpx = mx - uy * curveOffset;
      const cpy = my + ux * curveOffset;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cpx, cpy, tx, ty);
      ctx.setLineDash(lineDash);
      ctx.lineDashOffset = dashOffset;
      ctx.strokeStyle = edgeColor;
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = isConnected && hasHover ? baseLineWidth * 1.5 : baseLineWidth;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;

      // Arrowhead at target
      const arrowLen = 6 + baseLineWidth;
      const arrowAngle = 0.42; // radians (~24°)
      const ax = target.x - ux * targetRadius;
      const ay = target.y - uy * targetRadius;
      const headAngle = Math.atan2(uy, ux);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(headAngle - arrowAngle),
        ay - arrowLen * Math.sin(headAngle - arrowAngle),
      );
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(headAngle + arrowAngle),
        ay - arrowLen * Math.sin(headAngle + arrowAngle),
      );
      ctx.strokeStyle = edgeColor;
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = baseLineWidth * 0.85;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // ── Draw nodes ────────────────────────────────────────────────────

  for (const node of nodes) {
    if (node.x == null || node.y == null) continue;

    // Dim if filtered out OR if hovering another node and not connected
    const isHoverConnected =
      !hasHover ||
      node.id === hId ||
      links.some((l) => {
        const s = (l.source as SimNode).id;
        const t = (l.target as SimNode).id;
        return (s === hId && t === node.id) || (t === hId && s === node.id);
      });
    const isDimmed =
      (connectedNodeIds !== null && !connectedNodeIds.has(node.id)) ||
      (hasHover && !isHoverConnected);

    const radius = getNodeRadius(node.relationCount, maxRelations);
    const fillColor = UNIT_TYPE_COLORS[node.unitType] ?? "#6B7280";

    // Draw focus ring if this node is keyboard-focused
    if (focusedNodeId === node.id) {
      const focusRingRadius = radius + 4;

      // Outer glow
      ctx.beginPath();
      ctx.arc(node.x, node.y, focusRingRadius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = FOCUS_RING_WIDTH + 2;
      ctx.stroke();

      // Inner focus ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, focusRingRadius, 0, Math.PI * 2);
      ctx.strokeStyle = FOCUS_RING_COLOR;
      ctx.lineWidth = FOCUS_RING_WIDTH;
      ctx.stroke();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.globalAlpha = isDimmed ? DIMMED_OPACITY : 1;
    ctx.fill();

    // Subtle border stroke for definition
    ctx.strokeStyle = darkenColor(fillColor.startsWith("#") ? fillColor : "#6B7280", 0.7);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ── Draw labels (only when zoomed in enough) ───────────────────────

  if (zoomLevel >= LABEL_ZOOM_THRESHOLD) {
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const node of nodes) {
      if (node.x == null || node.y == null) continue;
      if (!node.label) continue;

      const radius = getNodeRadius(node.relationCount, maxRelations);

      // Dim label when node is dimmed
      const isHoverConnected =
        !hasHover ||
        node.id === hId ||
        links.some((l) => {
          const s = (l.source as SimNode).id;
          const t = (l.target as SimNode).id;
          return (s === hId && t === node.id) || (t === hId && s === node.id);
        });
      const isDimmed =
        (connectedNodeIds !== null && !connectedNodeIds.has(node.id)) ||
        (hasHover && !isHoverConnected);

      if (isDimmed) continue; // skip labels for dimmed nodes

      const labelY = node.y + radius + 4;
      const textWidth = ctx.measureText(node.label).width;
      const padding = 3;

      // Background rect for readability
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(
        node.x - textWidth / 2 - padding,
        labelY - 1,
        textWidth + padding * 2,
        13,
      );

      // Label text
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(node.label, node.x, labelY);
    }
  }

  ctx.restore();
}
