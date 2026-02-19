import { API_BASE_URL } from "@/config";

// --- Auth types ---

interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
}

interface ErrorResponse {
  message: string;
  errors?: Record<string, string[]>;
}

// --- Core request helper ---

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("auth_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_userId");
      localStorage.removeItem("auth_email");
      localStorage.removeItem("auth_role");
      window.location.href = "/login";
      throw { message: "Session expired. Please log in again." };
    }
    const errorData: ErrorResponse = await response.json().catch(() => ({
      message: "An unexpected error occurred",
    }));
    throw errorData;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// --- Auth ---

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/Auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/api/Auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Sprint types ---

export interface SprintListDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  taskCount: number;
  teamId: string | null;
  teamName: string | null;
}

export interface SprintDto {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  teamId: string;
  createdAtUtc: string;
}

export interface BoardTaskDto {
  id: string;
  title: string;
  assigneeId: string | null;
  assigneeName: string | null;
}

export interface SprintBoardDto {
  sprintId: string;
  sprintName: string;
  toDo: BoardTaskDto[];
  inProgress: BoardTaskDto[];
  done: BoardTaskDto[];
}

// --- Sprint endpoints ---

export async function getSprints(): Promise<SprintListDto[]> {
  return apiRequest<SprintListDto[]>("/api/Sprints");
}

export async function createSprint(data: {
  name: string;
  startDate: string;
  endDate: string;
  teamId?: string | null;
}): Promise<SprintDto> {
  return apiRequest<SprintDto>("/api/Sprints", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSprint(
  id: string,
  data: { name: string; startDate: string; endDate: string }
): Promise<SprintDto> {
  return apiRequest<SprintDto>(`/api/Sprints/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getSprintBoard(sprintId: string): Promise<SprintBoardDto> {
  return apiRequest<SprintBoardDto>(`/api/Sprints/${sprintId}/board`);
}

// --- Task types ---

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigneeId: string | null;
  assigneeName: string | null;
  sprintId: string;
  createdByUserId: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

// --- Task endpoints ---

export async function createTask(data: {
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  sprintId: string;
}): Promise<TaskDto> {
  return apiRequest<TaskDto>("/api/Tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTask(id: string): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/Tasks/${id}`);
}

export async function updateTask(
  id: string,
  data: {
    title: string;
    description?: string | null;
    assigneeId?: string | null;
  }
): Promise<TaskDto> {
  return apiRequest<TaskDto>(`/api/Tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/api/Tasks/${id}`, {
    method: "DELETE",
  });
}

export async function updateTaskStatus(
  taskId: string,
  status: number
): Promise<void> {
  await apiRequest<void>(`/api/Tasks/${taskId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// --- Team types ---

export interface TeamDto {
  id: string;
  name: string;
  description: string | null;
  createdAtUtc: string;
}

export interface TeamMemberDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// --- Team endpoints ---

export async function getTeams(): Promise<TeamDto[]> {
  return apiRequest<TeamDto[]>("/api/Teams");
}

export async function createTeam(data: {
  name: string;
  description?: string | null;
}): Promise<TeamDto> {
  return apiRequest<TeamDto>("/api/Teams", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTeamMembers(teamId: string): Promise<TeamMemberDto[]> {
  return apiRequest<TeamMemberDto[]>(`/api/Teams/${teamId}/members`);
}

export async function addTeamMember(
  teamId: string,
  email: string
): Promise<void> {
  await apiRequest<void>(`/api/Teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// --- User types ---

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  teamId: string | null;
  createdAtUtc: string;
}

// --- User endpoints (Admin only) ---

export async function getUsers(): Promise<UserDto[]> {
  return apiRequest<UserDto[]>("/api/Users");
}

export { apiRequest };
export type { AuthResponse, ErrorResponse };
