import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function FieldInfo({ text }: { text: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info size={13} className="text-muted-foreground cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ScoringRules() {
  const { data: competitions } = trpc.competitions.list.useQuery();
  const [compId, setCompId] = useState<number>(0);
  const selectedComp = compId || competitions?.[0]?.id || 0;

  const { data: comp, refetch } = trpc.competitions.get.useQuery(
    { id: selectedComp },
    { enabled: selectedComp > 0 }
  );

  // Scoring rule fields (names match server schema)
  const [pointsPerCorrectTip, setPointsPerCorrectTip] = useState(1);
  const [incorrectTipPoints, setIncorrectTipPoints] = useState(0);
  const [bonusMarginCorrect, setBonusMarginCorrect] = useState(0);
  const [bonusPerfectRound, setBonusPerfectRound] = useState(0);
  const [streakBonusEnabled, setStreakBonusEnabled] = useState(false);
  const [defaultScoreForUntipped, setDefaultScoreForUntipped] = useState(0);
  const [defaultMarginValue, setDefaultMarginValue] = useState(0);
  const [jokerRoundEnabled, setJokerRoundEnabled] = useState(false);
  const [jokerMultiplier, setJokerMultiplier] = useState(2);

  useEffect(() => {
    if (comp?.scoringRules) {
      const r = comp.scoringRules as Record<string, unknown>;
      setPointsPerCorrectTip(Number(r.pointsPerCorrectTip ?? 1));
      setIncorrectTipPoints(Number(r.incorrectTipPoints ?? 0));
      setBonusMarginCorrect(Number(r.bonusMarginCorrect ?? 0));
      setBonusPerfectRound(Number(r.bonusPerfectRound ?? 0));
      setStreakBonusEnabled(Boolean(r.streakBonusEnabled ?? false));
      setDefaultScoreForUntipped(Number(r.defaultScoreForUntipped ?? 0));
      setDefaultMarginValue(Number(r.defaultMarginValue ?? 0));
      setJokerRoundEnabled(Boolean(r.jokerRoundEnabled ?? false));
      setJokerMultiplier(Number(r.jokerMultiplier ?? 2));
    }
  }, [comp]);

  const updateRules = trpc.competitions.updateScoringRules.useMutation({
    onSuccess: () => { toast.success("Scoring rules saved"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  function handleSave() {
    updateRules.mutate({
      competitionId: selectedComp,
      scoringRules: {
        pointsPerCorrectTip,
        incorrectTipPoints,
        bonusMarginCorrect,
        bonusPerfectRound,
        streakBonusEnabled,
        defaultScoreForUntipped,
        defaultMarginValue,
        jokerRoundEnabled,
        jokerMultiplier,
      },
    });
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Scoring Rules</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Configure how points are awarded each round</p>
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
            <CardTitle className="text-base">Points per Tip</CardTitle>
            <CardDescription>Base points awarded or deducted per fixture result</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>
                Correct Tip Points
                <FieldInfo text="Points awarded when an entrant correctly tips the winning team" />
              </Label>
              <Input type="number" min={0} value={pointsPerCorrectTip} onChange={e => setPointsPerCorrectTip(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Incorrect Tip Points
                <FieldInfo text="Points awarded (or deducted if negative) for an incorrect tip" />
              </Label>
              <Input type="number" value={incorrectTipPoints} onChange={e => setIncorrectTipPoints(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Bonus Margin Points
                <FieldInfo text="Extra points awarded for correctly predicting the winning margin. Set 0 to disable." />
              </Label>
              <Input type="number" min={0} value={bonusMarginCorrect} onChange={e => setBonusMarginCorrect(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Default Margin Value
                <FieldInfo text="Assumed margin applied when an entrant does not submit a margin tip" />
              </Label>
              <Input type="number" min={0} value={defaultMarginValue} onChange={e => setDefaultMarginValue(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>
                Perfect Round Bonus
                <FieldInfo text="Bonus points awarded when an entrant tips every fixture correctly in a round" />
              </Label>
              <Input type="number" min={0} value={bonusPerfectRound} onChange={e => setBonusPerfectRound(Number(e.target.value))} />
            </div>
            <div className="flex items-center justify-between col-span-2">
              <div>
                <Label>Streak Bonus</Label>
                <p className="text-xs text-muted-foreground">Award bonus points for consecutive correct-tip streaks</p>
              </div>
              <Switch checked={streakBonusEnabled} onCheckedChange={setStreakBonusEnabled} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Untipped Fixtures</CardTitle>
            <CardDescription>How to score fixtures where an entrant did not submit a tip</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-w-xs">
              <Label>
                Default Score for Untipped
                <FieldInfo text="Points assigned to an entrant for a fixture they did not tip. Use 0 to award nothing, or a negative value to penalise." />
              </Label>
              <Input type="number" value={defaultScoreForUntipped} onChange={e => setDefaultScoreForUntipped(Number(e.target.value))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Joker Round</CardTitle>
            <CardDescription>Allow entrants to nominate one round where their points are multiplied</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Enable Joker Round</Label>
              <Switch checked={jokerRoundEnabled} onCheckedChange={setJokerRoundEnabled} />
            </div>
            {jokerRoundEnabled && (
              <div className="space-y-1.5 max-w-xs">
                <Label>
                  Multiplier
                  <FieldInfo text="Points earned in the joker round are multiplied by this value" />
                </Label>
                <Input type="number" min={2} max={5} value={jokerMultiplier} onChange={e => setJokerMultiplier(Number(e.target.value))} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateRules.isPending}>
            <Save size={14} className="mr-1.5" />
            {updateRules.isPending ? "Saving…" : "Save Rules"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
