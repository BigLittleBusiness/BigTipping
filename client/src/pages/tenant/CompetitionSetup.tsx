import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Save, ToggleLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function CompetitionSetup() {
  const { data: competitions } = trpc.competitions.list.useQuery();
  const [compId, setCompId] = useState<number>(0);
  const selectedComp = compId || competitions?.[0]?.id || 0;

  const { data: branding, refetch } = trpc.competitions.getBranding.useQuery(
    { competitionId: selectedComp },
    { enabled: selectedComp > 0 }
  );

  const [fontColour, setFontColour] = useState("#111827");
  const [fontType, setFontType] = useState("Inter");
  const [bgColour, setBgColour] = useState("#ffffff");
  const [bgImageUrl, setBgImageUrl] = useState("");
  const [bgImageMode, setBgImageMode] = useState<"centred" | "full_width" | "tile">("full_width");
  const [landingPageText, setLandingPageText] = useState("");
  const [allowDraw, setAllowDraw] = useState(false);

  useEffect(() => {
    if (branding) {
      setFontColour(branding.fontColour ?? "#111827");
      setFontType(branding.fontType ?? "Inter");
      setBgColour(branding.bgColour ?? "#ffffff");
      setBgImageUrl(branding.bgImageUrl ?? "");
      setBgImageMode((branding.bgImageMode as "centred" | "full_width" | "tile") ?? "full_width");
      setLandingPageText(branding.landingPageText ?? "");
    }
  }, [branding]);

  // Load allowDraw from the selected competition row
  const selectedCompData = competitions?.find(c => c.id === selectedComp);
  useEffect(() => {
    setAllowDraw(selectedCompData?.allowDraw ?? false);
  }, [selectedCompData]);

  const updateBranding = trpc.competitions.updateBranding.useMutation({
    onSuccess: () => { toast.success("Branding saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const updateSettings = trpc.competitions.updateSettings.useMutation({
    onSuccess: () => toast.success("Settings saved"),
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    updateBranding.mutate({
      competitionId: selectedComp,
      fontColour,
      fontType,
      bgColour,
      bgImageUrl: bgImageUrl || undefined,
      bgImageMode,
      landingPageText: landingPageText || undefined,
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Competition Setup</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Customise branding and landing page content</p>
          </div>
          {competitions && competitions.length > 1 && (
            <Select value={String(selectedComp)} onValueChange={v => setCompId(Number(v))}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent>
                {competitions.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette size={16} />
              Colours &amp; Typography
            </CardTitle>
            <CardDescription>Applied to the entrant-facing competition page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Font Colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fontColour}
                    onChange={e => setFontColour(e.target.value)}
                    className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                  />
                  <Input
                    value={fontColour}
                    onChange={e => setFontColour(e.target.value)}
                    className="font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Background Colour</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColour}
                    onChange={e => setBgColour(e.target.value)}
                    className="h-9 w-12 rounded border border-input cursor-pointer p-0.5"
                  />
                  <Input
                    value={bgColour}
                    onChange={e => setBgColour(e.target.value)}
                    className="font-mono text-xs"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Font Family</Label>
              <Select value={fontType} onValueChange={setFontType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Raleway", "Nunito", "Source Sans Pro"].map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Background Image</CardTitle>
            <CardDescription>Optional — overrides background colour when set</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                placeholder="https://example.com/background.jpg"
                value={bgImageUrl}
                onChange={e => setBgImageUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Mode</Label>
              <Select value={bgImageMode} onValueChange={v => setBgImageMode(v as "centred" | "full_width" | "tile")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="centred">Centred</SelectItem>
                  <SelectItem value="full_width">Full Width (cover)</SelectItem>
                  <SelectItem value="tile">Tile (repeat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Landing Page Content</CardTitle>
            <CardDescription>Rich text shown on the competition landing page (Markdown supported)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={8}
              placeholder="Welcome to our tipping competition! Join now to compete for prizes…"
              value={landingPageText}
              onChange={e => setLandingPageText(e.target.value)}
              className="font-mono text-sm"
            />
          </CardContent>
        </Card>

        {/* Draw Option */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ToggleLeft size={16} />
              Game Options
            </CardTitle>
            <CardDescription>Configure tipping rules for this competition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Allow Draw Tips</Label>
                <p className="text-xs text-muted-foreground">
                  When enabled, entrants can tip a draw on any fixture. Applies to sports like AFL and NRL where draws are possible.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className="text-xs text-muted-foreground">{allowDraw ? "On" : "Off"}</span>
                <Switch
                  checked={allowDraw}
                  onCheckedChange={(checked) => {
                    setAllowDraw(checked);
                    updateSettings.mutate({ competitionId: selectedComp, allowDraw: checked });
                  }}
                  disabled={updateSettings.isPending || selectedComp === 0}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateBranding.isPending}>
            <Save size={14} className="mr-1.5" />
            {updateBranding.isPending ? "Saving…" : "Save Branding"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
