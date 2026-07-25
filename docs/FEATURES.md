# Features

Priority scale: **P0** = MVP · **P1** = v1 post-launch · **P2** = v2+/enterprise. Full context in [ROADMAP.md](ROADMAP.md).

Each row = Feature · Purpose/User Flow · DB Impact · API · UI Components · Permissions · Priority. Future improvements noted inline where non-obvious.

## Authentication

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Sign up / Sign in | Email+password and OAuth (Google/GitHub) via Better Auth; verify email before first AI action | `users`, `sessions`, `accounts` (OAuth) | `POST /auth/sign-up`, `POST /auth/sign-in`, `POST /auth/sign-out`, `GET /auth/session` | `AuthForm`, `OAuthButtons`, `EmailVerifyBanner` | Public | P0 |
| Password reset | Token-based reset flow, email delivery | `verification_tokens` | `POST /auth/forgot-password`, `POST /auth/reset-password` | `ResetForm` | Public | P0 |
| Multi-factor auth | TOTP-based 2FA for account hardening | `users.mfa_secret`, `mfa_backup_codes` | `POST /auth/mfa/enable`, `POST /auth/mfa/verify` | `MfaSetupDialog` | Owner (self) | P1 |
| SSO/SAML | Enterprise identity federation | `sso_connections` | `POST /auth/sso/callback` | `SsoAdminPanel` | Org admin | P2 |

## Dashboard

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Home dashboard | Landing view after login: recent items, quick capture, usage meter | Reads `documents`, `usage_events` | `GET /dashboard/summary` | `DashboardGrid`, `QuickCapture`, `UsageMeter` | Owner | P0 |
| Recent activity | Last-touched items across all types | Reads `activity_log` | `GET /activity?limit=` | `ActivityFeed` | Owner | P0 |

## Knowledge Base & Capture

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Notes | Markdown note create/edit/autosave | `documents(type=note)`, `document_versions` | `POST/GET/PATCH/DELETE /documents` | `NoteEditor` (markdown, live preview) | Owner/Editor | P0 |
| Document/PDF upload | Upload file to storage, queue for parsing+chunking+embedding | `documents`, `document_files`, `jobs(type=ingest)` | `POST /uploads`, `GET /uploads/:id/status` | `UploadDropzone`, `IngestProgress` | Owner/Editor | P0 |
| OCR | Extract text from scanned PDFs/images via OCR worker | `documents.ocr_text`, `jobs(type=ocr)` | Internal worker, status via `GET /uploads/:id/status` | `IngestProgress` (OCR stage) | System | P0 |
| Bookmark saver | Save a URL, fetch+clean+store readable text | `documents(type=bookmark)` | `POST /bookmarks` | `SaveBookmarkDialog` | Owner/Editor | P0 |
| Web clipper (browser ext) | Clip selected page content from browser | `documents(type=clip)` | `POST /clips` (extension auth via API key) | Browser extension popup | Owner/Editor | P1 |
| YouTube transcript import | Paste URL, fetch transcript, chunk+embed | `documents(type=youtube)` | `POST /imports/youtube` | `ImportYoutubeDialog` | Owner/Editor | P1 |
| Code snippet capture | Store syntax-highlighted code with language tag | `documents(type=snippet)` | `POST /snippets` | `SnippetEditor` (CodeMirror) | Owner/Editor | P1 |
| Meeting notes | Structured template (agenda/notes/action items) | `documents(type=meeting)` | `POST /documents` | `MeetingTemplate` | Owner/Editor | P1 |
| Voice notes (future) | Record/upload audio, transcribe via Whisper-class model | `documents(type=voice)`, `jobs(type=transcribe)` | `POST /voice-notes` | `VoiceRecorder` | Owner/Editor | P2 |
| Email ingestion (future) | Forward-to-vault email address, parse+store | `documents(type=email)` | Inbound email webhook | n/a (email-based) | Owner/Editor | P2 |

## Organization

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Folders | Hierarchical containers for documents | `folders` (self-referencing parent_id) | `POST/GET/PATCH/DELETE /folders` | `FolderTree` | Owner/Editor | P0 |
| Collections | Flat, cross-folder groupings (e.g. "Q3 Research") | `collections`, `collection_items` | `POST/GET/DELETE /collections` | `CollectionPicker` | Owner/Editor | P0 |
| Tags | Freeform labels, many-to-many | `tags`, `document_tags` | `POST /tags`, `POST /documents/:id/tags` | `TagInput`, `TagFilterBar` | Owner/Editor | P0 |
| Favorites / Pinned | Quick-access starring; pinned memories surface in AI context first | `document_stars`, `pinned_memories` | `POST/DELETE /documents/:id/star` | `StarButton`, `PinnedRail` | Owner | P0 |
| Trash | Soft-delete with restore window (30 days) | `documents.deleted_at` | `POST /documents/:id/trash`, `POST /documents/:id/restore` | `TrashView` | Owner/Editor | P0 |
| Version history | Snapshot on each significant edit, diff + restore | `document_versions` | `GET /documents/:id/versions`, `POST /documents/:id/versions/:vid/restore` | `VersionHistoryPanel` (diff view) | Owner/Editor | P1 |
| Auto folder/tag/collection suggestions | AI suggests placement on ingest | Reads embeddings, writes suggestion to `documents.suggested_tags` | `POST /documents/:id/auto-organize` | `SuggestionChip` (accept/reject) | Owner/Editor | P1 |

## AI Chat & Retrieval

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| AI chat | Ask question → hybrid retrieve → re-rank → stream cited answer | `conversations`, `messages`, `message_citations` | `POST /chat` (SSE stream), `GET /conversations/:id` | `ChatPanel`, `MessageBubble`, `StreamingCursor` | Owner | P0 |
| Citation viewer | Click citation → jump to exact source chunk/page | Reads `message_citations` → `chunks` | `GET /citations/:id` | `CitationPopover`, `SourcePreviewPane` | Owner | P0 |
| Conversation history | List/search past chats, resume thread | `conversations` | `GET /conversations`, `DELETE /conversations/:id` | `ConversationSidebar` | Owner | P0 |
| Conversation memory (short/long-term) | Carry relevant prior turns + durable user facts into context | `conversations.summary`, `long_term_memory` | Internal to `/chat` pipeline | n/a | Owner | P1 |
| Document summaries | On-demand or on-ingest AI summary | `documents.summary` | `POST /documents/:id/summarize` | `SummaryCard` | Owner | P1 |

## Search

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Global search | Cross-type keyword+semantic search, cmd-K palette | Reads `chunks`, `documents` (FTS + vector) | `GET /search?q=&mode=` | `CommandPalette` | Owner | P0 |
| Search filters | Filter by type/tag/folder/date | Query params on `/search` | `GET /search?type=&tag=&folder=&date=` | `FilterSidebar` | Owner | P0 |
| Document preview | Inline preview without full navigation | Reads `documents`, `document_files` | `GET /documents/:id/preview` | `PreviewDrawer` | Owner | P0 |
| Saved searches | Persist a filtered query for reuse | `saved_searches` | `POST/GET/DELETE /saved-searches` | `SavedSearchList` | Owner | P2 |

## Sharing & Workspace

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Sharing (link/user) | Share a document or collection, read or comment access | `shares` | `POST /documents/:id/share`, `GET /shares/:token` | `ShareDialog` | Owner | P1 |
| Workspace | Team container with shared vault + member roles | `workspaces`, `workspace_members` | `POST/GET /workspaces`, `POST /workspaces/:id/invite` | `WorkspaceSwitcher`, `MembersTable` | Owner/Admin | P1 |
| User settings | Profile, API keys (BYO LLM), plan, notifications, data export | `users`, `api_keys` | `GET/PATCH /me`, `POST /me/api-keys`, `GET /me/export` | `SettingsTabs` | Owner (self) | P0 |
| Dark mode | System/light/dark theme toggle, persisted preference | `users.theme_preference` | `PATCH /me` | `ThemeToggle` | Owner | P0 |
| Notifications | In-app + email for job completion, mentions, shares | `notifications` | `GET /notifications`, `POST /notifications/:id/read` | `NotificationBell` | Owner | P1 |

## Admin & System

| Feature | Purpose / Flow | DB Impact | API | UI | Permissions | Priority |
|---|---|---|---|---|---|---|
| Admin dashboard | Org usage, member management, billing | Reads aggregate tables | `GET /admin/overview` | `AdminDashboard` | Org admin | P1 |
| Analytics | Product usage metrics (PostHog-backed) | Event stream, not primary DB | n/a (PostHog) | `AnalyticsPanel` (admin) | Org admin | P1 |
| Audit logs | Immutable log of sensitive actions (auth, delete, share, admin) | `audit_logs` (append-only) | `GET /admin/audit-logs` | `AuditLogTable` | Org admin | P1 |
| Background jobs | Ingest/embed/OCR/transcribe queue visibility | `jobs` | `GET /admin/jobs`, `POST /admin/jobs/:id/retry` | `JobsQueuePanel` | Org admin | P1 |

## Future Improvements (cross-cutting)

- Knowledge graph view over entity/topic extraction (see [AI.md](AI.md))
- Multi-agent research assistant that chains search → synthesis → draft
- API marketplace for third-party ingestion connectors
