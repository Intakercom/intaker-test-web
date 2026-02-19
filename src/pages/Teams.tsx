import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeams,
  createTeam,
  getTeamMembers,
  addTeamMember,
  getUsers,
  type TeamDto,
  type TeamMemberDto,
  type UserDto,
  type ErrorResponse,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Users, Loader2, UserPlus, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

function getInitials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function TeamMemberList({ teamId, isAdmin }: { teamId: string; isAdmin: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", teamId],
    queryFn: () => getTeamMembers(teamId),
  });

  const { data: allUsers } = useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    enabled: isAdmin,
  });

  const addMutation = useMutation({
    mutationFn: (userEmail: string) => addTeamMember(teamId, userEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", teamId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedUserId("");
      toast({ title: "Member added" });
    },
    onError: (err: ErrorResponse) => {
      toast({
        variant: "destructive",
        title: "Failed to add member",
        description: err.message || "Please try again.",
      });
    },
  });

  // Filter out users already in this team
  const memberIds = new Set(members?.map((m) => m.id) ?? []);
  const availableUsers = allUsers?.filter((u) => !memberIds.has(u.id)) ?? [];
  const sortByName = (a: UserDto, b: UserDto) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  const usersWithoutTeam = availableUsers.filter((u) => !u.teamId).sort(sortByName);
  const usersWithTeam = availableUsers.filter((u) => u.teamId).sort(sortByName);

  // Map teamId → teamName for the "will be reassigned" label
  const { data: allTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: () => import("@/lib/api").then((m) => m.getTeams()),
  });
  const teamNameMap = new Map(allTeams?.map((t) => [t.id, t.name]) ?? []);

  const handleAdd = () => {
    const user = availableUsers.find((u) => u.id === selectedUserId);
    if (!user) return;
    addMutation.mutate(user.email);
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a user to add..." />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.length === 0 ? (
                <SelectItem value="_none" disabled>No available users</SelectItem>
              ) : (
                <>
                  {usersWithoutTeam.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-muted-foreground">No team</SelectLabel>
                      {usersWithoutTeam.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">({u.email})</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {usersWithTeam.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="text-xs text-[hsl(var(--warning-foreground))]">
                        Has a team — will be reassigned
                      </SelectLabel>
                      {usersWithTeam.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <span className="font-medium">{u.firstName} {u.lastName}</span>
                          <span className="text-muted-foreground ml-1.5 text-xs">({u.email})</span>
                          <span className="ml-1.5 text-xs font-medium text-[hsl(var(--warning-foreground))] italic">[{teamNameMap.get(u.teamId!) ?? "another team"}]</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </>
              )}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={addMutation.isPending || !selectedUserId} onClick={handleAdd}>
            {addMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Add
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !members || members.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-4 text-center">
          No members yet. Select a user above to add them.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(m.firstName, m.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">
                      {m.firstName} {m.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {m.role}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

const Teams = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: "", description: "" });
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createTeam({
        name: newTeam.name.trim(),
        description: newTeam.description.trim() || null,
      }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      setCreateOpen(false);
      setNewTeam({ name: "", description: "" });
      setSelectedTeamId(created.id);
      toast({ title: "Team created", description: `"${created.name}" has been created.` });
    },
    onError: (err: ErrorResponse) => {
      toast({
        variant: "destructive",
        title: "Failed to create team",
        description: err.message || "Please try again.",
      });
    },
  });

  const selectedTeam = teams?.find((t) => t.id === selectedTeamId);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
                <DialogDescription>Add a new team to organize your members.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Name</Label>
                  <Input
                    id="team-name"
                    placeholder="e.g. Engineering"
                    value={newTeam.name}
                    onChange={(e) => setNewTeam((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="team-desc">Description (optional)</Label>
                  <Textarea
                    id="team-desc"
                    placeholder="What does this team do?"
                    value={newTeam.description}
                    onChange={(e) => setNewTeam((s) => ({ ...s, description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !newTeam.name.trim()}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : !teams || teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No teams yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedTeamId === team.id
                  ? "ring-2 ring-primary"
                  : ""
              }`}
              onClick={() => setSelectedTeamId(selectedTeamId === team.id ? null : team.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{team.name}</CardTitle>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      selectedTeamId === team.id ? "rotate-90" : ""
                    }`}
                  />
                </div>
                {team.description && (
                  <CardDescription className="line-clamp-2">{team.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-xs text-muted-foreground">
                  Created {new Date(team.createdAtUtc).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTeam && (
        <Card>
          <CardHeader>
          <CardTitle className="text-lg">
              {selectedTeam.name} — Members
            </CardTitle>
            {selectedTeam.description && (
              <p className="text-sm text-foreground/80 mt-1">{selectedTeam.description}</p>
            )}
            <CardDescription className="mt-1">{isAdmin ? "Manage who belongs to this team." : "View team members."}</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamMemberList teamId={selectedTeam.id} isAdmin={isAdmin} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Teams;
