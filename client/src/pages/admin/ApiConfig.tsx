import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Loader2, Save, Plug, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, Key, Globe, Zap, FileText,
} from "lucide-react";

interface ApiConfigFormProps {
  sportId: number;
  sportName: string;
  existing: {
    providerName: string;
    baseUrl: string;
    apiKey: string | null;
    endpointFixtures: string | null;
    endpointResults: string | null;
    additionalHeaders: Record<string, string> | null;
    isActive: boolean;
    notes: string | null;
  } | null;
  onSaved: () => void;
}

function ApiConfigForm({ sportId, sportName, existing, onSaved }: ApiConfigFormProps) {
  const [expanded, setExpanded] = useState(!!existing);
  const [providerName, setProviderName]           = useState(existing?.providerName ?? "");
  const [baseUrl, setBaseUrl]                     = useState(existing?.baseUrl ?? "");
  const [apiKey, setApiKey]                       = useState(existing?.apiKey ?? "");
  const [endpointFixtures, setEndpointFixtures]   = useState(existing?.endpointFixtures ?? "");
  const [endpointResults, setEndpointResults]     = useState(existing?.endpointResults ?? "");
  const [headersRaw, setHeadersRaw]               = useState(
    existing?.additionalHeaders ? JSON.stringify(existing.additionalHeaders, null, 2) : ""
  );
  const [isActive, setIsActive]                   = useState(existing?.isActive ?? true);
  const [notes, setNotes]                         = useState(existing?.notes ?? "");

  const upsert = trpc.sportApiConfigs.upsert.useMutation({
    onSuccess: (data) => {
      toast.success(`API configuration ${data.action} for ${sportName}`);
      onSaved();
    },
    onError: (e) => toast.error(e.message ?? "Failed to save configuration"),
  });

  const handleSave = () => {
    if (!providerName.trim()) { toast.error("Provider name is required"); return; }
    if (!baseUrl.trim()) { toast.error("Base URL is required"); return; }

    let additionalHeaders: Record<string, string> | null = null;
    if (headersRaw.trim()) {
      try {
        additionalHeaders = JSON.parse(headersRaw);
      } catch {
        toast.error("Additional headers must be valid JSON");
        return;
      }
    }

    upsert.mutate({
      sportId,
      providerName: providerName.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || null,
      endpointFixtures: endpointFixtures.trim() || null,
      endpointResults: endpointResults.trim() || null,
      additionalHeaders,
      isActive,
      notes: notes.trim() || null,
    });
  };

  return (
    <Card className={existing?.isActive === false ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Plug size={16} className="text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{sportName}</CardTitle>
              {existing ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{existing.providerName}</span>
                  {existing.isActive ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-300 text-xs gap-1">
                      <CheckCircle2 size={10} /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                      <AlertCircle size={10} /> Inactive
                    </Badge>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">No API configured</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setExpanded(e => !e)}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Collapse" : "Configure"}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-5 pt-0">
          <div className="h-px bg-border" />

          {/* Provider & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-sm">
                <Zap size={13} /> Provider Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={providerName}
                onChange={e => setProviderName(e.target.value)}
                placeholder="e.g. SportRadar, The Odds API, AFL Tables"
              />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label className="text-sm cursor-pointer" onClick={() => setIsActive(v => !v)}>
                {isActive ? "Active — will be used for imports" : "Inactive — disabled"}
              </Label>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <Globe size={13} /> Base URL <span className="text-destructive">*</span>
            </Label>
            <Input
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              The root URL of the API. Endpoint paths are appended to this.
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <Key size={13} /> API Key / Token
            </Label>
            <Input
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Leave blank if not required"
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              Stored securely. Used as a Bearer token or query parameter depending on the provider.
            </p>
          </div>

          {/* Endpoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Fixtures Endpoint</Label>
              <Input
                value={endpointFixtures}
                onChange={e => setEndpointFixtures(e.target.value)}
                placeholder="/fixtures or /schedule/{season}"
              />
              <p className="text-xs text-muted-foreground">Path appended to Base URL to fetch fixtures.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Results Endpoint</Label>
              <Input
                value={endpointResults}
                onChange={e => setEndpointResults(e.target.value)}
                placeholder="/results or /scores/{round}"
              />
              <p className="text-xs text-muted-foreground">Path appended to Base URL to fetch results.</p>
            </div>
          </div>

          {/* Additional Headers */}
          <div className="space-y-1.5">
            <Label className="text-sm">Additional Headers (JSON)</Label>
            <Textarea
              value={headersRaw}
              onChange={e => setHeadersRaw(e.target.value)}
              placeholder={'{\n  "X-Api-Version": "2",\n  "Accept": "application/json"\n}'}
              className="font-mono text-xs h-24"
            />
            <p className="text-xs text-muted-foreground">
              Optional HTTP headers sent with every request. Must be valid JSON object.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-sm">
              <FileText size={13} /> Notes
            </Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Rate limit: 100 req/min. Season parameter format: 2025. Contact: api@provider.com"
              className="h-20 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setExpanded(false)}>
              Cancel
            </Button>
            <Button size="sm" className="gap-1" onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ApiConfig() {
  const { data: sports } = trpc.sports.listAll.useQuery();
  const { data: configs, refetch } = trpc.sportApiConfigs.list.useQuery();

  const configBySportId = Object.fromEntries(
    (configs ?? []).map(c => [c.sportId, c])
  );

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-heading">API Configuration</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Configure third-party data provider APIs for each sport. These settings are used to
            import fixtures and results automatically. API providers can be changed at any time
            without affecting existing data.
          </p>
        </div>

        {/* Info card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Plug size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-800 space-y-1">
                <p className="font-medium">How API imports work</p>
                <p>
                  When a System Admin triggers an import, the platform calls the configured
                  endpoint, maps the response to fixtures or results, and saves them to the database.
                  The API key is sent as a Bearer token by default. Use Additional Headers for
                  providers that require a different authentication method.
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Only active configurations will be used for imports. You can have multiple
                  providers configured but only the active one will be called.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-sport config cards */}
        {!sports ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : sports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No sports configured. Add sports first from the Sports Management page.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sports.map(sport => (
              <ApiConfigForm
                key={sport.id}
                sportId={sport.id}
                sportName={sport.name}
                existing={configBySportId[sport.id] ?? null}
                onSaved={refetch}
              />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
