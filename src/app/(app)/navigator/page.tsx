"use client";

import * as React from "react";
import { Skeleton } from "~/components/shared/skeleton";
import { NavigatorView } from "~/components/domain/navigator";

export default function NavigatorPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton height="32px" width="180px" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton height="80px" />
          <Skeleton height="80px" />
          <Skeleton height="80px" />
        </div>
        <Skeleton height="300px" />
      </div>
    );
  }

  return <NavigatorView />;
}
