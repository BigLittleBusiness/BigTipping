import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Plus, Award } from "lucide-react";

export default function PrizesManagement() {
  const { data: competitions } = trpc.competitions.list.useQuery();
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  const { data: prizes, refetch } = trpc.prizes.list.useQuery(
    { competitionId: selectedCompId! },
    { enabled: !!selectedCompId }
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [prizeName, setPrizeName] = useState("");
  const [prizeDesc, setPrizeDesc] = useState("");

  const [prizeType, setPrizeType] = useState<"weekly" | "season" | "special">("weekly");

  const [awardOpen, setAwardOpen] = useState(false);
  const [awardPrizeId, setAwardPrizeId] = useState<number | null>(null);
  const [awardUserId, setAwardUserId] = useState("");


  const createPrize = trpc.prizes.create.useMutation({
    onSuccess: () => {
      toast.success("Prize created");
      setCreateOpen(false);
      setPrizeName(""); setPrizeDesc(""); setPrizeType("weekly");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const awardPrize = trpc.prizes.award.useMutation({
    onSuccess: () => {
      toast.success("Prize awarded");
      setAwardOpen(false);
      setAwardUserId("");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prizes</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Create and award prizes for your competitions</p>
          </div>
          {selectedCompId && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={15} className="mr-1.5" /> Add Prize
            </Button>
          )}
        </div>

        {/* Competition selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-1.5 max-w-xs">
              <Label>Select Competition</Label>
              <Select
                value={selectedCompId?.toString() ?? ""}
                onValueChange={v => setSelectedCompId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a competition…" />
                </SelectTrigger>
                <SelectContent>
                  {(competitions ?? []).map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Prizes list */}
        {selectedCompId && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-muted-foreground" />
                <CardTitle className="text-base">Prizes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!prizes || prizes.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No prizes yet. Add one above.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Prize</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Type</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Value</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Status</th>
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(prizes as Array<{ id: number; name: string; type: string; isAwarded: boolean; description: string | null; awardedTo: { id: number; name: string | null; email: string | null } | null; awardedToUserId: number | null }>).map((prize) => (
                      <tr key={prize.id} className="border-b border-border last:border-0">
                        <td className="py-2 px-2">
                          <p className="font-medium">{prize.name}</p>
                          {prize.description && <p className="text-xs text-muted-foreground">{prize.description}</p>}
                        </td>
                        <td className="py-2 px-2 capitalize">{prize.type}</td>
                        <td className="py-2 px-2">{prize.awardedTo ? (prize.awardedTo.name ?? prize.awardedTo.email ?? `#${prize.awardedToUserId}`) : "—"}</td>
                        <td className="py-2 px-2">
                          {prize.isAwarded ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">Awarded</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 text-xs">Pending</Badge>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {!prize.isAwarded && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setAwardPrizeId(prize.id); setAwardOpen(true); }}
                            >
                              <Award size={13} className="mr-1" /> Award
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create Prize Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Prize</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Prize Name</Label>
                <Input value={prizeName} onChange={e => setPrizeName(e.target.value)} placeholder="Weekly Winner" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={prizeDesc} onChange={e => setPrizeDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                  <Select value={prizeType} onValueChange={v => setPrizeType(v as "weekly" | "season" | "special")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="season">Season</SelectItem>
                      <SelectItem value="special">Special</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                disabled={!prizeName || createPrize.isPending}
                onClick={() => createPrize.mutate({
                  competitionId: selectedCompId!,
                  name: prizeName,
                  description: prizeDesc || undefined,
                  type: prizeType,
                })}
              >
                {createPrize.isPending ? "Creating…" : "Create Prize"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Award Prize Dialog */}
        <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Award Prize</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>User ID to Award</Label>
                <Input
                  type="number"
                  value={awardUserId}
                  onChange={e => setAwardUserId(e.target.value)}
                  placeholder="Enter entrant user ID"
                />
              </div>

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAwardOpen(false)}>Cancel</Button>
              <Button
                disabled={!awardUserId || awardPrize.isPending}
                onClick={() => awardPrize.mutate({
                  prizeId: awardPrizeId!,
                  userId: Number(awardUserId),
                })}
              >
                {awardPrize.isPending ? "Awarding…" : "Award Prize"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
