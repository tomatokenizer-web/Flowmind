# ExportDialog

## Purpose

A modal dialog for exporting an assembly's units as formatted text. It supports four output formats and applies unit-type-specific formatting client-side before presenting a preview and allowing copy/download.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Radix open-state callback |
| `assemblyId` | `string` | UUID of the assembly to export |
| `assemblyName` | `string` | Used to derive the download filename |

## Export Formats

| Format | Description |
|--------|-------------|
| `essay` | Units formatted as rich prose with type-aware prefixes |
| `presentation` | Slide-numbered bullet points with type label prefixes |
| `email` | Key points block + separate action items checklist |
| `social` | Truncated entries (max 240 chars) separated by `---` |

## Unit-Type Conversion Rules

Applied client-side via `applyUnitTypeFormatting` for `essay` and `email` formats:

| Unit Type | Formatting |
|-----------|------------|
| `claim` | `**bold**` — thesis statement style |
| `evidence` | Content + `— [source]` citation cue |
| `question` | `_italic_` open question |
| `counterargument` | Prefixed with "However, …" if not already |
| `observation` | Plain paragraph, no prefix |
| `definition` | `**term**: definition` — splits on first colon |
| `assumption` | Prefixed with "Assuming that …" if not already |
| `action` | `- [ ] content` checklist item |
| `idea` | `> **Idea:** content` blockquote callout |

For `presentation` and `social`, a short `[TYPE]` tag is prepended instead.

## Data Flow

1. `api.assembly.export` — fetches server-rendered raw content for the selected format.
2. `api.assembly.getById` — fetches the assembly with ordered items to obtain per-unit `content` and `unitType`.
3. Both queries run in parallel when the dialog is open.
4. `applyTypeConversions` combines raw content + ordered unit list → formatted preview string.

## Actions

- **Copy** — writes `formattedContent` to the clipboard.
- **Download** — creates a `.txt` blob named `{assembly-name}-{format}.txt`.
- **PDF** — disabled, shows "Coming soon" tooltip.
