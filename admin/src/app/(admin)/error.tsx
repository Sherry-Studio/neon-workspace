"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/primitives";
import { ErrorState } from "@/components/ui/states";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <ErrorState message={error.message || "Something went wrong."} onRetry={reset} />
    </Card>
  );
}
