import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { createTask, type TaskDto, type TeamMemberDto, type ErrorResponse } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprintId: string;
  statusKey: string;
  members: TeamMemberDto[];
  currentUserId: string;
  onCreated: (task: TaskDto) => void;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  sprintId,
  statusKey,
  members,
  currentUserId,
  onCreated,
}: CreateTaskDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    storyPoints: null as number | null,
    assigneeId: currentUserId,
  });

  // Preselect current user if they're in the team or are an admin
  useEffect(() => {
    if (open) {
      const isMember = members.some((m) => m.id === currentUserId);
      setForm({ title: "", description: "", storyPoints: null, assigneeId: (isMember || isAdmin) ? currentUserId : "" });
    }
  }, [open, currentUserId, members, isAdmin]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await createTask({
        title: form.title.trim(),
        description: form.description.trim() || null,
        storyPoints: form.storyPoints,
        assigneeId: form.assigneeId || null,
        sprintId,
      });
      toast({ title: "Task created" });
      onCreated(task);
      onOpenChange(false);
      setForm({ title: "", description: "", storyPoints: null, assigneeId: currentUserId });
    } catch (err) {
      const apiErr = err as ErrorResponse;
      toast({
        variant: "destructive",
        title: "Failed to create task",
        description: apiErr.message || "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a new task to this sprint.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              placeholder="Task title"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              placeholder="Optional description"
              maxLength={2000}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-story-points">Story Points</Label>
            <Select
              value={form.storyPoints === null ? "-" : String(form.storyPoints)}
              onValueChange={(val) => setForm((f) => ({ ...f, storyPoints: val === "-" ? null : Number(val) }))}
            >
              <SelectTrigger id="task-story-points">
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-">-</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select
              value={form.assigneeId || "__none__"}
              onValueChange={(val) => setForm((f) => ({ ...f, assigneeId: val === "__none__" ? "" : val }))}
            >
              <SelectTrigger id="task-assignee">
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
