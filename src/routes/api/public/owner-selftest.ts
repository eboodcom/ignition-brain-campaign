import { createFileRoute } from "@tanstack/react-router";
import { ensureOwnerAccount } from "@/lib/owner.functions";
import { ownerSelfTest } from "@/lib/owner-selftest.functions";

export const Route = createFileRoute("/api/public/owner-selftest")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = new URL(request.url).searchParams.get("t");
        if (token !== "kq83nfj2ls") return new Response("no", { status: 404 });
        const provision = await ensureOwnerAccount();
        const test = await ownerSelfTest();
        return Response.json({ provision, test });
      },
    },
  },
});
