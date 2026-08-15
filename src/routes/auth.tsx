import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logoAsset from "@/assets/ignitionbrain-campaigns.png.asset.json";
import { isOwnerEmail } from "@/lib/owner.functions";



export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Daily Income Steps Campaign Library" },
      {
        name: "description",
        content:
          "Sign in to manage Daily Income Steps branded tracking links, campaign creatives and click stats.",
      },
      { property: "og:title", content: "Sign In — Daily Income Steps Campaign Library" },
      {
        property: "og:description",
        content: "Secure admin access to branded tracking links and campaign HTML creatives.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const check = await isOwnerEmail({ data: { email } });
      if (!check.ok) throw new Error("Invalid credentials");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error("Invalid credentials");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <img
        src={logoAsset.url}
        alt="IgnitionBrain Campaigns"
        className="mb-8 w-full max-w-sm rounded-xl"
      />
      <Card className="w-full max-w-sm border-border/80">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Owner sign in</CardTitle>
          <CardDescription>Private access for the IgnitionBrain Campaigns owner.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={busy}>
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}


