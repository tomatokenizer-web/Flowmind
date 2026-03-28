"use client";

import * as React from "react";
import { use } from "react";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Skeleton, SkeletonCard } from "~/components/shared/skeleton";
import { InquiryPanel } from "~/components/domain/inquiry";

/* ─── Loading skeleton ─── */

function InquirySkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton height="28px" width="200px" />
      <Skeleton height="16px" width="300px" />
      <div className="grid gap-3 mt-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

/* ─── Page ─── */

export default function InquiryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const setActiveInquiry = useWorkspaceStore((s) => s.setActiveInquiry);
  const setRightPanelContent = useWorkspaceStore((s) => s.setRightPanelContent);

  React.useEffect(() => {
    setActiveInquiry(id);
    // Open compass panel for inquiry pages
    setRightPanelContent("compass");
    return () => {
      setActiveInquiry(null);
      setRightPanelContent(null);
    };
  }, [id, setActiveInquiry, setRightPanelContent]);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) return <InquirySkeleton />;

  return <InquiryPanel inquiryId={id} />;
}
