import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Mail, Settings, BarChart3, ToggleLeft, ToggleRight,
  Edit3, Send, RefreshCw, Upload, Eye, EyeOff,
  CheckCircle2, XCircle, AlertTriangle, Info,
  LineChart, Users, TrendingUp, Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Tab = "templates" | "branding" | "bounce";

interface Template {
  id: number;
  templateKey: string;
  recipientRole: "admin" | "entrant";
  name: string;
  triggerDesc: string | null;
  isEnabled: boolean;
  subject: string;
  bodyHtml: string;
  placeholders: string[];
}

// ── Placeholder helper ────────────────────────────────────────────────────────
function PlaceholderBadge({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      title={`Click to copy {{${name}}}`}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border transition-colors",
        copied
          ? "bg-green-50 border-green-300 text-green-700"
          : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      )}
    >
      {`{{${name}}}`}
      {copied && <CheckCircle2 size={10} />}
    </button>
  );
}
// ── Digest Preview Modal ───────────────────────────────────────────────────────────
function DigestPreviewModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = trpc.email.getDigestPreview.useQuery();

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LineChart size={18} className="text-primary" />
            Weekly Digest Preview
          </DialogTitle>
          {data?.hasData && (
            <p className="text-sm text-muted-foreground">
              Based on <span className="font-medium">{data.roundLabel}</span> — {data.competitionName}
            </p>
          )}
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading real engagement data…</p>
          </div>
        )}

        {!isLoading && !data?.hasData && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Inbox size={40} className="opacity-30" />
            <p className="font-medium">No scored rounds yet</p>
            <p className="text-sm text-center max-w-xs">
              The digest preview will appear here once at least one round has been scored.
              Score a round first, then return to preview the digest.
            </p>
          </div>
        )}

        {!isLoading && data?.hasData && (
          <div className="space-y-5">
            {/* Stats summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border bg-card p-3 text-center">
                <Users size={16} className="mx-auto mb-1 text-blue-500" />
                <div className="text-2xl font-bold tabular-nums">{data.stats.activeEntrants}</div>
                <div className="text-xs text-muted-foreground">Active Entrants</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <Send size={16} className="mx-auto mb-1 text-purple-500" />
                <div className="text-2xl font-bold tabular-nums">{data.stats.tipsSubmitted}</div>
                <div className="text-xs text-muted-foreground">Tips Submitted</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <TrendingUp size={16} className="mx-auto mb-1 text-green-500" />
                <div className="text-2xl font-bold tabular-nums">{data.stats.openRate}</div>
                <div className="text-xs text-muted-foreground">Open Rate (30d)</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-center">
                <AlertTriangle size={16} className="mx-auto mb-1 text-orange-500" />
                <div className="text-2xl font-bold tabular-nums">{data.stats.bounceRate}</div>
                <div className="text-xs text-muted-foreground">Bounce Rate (30d)</div>
              </div>
            </div>

            {/* Subject line */}
            <div className="rounded-md border bg-muted/40 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-2">Subject:</span>
              <span className="text-sm font-medium">{data.renderedSubject}</span>
            </div>

            {/* Rendered email body in a sandboxed iframe */}
            <div className="rounded-md border overflow-hidden">
              <div className="bg-muted/30 border-b px-4 py-2 flex items-center gap-2">
                <Mail size={13} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Email body preview</span>
                <Badge variant="outline" className="ml-auto text-xs">Live data</Badge>
              </div>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#f9fafb;font-family:sans-serif;}</style></head><body>${data.renderedHtml}</body></html>`}
                className="w-full border-0"
                style={{ minHeight: 480 }}
                title="Digest email preview"
                sandbox="allow-same-origin"
                onLoad={(e) => {
                  // Auto-resize iframe to content height
                  const iframe = e.currentTarget;
                  try {
                    const h = iframe.contentDocument?.body?.scrollHeight;
                    if (h) iframe.style.height = `${h + 32}px`;
                  } catch { /* cross-origin guard */ }
                }}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Customise Modal ────────────────────────────────────────────────────────────
function CustomiseModal({
  template,
  onClose,
  onSaved,
}: {
  template: Template;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState(template.subject);
  const [bodyHtml, setBodyHtml] = useState(template.bodyHtml);
  const [preview, setPreview] = useState(false);

  const utils = trpc.useUtils();
  const update = trpc.email.updateTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template saved");
      utils.email.listTemplates.invalidate();
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customise: {template.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Subject */}
          <div className="space-y-1">
            <Label>Subject line</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject…"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Body HTML</Label>
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {preview ? <EyeOff size={12} /> : <Eye size={12} />}
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div
                className="border rounded-md p-4 min-h-[200px] prose prose-sm max-w-none bg-white text-gray-900"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={12}
                className="font-mono text-xs"
                placeholder="HTML body…"
              />
            )}
          </div>

          {/* Placeholder reference */}
          {template.placeholders.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Info size={12} />
                Available placeholders (click to copy)
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {template.placeholders.map((p) => (
                  <PlaceholderBadge key={p} name={p} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              update.mutate({
                templateKey: template.templateKey,
                subject,
                bodyHtml,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? "Saving…" : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/// ── Templates Tab ────────────────────────────────────────────────────────────
function TemplatesTab() {
  const { data: templates = [], isLoading } = trpc.email.listTemplates.useQuery();
  const [customising, setCustomising] = useState<Template | null>(null);
  const [showDigestPreview, setShowDigestPreview] = useState(false);
  const utils = trpc.useUtils();

  const toggle = trpc.email.updateTemplate.useMutation({
    onSuccess: () => utils.email.listTemplates.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const sendTest = trpc.email.sendTest.useMutation({
    onSuccess: (res) => {
      if (res.sent) {
        toast.success("Test email sent (check your inbox or server logs)");
      } else {
        toast.info(`Test email not sent: ${res.reason ?? "stub mode"}`);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const adminTemplates = templates.filter((t) => t.recipientRole === "admin");
  const entrantTemplates = templates.filter((t) => t.recipientRole === "entrant");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Mail size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium">No templates found</p>
        <p className="text-sm mt-1">
          Templates are seeded automatically when your account is set up.
        </p>
      </div>
    );
  }

  const TemplateRow = ({ t }: { t: Template }) => (
    <div className="flex items-start gap-4 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{t.name}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              t.recipientRole === "admin"
                ? "border-blue-200 text-blue-700"
                : "border-purple-200 text-purple-700"
            )}
          >
            {t.recipientRole === "admin" ? "Admin" : "Entrant"}
          </Badge>
          {!t.isEnabled && (
            <Badge variant="outline" className="text-xs border-red-200 text-red-600">
              Disabled
            </Badge>
          )}
        </div>
        {t.triggerDesc && (
          <p className="text-xs text-muted-foreground mt-0.5">{t.triggerDesc}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
          Subject: {t.subject}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Preview Digest button — only shown for the admin_weekly_digest template */}
        {t.templateKey === "admin_weekly_digest" && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => setShowDigestPreview(true)}
            title="Preview this email with real engagement data from the most recent scored round"
          >
            <LineChart size={13} className="mr-1" />
            Preview Digest
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => setCustomising(t as Template)}
        >
          <Edit3 size={13} className="mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-xs"
          onClick={() => sendTest.mutate({ templateKey: t.templateKey })}
          disabled={sendTest.isPending}
        >
          <Send size={13} className="mr-1" />
          Test
        </Button>
        <button
          onClick={() =>
            toggle.mutate({
              templateKey: t.templateKey,
              isEnabled: !t.isEnabled,
            })
          }
          className={cn(
            "p-1.5 rounded transition-colors",
            t.isEnabled
              ? "text-green-600 hover:bg-green-50"
              : "text-muted-foreground hover:bg-muted"
          )}
          title={t.isEnabled ? "Disable" : "Enable"}
        >
          {t.isEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Admin Notifications ({adminTemplates.length})
        </h3>
        <Card>
          <CardContent className="p-0 divide-y">
            {adminTemplates.map((t) => (
              <TemplateRow key={t.templateKey} t={t as Template} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
          Entrant Emails ({entrantTemplates.length})
        </h3>
        <Card>
          <CardContent className="p-0 divide-y">
            {entrantTemplates.map((t) => (
              <TemplateRow key={t.templateKey} t={t as Template} />
            ))}
          </CardContent>
        </Card>
      </div>

      {customising && (
        <CustomiseModal
          template={customising}
          onClose={() => setCustomising(null)}
          onSaved={() => setCustomising(null)}
        />
      )}
      {showDigestPreview && (
        <DigestPreviewModal onClose={() => setShowDigestPreview(false)} />
      )}
    </div>
  );
}

// ── Branding Tab ──────────────────────────────────────────────────────────────
function BrandingTab() {
  const { data: branding, isLoading } = trpc.email.getBranding.useQuery();
  const utils = trpc.useUtils();

  const [logoUrl, setLogoUrl] = useState<string>("");
  const [logoPosition, setLogoPosition] = useState<"top" | "bottom">("top");
  const [primaryColor, setPrimaryColor] = useState("#2B4EAE");
  const [footerText, setFooterText] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [initialised, setInitialised] = useState(false);

  // Populate form once data loads
  if (branding && !initialised) {
    setLogoUrl(branding.logoUrl ?? "");
    setLogoPosition(branding.logoPosition ?? "top");
    setPrimaryColor(branding.primaryColor ?? "#2B4EAE");
    setFooterText(branding.footerText ?? "");
    setBusinessAddress(branding.businessAddress ?? "");
    setInitialised(true);
  }

  const update = trpc.email.updateBranding.useMutation({
    onSuccess: () => {
      toast.success("Branding settings saved");
      utils.email.getBranding.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    update.mutate({
      logoUrl: logoUrl || null,
      logoPosition,
      primaryColor,
      footerText: footerText || null,
      businessAddress: businessAddress || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Logo</CardTitle>
            <CardDescription>
              Paste the URL of your logo image. Use the storage upload tool to get a URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Logo URL</Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://…/logo.png"
              />
            </div>
            <div className="space-y-1">
              <Label>Logo position</Label>
              <div className="flex gap-2">
                {(["top", "bottom"] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setLogoPosition(pos)}
                    className={cn(
                      "flex-1 py-2 rounded-md border text-sm font-medium transition-colors",
                      logoPosition === pos
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Colours</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Primary colour (buttons, headings)</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded border cursor-pointer"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="font-mono"
                  maxLength={7}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Footer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Footer text</Label>
              <Textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={3}
                placeholder="e.g. © 2025 Acme Pub Group. All rights reserved."
              />
            </div>
            <div className="space-y-1">
              <Label>Business address</Label>
              <Textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                rows={2}
                placeholder="e.g. 123 Main St, Melbourne VIC 3000"
              />
              <p className="text-xs text-muted-foreground">
                Required for CAN-SPAM / Australian Spam Act compliance.
              </p>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={update.isPending} className="w-full">
          {update.isPending ? "Saving…" : "Save Branding Settings"}
        </Button>
      </div>

      {/* Live preview */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          Live Preview
        </h3>
        <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
          {/* Email chrome */}
          <div className="bg-gray-100 px-4 py-2 border-b text-xs text-gray-500 font-mono">
            From: no-reply@bigtipping.com &nbsp;|&nbsp; Subject: Round 5 results are in
          </div>
          <div className="p-6 bg-white">
            {/* Logo */}
            {logoUrl && logoPosition === "top" && (
              <div className="mb-4 text-center">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-12 max-w-[180px] mx-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
            {/* Header bar */}
            <div
              className="rounded-t-md px-5 py-4 mb-0"
              style={{ backgroundColor: primaryColor }}
            >
              <p className="text-white font-bold text-lg m-0">Big Tipping</p>
            </div>
            {/* Body */}
            <div className="border border-t-0 rounded-b-md px-5 py-4">
              <h2 className="text-lg font-bold text-gray-800 mt-0">
                Round 5 has been scored
              </h2>
              <p className="text-gray-600 text-sm">Hi Jane,</p>
              <p className="text-gray-600 text-sm">
                Round 5 of <strong>AFL 2025 Tipping</strong> has been scored and the
                leaderboard has been updated.
              </p>
              <div className="mt-4">
                <a
                  href="#"
                  className="inline-block px-5 py-2.5 rounded-md text-white text-sm font-semibold no-underline"
                  style={{ backgroundColor: primaryColor }}
                >
                  View Leaderboard
                </a>
              </div>
            </div>
            {/* Footer */}
            {(footerText || businessAddress) && (
              <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center space-y-1">
                {footerText && <p>{footerText}</p>}
                {businessAddress && <p>{businessAddress}</p>}
              </div>
            )}
            {/* Logo bottom */}
            {logoUrl && logoPosition === "bottom" && (
              <div className="mt-4 text-center">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="max-h-10 max-w-[140px] mx-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bounce Dashboard Tab ──────────────────────────────────────────────────────
function BounceDashboardTab() {
  const { data, isLoading } = trpc.email.getBounceDashboard.useQuery();

  const statsMap = Object.fromEntries(
    (data?.stats ?? []).map((s) => [s.eventType, s.count])
  );

  const sent = statsMap["sent"] ?? 0;
  const delivered = statsMap["delivered"] ?? 0;
  const bounces = statsMap["bounce"] ?? 0;
  const complaints = statsMap["complaint"] ?? 0;
  const opens = statsMap["open"] ?? 0;
  const clicks = statsMap["click"] ?? 0;

  const openRate = sent > 0 ? ((opens / sent) * 100).toFixed(1) : "—";
  const bounceRate = sent > 0 ? ((bounces / sent) * 100).toFixed(1) : "—";

  const StatCard = ({
    label,
    value,
    sub,
    color,
    icon,
  }: {
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
    icon: React.ReactNode;
  }) => (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {label}
            </p>
            <p className={cn("text-3xl font-bold mt-1", color ?? "text-foreground")}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn("p-2 rounded-lg", color ? "bg-current/10" : "bg-muted")}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Sent"
          value={sent.toLocaleString()}
          icon={<Send size={16} className="text-blue-600" />}
        />
        <StatCard
          label="Delivered"
          value={delivered.toLocaleString()}
          icon={<CheckCircle2 size={16} className="text-green-600" />}
          color="text-green-600"
        />
        <StatCard
          label="Opens"
          value={opens.toLocaleString()}
          sub={`${openRate}% open rate`}
          icon={<Eye size={16} className="text-purple-600" />}
          color="text-purple-600"
        />
        <StatCard
          label="Clicks"
          value={clicks.toLocaleString()}
          icon={<BarChart3 size={16} className="text-indigo-600" />}
          color="text-indigo-600"
        />
        <StatCard
          label="Bounces"
          value={bounces.toLocaleString()}
          sub={`${bounceRate}% bounce rate`}
          icon={<AlertTriangle size={16} className="text-amber-600" />}
          color="text-amber-600"
        />
        <StatCard
          label="Complaints"
          value={complaints.toLocaleString()}
          icon={<XCircle size={16} className="text-red-600" />}
          color="text-red-600"
        />
      </div>

      {/* Recent bounces & complaints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Bounces & Complaints</CardTitle>
          <CardDescription>Last 50 delivery issues</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(data?.recentEvents ?? []).length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-500 opacity-60" />
              No bounces or complaints recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Recipient
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Type
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Template
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Bounce Type
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentEvents ?? []).map((ev) => (
                    <tr key={ev.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {ev.recipientEmail}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            ev.eventType === "bounce"
                              ? "border-amber-200 text-amber-700"
                              : "border-red-200 text-red-700"
                          )}
                        >
                          {ev.eventType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {ev.templateKey}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {ev.bounceType ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleString("en-AU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AWS SES info */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">AWS SES Integration</p>
              <p>
                Bounce and complaint data is populated via AWS SES SNS notifications. To
                enable live email sending, add your{" "}
                <code className="bg-blue-100 px-1 rounded text-xs">
                  AWS_ACCESS_KEY_ID
                </code>
                ,{" "}
                <code className="bg-blue-100 px-1 rounded text-xs">
                  AWS_SECRET_ACCESS_KEY
                </code>
                ,{" "}
                <code className="bg-blue-100 px-1 rounded text-xs">AWS_REGION</code>, and{" "}
                <code className="bg-blue-100 px-1 rounded text-xs">SES_FROM_EMAIL</code>{" "}
                environment variables. Until then, emails are logged to the server console
                in stub mode.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmailSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("templates");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "templates", label: "Templates", icon: <Mail size={15} /> },
    { id: "branding",  label: "Branding",  icon: <Settings size={15} /> },
    { id: "bounce",    label: "Bounce Dashboard", icon: <BarChart3 size={15} /> },
  ];

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Email Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage email templates, branding, and monitor delivery health.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "templates" && <TemplatesTab />}
          {activeTab === "branding" && <BrandingTab />}
          {activeTab === "bounce" && <BounceDashboardTab />}
        </div>
      </div>
    </AdminLayout>
  );
}
