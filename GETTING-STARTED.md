# Flowmind — Getting Started Guide

## What's Installed
- ✅ **BMAD Method v6.2.0** — AI-driven agile development framework
- ✅ **TaskMaster AI** — Task breakdown & management (MCP server for IDE)
- ✅ **Claude Code integration** — 36 skills, 9 agents configured
- ✅ **PRD saved** — `docs/flowmind-prd.md` (your Flowmind spec v1.2)

## Project Location
```
C:\Users\USER\clawd\projects\flowmind
```

## How to Start

### 1. Open the project in VS Code
```bash
code C:\Users\USER\clawd\projects\flowmind
```

### 2. Open Claude Code extension in VS Code

### 3. Start with BMAD Orchestrator
In Claude Code, type:
```
@bmad-help
```
This will show you all available BMAD skills and agents.

### 4. Generate Architecture from PRD
In Claude Code, use:
```
Use the bmad-create-architecture skill. The PRD is at docs/flowmind-prd.md
```

### 5. After Architecture is done, use TaskMaster
TaskMaster runs as an MCP server inside Claude Code. To initialize:
```
Initialize TaskMaster and break down the architecture into tasks
```

### 6. Implement tasks one by one
Work through tasks sequentially. Report to Eric (me!) after each task for approval.

## Key BMAD Skills Available
- `bmad-create-architecture` — Generate architecture doc from PRD
- `bmad-create-prd` — Create/refine PRD
- `bmad-create-epics-and-stories` — Break into epics/stories
- `bmad-dev` — Development agent
- `bmad-dev-story` — Implement a story
- `bmad-analyst` — Analysis agent
- `bmad-architect` — Architecture agent
- `bmad-check-implementation-readiness` — Verify readiness

## Output Directories
- `_bmad-output/planning-artifacts/` — Architecture docs, PRD, etc.
- `_bmad-output/implementation-artifacts/` — Code artifacts
- `docs/` — Project knowledge & PRD
