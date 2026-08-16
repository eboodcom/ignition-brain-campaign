import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Code2, Copy, Eye, LinkIcon, LogOut, Pencil, Plus, Files, RefreshCw } from "lucide-react";
import logoAsset from "@/assets/ignitionbrain-campaigns.png.asset.json";
import { InstallAppButton } from "@/components/install-app-button";
import { useServerFn } from "@tanstack/react-start";
import { captureCampaignHtml, regenerateMailerHtml } from "@/lib/html-capture.functions";
import { checkBrandDomain, generateRedirect, verifyRedirect } from "@/lib/redirect.functions";

type RedirectCheck = {
  overall: "working" | "not-generated" | "inactive" | "destination-error";
  mapping: string;
  appRoute: string;
  brandedDomain: string;
  destination: string;
  shortUrl: string;
  testUrl: string;
  domainConnected: boolean;
};




export const BRAND_DOMAIN = "https://go.dailyincomesteps.com";

type Campaign = {
  id: string;
  user_id: string;
  campaign_name: string;
  offer: string;
  traffic_source: string;
  test_number: number | null;
  slug: string;
  destination_url: string;
  html_creative: string;
  raw_source: string;
  mailer_html: string;
  click_count: number;
  last_clicked_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const OFFERS = ["Traffic Ignition", "Gotta Have Traffic", "Daily Income Method", "Other"];
const SOURCES = ["HercuList", "Facebook", "Traffic Authority", "Safelist", "Email", "Organic", "Other"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campaign Library — Daily Income Steps Tracking Links" },
      {
        name: "description",
        content:
          "Manage Daily Income Steps branded tracking links: short slugs, destinations, click counts and campaign HTML creatives in one place.",
      },
      { property: "og:title", content: "Campaign Library — Daily Income Steps Tracking Links" },
      {
        property: "og:description",
        content:
          "Branded short links, click tracking and copy-ready HTML creatives for Daily Income Steps campaigns.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CampaignLibrary,
});

const emptyForm = {
  campaign_name: "",
  offer: "Traffic Ignition",
  traffic_source: "HercuList",
  test_number: "",
  slug: "",
  destination_url: "",
  html_creative: "",
  is_active: true,
};

type FormState = typeof emptyForm;

function CampaignLibrary() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOffer, setFilterOffer] = useState("all");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [htmlTarget, setHtmlTarget] = useState<Campaign | null>(null);
  const [htmlDraft, setHtmlDraft] = useState("");
  const [mailerDraft, setMailerDraft] = useState("");
  const [tab, setTab] = useState<"snapshot" | "mailer">("snapshot");
  const [previewing, setPreviewing] = useState(false);
  const [htmlStatus, setHtmlStatus] = useState<string | null>(null);
  const [fetchingHtml, setFetchingHtml] = useState(false);
  const captureHtml = useServerFn(captureCampaignHtml);
  const regenerateMailer = useServerFn(regenerateMailerHtml);
  const activeHtml = tab === "mailer" ? mailerDraft : htmlDraft;

  const makeRedirect = useServerFn(generateRedirect);
  const testRedirect = useServerFn(verifyRedirect);
  const brandDomainCheck = useServerFn(checkBrandDomain);
  const [domainStatus, setDomainStatus] = useState<{ connected: boolean; detail: string } | null>(null);
  const [domainHelpOpen, setDomainHelpOpen] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  const runDomainCheck = async (notify = false) => {
    setVerifyingDomain(true);
    try {
      const res = await brandDomainCheck();
      setDomainStatus({ connected: res.connected, detail: res.detail });
      if (notify) {
        if (res.connected) toast.success("Branded domain is connected");
        else toast.error(`Not connected — ${res.detail}`);
      }
    } catch {
      setDomainStatus({ connected: false, detail: "Domain status unknown" });
      if (notify) toast.error("Could not check the domain");
    } finally {
      setVerifyingDomain(false);
    }
  };

  const [checks, setChecks] = useState<Record<string, RedirectCheck>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const runVerify = async (c: Campaign, notify = true) => {
    setBusyId(c.id);
    try {
      const res = await testRedirect({ data: { campaignId: c.id, origin: window.location.origin } });
      setChecks((prev) => ({ ...prev, [c.id]: res as RedirectCheck }));
      if (notify) {
        if (res.overall === "working") toast.success("Redirect working");
        else toast.error(`Redirect: ${res.appRoute}`);
      }
    } catch {
      if (notify) toast.error("Could not test the redirect");
    } finally {
      setBusyId(null);
    }
  };

  const runGenerate = async (c: Campaign) => {
    setBusyId(c.id);
    try {
      const res = await makeRedirect({ data: { campaignId: c.id, origin: window.location.origin } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      void load();
    } catch {
      toast.error("Could not generate the redirect");
      return;
    } finally {
      setBusyId(null);
    }
    await runVerify(c, false);
  };

  const runCapture = async (campaign: Campaign, force: boolean) => {
    setFetchingHtml(true);
    setHtmlStatus("Fetching HTML…");
    try {
      const res = await captureHtml({ data: { campaignId: campaign.id, force } });
      if (res.status === "error" || !res.html) {
        setHtmlStatus(res.message ?? "Unable to capture HTML");
        return false;
      }
      setHtmlDraft(res.html);
      if (res.mailer) setMailerDraft(res.mailer);
      setHtmlStatus(
        res.status === "incomplete"
          ? res.message
          : res.status === "cached"
            ? "Saved snapshot loaded"
            : "Portable snapshot captured and saved",
      );
      void load();
      return true;
    } catch {
      setHtmlStatus("Unable to capture HTML");
      return false;
    } finally {
      setFetchingHtml(false);
    }
  };

  const runRegenerate = async () => {
    if (!htmlTarget) return;
    setFetchingHtml(true);
    setHtmlStatus("Rebuilding mailer HTML…");
    try {
      const res = await regenerateMailer({ data: { campaignId: htmlTarget.id } });
      if (res.status === "error" || !res.mailer) {
        setHtmlStatus(res.message ?? "Could not build mailer HTML");
        return;
      }
      setMailerDraft(res.mailer);
      setHtmlStatus("Mailer HTML regenerated");
      void load();
    } catch {
      setHtmlStatus("Could not build mailer HTML");
    } finally {
      setFetchingHtml(false);
    }
  };

  const openHtml = (c: Campaign) => {
    setHtmlTarget(c);
    setHtmlDraft(c.html_creative);
    setMailerDraft(c.mailer_html ?? "");
    setTab("snapshot");
    setPreviewing(false);
    if (c.html_creative && c.html_creative.trim()) {
      setHtmlStatus("Saved snapshot");
    } else {
      setHtmlStatus(null);
      void runCapture(c, false);
    }
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth" });
        return;
      }
      setReady(true);
    });
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Campaign[]);
    setLoading(false);
  };

  useEffect(() => {
    if (ready) void load();
  }, [ready]);

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!ready) return;
    void runDomainCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, [ready]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (filterOffer === "all" || r.offer === filterOffer) &&
          (filterSource === "all" || r.traffic_source === filterSource) &&
          (filterStatus === "all" ||
            (filterStatus === "active" ? r.is_active : !r.is_active)),
      ),
    [rows, filterOffer, filterSource, filterStatus],
  );

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed — select the text manually");
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      campaign_name: c.campaign_name,
      offer: c.offer,
      traffic_source: c.traffic_source,
      test_number: c.test_number?.toString() ?? "",
      slug: c.slug,
      destination_url: c.destination_url,
      html_creative: c.html_creative,
      is_active: c.is_active,
    });
    setFormOpen(true);
  };

  const openDuplicate = (c: Campaign) => {
    setEditingId(null);
    setForm({
      campaign_name: `${c.campaign_name} (copy)`,
      offer: c.offer,
      traffic_source: c.traffic_source,
      test_number: c.test_number ? String(c.test_number + 1) : "",
      slug: "",
      destination_url: c.destination_url,
      html_creative: c.html_creative,
      is_active: c.is_active,
    });
    setFormOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^https?:\/\//i.test(form.destination_url.trim())) {
      toast.error("Destination must start with http:// or https://");
      return;
    }
    setSaving(true);
    const payload = {
      campaign_name: form.campaign_name.trim(),
      offer: form.offer,
      traffic_source: form.traffic_source,
      test_number: form.test_number ? Number(form.test_number) : null,
      slug: form.slug.trim().toLowerCase(),
      destination_url: form.destination_url.trim(),
      html_creative: form.html_creative,
      is_active: form.is_active,
    };
    let error;
    let newId: string | null = null;
    if (editingId) {
      ({ error } = await supabase.from("campaigns").update(payload).eq("id", editingId));
    } else {
      const { data: session } = await supabase.auth.getUser();
      const inserted = await supabase
        .from("campaigns")
        .insert({ ...payload, user_id: session.user!.id })
        .select("id")
        .single();
      error = inserted.error;
      newId = inserted.data?.id ?? null;
    }
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That slug is already used" : error.message);
      return;
    }
    toast.success(editingId ? "Campaign updated" : "Campaign created");
    setFormOpen(false);
    void load();

    // Auto-create + verify the redirect mapping for the new campaign.
    if (newId) {
      const rid = newId;
      void (async () => {
        try {
          const res = await makeRedirect({ data: { campaignId: rid, origin: window.location.origin } });
          if (!res.ok) toast.error(`Redirect not generated — ${res.message}`);
          else {
            const check = await testRedirect({ data: { campaignId: rid, origin: window.location.origin } });
            setChecks((prev) => ({ ...prev, [rid]: check as RedirectCheck }));
          }
        } catch {
          toast.error("Redirect not generated");
        }
      })();
    }

    // Auto-capture the destination page HTML for new campaigns without a creative.
    if (newId && !payload.html_creative.trim()) {
      const id = newId;
      void (async () => {
        try {
          const res = await captureHtml({ data: { campaignId: id, force: false } });
          if (res.status === "error" || !res.html) {
            toast.error(`HTML not captured — ${res.message}`);
          } else {
            toast.success("HTML captured from destination page");
          }
        } catch {
          toast.error("HTML not captured");
        }
        void load();
      })();
    }
  };


  const toggleActive = async (c: Campaign) => {
    const { error } = await supabase
      .from("campaigns")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(c.is_active ? "Link disabled" : "Link enabled");
    void load();
  };

  const saveHtml = async () => {
    if (!htmlTarget) return;
    const patch =
      tab === "mailer" ? { mailer_html: mailerDraft } : { html_creative: htmlDraft };
    const { error } = await supabase.from("campaigns").update(patch).eq("id", htmlTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tab === "mailer" ? "Mailer HTML saved" : "Page HTML saved");
    void load();
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <img
            src={logoAsset.url}
            alt="IgnitionBrain Campaigns"
            className="mb-4 w-full max-w-md rounded-lg"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-brand">Daily Income Steps</p>
              <h1 className="truncate text-2xl font-bold">Campaign Library</h1>
            </div>
            <InstallAppButton />
            <Button variant="brand" size="sm" onClick={openCreate}>
              <Plus /> New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/auth" });
              }}
            >
              <LogOut />
            </Button>
          </div>

        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Card
          className={`p-4 ${domainStatus?.connected ? "border-success/40" : "border-destructive/40 bg-destructive/5"}`}
        >
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">
                Branded domain
              </p>
              <p className="mt-1 font-mono text-sm break-all">go.dailyincomesteps.com</p>
            </div>
            <Badge
              className={
                domainStatus?.connected
                  ? "bg-success text-background"
                  : "bg-destructive text-destructive-foreground"
              }
            >
              {domainStatus === null ? "Checking…" : domainStatus.connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>

          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Status">
              <span className="text-muted-foreground">
                {domainStatus === null ? "Checking…" : domainStatus.detail}
              </span>
            </Row>
            <Row label="Working test domain">
              <span className="font-mono break-all text-muted-foreground">
                {origin.replace(/^https?:\/\//, "") || "ignition-brain-campaign.lovable.app"}
              </span>
            </Row>
            <Row label="Planned branded domain">
              <span className="font-mono break-all text-muted-foreground">go.dailyincomesteps.com</span>
            </Row>
          </dl>

          {!domainStatus?.connected && (
            <p className="mt-3 text-xs text-muted-foreground">
              Your redirect mappings already exist and work on the test domain. Only the custom domain
              still needs connecting.
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="brand" onClick={() => setDomainHelpOpen(true)}>
              <LinkIcon /> Connect Branded Domain
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={verifyingDomain}
              onClick={() => void runDomainCheck(true)}
            >
              <RefreshCw /> {verifyingDomain ? "Verifying…" : "Verify Domain"}
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={domainHelpOpen} onOpenChange={setDomainHelpOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect go.dailyincomesteps.com</DialogTitle>
            <DialogDescription>
              Lovable domain settings live in the project editor, so connect it there and come back.
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Open Project Settings.</li>
            <li>Go to Domains.</li>
            <li>Choose Connect Domain.</li>
            <li>
              Enter <span className="font-mono text-foreground">go.dailyincomesteps.com</span>
            </li>
            <li>Apply the DNS records Lovable gives you at your registrar.</li>
            <li>Return here and press Verify Domain.</li>
          </ol>
          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => copy("go.dailyincomesteps.com", "Domain")}
            >
              <Copy /> Copy Domain
            </Button>
            <Button variant="brand" disabled={verifyingDomain} onClick={() => void runDomainCheck(true)}>
              <RefreshCw /> Verify Domain
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FilterSelect value={filterOffer} onChange={setFilterOffer} label="All offers" options={OFFERS} />
          <FilterSelect
            value={filterSource}
            onChange={setFilterSource}
            label="All sources"
            options={SOURCES}
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <p className="text-sm text-muted-foreground">Loading campaigns…</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns match these filters.</p>
          )}
          {filtered.map((c) => (
            <Card key={c.id} className="overflow-hidden p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold break-words">{c.campaign_name}</h2>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="secondary">{c.offer}</Badge>
                    <Badge variant="outline">{c.traffic_source}</Badge>
                    {c.test_number != null && <Badge variant="outline">Test {c.test_number}</Badge>}
                  </div>
                </div>
                <Badge
                  className={c.is_active ? "bg-success text-background" : "bg-muted text-muted-foreground"}
                >
                  {c.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mt-4 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Redirect
                  </p>
                  <RedirectBadge
                    check={checks[c.id]}
                    isActive={c.is_active}
                    domainConnected={domainStatus?.connected ?? false}
                  />
                </div>
                <dl className="mt-2 space-y-2 text-sm">
                  <Row label="From">
                    <span className="font-mono break-all text-brand">
                      {BRAND_DOMAIN}/{c.slug}
                    </span>
                  </Row>
                  <Row label="To">
                    <span className="break-all text-muted-foreground">{c.destination_url}</span>
                  </Row>
                  <Row label="Test URL">
                    <span className="font-mono break-all text-muted-foreground">
                      {origin}/{c.slug}
                    </span>
                  </Row>
                  <Row label="Redirect mapping">
                    <span className="text-success">
                      {checks[c.id]?.overall === "not-generated" ? "Not generated" : "Ready"}
                    </span>
                  </Row>
                  <Row label="Branded domain">
                    <span className={domainStatus?.connected ? "text-success" : "text-destructive"}>
                      {domainStatus === null
                        ? "Checking…"
                        : domainStatus.connected
                          ? "Connected"
                          : "Not Connected"}
                    </span>
                  </Row>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="brand"
                    onClick={() => copy(`${BRAND_DOMAIN}/${c.slug}`, "Short link")}
                  >
                    <Copy /> Copy Short Link
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copy(c.destination_url, "Destination")}>
                    <Copy /> Copy Destination
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === c.id}
                    onClick={() => void runGenerate(c)}
                  >
                    <RefreshCw />{" "}
                    {checks[c.id]?.overall === "working" ? "Redirect Ready" : "Generate Redirect"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === c.id}
                    onClick={() => void runVerify(c)}
                  >
                    <LinkIcon /> {busyId === c.id ? "Testing…" : "Test Redirect"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copy(`${window.location.origin}/${c.slug}`, "Test link")}
                  >
                    <Copy /> Copy Test URL
                  </Button>
                </div>
                {checks[c.id] && (
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <li>Redirect mapping: {checks[c.id]!.mapping}</li>
                    <li>Lovable route: {checks[c.id]!.appRoute}</li>
                    <li>Custom domain: {checks[c.id]!.brandedDomain}</li>
                    <li>Destination: {checks[c.id]!.destination}</li>
                  </ul>
                )}
              </div>

              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Clicks">
                  <span className="font-semibold">{c.click_count}</span>
                  {c.last_clicked_at && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      last {new Date(c.last_clicked_at).toLocaleString()}
                    </span>
                  )}
                </Row>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => openHtml(c)}>
                  <Code2 /> HTML Code
                </Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                  <Pencil /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => openDuplicate(c)}>
                  <Files /> Duplicate
                </Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                  {c.is_active ? "Disable" : "Enable"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Create / edit */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit campaign" : "New campaign"}</DialogTitle>
            <DialogDescription>Short branded link plus its creative.</DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <Field label="Campaign name">
              <Input
                required
                value={form.campaign_name}
                onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Offer">
                <ComboField
                  value={form.offer}
                  options={OFFERS}
                  onChange={(v) => setForm({ ...form, offer: v })}
                />
              </Field>
              <Field label="Traffic source">
                <ComboField
                  value={form.traffic_source}
                  options={SOURCES}
                  onChange={(v) => setForm({ ...form, traffic_source: v })}
                />
              </Field>
              <Field label="Test number">
                <Input
                  type="number"
                  min={0}
                  value={form.test_number}
                  onChange={(e) => setForm({ ...form, test_number: e.target.value })}
                />
              </Field>
              <Field label="Slug">
                <Input
                  required
                  placeholder="ti1"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Destination URL">
              <Input
                required
                type="url"
                value={form.destination_url}
                onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
              />
            </Field>
            <Field label="HTML creative">
              <Textarea
                rows={6}
                className="font-mono text-xs"
                value={form.html_creative}
                onChange={(e) => setForm({ ...form, html_creative: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                id="active"
              />
              <Label htmlFor="active">Active</Label>
            </div>
            <DialogFooter>
              <Button type="submit" variant="brand" disabled={saving}>
                {saving ? "Saving…" : "Save campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* HTML code viewer */}
      <Dialog open={!!htmlTarget} onOpenChange={(o) => !o && setHtmlTarget(null)}>
        <DialogContent className="flex max-h-[92vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="break-words">{htmlTarget?.campaign_name} — HTML</DialogTitle>
            <DialogDescription>
              Page Snapshot is the portable copy of the destination page. Mailer HTML is the email-safe
              version to paste into HercuList.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant={tab === "snapshot" ? "secondary" : "outline"}
              onClick={() => setTab("snapshot")}
            >
              Page Snapshot
            </Button>
            <Button
              size="sm"
              variant={tab === "mailer" ? "secondary" : "outline"}
              onClick={() => setTab("mailer")}
            >
              Mailer HTML
            </Button>
          </div>

          {tab === "mailer" && domainStatus && !domainStatus.connected && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
              Branded redirect domain is not live yet. Links to {BRAND_DOMAIN} will not work until
              go.dailyincomesteps.com is connected — use the temporary working link for testing.
            </p>
          )}
          <Button
            variant="brand"
            className="w-full"
            disabled={!activeHtml.trim()}
            onClick={() => {
              if (
                tab === "mailer" &&
                domainStatus &&
                !domainStatus.connected &&
                !window.confirm(
                  "Branded redirect domain is not live yet. Copy this mailer HTML with the branded links anyway?",
                )
              )
                return;
              copy(activeHtml, tab === "mailer" ? "Mailer HTML" : "Page HTML");
            }}
          >
            <Copy /> {tab === "mailer" ? "COPY MAILER HTML" : "COPY PAGE HTML"}
          </Button>
          {tab === "mailer" && origin && (
            <Button
              variant="outline"
              className="w-full"
              disabled={!mailerDraft.trim()}
              onClick={() =>
                copy(mailerDraft.split(BRAND_DOMAIN).join(origin), "Mailer HTML (temporary link)")
              }
            >
              <LinkIcon /> Use Temporary Working Link
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={previewing ? "outline" : "secondary"}
              onClick={() => setPreviewing(false)}
            >
              <Code2 /> Code
            </Button>
            <Button
              size="sm"
              variant={previewing ? "secondary" : "outline"}
              onClick={() => setPreviewing(true)}
            >
              <Eye /> Preview
            </Button>
            {tab === "snapshot" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={fetchingHtml || !htmlTarget}
                onClick={() => {
                  if (!htmlTarget) return;
                  if (
                    htmlDraft.trim() &&
                    !window.confirm("Replace the saved page snapshot with a fresh copy of the destination page?")
                  )
                    return;
                  void runCapture(htmlTarget, true);
                }}
              >
                <RefreshCw /> {fetchingHtml ? "Fetching…" : "Refresh From Page"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={fetchingHtml || !htmlTarget}
                onClick={() => void runRegenerate()}
              >
                <RefreshCw /> {fetchingHtml ? "Working…" : "Regenerate From Snapshot"}
              </Button>
            )}
          </div>
          {htmlStatus && <p className="text-xs text-muted-foreground">{htmlStatus}</p>}

          <div className="min-h-0 flex-1 overflow-auto">
            {previewing ? (
              <div className={tab === "mailer" ? "mx-auto w-full max-w-[600px]" : "w-full"}>
                <iframe
                  title={tab === "mailer" ? "Mailer preview" : "Page snapshot preview"}
                  sandbox=""
                  srcDoc={activeHtml}
                  className="h-[50vh] w-full rounded-md border border-border bg-white"
                />
              </div>
            ) : (
              <Textarea
                value={activeHtml}
                onChange={(e) =>
                  tab === "mailer" ? setMailerDraft(e.target.value) : setHtmlDraft(e.target.value)
                }
                placeholder={
                  fetchingHtml
                    ? "Working…"
                    : tab === "mailer"
                      ? "No mailer HTML yet — use Regenerate From Snapshot."
                      : "No snapshot captured yet — use Refresh From Page."
                }
                className="h-[50vh] font-mono text-xs"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saveHtml}>
              Save {tab === "mailer" ? "Mailer HTML" : "Page HTML"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}

function RedirectBadge({
  check,
  isActive,
  domainConnected,
}: {
  check?: RedirectCheck | undefined;
  isActive: boolean;
  domainConnected: boolean;
}) {
  let label = "Not verified";
  let className = "bg-muted text-muted-foreground";
  if (!isActive) {
    label = "Inactive";
  } else if (check) {
    if (check.overall === "working") {
      label = domainConnected ? "Working" : "Working (test URL)";
      className = "bg-success text-background";
    } else if (check.overall === "not-generated") {
      label = "Not Generated";
      className = "bg-destructive text-destructive-foreground";
    } else if (check.overall === "destination-error") {
      label = "Destination Error";
      className = "bg-destructive text-destructive-foreground";
    } else {
      label = "Inactive";
    }
  }
  if (isActive && !domainConnected && (!check || check.overall !== "working")) {
    label = check ? label : "Not verified";
  }
  return <Badge className={className}>{label}</Badge>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground sm:w-28">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ComboField({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const list = options.includes(value) ? options : [...options, value];
  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {list.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="mt-2 text-xs"
        placeholder="or type a custom value"
        onBlur={(e) => e.target.value.trim() && onChange(e.target.value.trim())}
      />
    </>
  );
}
