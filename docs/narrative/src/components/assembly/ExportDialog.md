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

## Partial Export

Users can select a subset of units via checkboxes before exporting. All units are selected by default when the assembly loads. The formatted preview and all export actions only include selected units. A "Select all / Deselect all" toggle is provided.

## Export History Tab

A second tab lists previous export events fetched via `api.exportHistory.list`. Each entry shows format badge, unit count, and a formatted timestamp using `date-fns` `format()` with the pattern `"MMM d, yyyy, h:mm a"` (e.g. "Mar 24, 2026, 2:30 PM") for consistent locale-independent display. A changed-units badge alerts the user when units have been modified since the last export.

## Actions

- **Copy** — writes `formattedContent` to the clipboard and records an export history entry.
- **Download** — creates a `.txt` blob named `{assembly-name}-{format}.txt` and records history.
- **PDF** — triggers a server-side PDF export via `/api/assembly/{id}/export-pdf`.

## Preview Container

The preview `<div>` has `min-h-[120px]` to prevent the container from collapsing when no units are selected or content is empty. Content is rendered in a `<div>` (not `<pre>`) with `whitespace-pre-wrap` to preserve newlines while allowing prose wrapping.

## 2026-03-24 Changes

- Renamed internal `format` state to `exportFormat` to avoid shadowing the `date-fns` `format` import.
- Added `date-fns` `format()` import; replaced `toLocaleString()` in history entries with `format(date, "MMM d, yyyy, h:mm a")`.
- Preview container: added `min-h-[120px]`; replaced `<pre className="... font-sans">` with `<div className="whitespace-pre-wrap ...">`.
- Partial export unit selection and export history tab added.
