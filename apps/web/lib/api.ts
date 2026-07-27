const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "cortexvault.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Pydantic returns a list of field errors; flatten it into one readable line. */
function readDetail(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((e) => (typeof e?.msg === "string" ? e.msg : ""))
        .filter(Boolean)
        .join("; ");
    }
  }
  return fallback;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE}${path}`, { ...init, headers });

  if (response.status === 401) {
    setToken(null);
    throw new ApiError(401, "Your session expired. Sign in again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, readDetail(body, `Request failed (${response.status})`));
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

// --- types mirroring the API schemas -------------------------------------

export type User = {
  id: string;
  email: string;
  name: string | null;
  email_verified: boolean;
  theme_preference: string;
  mfa_enabled: boolean;
  created_at: string;
};

export type SignInResult = {
  access_token: string | null;
  mfa_required: boolean;
  mfa_token: string | null;
};

export type MfaEnrollment = {
  secret: string;
  otpauth_uri: string;
  backup_codes: string[];
};

export type Document = {
  id: string;
  type: string;
  title: string;
  content: string | null;
  summary: string | null;
  source_url: string | null;
  folder_id: string | null;
  ingest_status: string;
  starred: boolean;
  created_at: string;
  updated_at: string;
};

export type Page<T> = { items: T[]; total: number; limit: number; offset: number };

export type SearchHit = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  content: string;
  score: number;
};

export type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type Message = { id: string; role: string; content: string; created_at: string };

export type Citation = {
  index: number;
  chunk_id: string;
  document_id: string;
  document_title: string;
};

export type DashboardSummary = {
  documents: number;
  chunks: number;
  conversations: number;
  recent: { id: string; title: string; type: string }[];
};

// --- endpoints ------------------------------------------------------------

export const api = {
  signUp: (email: string, password: string, name?: string) =>
    request<{ access_token: string }>("/api/v1/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({ email, password, name: name || null }),
    }),

  signIn: (email: string, password: string) =>
    request<SignInResult>("/api/v1/auth/sign-in", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  mfaChallenge: (mfaToken: string, code: string) =>
    request<{ access_token: string }>("/api/v1/auth/mfa/challenge", {
      method: "POST",
      body: JSON.stringify({ mfa_token: mfaToken, code }),
    }),

  signOut: () => request<void>("/api/v1/auth/sign-out", { method: "POST" }),

  enableMfa: () => request<MfaEnrollment>("/api/v1/auth/mfa/enable", { method: "POST" }),

  verifyMfa: (code: string) =>
    request<void>("/api/v1/auth/mfa/verify", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  disableMfa: (code: string) =>
    request<void>("/api/v1/auth/mfa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  verifyEmail: (token: string) =>
    request<void>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, newPassword: string) =>
    request<void>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, new_password: newPassword }),
    }),

  me: () => request<User>("/api/v1/me"),

  updateMe: (patch: { name?: string; theme_preference?: string }) =>
    request<User>("/api/v1/me", { method: "PATCH", body: JSON.stringify(patch) }),

  summary: () => request<DashboardSummary>("/api/v1/dashboard/summary"),

  documents: (params: { limit?: number; offset?: number; trashed?: boolean } = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    if (params.trashed) query.set("trashed", "true");
    return request<Page<Document>>(`/api/v1/documents?${query}`);
  },

  document: (id: string) => request<Document>(`/api/v1/documents/${id}`),

  createDocument: (body: { title: string; content?: string; type?: string }) =>
    request<Document>("/api/v1/documents", { method: "POST", body: JSON.stringify(body) }),

  trashDocument: (id: string) =>
    request<Document>(`/api/v1/documents/${id}/trash`, { method: "POST" }),

  deleteDocument: (id: string) =>
    request<void>(`/api/v1/documents/${id}`, { method: "DELETE" }),

  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ document_id: string; job_id: string | null; ingest_status: string }>(
      "/api/v1/uploads",
      { method: "POST", body: form },
    );
  },

  uploadStatus: (id: string) =>
    request<{ ingest_status: string; job_status: string | null; error: string | null }>(
      `/api/v1/uploads/${id}/status`,
    ),

  search: (q: string, mode = "hybrid", limit = 20) =>
    request<{ query: string; mode: string; hits: SearchHit[] }>(
      `/api/v1/search?q=${encodeURIComponent(q)}&mode=${mode}&limit=${limit}`,
    ),

  conversations: () => request<Conversation[]>("/api/v1/conversations"),

  conversation: (id: string) =>
    request<Conversation & { messages: Message[] }>(`/api/v1/conversations/${id}`),

  deleteConversation: (id: string) =>
    request<void>(`/api/v1/conversations/${id}`, { method: "DELETE" }),

  chat,
};

// --- SSE ------------------------------------------------------------------

type ChatHandlers = {
  onCitations?: (citations: Citation[]) => void;
  onToken?: (delta: string) => void;
  onDone?: (info: { conversation_id: string; message_id: string }) => void;
  onError?: (message: string) => void;
};

/**
 * EventSource cannot POST or send an Authorization header, so the stream is
 * read from fetch and framed by hand. Frames are separated by a blank line and
 * may arrive split across chunks, so the tail is buffered until complete.
 */
async function chat(
  message: string,
  conversationId: string | null,
  handlers: ChatHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${BASE}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversation_id: conversationId }),
    signal,
  });

  if (response.status === 401) {
    setToken(null);
    throw new ApiError(401, "Your session expired. Sign in again.");
  }
  if (!response.ok || !response.body) {
    throw new ApiError(response.status, `Chat failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = /^event: (\w+)$/m.exec(frame)?.[1];
      const raw = /^data: (.*)$/m.exec(frame)?.[1];
      if (!event || raw === undefined) continue;

      let payload: unknown;
      try {
        payload = JSON.parse(raw);
      } catch {
        continue;
      }

      if (event === "citations") handlers.onCitations?.(payload as Citation[]);
      else if (event === "token") handlers.onToken?.((payload as { delta: string }).delta);
      else if (event === "error") {
        handlers.onError?.((payload as { message: string }).message);
        return;
      } else if (event === "done") {
        sawDone = true;
        handlers.onDone?.(payload as { conversation_id: string; message_id: string });
      }
    }
  }

  // The server closes on failure without a done frame; treat that as an error
  // rather than a silently truncated answer.
  if (!sawDone) handlers.onError?.("The answer ended unexpectedly. Please try again.");
}
