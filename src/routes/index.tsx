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
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <div className="flex justify-center">
          <img
            src={logoAsset.url}
            alt="IgnitionBrain Campaigns"
            className="w-full max-w-md rounded-lg shadow-2xl"
          />
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-destructive sm:text-5xl">
            ESTA EXTENSÃO FOI PIRATEADA
          </h1>

          <div className="space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>
              A chave utilizada nesta extensão foi bloqueada por uso não autorizado.
              Fale com o contato oficial abaixo para adquirir a versão original.
            </p>
            <p className="font-semibold text-foreground">
              FALAR COM O CONTATO OFICIAL (91) 98583-7992 ou no botão abaixo
            </p>
          </div>

          <div className="pt-4">
            <Button
              variant="brand"
              size="lg"
              className="h-16 px-10 text-xl font-bold uppercase tracking-wider shadow-lg hover:scale-105 transition-transform"
              onClick={() => window.open("https://wa.me/91985837992", "_blank")}
            >
              CHAMAR NO WHATSAPP
            </Button>
          </div>
        </div>

        <div className="pt-12 text-xs uppercase tracking-[0.2em] text-muted-foreground/50">
          IgnitionBrain Security System
        </div>
      </div>
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
