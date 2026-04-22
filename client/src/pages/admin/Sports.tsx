import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Zap } from "lucide-react";

export default function AdminSports() {
  const { data: sports, refetch: refetchSports } = trpc.sports.listAll.useQuery();
  const setActive = trpc.sports.setActive.useMutation({ onSuccess: () => { refetchSports(); toast.success("Updated"); } });

  const [selectedSportId, setSelectedSportId] = useState<number | null>(null);
  const { data: teams, refetch: refetchTeams } = trpc.sports.listTeams.useQuery(
    { sportId: selectedSportId! },
    { enabled: !!selectedSportId }
  );
  const createTeam = trpc.sports.createTeam.useMutation({ onSuccess: () => { refetchTeams(); setTeamOpen(false); toast.success("Team created"); } });

  const [teamOpen, setTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", abbreviation: "" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Sports & Teams</h1>
          <p className="text-muted-foreground mt-1">Configure which sports are active on the platform</p>
        </div>

        {/* Sports list */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sports?.map(sport => (
            <Card
              key={sport.id}
              className={`cursor-pointer transition-all ${selectedSportId === sport.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedSportId(sport.id)}
            >
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{sport.name}</p>
                      <p className="text-xs text-muted-foreground">{sport.isActive ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                  <Switch
                    checked={sport.isActive}
                    onCheckedChange={v => setActive.mutate({ id: sport.id, isActive: v })}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Teams for selected sport */}
        {selectedSportId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Teams — {sports?.find(s => s.id === selectedSportId)?.name}
              </CardTitle>
              <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1"><Plus size={14} /> Add Team</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add Team</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1">
                      <Label>Team Name</Label>
                      <Input value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="Collingwood" />
                    </div>
                    <div className="space-y-1">
                      <Label>Abbreviation</Label>
                      <Input value={teamForm.abbreviation} onChange={e => setTeamForm(f => ({ ...f, abbreviation: e.target.value.toUpperCase() }))} placeholder="COL" maxLength={10} />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createTeam.mutate({ sportId: selectedSportId, name: teamForm.name, abbreviation: teamForm.abbreviation || undefined })}
                      disabled={createTeam.isPending || !teamForm.name}
                    >
                      {createTeam.isPending ? "Adding…" : "Add Team"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {!teams?.length ? (
                <p className="text-muted-foreground text-sm">No teams yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border">
                      <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {team.abbreviation ?? team.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium truncate">{team.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
