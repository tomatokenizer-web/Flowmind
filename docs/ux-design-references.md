# Flowmind UX Design References

## Design Direction: Modernistic, Clean, Apple-like

### Core Design Principles
- **Minimalism**: Whitespace as a design element, not wasted space
- **Clarity**: Every element has a clear purpose
- **Depth through subtlety**: Soft shadows, gentle gradients, not flat but not skeuomorphic
- **Motion with meaning**: Smooth transitions that convey spatial relationships
- **Progressive disclosure**: Show only what's needed, reveal complexity on demand

### Reference Apps & Styles

#### Primary Inspirations:
1. **Apple Notes / Apple Reminders (macOS/iOS)** — Clean sidebar, minimal chrome, content-first
2. **Linear.app** — Modern project management, beautiful transitions, keyboard-first
3. **Notion** — Clean page layout, but Flowmind should be MORE minimal
4. **Arc Browser** — Innovative sidebar navigation, beautiful color usage
5. **Craft.do** — Apple-like document editing, beautiful typography
6. **Things 3** — Gorgeous task management, Apple Design Award winner
7. **Bear App** — Minimal note-taking with subtle markdown

#### Graph View Inspirations:
1. **Obsidian Graph View** — For global overview (Layer 1), but cleaner
2. **Kumu.io** — Clean network visualization
3. **The Brain (TheBrain.com)** — Dynamic graph navigation

#### Card/Board Inspirations:
1. **Heptabase** — Visual knowledge cards on whiteboard
2. **Miro** — Clean card layouts
3. **Apple Freeform** — Clean infinite canvas

### Color System
- **Background**: Pure white (#FFFFFF) or very subtle warm gray (#FAFAF8)
- **Surface**: Light gray (#F5F5F5) for cards and panels
- **Primary accent**: Soft blue (#007AFF — Apple blue) or custom brand color
- **Text**: Near-black (#1D1D1F) for primary, gray (#86868B) for secondary
- **Borders**: Ultra-subtle (#E5E5E5), never heavy
- **Unit type colors**: Muted, pastel variants — never saturated
  - Claim: Soft blue
  - Question: Soft amber
  - Evidence: Soft green
  - Counterargument: Soft red
  - Observation: Soft purple
  - Idea: Soft orange

### Typography
- **System font stack**: -apple-system, BlinkMacSystemFont, 'SF Pro', 'Inter', sans-serif
- **Headings**: Semi-bold (600), generous letter-spacing
- **Body**: Regular (400), 16px base, 1.6 line-height
- **Monospace**: 'SF Mono', 'JetBrains Mono' for code units

### Key UI Patterns

#### Sidebar Navigation (Apple-style)
- Collapsible left sidebar
- Project list with subtle icons
- Context hierarchy as expandable tree
- Active item: subtle blue highlight with rounded corners

#### Unit Cards
- Rounded corners (12px)
- Subtle shadow (0 1px 3px rgba(0,0,0,0.08))
- Type indicator: small colored dot or left border accent
- Lifecycle badge: subtle, not distracting (draft = dashed border)
- Hover: gentle lift effect

#### Graph View — Global (Layer 1)
- White/light background
- Nodes: Small circles (8-12px), type-colored, no labels by default
- Edges: 1px lines, very low opacity (0.15-0.3)
- Clusters: Subtle background tint
- Hover node: expand to show label + type
- Click: transition to local view

#### Graph View — Local (Layer 2 Card Array)
- Cards arranged in Domain Template layout
- Clean connecting lines between cards
- Smooth zoom/pan transitions
- Selected card: blue outline glow

#### Thread View
- Vertical card stack with generous spacing
- Branch indicator: subtle fork icon with count
- Chunk dividers: thin line with label
- Smooth scroll with card snapping

#### Assembly View
- Drag handles: subtle grip dots
- Empty slots: dashed border with "+" icon
- Bridge text: italic, lighter color, editable

#### Animations
- Page transitions: 300ms ease-out
- Card hover: 150ms transform scale(1.02)
- Graph node expand: 200ms spring animation
- Sidebar collapse: 250ms ease

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  Title Bar (minimal, macOS-style traffic lights) │
├────────┬────────────────────────────────────────┤
│        │  Toolbar (minimal icons, search bar)    │
│ Side-  ├────────────────────────────────────────┤
│ bar    │                                        │
│        │  Main Content Area                     │
│ Pro-   │  (Graph / Thread / Assembly / Search)  │
│ jects  │                                        │
│ Con-   │                                        │
│ texts  │                                        │
│ Nav    │                                        │
│        ├────────────────────────────────────────┤
│        │  Detail Panel (slide-in from right)    │
│        │  Unit detail, relations, metadata      │
└────────┴────────────────────────────────────────┘
```

### Responsive Behavior
- Desktop-first (primary target)
- Sidebar collapses to icons at < 1200px
- Detail panel becomes overlay at < 1400px
- Mobile: simplified Thread View only (future)

### Accessibility
- WCAG 2.1 AA minimum
- Keyboard navigation for all actions
- Focus indicators (blue ring, 2px)
- Color is never the only indicator (always paired with icon/text)
- Reduced motion preference respected
