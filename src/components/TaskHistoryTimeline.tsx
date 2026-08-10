import { TaskHistoryDto } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface TaskHistoryTimelineProps {
  history: TaskHistoryDto[];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatHistoryMessage(entry: TaskHistoryDto): { message: string; details?: { old: string; new: string } } {
  switch (entry.changeType) {
    case "Created":
      return { message: "created this task" };

    case "StatusChanged":
      return {
        message: `changed status from ${entry.oldValue} to ${entry.newValue}`
      };

    case "TitleChanged":
      return {
        message: "changed title",
        details: {
          old: entry.oldValue || "",
          new: entry.newValue || ""
        }
      };

    case "DescriptionChanged":
      if (!entry.oldValue && entry.newValue) {
        return { message: "added description" };
      }
      if (entry.oldValue && !entry.newValue) {
        return { message: "removed description" };
      }
      return { message: "updated description" };

    case "StoryPointsChanged":
      if (!entry.oldValue && entry.newValue) {
        return { message: `set story points to ${entry.newValue}` };
      }
      if (entry.oldValue && !entry.newValue) {
        return { message: "removed story points" };
      }
      return {
        message: `changed story points from ${entry.oldValue} to ${entry.newValue}`
      };

    case "AssigneeChanged":
      if (!entry.oldValue && entry.newValue) {
        return { message: "assigned this task" };
      }
      if (entry.oldValue && !entry.newValue) {
        return { message: "unassigned this task" };
      }
      return { message: "changed assignee" };

    default:
      return { message: `modified ${entry.fieldName}` };
  }
}

export function TaskHistoryTimeline({ history }: TaskHistoryTimelineProps) {
  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        No history available for this task yet.
      </div>
    );
  }

  return (
    <div className="relative space-y-4 py-4">
      {/* Vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

      {history.map((entry, index) => {
        const { message, details } = formatHistoryMessage(entry);
        const timeAgo = formatDistanceToNow(new Date(entry.createdAtUtc), { addSuffix: true });

        return (
          <div key={entry.id} className="relative flex gap-4">
            {/* Avatar with dot */}
            <div className="relative flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                {getInitials(entry.userName)}
              </div>
              {/* Dot indicator */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-background border-2 border-primary" />
              </div>
            </div>

            {/* Content card */}
            <div className="flex-1 pb-4">
              <div className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{entry.userName}</span>
                      {" "}
                      <span className="text-muted-foreground">{message}</span>
                    </p>

                    {/* Show old/new values for title changes */}
                    {details && (
                      <div className="mt-2 space-y-1 text-sm">
                        {details.old && (
                          <div className="text-muted-foreground line-through">
                            {details.old}
                          </div>
                        )}
                        {details.new && (
                          <div className="text-foreground font-medium">
                            {details.new}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <time className="text-xs text-muted-foreground whitespace-nowrap">
                    {timeAgo}
                  </time>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
