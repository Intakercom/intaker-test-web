import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import {
  getTask,
  updateTask,
  deleteTask,
  type TaskDto,
  type TeamMemberDto,
  type ErrorResponse,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMemberDto[];
  onUpdated: () => void;
  onDeleted: (taskId: string) => void;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  members,
  onUpdated,
  onDeleted,
}: TaskDetailDialogProps) {
  const { toast } = useToast();
  const [task, setTask] = useState<TaskDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assigneeId: "" });

  useEffect(() => {
    if (!taskId || !open) {
      setTask(null);
      setEditing(false);
      return;
    }
    setLoading(true);
    getTask(taskId)
      .then((t) => {
        setTask(t);
        setForm({
          title: t.title,
          description: t.description || "",
          assigneeId: t.assigneeId || "",
        });
      })
      .catch((err) => {
        const apiErr = err as ErrorResponse;
        toast({
          variant: "destructive",
          title: "Failed to load task",
          description: apiErr.message || "Please try again.",
        });
        onOpenChange(false);
      })
      .finally(() => setLoading(false));
  }, [taskId, open]);

  const handleSave = async () => {
    if (!taskId || !form.title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateTask(taskId, {
        title: form.title.trim(),
        description: form.description.trim() || null,
        assigneeId: form.assigneeId || null,
      });
      setTask(updated);
      setEditing(false);
      toast({ title: "Task updated" });
      onUpdated();
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({
        variant: "destructive",
        title: "Failed to update task",
        description: apiErr.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!taskId) return;
    setDeleting(true);
    try {
      await deleteTask(taskId);
      toast({ title: "Task deleted" });
      onDeleted(taskId);
      onOpenChange(false);
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({
        variant: "destructive",
        title: "Failed to delete task",
        description: apiErr.message || "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const assignee = task?.assigneeId
    ? members.find((m) => m.id === task.assigneeId)
    : null;

  const statusLabel =
    task?.status === "ToDo" || task?.status === "0"
      ? "To Do"
      : task?.status === "InProgress" || task?.status === "1"
      ? "In Progress"
      : task?.status === "Done" || task?.status === "2"
      ? "Done"
      : task?.status || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !task ? null : editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Modify the task details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-task-title">Title</Label>
                <Input
                  id="edit-task-title"
                  maxLength={200}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-desc">Description</Label>
                <Textarea
                  id="edit-task-desc"
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-assignee">Assignee</Label>
                <Select
                  value={form.assigneeId || "__none__"}
                  onValueChange={(val) =>
                    setForm((f) => ({ ...f, assigneeId: val === "__none__" ? "" : val }))
                  }
                >
                  <SelectTrigger id="edit-task-assignee">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-muted-foreground italic">
                      — Unassigned —
                    </SelectItem>
                    <SelectSeparator />
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setForm({
                    title: task.title,
                    description: task.description || "",
                    assigneeId: task.assigneeId || "",
                  });
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Save
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-20">{task.title}</DialogTitle>
              <DialogDescription>Task details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {task.description && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <div className="max-h-48 overflow-y-auto pr-1">
                    <p className="text-sm whitespace-pre-wrap">{task.description}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Status</p>
                  <p>{statusLabel}</p>
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Assignee</p>
                  {assignee ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {getInitials(`${assignee.firstName} ${assignee.lastName}`)}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {assignee.firstName} {assignee.lastName}
                      </span>
                    </div>
                  ) : task.assigneeName ? (
                    <span>{task.assigneeName}</span>
                  ) : (
                    <span className="text-muted-foreground italic">Unassigned</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-muted-foreground mb-1">Created</p>
                  <p>{new Date(task.createdAtUtc).toLocaleString()}</p>
                </div>
                {task.updatedAtUtc && (
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Updated</p>
                    <p>{new Date(task.updatedAtUtc).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5" disabled={deleting}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure? This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
