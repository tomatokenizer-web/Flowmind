"use client";

import * as React from "react";
import { use } from "react";
import { Skeleton } from "~/components/shared/skeleton";
import { DocumentEditor } from "~/components/domain/document";

/* ─── Loading skeleton ─── */

function DocumentSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 max-w-3xl mx-auto">
      <Skeleton height="36px" width="280px" />
      <Skeleton height="24px" width="100%" />
      <Skeleton height="400px" />
    </div>
  );
}

/* ─── Page ─── */

export default function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <DocumentSkeleton />;

  return <DocumentEditor documentId={id} />;
}
