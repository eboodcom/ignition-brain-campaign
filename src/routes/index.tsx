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
import { captureCampaignHtml } from "@/lib/html-capture.functions";




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
  const [previewing, setPreviewing] = useState(false);
  const [htmlStatus, setHtmlStatus] = useState<string | null>(null);
  const [fetchingHtml, setFetchingHtml] = useState(false);
  const captureHtml = useServerFn(captureCampaignHtml);

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
      setHtmlStatus(res.status === "cached" ? "Saved HTML loaded" : "HTML captured and saved");
      void load();
      return true;
    } catch {
      setHtmlStatus("Unable to capture HTML");
      return false;
    } finally {
      setFetchingHtml(false);
    }
  };

  const openHtml = (c: Campaign) => {
    setHtmlTarget(c);
    setHtmlDraft(c.html_creative);
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
    const { error } = await supabase
      .from("campaigns")
      .update({ html_creative: htmlDraft })
      .eq("id", htmlTarget.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("HTML saved");
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

              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Short link">
                  <span className="font-mono break-all text-brand">{BRAND_DOMAIN}/{c.slug}</span>
                </Row>
                <Row label="Destination">
                  <span className="break-all text-muted-foreground">{c.destination_url}</span>
                </Row>
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
                <Button size="sm" variant="brand" onClick={() => copy(`${BRAND_DOMAIN}/${c.slug}`, "Link")}>
                  <Copy /> Copy Link
                </Button>
                <Button size="sm" variant="outline" onClick={() => openHtml(c)}
                >
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
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copy(`${window.location.origin}/${c.slug}`, "Test link")}
                >
                  <LinkIcon /> Test URL
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
            <DialogDescription>Raw creative source. Copy it straight into HercuList.</DialogDescription>
          </DialogHeader>
          <Button
            variant="brand"
            className="w-full"
            disabled={!htmlDraft.trim()}
            onClick={() => copy(htmlDraft, "HTML")}
          >
            <Copy /> Copy All HTML
          </Button>
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
            <Button
              size="sm"
              variant="outline"
              disabled={fetchingHtml || !htmlTarget}
              onClick={() => {
                if (!htmlTarget) return;
                if (
                  htmlDraft.trim() &&
                  !window.confirm("Replace the saved HTML snapshot with a fresh copy of the destination page?")
                )
                  return;
                void runCapture(htmlTarget, true);
              }}
            >
              <RefreshCw /> {fetchingHtml ? "Fetching…" : "Refresh From Page"}
            </Button>
          </div>
          {htmlStatus && (
            <p className="text-xs text-muted-foreground">{htmlStatus}</p>
          )}
          <div className="min-h-0 flex-1 overflow-auto">
            {previewing ? (
              <iframe
                title="Creative preview"
                sandbox=""
                srcDoc={htmlDraft}
                className="h-[50vh] w-full rounded-md border border-border bg-white"
              />
            ) : (
              <Textarea
                value={htmlDraft}
                onChange={(e) => setHtmlDraft(e.target.value)}
                placeholder={
                  fetchingHtml
                    ? "Fetching HTML from the destination page…"
                    : "No HTML captured yet — use Refresh From Page to fetch the destination, or paste your own creative."
                }
                className="h-[50vh] font-mono text-xs"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saveHtml}>
              Save HTML
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </main>
  );
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
