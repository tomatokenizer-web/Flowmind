"use client";

import * as React from "react";
import { use } from "react";
import { Skeleton } from "~/components/shared/skeleton";
import { AssemblyEditor } from "~/components/domain/assembly";

/* ─── Loading skeleton ─── */

function AssemblySkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton height="32px" width="200px" />
      <Skeleton height="40px" width="100%" />
      <Skeleton height="300px" />
    </div>
  );
}

/* ─── Page ─── */

export default function AssemblyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <AssemblySkeleton />;

  return <AssemblyEditor assemblyId={id} />;
}
