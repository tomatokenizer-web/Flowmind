"use client";

import * as React from "react";
import {
  ChevronRight,
  Compass,
  Hash,
  Layers,
  Link2,
  Pencil,
  Check,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { EmptyProjects } from "~/components/shared/empty-state";

/* ─── Stat Card ─── */

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-bg-surface p-3">
      <Icon className="h-4 w-4 text-text-tertiary shrink-0" aria-hidden="true" />
      <div>
        <span className="text-lg font-semibold text-text-primary leading-none">
          {value}
        </span>
        <span className="block text-xs text-text-tertiary mt-0.5">{label}</span>
      </div>
    </div>
  );
}

/* ─── Types ─── */

interface ProjectOverviewProps {
  projectId: string;
  className?: string;
}

/* ─── Component ─── */

export function ProjectOverview({ projectId, className }: ProjectOverviewProps) {
  const utils = api.useUtils();
  const setActiveInquiry = useWorkspaceStore((s) => s.setActiveInquiry);
  const setActiveContext = useWorkspaceStore((s) => s.setActiveContext);

  const projectQuery = api.project.getById.useQuery({ id: projectId });
  const inquiriesQuery = api.inquiry.list.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  const [editingName, setEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState("");
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const project = projectQuery.data;
  const inquiries = inquiriesQuery.data ?? [];
  const isLoading = projectQuery.isLoading;

  React.useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  function startEditingName() {
    if (!project) return;
    setNameDraft(project.name);
    setEditingName(true);
  }

  function saveName() {
    setEditingName(false);
    // Project update mutation would go here
  }

  function handleNameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      saveName();
    }
    if (e.key === "Escape") setEditingName(false);
  }

  /* ─── Loading ─── */

  if (isLoading) {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)}>
        <Skeleton height="32px" width="40%" />
        <Skeleton height="16px" width="60%" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height="64px" />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!project) {
    return <EmptyProjects />;
  }

  /* ─── Derived stats ─── */

  const totalContexts = inquiries.reduce(
    (sum, inq) => sum + (inq.counts?.contexts ?? 0),
    0,
  );

  return (
    <section
      className={cn("flex flex-col h-full", className)}
      aria-label={`Project: ${project.name}`}
    >
      {/* Header */}
      <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
        {/* Name */}
        <div className="flex items-center gap-2 group">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={handleNameKeyDown}
                className={cn(
                  "flex-1 bg-transparent text-2xl font-semibold tracking-heading-tight text-text-primary",
                  "border-b-2 border-accent-primary outline-none px-0 py-0.5",
                )}
                aria-label="Project name"
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveName} aria-label="Save">
                <Check className="h-4 w-4 text-accent-success" />
              </Button>
            </div>
          ) : (
            <button
              onClick={startEditingName}
              className={cn(
                "flex items-center gap-2 group/name text-left",
                "rounded-lg -ml-1 px-1 py-0.5",
                "hover:bg-bg-hover transition-colors duration-fast",
              )}
              aria-label="Click to edit project name"
            >
              <h1 className="text-2xl font-semibold tracking-heading-tight text-text-primary">
                  {project.name}
              </h1>
              <Pencil
                className="h-4 w-4 text-text-tertiary opacity-0 group-hover/name:opacity-100 transition-opacity duration-fast shrink-0"
                aria-hidden="true"
              />
            </button>
          )}
        </div>

        {/* Description */}
        {project.description && (
          <p className="mt-2 text-sm text-text-secondary max-w-reading">
            {project.description}
          </p>
        )}

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <StatCard icon={Hash} label="Total units" value={project.counts?.units ?? 0} />
          <StatCard icon={Layers} label="Contexts" value={totalContexts} />
          <StatCard icon={Link2} label="Assemblies" value={project.counts?.assemblies ?? 0} />
        </div>
      </div>

      {/* Inquiry list */}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 p-6">
          <h2 className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Inquiries ({inquiries.length})
          </h2>

          {inquiries.length === 0 ? (
            <p className="text-sm text-text-tertiary italic py-4 text-center">
              No inquiries yet. Start one to begin exploring.
            </p>
          ) : (
            inquiries.map((inq) => (
              <button
                key={inq.id}
                onClick={() => setActiveInquiry(inq.id)}
                className={cn(
                  "flex items-start gap-3 rounded-card border border-border bg-bg-surface p-4",
                  "hover:shadow-hover hover:border-accent-primary/30 transition-all duration-fast",
                  "text-left w-full group",
                )}
              >
                <Compass
                  className="h-5 w-5 mt-0.5 text-text-tertiary group-hover:text-accent-primary transition-colors duration-fast shrink-0"
                  aria-hidden="true"
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-text-primary">
                    {inq.title}
                  </span>
                  {inq.startingQuestions?.[0] && (
                    <span className="block text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {inq.startingQuestions[0]}
                    </span>
                  )}
                  <span className="block text-xs text-text-tertiary mt-1">
                    {inq.counts?.contexts ?? 0} contexts
                  </span>
                </div>
                <ChevronRight
                  className="h-4 w-4 mt-0.5 text-text-tertiary group-hover:text-text-secondary transition-colors duration-fast shrink-0"
                  aria-hidden="true"
                />
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  );
}
