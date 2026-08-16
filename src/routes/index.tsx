import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function IndexRoute() {
  const isMobile = useIsMobile();

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Campaign Library</h1>
      <p className="text-muted-foreground text-sm mb-6">Track links, creatives and campaign results in one place.</p>
      {/* ...rest of the page content... */}
    </main>
  );
}
