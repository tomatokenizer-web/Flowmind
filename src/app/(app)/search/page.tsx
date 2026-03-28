"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Skeleton } from "~/components/shared/skeleton";
import { SearchView } from "~/components/domain/search";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton height="40px" width="100%" />
        <Skeleton height="16px" width="120px" />
        <div className="space-y-3 mt-2">
          <Skeleton height="72px" />
          <Skeleton height="72px" />
          <Skeleton height="72px" />
        </div>
      </div>
    );
  }

  return <SearchView initialQuery={query} />;
}
