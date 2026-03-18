"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Copy,
  Trash2,
  Settings,
  Search,
  FileText,
  Plus,
  ChevronDown,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Shield,
  Eye,
  Zap,
} from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DestructiveDialog,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";
import {
  TooltipProvider,
  SimpleTooltip,
} from "~/components/ui/tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "~/components/ui/context-menu";
import {
  CommandPalette,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "~/components/ui/command";
import { Toggle } from "~/components/ui/toggle";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-border bg-bg-primary p-6 shadow-resting">
      <h2 className="mb-4 text-lg font-semibold text-text-primary tracking-heading-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ComponentShowcasePage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [destructiveOpen, setDestructiveOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-bg-surface p-8">
        <div className="mx-auto max-w-content space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-heading-tight">
              Flowmind Component Library
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Story 1.5 — Radix UI primitives with Flowmind design tokens.
              Press <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-xs">Cmd+K</kbd> to
              open the command palette.
            </p>
          </div>

          {/* 1. Button */}
          <Section title="Button">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>
          </Section>

          {/* 2. Dialog */}
          <Section title="Dialog">
            <div className="flex gap-3">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Thought Unit</DialogTitle>
                    <DialogDescription>
                      Make changes to your thought unit. Click save when
                      you&apos;re done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <input
                      className="w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      placeholder="Enter content..."
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setDialogOpen(false)}>
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DestructiveDialog
                open={destructiveOpen}
                onOpenChange={setDestructiveOpen}
                title="Delete Thought Unit"
                description="This action cannot be undone. This will permanently delete the thought unit and remove it from all threads."
                onConfirm={() => {
                  /* no-op demo */
                }}
              >
                <Button variant="destructive">Delete Unit</Button>
              </DestructiveDialog>
            </div>
          </Section>

          {/* 3. Dropdown Menu */}
          <Section title="Dropdown Menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">
                  Actions <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Thought Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  shortcut="Cmd+C"
                  indicator={{ color: "var(--unit-claim-accent)", label: "Claim" }}
                >
                  Copy as Claim
                </DropdownMenuItem>
                <DropdownMenuItem
                  shortcut="Cmd+E"
                  indicator={{ color: "var(--unit-evidence-accent)", label: "Evidence" }}
                >
                  Add Evidence
                </DropdownMenuItem>
                <DropdownMenuItem
                  indicator={{ color: "var(--unit-question-accent)", label: "Question" }}
                >
                  Convert to Question
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem shortcut="Cmd+D">
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-accent-error">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Section>

          {/* 4. Tooltip */}
          <Section title="Tooltip">
            <div className="flex gap-3">
              <SimpleTooltip content="Create a new thought unit">
                <Button variant="secondary" size="icon" aria-label="Add">
                  <Plus className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="Search across all units" side="bottom">
                <Button variant="secondary" size="icon" aria-label="Search">
                  <Search className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
              <SimpleTooltip content="Open settings" side="right">
                <Button variant="secondary" size="icon" aria-label="Settings">
                  <Settings className="h-4 w-4" />
                </Button>
              </SimpleTooltip>
            </div>
          </Section>

          {/* 5. Popover */}
          <Section title="Popover">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary">
                  Unit Info <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-text-primary">
                    Unit Metadata
                  </h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                    <div className="flex justify-between">
                      <span>Type</span>
                      <span className="font-medium text-unit-claim-accent">Claim</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status</span>
                      <span>Confirmed</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Relations</span>
                      <span>5</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Created</span>
                      <span>Mar 15, 2026</span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </Section>

          {/* 6. Tabs */}
          <Section title="Tabs">
            <Tabs defaultValue="claims">
              <TabsList>
                <TabsTrigger value="claims">Claims</TabsTrigger>
                <TabsTrigger value="evidence">Evidence</TabsTrigger>
                <TabsTrigger value="questions">Questions</TabsTrigger>
              </TabsList>
              <TabsContent value="claims">
                <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-unit-claim-accent" />
                    <span>3 claims in this thread</span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="evidence">
                <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-unit-evidence-accent" />
                    <span>7 evidence units linked</span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="questions">
                <div className="rounded-lg border border-border bg-bg-surface p-4 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-unit-question-accent" />
                    <span>2 open questions</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Section>

          {/* 7. Scroll Area */}
          <Section title="Scroll Area">
            <ScrollArea className="h-48 w-full rounded-lg border border-border">
              <div className="p-4 space-y-3">
                {Array.from({ length: 20 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-border bg-bg-surface p-3 text-sm"
                  >
                    <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="text-text-primary">
                      Thought Unit #{i + 1}
                    </span>
                    <span className="ml-auto text-xs text-text-tertiary">
                      {i % 3 === 0 ? "Claim" : i % 3 === 1 ? "Evidence" : "Question"}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Section>

          {/* 8. Context Menu */}
          <Section title="Context Menu">
            <ContextMenu>
              <ContextMenuTrigger>
                <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-border bg-bg-surface text-sm text-text-secondary">
                  Right-click here for context menu
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuLabel>Actions</ContextMenuLabel>
                <ContextMenuItem shortcut="Cmd+C">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </ContextMenuItem>
                <ContextMenuItem shortcut="Cmd+D">
                  <Plus className="mr-2 h-4 w-4" />
                  Duplicate
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Add to Thread
                </ContextMenuItem>
                <ContextMenuItem>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Convert to Idea
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem className="text-accent-error">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Section>

          {/* 9. Toggle */}
          <Section title="Toggle">
            <div className="flex gap-3">
              <SimpleTooltip content="Bold">
                <Toggle aria-label="Toggle bold">
                  <Bold className="h-4 w-4" />
                </Toggle>
              </SimpleTooltip>
              <SimpleTooltip content="Italic">
                <Toggle aria-label="Toggle italic">
                  <Italic className="h-4 w-4" />
                </Toggle>
              </SimpleTooltip>
              <SimpleTooltip content="Underline">
                <Toggle aria-label="Toggle underline">
                  <Underline className="h-4 w-4" />
                </Toggle>
              </SimpleTooltip>
              <Toggle size="lg" aria-label="Toggle AI assist">
                <Zap className="mr-1 h-4 w-4" /> AI Assist
              </Toggle>
            </div>
          </Section>

          {/* 10. Command Palette hint */}
          <Section title="Command Palette">
            <p className="text-sm text-text-secondary">
              Press{" "}
              <kbd className="rounded border border-border bg-bg-secondary px-1.5 py-0.5 text-xs font-medium">
                Cmd+K
              </kbd>{" "}
              (or Ctrl+K) to open the command palette. It features fuzzy search,
              keyboard navigation, and recent actions.
            </p>
          </Section>
        </div>
      </div>

      {/* Global Command Palette */}
      <CommandPalette>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Recent">
            <CommandItem shortcut="Cmd+N">
              <Plus className="mr-2 h-4 w-4" />
              New Thought Unit
            </CommandItem>
            <CommandItem>
              <FileText className="mr-2 h-4 w-4" />
              Open Thread: Research Notes
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem shortcut="Cmd+F">
              <Search className="mr-2 h-4 w-4" />
              Search Units
            </CommandItem>
            <CommandItem>
              <MessageSquare className="mr-2 h-4 w-4" />
              New Thread
            </CommandItem>
            <CommandItem>
              <Lightbulb className="mr-2 h-4 w-4" />
              AI Decompose
            </CommandItem>
            <CommandItem shortcut="Cmd+,">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandPalette>
    </TooltipProvider>
  );
}
