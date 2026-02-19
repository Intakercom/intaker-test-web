import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getSprints,
  getSprintBoard,
  updateTaskStatus,
  createSprint,
  updateSprint,
  getTeams,
  getTeamMembers,
  getUsers,
  type SprintListDto,
  type SprintBoardDto,
  type BoardTaskDto,
  type ErrorResponse,
  type TeamDto,
  type TeamMemberDto,
} from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";

const STATUS_MAP: Record<string, { label: string; value: number; bg: string; headerAccent: string }> = {
  toDo:       { label: "To Do",       value: 0, bg: "bg-[hsl(var(--column-todo))]",       headerAccent: "bg-[hsl(var(--column-todo-header))]" },
  inProgress: { label: "In Progress", value: 1, bg: "bg-[hsl(var(--column-inprogress))]", headerAccent: "bg-[hsl(var(--column-inprogress-header))]" },
  done:       { label: "Done",        value: 2, bg: "bg-[hsl(var(--column-done))]",       headerAccent: "bg-[hsl(var(--column-done-header))]" },
};

const COLUMNS: Array<{ key: keyof Pick<SprintBoardDto, "toDo" | "inProgress" | "done">; statusKey: string }> = [
  { key: "toDo", statusKey: "toDo" },
  { key: "inProgress", statusKey: "inProgress" },
  { key: "done", statusKey: "done" },
];

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const TaskCard = React.forwardRef<
  HTMLDivElement,
  { task: BoardTaskDto; index: number; onClick: () => void }
>(function TaskCard({ task, index, onClick }, _ref) {
  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            className={`shadow-sm transition-shadow cursor-pointer ${
              snapshot.isDragging ? "shadow-lg ring-2 ring-primary/30" : "hover:shadow-md"
            }`}
            onClick={onClick}
          >
            <CardContent className="p-3">
              <p className="text-sm font-medium leading-snug">{task.title}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {task.assigneeName ? (
                  <>
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(task.assigneeName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {task.assigneeName}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">Unassigned</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
});

function BoardColumn({
  title,
  statusKey,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  title: string;
  statusKey: string;
  tasks: BoardTaskDto[];
  onTaskClick: (taskId: string) => void;
  onAddTask: () => void;
}) {
  return (
    <div className="flex flex-col min-w-[280px] flex-1">
      <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${STATUS_MAP[statusKey].headerAccent}`}>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/70">
          {title}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 ml-auto"
          onClick={onAddTask}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Droppable droppableId={statusKey}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2 rounded-lg p-2 min-h-[200px] transition-colors ${
              STATUS_MAP[statusKey].bg
            } ${snapshot.isDraggingOver ? "ring-2 ring-primary/20" : ""}`}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver ? (
              <p className="text-xs text-muted-foreground text-center py-8 italic">
                No tasks
              </p>
            ) : (
              tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onClick={() => onTaskClick(task.id)}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

const Dashboard = () => {
  const { toast } = useToast();

  const [sprints, setSprints] = useState<SprintListDto[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [board, setBoard] = useState<SprintBoardDto | null>(null);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [loadingBoard, setLoadingBoard] = useState(false);

  // Create sprint modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSprint, setNewSprint] = useState({ name: "", startDate: "", endDate: "", teamId: "" });
  const [teams, setTeams] = useState<TeamDto[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // Edit sprint modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSprint, setEditSprint] = useState({ name: "", startDate: "", endDate: "" });

  // Team members for task assignee — loaded from selected sprint's teamId
  const [members, setMembers] = useState<TeamMemberDto[]>([]);

  // Task dialogs
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskColumn, setCreateTaskColumn] = useState("toDo");
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);
  const [viewTaskOpen, setViewTaskOpen] = useState(false);

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // Fetch sprints on mount
  useEffect(() => {
    async function fetchSprints() {
      try {
        const data = await getSprints();
        setSprints(data);
        const active = data.find((s) => s.isActive);
        if (active) setSelectedSprintId(active.id);
        else if (data.length > 0) setSelectedSprintId(data[0].id);
      } catch (err) {
        const apiErr = err as ErrorResponse;
        toast({
          variant: "destructive",
          title: "Failed to load sprints",
          description: apiErr.message || "Please try again.",
        });
      } finally {
        setLoadingSprints(false);
      }
    }
    fetchSprints();
  }, [toast]);

  // Fetch board when sprint changes
  const fetchBoard = useCallback(async () => {
    if (!selectedSprintId) return;
    setLoadingBoard(true);
    try {
      const data = await getSprintBoard(selectedSprintId);
      setBoard(data);
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({
        variant: "destructive",
        title: "Failed to load board",
        description: apiErr.message || "Please try again.",
      });
    } finally {
      setLoadingBoard(false);
    }
  }, [selectedSprintId, toast]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  // Fetch team members whenever the selected sprint changes (use sprint's teamId)
  useEffect(() => {
    if (!selectedSprintId) return;
    const sprint = sprints.find((s) => s.id === selectedSprintId);
    if (!sprint?.teamId) {
      setMembers([]);
      return;
    }
    getTeamMembers(sprint.teamId).then(async (teamMembers) => {
      // If the current user is an admin but not a team member, add them to the list
      if (isAdmin && user && !teamMembers.some((m) => m.id === user.userId)) {
        try {
          const allUsers = await getUsers();
          const self = allUsers.find((u) => u.id === user.userId);
          if (self) {
            setMembers([{ id: self.id, email: self.email, firstName: self.firstName, lastName: self.lastName, role: self.role }, ...teamMembers]);
            return;
          }
        } catch {
          // fall through with team members only
        }
      }
      setMembers(teamMembers);
    }).catch(() => setMembers([]));
  }, [selectedSprintId, sprints, isAdmin, user]);

  const handleMoveTask = useCallback(async (taskId: string, sourceKey: string, destKey: string, destIndex: number) => {
    if (!board) return;
    const newStatus = STATUS_MAP[destKey].value;

    // Optimistic update
    const prev = { ...board };
    const sourceTasks = [...(board[sourceKey as keyof Pick<SprintBoardDto, "toDo" | "inProgress" | "done">] || [])];
    const destTasks = sourceKey === destKey
      ? sourceTasks
      : [...(board[destKey as keyof Pick<SprintBoardDto, "toDo" | "inProgress" | "done">] || [])];

    const taskIndex = sourceTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) return;
    const [task] = sourceTasks.splice(taskIndex, 1);

    if (sourceKey === destKey) {
      sourceTasks.splice(destIndex, 0, task);
    } else {
      destTasks.splice(destIndex, 0, task);
    }

    const updated: SprintBoardDto = {
      ...board,
      [sourceKey]: sourceTasks,
      ...(sourceKey !== destKey ? { [destKey]: destTasks } : {}),
    };
    setBoard(updated);

    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      setBoard(prev);
      const apiErr = err as ErrorResponse;
      toast({
        variant: "destructive",
        title: "Failed to move task",
        description: apiErr.message || "Please try again.",
      });
    }
  }, [board, toast]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    handleMoveTask(draggableId, source.droppableId, destination.droppableId, destination.index);
  }, [handleMoveTask]);

  // Fetch teams when admin opens the create sprint modal
  useEffect(() => {
    if (createOpen && isAdmin && teams.length === 0) {
      setLoadingTeams(true);
      getTeams()
        .then(setTeams)
        .catch(() => {})
        .finally(() => setLoadingTeams(false));
    }
  }, [createOpen, isAdmin, teams.length]);

  const handleCreateSprint = async () => {
    if (!newSprint.name.trim() || !newSprint.startDate || !newSprint.endDate) return;
    if (isAdmin && !newSprint.teamId) {
      toast({ variant: "destructive", title: "Please select a team" });
      return;
    }
    if (new Date(newSprint.endDate) <= new Date(newSprint.startDate)) {
      toast({ variant: "destructive", title: "End date must be after start date" });
      return;
    }
    setCreating(true);
    try {
      const created = await createSprint({
        name: newSprint.name.trim(),
        startDate: newSprint.startDate,
        endDate: newSprint.endDate,
        teamId: isAdmin ? newSprint.teamId : null,
      });
      const refreshed = await getSprints();
      setSprints(refreshed);
      setSelectedSprintId(created.id);
      setCreateOpen(false);
      setNewSprint({ name: "", startDate: "", endDate: "", teamId: "" });
      toast({ title: "Sprint created", description: `"${created.name}" has been created.` });
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({ variant: "destructive", title: "Failed to create sprint", description: apiErr.message || "Please try again." });
    } finally {
      setCreating(false);
    }
  };

  const handleEditSprint = async () => {
    if (!selectedSprintId || !editSprint.name.trim() || !editSprint.startDate || !editSprint.endDate) return;
    if (new Date(editSprint.endDate) <= new Date(editSprint.startDate)) {
      toast({ variant: "destructive", title: "End date must be after start date" });
      return;
    }
    setEditing(true);
    try {
      await updateSprint(selectedSprintId, {
        name: editSprint.name.trim(),
        startDate: editSprint.startDate,
        endDate: editSprint.endDate,
      });
      const refreshed = await getSprints();
      setSprints(refreshed);
      setEditOpen(false);
      toast({ title: "Sprint updated" });
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({ variant: "destructive", title: "Failed to update sprint", description: apiErr.message || "Please try again." });
    } finally {
      setEditing(false);
    }
  };

  const openEditDialog = () => {
    if (!selectedSprint) return;
    setEditSprint({
      name: selectedSprint.name,
      startDate: selectedSprint.startDate.split("T")[0],
      endDate: selectedSprint.endDate.split("T")[0],
    });
    setEditOpen(true);
  };

  const handleAddTask = (statusKey: string) => {
    setCreateTaskColumn(statusKey);
    setCreateTaskOpen(true);
  };

  const handleTaskCreated = async (task: import("@/lib/api").TaskDto) => {
    const targetStatus = STATUS_MAP[createTaskColumn]?.value ?? 0;
    if (targetStatus !== 0) {
      try {
        await updateTaskStatus(task.id, targetStatus);
      } catch {
        // non-critical; board refresh will show correct state from API
      }
    }
    fetchBoard();
    // Also refresh sprint list for task counts
    getSprints().then(setSprints).catch(() => {});
  };

  const handleTaskUpdated = () => {
    fetchBoard();
  };

  const handleTaskDeleted = () => {
    fetchBoard();
    getSprints().then(setSprints).catch(() => {});
  };

  const selectedSprint = sprints.find((s) => s.id === selectedSprintId);

  return (
    <div className="flex flex-col h-full">
      {/* Sprint selector */}
      <div className="px-6 py-4 border-b bg-card/50">
        <div className="flex items-center gap-4 w-full">
          <label className="text-sm font-medium text-muted-foreground">Sprint</label>
          {loadingSprints ? (
            <Skeleton className="h-10 w-[260px]" />
          ) : sprints.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No sprints available</p>
          ) : (
            <Select
              value={selectedSprintId || ""}
              onValueChange={(val) => setSelectedSprintId(val)}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a sprint" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  // Group sprints by team
                  const groups = new Map<string, { label: string; sprints: SprintListDto[] }>();
                  for (const sprint of sprints) {
                    const key = sprint.teamId ?? "__none__";
                    const label = sprint.teamName ?? "No Team";
                    if (!groups.has(key)) groups.set(key, { label, sprints: [] });
                    groups.get(key)!.sprints.push(sprint);
                  }
                  return Array.from(groups.entries()).map(([key, group]) => (
                    <div key={key}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {group.label}
                      </div>
                      {group.sprints.map((sprint) => {
                        const isPast = !sprint.isActive && new Date(sprint.endDate) < new Date();
                        return (
                          <SelectItem key={sprint.id} value={sprint.id}>
                            <span className="flex items-center gap-2">
                              <span className={isPast ? "text-muted-foreground" : undefined}>
                                {sprint.name}
                              </span>
                              {sprint.isActive && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                  Active
                                </Badge>
                              )}
                              {isPast && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                                  Closed
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                ({sprint.taskCount} tasks)
                              </span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>
          )}

          {selectedSprint && (
            <>
              <span className="text-xs text-muted-foreground">
                {new Date(selectedSprint.startDate).toLocaleDateString()} –{" "}
                {new Date(selectedSprint.endDate).toLocaleDateString()}
              </span>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={openEditDialog}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </>
          )}

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 ml-auto">
                <Plus className="h-4 w-4" />
                New Sprint
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sprint</DialogTitle>
                <DialogDescription>
                  Define a new time-boxed sprint for your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="sprint-name">Name</Label>
                  <Input
                    id="sprint-name"
                    placeholder="e.g. Sprint 12"
                    value={newSprint.name}
                    onChange={(e) => setNewSprint((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label htmlFor="sprint-team">Team</Label>
                    {loadingTeams ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={newSprint.teamId}
                        onValueChange={(val) => setNewSprint((s) => ({ ...s, teamId: val }))}
                      >
                        <SelectTrigger id="sprint-team">
                          <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sprint-start">Start Date</Label>
                    <Input
                      id="sprint-start"
                      type="date"
                      value={newSprint.startDate}
                      onChange={(e) => setNewSprint((s) => ({ ...s, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sprint-end">End Date</Label>
                    <Input
                      id="sprint-end"
                      type="date"
                      value={newSprint.endDate}
                      onChange={(e) => setNewSprint((s) => ({ ...s, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSprint}
                  disabled={creating || !newSprint.name.trim() || !newSprint.startDate || !newSprint.endDate || (isAdmin && !newSprint.teamId)}
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Sprint</DialogTitle>
                <DialogDescription>Update the sprint details.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-sprint-name">Name</Label>
                  <Input
                    id="edit-sprint-name"
                    value={editSprint.name}
                    onChange={(e) => setEditSprint((s) => ({ ...s, name: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-sprint-start">Start Date</Label>
                    <Input
                      id="edit-sprint-start"
                      type="date"
                      value={editSprint.startDate}
                      onChange={(e) => setEditSprint((s) => ({ ...s, startDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-sprint-end">End Date</Label>
                    <Input
                      id="edit-sprint-end"
                      type="date"
                      value={editSprint.endDate}
                      onChange={(e) => setEditSprint((s) => ({ ...s, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editing}>Cancel</Button>
                <Button
                  onClick={handleEditSprint}
                  disabled={editing || !editSprint.name.trim() || !editSprint.startDate || !editSprint.endDate}
                >
                  {editing && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Team banner */}
      {selectedSprint?.teamName && (
        <div className="px-6 py-2 bg-secondary/60 border-b flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Team</span>
          <span className="text-sm font-medium text-foreground">{selectedSprint.teamName}</span>
        </div>
      )}

      {/* Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        {loadingBoard ? (
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 min-w-[280px]">
                <Skeleton className="h-6 w-24 mb-3" />
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : !board ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">
              {sprints.length === 0
                ? "No sprints found. Create a sprint to get started."
                : "Select a sprint to view the board."}
            </p>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4">
              {COLUMNS.map(({ key, statusKey }) => (
                <BoardColumn
                  key={key}
                  title={STATUS_MAP[statusKey].label}
                  statusKey={statusKey}
                  tasks={board[key] || []}
                  onTaskClick={(taskId) => {
                    setViewTaskId(taskId);
                    setViewTaskOpen(true);
                  }}
                  onAddTask={() => handleAddTask(statusKey)}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Create Task Dialog */}
      {selectedSprintId && (
        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          sprintId={selectedSprintId}
          statusKey={createTaskColumn}
          members={members}
          currentUserId={user?.userId || ""}
          onCreated={handleTaskCreated}
        />
      )}

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        taskId={viewTaskId}
        open={viewTaskOpen}
        onOpenChange={setViewTaskOpen}
        members={members}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
};

export default Dashboard;
