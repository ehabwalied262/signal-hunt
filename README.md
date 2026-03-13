# SignalHunt — Project Technical Specification

> **Authoritative architecture reference for AI models and engineers working on this codebase.**
> Last generated from source on 2026-03-13.

---

## 1. Project Overview

### What the System Does
SignalHunt is a **B2B outbound sales dialer platform** that enables sales development representatives (BDRs) to manage leads, place outbound phone calls, capture call dispositions, and import lead data at scale.

### Primary Use Case
A BDR logs in, views their lead queue, clicks a phone icon to initiate an outbound call, speaks with the prospect, and then submits a disposition (e.g. INTERESTED, CALLBACK, NOT_INTERESTED) when the call ends. Admins manage users, assign phone numbers, and view aggregate reports.

### Key Features
- **Preview dialer**: one-click outbound calling from the lead list or dedicated dialer page
- **Real-time call status**: WebSocket push events keep the agent's UI in sync with telephony provider state (RINGING → IN_PROGRESS → COMPLETED)
- **Call dispositions**: structured outcome capture with notes, pain points, callback scheduling
- **CSV/Excel lead import**: bulk upload with duplicate detection and per-row merge/skip/import review
- **Call recording**: automatic dual-channel recording via Twilio; recording URL stored per call
- **Transcription** (data model ready): request-based transcription via Deepgram or AssemblyAI
- **Multi-provider telephony**: pluggable provider abstraction supports Twilio, Telnyx, or Mock (dev)
- **Role-based access**: ADMIN and BDR roles with enforced data ownership
- **Theming**: light/dark mode with customizable background colors

### Target Users
- **BDRs (Business Development Representatives)**: place calls, manage their leads, submit dispositions
- **ADMINs**: manage all leads, reassign leads, add users, assign phone numbers, view reports

---

## 2. System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Agent)                          │
│  Next.js 16 frontend (React 19, Zustand, Axios, Socket.io-client│
└─────────┬───────────────────────────────────┬───────────────────┘
          │ REST HTTP /api/v1/*               │ WebSocket ws://host/calls
          ▼                                  ▼
┌─────────────────────┐          ┌───────────────────────┐
│   NestJS API Server │          │ NestJS WebSocket       │
│   (main.ts)         │◄────────►│ Gateway (/calls NS)    │
│   Port 4000         │          └───────────────────────┘
│                     │
│  ┌───────────────┐  │          ┌───────────────────────┐
│  │ BullMQ Queue  │◄─┼─────────►│ NestJS Worker Process │
│  │ (csv-import)  │  │          │ (worker.ts)           │
│  └───────────────┘  │          └───────────────────────┘
│                     │
│  ┌───────────────┐  │
│  │ Telephony     │  │◄──── Twilio Webhooks (POST)
│  │ Provider      │  │      /api/webhooks/twilio/*
│  │ (Twilio/Mock) │  │
│  └───────────────┘  │
└──────────┬──────────┘
           │ Prisma ORM
           ▼
┌──────────────────────┐    ┌───────────────────────┐
│    PostgreSQL 16      │    │      Redis 7           │
│   (primary DB)        │    │  (BullMQ job queues)   │
└──────────────────────┘    └───────────────────────┘
```

### Component Interactions

1. **Frontend → API**: All REST calls use `/api/v1/` prefix. JWT Bearer token in `Authorization` header via axios interceptor.
2. **API → Telephony Provider**: `CallsService` calls the `TelephonyProvider` interface (injected via NestJS DI). Never imports Twilio directly.
3. **Twilio → API Webhooks**: Twilio POSTs status/recording callbacks to unversioned routes (`/api/webhooks/twilio/*`). These are excluded from URI versioning so the configured URL never breaks.
4. **API → WebSocket**: `CallsGateway` pushes `call:status` and `call:recording_ready` events to per-agent rooms (`agent:{userId}`).
5. **Frontend WebSocket**: `useSocket` hook connects on dashboard mount. `call:status` events are written to `useCallStore` (Zustand). UI reacts to store state.
6. **CSV Import → Queue**: `ImportsService` enqueues a `process-csv` job to Redis via BullMQ. The worker process runs `ImportsProcessor` which bulk-inserts leads.
7. **Prisma**: Single shared schema at `prisma/schema.prisma` in the monorepo root. Both API and worker use `PrismaService`.

---

## 3. Technology Stack

| Layer | Technology | Version | Reason |
|-------|-----------|---------|--------|
| **Frontend framework** | Next.js | 16.1.6 | App Router, SSR-optional, file-based routing |
| **Frontend UI library** | React | 19.2.3 | Core rendering |
| **Frontend state** | Zustand | ^5.0.0 | Lightweight, no boilerplate, works outside React tree |
| **HTTP client** | Axios | ^1.7.0 | Interceptors for JWT attachment and 401 handling |
| **WebSocket client** | Socket.io-client | ^4.8.0 | Matches NestJS Socket.io adapter |
| **CSS** | Tailwind CSS | ^4 | Utility-first; CSS variables for theming |
| **Icons** | Lucide React | ^0.460.0 | Consistent icon set |
| **Backend framework** | NestJS | ^10.4.0 | Opinionated DI, decorators, modular architecture |
| **Backend language** | TypeScript | ^5.7.0 | Full stack type safety |
| **WebSocket server** | Socket.io (NestJS adapter) | ^4.8.0 | Namespace support, room-based targeting |
| **HTTP server** | Express (via NestJS) | default | Multer file upload middleware |
| **ORM** | Prisma | ^6.4.0 | Type-safe DB client, migration system |
| **Database** | PostgreSQL | 16 (Docker) | Primary persistence |
| **Queue system** | BullMQ + Redis | ^5.30.0 | Reliable background job processing with retries |
| **Auth** | JWT (NestJS JWT + Passport) | ^10.2.0 | Stateless, works across API and worker |
| **Password hashing** | bcrypt | ^5.1.1 | 12 salt rounds |
| **Telephony - primary** | Twilio | ^5.4.0 | Industry-standard voice API |
| **Telephony - secondary** | Telnyx | (provider stub) | Alternate provider via same interface |
| **Telephony - dev** | MockTelephonyProvider | internal | Full pipeline test without real calls |
| **File parsing** | xlsx | ^0.18.5 | CSV and Excel parsing |
| **Monorepo** | Turborepo | ^2.4.0 | Task orchestration across packages |
| **Package manager** | npm workspaces | 10.9.2 | Shared dependencies |
| **Containerization** | Docker Compose | v2 | Local PostgreSQL + Redis |
| **Shared types** | @signalhunt/shared-types | workspace | Call status enums, WebSocket event shapes shared between API and web |

---

## 4. Folder Structure

```
signalhunt/                          # Monorepo root
├── docker-compose.yml               # PostgreSQL + Redis services
├── package.json                     # Root workspace + Turborepo scripts
├── turbo.json                       # Turborepo pipeline config
├── tsconfig.base.json               # Shared TS config
├── .env / .env.example              # Environment variables (root level)
│
├── prisma/                          # Database schema (shared across apps)
│   ├── schema.prisma                # Single source of truth for all models
│   ├── seed.ts                      # Seeds admin, BDR users, phone numbers, 34 test leads
│   └── migrations/                  # Prisma migration SQL files
│
├── packages/
│   └── shared-types/                # @signalhunt/shared-types package
│       └── src/
│           ├── call.types.ts        # CallStatus enum, ACTIVE/TERMINAL status arrays
│           ├── lead.types.ts        # Lead interface
│           ├── user.types.ts        # User interface, UserRole enum
│           ├── disposition.types.ts # DispositionType enum
│           ├── api.types.ts         # Paginated response types
│           ├── websocket-events.ts  # WS event payload interfaces + WS_EVENTS constants
│           └── index.ts             # Re-exports all types
│
├── api/                             # @signalhunt/api — NestJS backend
│   ├── src/
│   │   ├── main.ts                  # HTTP server bootstrap (port 4000, versioning, CORS, WS)
│   │   ├── worker.ts                # Worker process bootstrap (no HTTP, just BullMQ consumers)
│   │   ├── app.module.ts            # Root module: imports all feature modules
│   │   │
│   │   ├── auth/                    # Authentication module
│   │   │   ├── auth.controller.ts   # POST /register, POST /login, GET /me
│   │   │   ├── auth.service.ts      # bcrypt verify, JWT sign, user lookup
│   │   │   ├── auth.module.ts       # Module definition
│   │   │   ├── jwt.strategy.ts      # Passport JWT strategy (reads sub/email/role from token)
│   │   │   └── dto/
│   │   │       ├── login.dto.ts     # email, password
│   │   │       └── register.dto.ts  # email, password, fullName, role
│   │   │
│   │   ├── users/                   # Users module
│   │   │   ├── users.controller.ts  # GET /users (ADMIN), GET /users/bdrs (ADMIN)
│   │   │   ├── users.service.ts     # findAll, findAllBDRs, findByEmail, findById, create
│   │   │   └── users.module.ts
│   │   │
│   │   ├── leads/                   # Leads module
│   │   │   ├── leads.controller.ts  # CRUD + reassign
│   │   │   ├── leads.service.ts     # create, findAll (paginated+filtered), findById, update, reassign, checkDuplicates
│   │   │   ├── leads.module.ts
│   │   │   └── dto/
│   │   │       ├── create-lead.dto.ts
│   │   │       ├── update-lead.dto.ts
│   │   │       └── lead-filter.dto.ts  # page, limit, status, country, search
│   │   │
│   │   ├── calls/                   # Calls module
│   │   │   ├── calls.controller.ts  # POST /initiate, POST /:id/end, GET /token, GET /lead/:leadId
│   │   │   ├── calls.service.ts     # initiateCall, endCall, handleStatusUpdate, handleRecordingComplete, getCallHistory
│   │   │   ├── calls.gateway.ts     # Socket.io /calls namespace, room: agent:{userId}
│   │   │   ├── calls.module.ts
│   │   │   └── dto/
│   │   │       └── initiate-call.dto.ts  # leadId
│   │   │
│   │   ├── dispositions/            # Dispositions module
│   │   │   ├── dispositions.controller.ts  # POST /, PATCH /:id
│   │   │   ├── dispositions.service.ts     # create (with lead status sync), update
│   │   │   ├── dispositions.module.ts
│   │   │   └── dto/
│   │   │       ├── create-disposition.dto.ts  # callId, type, notes, painPoints, callbackScheduledAt
│   │   │       └── update-disposition.dto.ts  # notes, painPoints
│   │   │
│   │   ├── imports/                 # CSV/Excel import module
│   │   │   ├── imports.controller.ts  # POST /upload, POST /:id/resolve, GET /:id, GET /
│   │   │   ├── imports.service.ts     # uploadFile, resolveDuplicates, getImportStatus, getImports
│   │   │   ├── imports.processor.ts   # BullMQ @Processor('csv-import') — batch inserts leads
│   │   │   ├── csv-parser.util.ts     # Parses CSV/Excel buffer → normalized row array
│   │   │   └── imports.module.ts
│   │   │
│   │   ├── webhooks/                # Telephony provider webhook handlers
│   │   │   ├── webhooks.controller.ts  # POST /voice, POST /status, POST /recording
│   │   │   ├── webhooks.guard.ts       # Validates Twilio signature (skipped in mock mode)
│   │   │   └── webhooks.module.ts
│   │   │
│   │   ├── telephony/               # Provider abstraction
│   │   │   ├── telephony.interface.ts  # TelephonyProvider interface + TELEPHONY_PROVIDER token
│   │   │   ├── telephony.models.ts     # CallResult, CallStatusEvent, RecordingEvent DTOs
│   │   │   ├── telephony.module.ts     # Factory: selects provider based on TELEPHONY_PROVIDER_NAME env
│   │   │   ├── mock/
│   │   │   │   └── mock.provider.ts    # Full lifecycle simulation via internal HTTP calls
│   │   │   ├── twilio/
│   │   │   │   └── twilio.provider.ts  # Twilio REST API implementation
│   │   │   └── telnyx/
│   │   │       └── telnyx.provider.ts  # Telnyx implementation (stub)
│   │   │
│   │   ├── prisma/                  # Database service
│   │   │   ├── prisma.service.ts    # Extends PrismaClient, handles onModuleInit/onModuleDestroy
│   │   │   └── prisma.module.ts     # Global module — PrismaService available everywhere
│   │   │
│   │   └── common/                  # Shared utilities
│   │       ├── decorators/
│   │       │   ├── current-user.decorator.ts  # @CurrentUser() extracts from JWT payload
│   │       │   └── roles.decorator.ts          # @Roles(UserRole.ADMIN)
│   │       ├── dto/                  # Response shape DTOs (used by Serialize interceptor)
│   │       │   ├── auth-response.dto.ts
│   │       │   ├── call-response.dto.ts
│   │       │   ├── disposition-response.dto.ts
│   │       │   ├── import-response.dto.ts
│   │       │   ├── lead-response.dto.ts
│   │       │   ├── paginated-response.dto.ts
│   │       │   ├── phone-number-response.dto.ts
│   │       │   ├── transcription-response.dto.ts
│   │       │   └── user-response.dto.ts
│   │       ├── filters/
│   │       │   └── http-exception.filter.ts   # Global: formats all errors as { statusCode, message, timestamp }
│   │       ├── guards/
│   │       │   ├── jwt-auth.guard.ts           # Checks isPublic metadata; delegates to AuthGuard('jwt')
│   │       │   └── roles.guard.ts              # Checks @Roles() metadata against user.role
│   │       └── interceptors/
│   │           └── serialize.interceptor.ts    # @Serialize(Dto) — strips unlisted fields via class-transformer
│   │
│   ├── package.json
│   ├── nest-cli.json
│   └── tsconfig.json
│
└── web/                             # @signalhunt/web — Next.js frontend
    └── src/
        ├── app/
        │   ├── layout.tsx                    # Root layout (HTML shell, font)
        │   ├── page.tsx                      # Root "/" → redirect to /leads
        │   ├── globals.css                   # CSS variables for theming (--foreground, --card-bg, etc.)
        │   ├── (auth)/                       # Auth route group (no sidebar)
        │   │   ├── layout.tsx               # Centered, no sidebar
        │   │   └── login/page.tsx           # Login form
        │   └── (dashboard)/                 # Protected route group (with sidebar)
        │       ├── layout.tsx               # Auth check, WebSocket init (useSocket), Sidebar+TopBar+CallWidget
        │       ├── leads/
        │       │   ├── page.tsx             # Lead list table with search, pagination, quick-call
        │       │   ├── [id]/page.tsx        # Lead detail: info + call history + call button
        │       │   └── import/page.tsx      # CSV upload UI with duplicate resolution
        │       ├── dialer/page.tsx           # Simplified dialer view: search → one-click call
        │       └── admin/
        │           ├── page.tsx             # Admin dashboard (user management)
        │           └── reports/page.tsx     # Call reports
        │
        ├── components/
        │   ├── call/
        │   │   ├── call-widget.tsx          # Floating call status overlay (shown during active call)
        │   │   ├── call-timer.tsx           # Live elapsed time counter during IN_PROGRESS
        │   │   └── disposition-form.tsx     # Post-call form (type, notes, pain points, callback time)
        │   └── layout/
        │       ├── sidebar.tsx              # Left nav: Leads, Dialer, Admin links
        │       ├── top-bar.tsx              # Header: user info, settings, logout
        │       ├── logout-modal.tsx         # Confirmation modal
        │       ├── settings-modal.tsx       # Theme customization modal
        │       └── theme-provider.tsx       # Applies CSS data-theme attribute
        │
        ├── hooks/
        │   ├── use-call.ts                  # initiateCall, endCall, submitDisposition actions
        │   └── use-socket.ts                # Connects to /calls WS namespace, routes events to callStore
        │
        ├── store/
        │   ├── auth.store.ts                # Zustand: user, token, isAuthenticated, login(), logout()
        │   ├── call.store.ts                # Zustand: activeCall, isOnCall, showDispositionForm
        │   └── theme.store.ts               # Zustand: mode (light/dark), lightBg, darkBg
        │
        └── lib/
            ├── api-client.ts                # Axios instance: baseURL=/api, JWT interceptor, 401 redirect
            └── utils.ts                     # cn() helper (clsx + tailwind-merge)
```

---

## 5. Backend Architecture

### Module Dependency Graph
```
AppModule
├── ConfigModule (global)
├── BullModule (global Redis connection)
├── PrismaModule (global)
├── AuthModule → UsersModule
├── UsersModule → PrismaModule
├── LeadsModule → PrismaModule
├── CallsModule → PrismaModule + TelephonyModule
├── DispositionsModule → PrismaModule
├── WebhooksModule → CallsModule + TelephonyModule
├── TelephonyModule (provides TELEPHONY_PROVIDER token)
└── ImportsModule → PrismaModule + BullModule (csv-import queue)
```

### Key Patterns

**Dependency Injection for Telephony**
- `TelephonyModule` uses a factory provider that reads `TELEPHONY_PROVIDER_NAME` env var
- Resolves to `TwilioProvider`, `TelnyxProvider`, or `MockTelephonyProvider`
- Other modules inject via `@Inject(TELEPHONY_PROVIDER)` — never import a concrete provider

**Serialize Interceptor**
- `@Serialize(ResponseDto)` on controller methods strips fields not in the DTO
- Uses `class-transformer`'s `plainToClass` + `excludeExtraneousValues`
- Prevents accidental password hash leaks, etc.

**Public Route Bypass**
- `JwtAuthGuard` checks for `@SetMetadata('isPublic', true)` on handler or class
- Auth routes and webhook routes use this to skip JWT validation
- Webhooks use `WebhookGuard` instead (Twilio signature validation)

**Data Flow Through Backend**
```
HTTP Request
  → NestJS routing
  → JwtAuthGuard (validates Bearer token, populates req.user)
  → RolesGuard (checks @Roles() if present)
  → ValidationPipe (validates + transforms DTO)
  → Controller method
  → Service method
  → PrismaService (DB)
  → Service returns entity
  → Serialize interceptor (strips to DTO shape)
  → HTTP Response
```

**WebSocket Flow**
```
Agent connects → CallsGateway.handleConnection()
  → client.join(`agent:${userId}`)

Twilio webhook → WebhooksController.handleStatus()
  → CallsService.handleStatusUpdate()
  → prisma.call.update()
  → callsGateway.sendCallStatus(agentId, data)
  → server.to(`agent:${agentId}`).emit('call:status', data)
  → Frontend useSocket receives event
  → callStore.setCallStatus(data)
  → UI re-renders (CallWidget, timer, disposition prompt)
```

### Guards Summary
| Guard | Applied To | Logic |
|-------|-----------|-------|
| `JwtAuthGuard` | All routes (global implicit) | Validates JWT; bypasses if `isPublic` metadata present |
| `RolesGuard` | Specific controller methods | Checks `user.role` against `@Roles(...)` metadata |
| `WebhookGuard` | `WebhooksController` | Validates Twilio HMAC signature; bypassed if `WEBHOOK_VALIDATION=false` |

---

## 6. Database Schema

### Enums

```
UserRole:         BDR | ADMIN
LeadStatus:       NEW | CONTACTED | INTERESTED | NOT_INTERESTED | WRONG_NUMBER | CALLBACK_SCHEDULED | OPT_OUT
CallStatus:       INITIATING | RINGING | IN_PROGRESS | COMPLETED | NO_ANSWER | BUSY | FAILED | CANCELED
DispositionType:  INTERESTED | NOT_INTERESTED | CALLBACK | WRONG_NUMBER | NO_ANSWER | VOICEMAIL | GATEKEEPER | OPT_OUT | OTHER
TelephonyProvider: TWILIO | TELNYX
TranscriptionProvider: DEEPGRAM | ASSEMBLYAI
TranscriptionStatus: PENDING | PROCESSING | COMPLETED | FAILED
ImportStatus:     PENDING | PROCESSING | COMPLETED | FAILED | AWAITING_DEDUP_REVIEW
```

### Entity: `users` (User)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| email | String UNIQUE | Login identifier |
| passwordHash | String | bcrypt, 12 rounds |
| fullName | String | |
| role | UserRole | Default: BDR |
| isActive | Boolean | Default: true; deactivated users cannot login |
| createdAt | DateTime | |
| updatedAt | DateTime | auto-updated |

Relations: `assignedPhoneNumber` (0-1 PhoneNumber), `ownedLeads` (Lead[]), `calls` (Call[]), `requestedTranscriptions` (Transcription[]), `csvImports` (CsvImport[])

### Entity: `phone_numbers` (PhoneNumber)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| number | String | E.164 format (e.g. +441234567890) |
| countryCode | String | ISO 2-letter (GB, DE, NL) |
| provider | TelephonyProvider | |
| providerSid | String? | Twilio phone number SID |
| assignedUserId | String? UNIQUE | One phone per BDR |
| isActive | Boolean | |
| createdAt | DateTime | |

Unique constraint: `(number, provider)`. Relations: `assignedUser` (User?), `calls` (Call[])

### Entity: `leads` (Lead)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| companyName | String | Required |
| contactName | String? | |
| contactTitle | String? | |
| phoneNumber | String | E.164 format; indexed |
| country | String? | ISO 2-letter |
| location | String? | City/region string |
| headcount | Int? | |
| headcountGrowth6m | Decimal(5,2)? | |
| headcountGrowth12m | Decimal(5,2)? | |
| email | String? | |
| website | String? | |
| personalLinkedin | String? | |
| companyLinkedin | String? | |
| industry | String? | |
| companyOverview | Text? | |
| aiSummary | Text? | AI-generated content field (future) |
| isOptOut | Boolean | Default: false; set by OPT_OUT disposition |
| isWrongNumber | Boolean | Default: false; blocks calling |
| ownerId | String FK → users.id | Required; BDR assignment |
| status | LeadStatus | Default: NEW |
| sourceImportId | String? FK → csv_imports.id | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Indexes: `(ownerId, status)`, `(phoneNumber)`. Relations: `owner` (User), `sourceImport` (CsvImport?), `calls` (Call[])

### Entity: `calls` (Call)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| leadId | String FK → leads.id | |
| agentId | String FK → users.id | |
| phoneNumberId | String FK → phone_numbers.id | |
| providerCallId | String? | Twilio Call SID (null until telephony confirms) |
| status | CallStatus | Default: INITIATING |
| startedAt | DateTime? | Set when call record created |
| answeredAt | DateTime? | Set when IN_PROGRESS received |
| endedAt | DateTime? | Set when terminal status received |
| durationSeconds | Int? | Total (ring + talk); from Twilio |
| talkTimeSeconds | Int? | Calculated: endedAt - answeredAt |
| recordingUrl | String? | Set by recording webhook |
| recordingSid | String? | Twilio recording SID |
| errorCode | String? | Provider error code |
| createdAt | DateTime | |

Indexes: `(agentId, status)`, `(leadId, createdAt)`. Relations: `lead`, `agent`, `phoneNumber`, `disposition` (0-1), `transcription` (0-1)

### Entity: `dispositions` (Disposition)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| callId | String UNIQUE FK → calls.id | One disposition per call |
| type | DispositionType | |
| notes | Text? | |
| painPoints | Text? | |
| callbackScheduledAt | DateTime? | For CALLBACK type |
| createdAt | DateTime | |

Index: `(type)`. Relations: `call` (Call)

### Entity: `transcriptions` (Transcription)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| callId | String UNIQUE FK → calls.id | |
| provider | TranscriptionProvider | |
| status | TranscriptionStatus | Default: PENDING |
| text | Text? | Completed transcription |
| requestedBy | String FK → users.id | |
| requestedAt | DateTime | |
| completedAt | DateTime? | |
| errorMessage | String? | |
| createdAt | DateTime | |

Relations: `call` (Call), `requester` (User)

### Entity: `csv_imports` (CsvImport)
| Field | Type | Notes |
|-------|------|-------|
| id | UUID PK | |
| uploadedBy | String FK → users.id | |
| filename | String | Original filename |
| totalRows | Int? | From parser |
| processedRows | Int | Default: 0; updated by worker |
| newLeads | Int | Default: 0; created leads count |
| duplicatesFound | Int | Default: 0 |
| status | ImportStatus | |
| duplicateData | Json? | Stores duplicate rows + newRows for review UI |
| createdAt | DateTime | |
| updatedAt | DateTime | |

Relations: `uploader` (User), `leads` (Lead[])

### Relationship Summary
```
User (1) ──── (0-1) PhoneNumber
User (1) ──── (many) Lead [as owner]
User (1) ──── (many) Call [as agent]
User (1) ──── (many) CsvImport
User (1) ──── (many) Transcription [as requester]
Lead (1) ──── (many) Call
Lead (many) ── (0-1) CsvImport [sourceImport]
Call (1) ──── (0-1) Disposition
Call (1) ──── (0-1) Transcription
PhoneNumber (1) ── (many) Call
```

---

## 7. API Design

All routes prefixed with `/api/v1/` unless noted. JWT Bearer token required unless marked **[PUBLIC]** or **[WEBHOOK]**.

### Auth

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| POST | `/api/v1/auth/register` | `{email, password, fullName, role}` | `{user, accessToken}` | **[PUBLIC]** |
| POST | `/api/v1/auth/login` | `{email, password}` | `{user, accessToken}` | **[PUBLIC]** Returns 200, not 201 |
| GET | `/api/v1/auth/me` | — | `UserResponseDto` | Returns current user from JWT |

### Users (ADMIN only)

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| GET | `/api/v1/users` | — | `UserResponseDto[]` | All users |
| GET | `/api/v1/users/bdrs` | — | `UserSummaryDto[]` | Only BDR-role users |

### Leads

| Method | Route | Query/Body | Response | Notes |
|--------|-------|-----------|----------|-------|
| GET | `/api/v1/leads` | `?page&limit&status&country&search` | `PaginatedLeadsResponseDto` | BDRs see only their own leads; ADMINs see all |
| POST | `/api/v1/leads` | `CreateLeadDto` | `LeadResponseDto` | Owner set to current user |
| GET | `/api/v1/leads/:id` | — | `LeadResponseDto` with calls | Includes full call history |
| PATCH | `/api/v1/leads/:id` | `UpdateLeadDto` | `LeadResponseDto` | BDRs restricted to own leads |
| PATCH | `/api/v1/leads/:id/reassign` | `{newOwnerId}` | `LeadResponseDto` | **[ADMIN only]** |

**Lead Filters** (query params): `page` (default 1), `limit` (default 25), `status` (LeadStatus enum), `country` (string), `search` (searches companyName, contactName, phoneNumber).

Note: `isWrongNumber=true` leads are always excluded from list queries.

### Calls

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| POST | `/api/v1/calls/initiate` | `{leadId}` | `CallResponseDto` | Initiates outbound call; enforces concurrency lock |
| POST | `/api/v1/calls/:id/end` | — | `{message}` | Sends hangup; status updates come via webhook |
| GET | `/api/v1/calls/token` | — | `{token}` | Twilio Access Token for WebRTC client |
| GET | `/api/v1/calls/lead/:leadId` | — | `CallResponseDto[]` | Call history for a lead |

### Dispositions

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| POST | `/api/v1/dispositions` | `{callId, type, notes?, painPoints?, callbackScheduledAt?}` | `DispositionResponseDto` | Only for terminal-status calls; auto-updates lead status |
| PATCH | `/api/v1/dispositions/:id` | `{notes?, painPoints?}` | `DispositionResponseDto` | Only call's own agent may edit |

### Imports

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| POST | `/api/v1/imports/upload` | `multipart/form-data; file` | `ImportUploadResponseDto` | Max 10MB; CSV or Excel |
| POST | `/api/v1/imports/:id/resolve` | `{decisions: [{phoneNumber, action}]}` | `ImportResolveResponseDto` | `action`: `skip` \| `merge` \| `import` |
| GET | `/api/v1/imports/:id` | — | `ImportStatusResponseDto` | Poll for progress |
| GET | `/api/v1/imports` | — | `ImportStatusResponseDto[]` | BDRs see own; ADMINs see all |

### Webhooks (Unversioned, no JWT)

| Method | Route | Body | Response | Notes |
|--------|-------|------|----------|-------|
| POST | `/api/webhooks/twilio/voice` | Twilio form fields | TwiML XML | **[WEBHOOK]** Returns XML to instruct call recording |
| POST | `/api/webhooks/twilio/status` | Twilio status fields | `{received: true}` | **[WEBHOOK]** Updates call DB + pushes WS event |
| POST | `/api/webhooks/twilio/recording` | Twilio recording fields | `{received: true}` | **[WEBHOOK]** Saves recording URL |

---

## 8. State Management

### Frontend State (Zustand stores)

**`useAuthStore`** (`src/store/auth.store.ts`)
- State: `user`, `token`, `isLoading`, `isAuthenticated`
- Actions: `login(email, password)` → POST /auth/login → persist to localStorage; `logout()` → clear localStorage + redirect; `loadFromStorage()` → hydrate from localStorage on mount
- Persisted to: `localStorage` keys `signalhunt_token`, `signalhunt_user`

**`useCallStore`** (`src/store/call.store.ts`)
- State: `activeCall` (callId, leadId, status, timestamps, duration), `isOnCall`, `showDispositionForm`
- Actions: `setCallStatus(payload)` → updates active call; auto-sets `showDispositionForm=true` on terminal status; `clearCall()` → reset all; `setShowDisposition(bool)`
- NOT persisted (in-memory only; call state is ephemeral)
- Written to exclusively by `useSocket` hook when `call:status` WS events arrive

**`useThemeStore`** (`src/store/theme.store.ts`)
- State: `mode` (light/dark), `lightBg`, `darkBg`
- Persisted to: localStorage
- Applied by dashboard layout via CSS `data-theme` attribute and CSS variables

### API Client State
- No React Query or SWR; pages use `useEffect` + local `useState` for data fetching
- Each page manages its own loading/error state
- `apiClient` (Axios) globally handles 401 → logout redirect

---

## 9. Background Jobs / Queues

### Queue: `csv-import`
- **Broker**: Redis (BullMQ)
- **Producer**: `ImportsService.enqueueImport()` — called after file upload (no duplicates path) or after duplicate resolution
- **Consumer**: `ImportsProcessor` (registered via `@Processor('csv-import')`) — runs in **worker process** (`worker.ts`)
- **Job name**: `process-csv`
- **Job payload**: `{ importId, rows: ParsedRow[], ownerId }`
- **Retry config**: `attempts: 3`, exponential backoff starting at 5000ms
- **Processing**: Batches of 50 rows; uses `prisma.lead.createMany()` with `skipDuplicates: true`; updates `CsvImport.processedRows` and `newLeads` incrementally; reports progress via `job.updateProgress()`
- **Terminal states**: Sets `ImportStatus.COMPLETED` or `ImportStatus.FAILED` on the `CsvImport` record

### Worker Process (`src/worker.ts`)
- Bootstrapped via `NestFactory.createApplicationContext(AppModule)` — no HTTP listener
- All `@Processor()` decorators in the app automatically register their queues
- Handles `SIGTERM`/`SIGINT` for graceful shutdown
- Run independently: `npm run dev:worker`

---

## 10. Realtime Systems

### WebSocket Namespace: `/calls`
- **Library**: Socket.io on server (NestJS `@nestjs/platform-socket.io`), `socket.io-client` on frontend
- **Namespace**: `/calls` — dedicated to call lifecycle events
- **Transport**: Starts with long-polling, upgrades to WebSocket (`transports: ['polling', 'websocket']`)
- **Auth**: Connects with `query: { userId: user.id }`. **TODO**: Production should validate JWT from `handshake.auth.token`.
- **Room pattern**: Each agent joins room `agent:{userId}`. Events are targeted to individual agents.

### Events (Server → Client)

| Event | Payload | When Fired |
|-------|---------|-----------|
| `call:status` | `CallStatusPayload` | On every call state change (INITIATING, RINGING, IN_PROGRESS, COMPLETED, etc.) |
| `call:recording_ready` | `RecordingReadyPayload` | When Twilio recording webhook is received and URL is saved |

### Frontend Handling
- `useSocket` hook: initialized once in dashboard layout (`(dashboard)/layout.tsx`)
- Listens for `call:status` → calls `callStore.setCallStatus(data)`
- `useCallStore` reactively triggers: `CallWidget` visibility, disposition form display, timer start/stop

### Reconnection
- Auto-reconnect: 10 attempts, 1s–5s backoff, 10s timeout

---

## 11. Authentication and Authorization

### Authentication Flow
1. Client POSTs `{email, password}` to `/api/v1/auth/login`
2. `AuthService.login()`: finds user by email → validates `isActive` → `bcrypt.compare(password, hash)` → `JwtService.sign({sub: id, email, role})`
3. Returns `{user, accessToken}` (JWT, 24h expiry by default)
4. Frontend stores in `localStorage`; axios interceptor attaches `Authorization: Bearer <token>` on every request
5. `JwtStrategy` (Passport) validates token on each request, populates `req.user` with `{id, email, role}`

### Authorization Model

**Route-level**:
- `JwtAuthGuard` on all routes by default (via explicit `@UseGuards`)
- `@SetMetadata('isPublic', true)` on auth routes and webhook controller bypasses JWT check
- `@UseGuards(RolesGuard)` + `@Roles(UserRole.ADMIN)` restricts to admin-only routes

**Data-level**:
- `LeadsService.findAll()`: BDRs automatically filtered to `ownerId = req.user.id`; admins get all
- `LeadsService.update()`: BDRs blocked from updating leads they don't own
- `CallsService.initiateCall()`: validates `lead.ownerId === agentId`
- `DispositionsService.update()`: validates `call.agentId === agentId`

**Webhook security**:
- `WebhookGuard` validates Twilio HMAC-SHA1 signature using `TWILIO_AUTH_TOKEN`
- `WEBHOOK_VALIDATION=false` env var disables for mock/dev environments

---

## 12. Key Business Logic

### Call Initiation Workflow
```
Agent clicks "Call" button on lead
  1. Frontend: useCall.initiateCall(leadId) → POST /api/v1/calls/initiate
  2. CallsService.initiateCall(agentId, leadId):
     a. Check no active call for agentId (INITIATING/RINGING/IN_PROGRESS) → 409 if exists
     b. Validate lead exists → 404 if not
     c. Validate lead.ownerId === agentId → 400 if mismatch
     d. Validate lead.isWrongNumber === false → 400 if wrong number
     e. Find PhoneNumber where assignedUserId === agentId → 400 if none assigned
     f. Create Call record (status: INITIATING)
     g. Call telephony.makeCall({to: lead.phoneNumber, from: phone.number, webhookUrl})
     h. Update Call record with providerCallId, status: RINGING
     i. Push call:status(RINGING) via WebSocket to agent
  3. Frontend receives call:status → callStore updates → CallWidget appears
  4. Twilio fires webhooks as call progresses:
     - /status → IN_PROGRESS → push WS → timer starts in UI
     - /status → COMPLETED → push WS → disposition form appears
```

### Call End Workflow
```
Agent clicks "End Call"
  1. POST /api/v1/calls/:id/end
  2. CallsService.endCall(): validates call is active + belongs to agent
  3. telephony.endCall(providerCallId) → tells Twilio to hang up
  4. Twilio fires status webhook COMPLETED → handleStatusUpdate()
     a. Updates call.endedAt, durationSeconds, talkTimeSeconds
     b. Updates lead.status = CONTACTED
     c. Pushes call:status(COMPLETED) via WebSocket
  5. Twilio fires recording webhook → handleRecordingComplete()
     a. Saves recording URL to call record
     b. Pushes call:recording_ready to agent
  6. Frontend: disposition form shown (showDispositionForm = true)
```

### Disposition Submission Workflow
```
Agent completes disposition form → useCall.submitDisposition(data)
  1. POST /api/v1/dispositions {callId, type, notes, painPoints, callbackScheduledAt?}
  2. DispositionsService.create():
     a. Validate call exists + belongs to agentId
     b. Validate call is in terminal status (COMPLETED/NO_ANSWER/BUSY/FAILED)
     c. Validate no existing disposition (prevents duplicates)
     d. Map DispositionType → LeadStatus (INTERESTED→INTERESTED, CALLBACK→CALLBACK_SCHEDULED, etc.)
     e. If type === OPT_OUT: set lead.isOptOut = true
     f. If type === WRONG_NUMBER: set lead.isWrongNumber = true
     g. Prisma $transaction: create Disposition + update Lead.status
  3. Frontend: clearCall() → CallWidget disappears, form closes
```

### CSV Import Workflow
```
Admin/BDR uploads CSV file
  1. POST /api/v1/imports/upload (multipart, 10MB limit)
  2. ImportsService.uploadFile():
     a. Validate MIME type (CSV/Excel)
     b. parseLeadFile(buffer) → ParseResult {rows, errors, totalRows}
     c. Extract all phoneNumbers → query existing leads for matches
     d. Split into: newRows (no match) and duplicateRows (match)
     e. Create CsvImport record
     f. IF no duplicates:
        - Set status: PENDING
        - Enqueue 'process-csv' job → return {status: 'processing'}
     g. IF duplicates exist:
        - Set status: AWAITING_DEDUP_REVIEW
        - Store {duplicates, newRows} in CsvImport.duplicateData (JSON)
        - Return {status: 'awaiting_review', duplicates: [...]}

  [IF duplicates: User reviews in UI]
  3. POST /api/v1/imports/:id/resolve {decisions: [{phoneNumber, action}]}
  4. ImportsService.resolveDuplicates():
     a. For each 'merge' decision: update existing lead with incoming data
     b. Collect rows to import: all newRows + duplicate rows where action='import'
     c. Set status: PENDING + enqueue job

  [Worker processes job]
  5. ImportsProcessor.process():
     a. Set status: PROCESSING
     b. Batch insert in groups of 50 via prisma.lead.createMany()
     c. Update processedRows + newLeads after each batch
     d. Set status: COMPLETED (or FAILED + re-throw for BullMQ retry)
```

### Lead Status State Machine
```
NEW
  → CONTACTED (on any call becoming IN_PROGRESS or COMPLETED)
  → INTERESTED (disposition: INTERESTED)
  → NOT_INTERESTED (disposition: NOT_INTERESTED)
  → CALLBACK_SCHEDULED (disposition: CALLBACK)
  → WRONG_NUMBER (disposition: WRONG_NUMBER, also sets isWrongNumber=true)
  → OPT_OUT (disposition: OPT_OUT, also sets isOptOut=true)
```

---

## 13. Environment Variables

All variables read from `signalhunt/.env` (monorepo root). API reads via `ConfigModule.forRoot({ envFilePath: '../../.env' })`.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string (Prisma) |
| `POSTGRES_USER` | Docker only | `signalhunt` | Docker Compose PostgreSQL user |
| `POSTGRES_PASSWORD` | Docker only | `signalhunt_dev` | Docker Compose PostgreSQL password |
| `POSTGRES_DB` | Docker only | `signalhunt_dev` | Docker Compose database name |
| `REDIS_URL` | ✅ | `redis://localhost:6379` | BullMQ Redis connection |
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs. Use 64-char random hex in production |
| `JWT_EXPIRES_IN` | ❌ | `24h` | JWT expiry duration |
| `TELEPHONY_PROVIDER_NAME` | ✅ | `mock` | `mock` \| `twilio` \| `telnyx` |
| `TWILIO_ACCOUNT_SID` | If Twilio | — | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | If Twilio | — | Twilio Auth Token (webhook validation) |
| `TWILIO_API_KEY` | If Twilio | — | Twilio API Key (for Access Tokens) |
| `TWILIO_API_SECRET` | If Twilio | — | Twilio API Secret |
| `TWILIO_TWIML_APP_SID` | If Twilio | — | TwiML App SID for browser calling |
| `WEBHOOK_VALIDATION` | ❌ | `false` | Set `true` in production to validate Twilio signatures |
| `DEEPGRAM_API_KEY` | If transcription | — | Deepgram API key for transcription (future) |
| `NODE_ENV` | ❌ | `development` | `development` \| `production` |
| `API_PORT` | ❌ | `4000` | Port for NestJS HTTP server |
| `API_URL` | ✅ | `http://localhost:4000` | Internal API URL (used by mock provider for self-webhook) |
| `FRONTEND_URL` | ✅ | `http://localhost:3000` | CORS allowed origin; WebSocket CORS |
| `WEBHOOK_BASE_URL` | ✅ | `http://localhost:4000` | Public base URL for Twilio webhook callbacks. Use ngrok for dev with real Twilio |
| `NEXT_PUBLIC_API_URL` | ✅ (web) | `http://localhost:4000` | Frontend: base URL for API calls and WebSocket |

---

## 14. Setup Instructions

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.9.2
- Docker + Docker Compose

### Local Development

```bash
# 1. Clone repo and install dependencies
git clone <repo>
cd signalhunt
npm install

# 2. Start infrastructure (PostgreSQL on :5433, Redis on :6379)
npm run docker:up

# 3. Configure environment
cp .env.example .env
# Edit .env — minimum: DATABASE_URL, REDIS_URL, JWT_SECRET
# Leave TELEPHONY_PROVIDER_NAME=mock for dev (no real calls)

# 4. Run database migrations
npm run db:migrate

# 5. Seed test data (admin + 2 BDRs + 2 phone numbers + 34 leads)
npm run db:seed

# 6. Start API server (port 4000)
npm run dev:api

# 7. Start worker (separate terminal)
npm run dev:worker

# 8. Start frontend (port 3000)
npm run dev:web
```

### Test Credentials (after seed)
```
Admin:  admin@signalhunt.com / admin123456
BDR 1:  bdr1@signalhunt.com  / bdr123456
BDR 2:  bdr2@signalhunt.com  / bdr123456
```

### Database Commands
```bash
npm run db:migrate    # Run pending migrations
npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:seed       # Insert test data
npm run db:studio     # Open Prisma Studio at localhost:5555
```

### Using Real Twilio (Optional)
1. Set `TELEPHONY_PROVIDER_NAME=twilio` in `.env`
2. Fill in all `TWILIO_*` variables
3. Install ngrok: `ngrok http 4000`
4. Set `WEBHOOK_BASE_URL=https://<your-ngrok-id>.ngrok.io`
5. Set `WEBHOOK_VALIDATION=true`
6. Configure Twilio phone number webhooks to point to your ngrok URL

---

## 15. Design Decisions

### Telephony Provider Abstraction
- **Decision**: `TelephonyProvider` interface + factory pattern; concrete providers are never imported directly by business logic.
- **Rationale**: Vendor lock-in avoidance. Can switch from Twilio to Telnyx by swapping one env var. Mock provider enables full E2E testing without real telephony costs.

### Webhook Routes Are Unversioned
- **Decision**: Webhook endpoints at `/api/webhooks/twilio/*` bypass URI versioning.
- **Rationale**: Twilio webhook URLs are configured externally in the Twilio console. Adding `/v1/` to these routes would silently break all incoming status callbacks when the route changes.

### BullMQ Worker as Separate Process
- **Decision**: CSV import processing runs in `worker.ts` (separate Node.js process) rather than inline.
- **Rationale**: Large CSV files with thousands of rows would block the HTTP event loop. Separate process allows independent scaling and restarts without affecting API availability.

### Duplicate Detection Before Queue
- **Decision**: Duplicate phone number check happens synchronously at upload time, before enqueuing.
- **Rationale**: Providing immediate feedback (which rows are duplicates) requires synchronous resolution. Moving it to the worker would require a polling UI or additional real-time events.

### Zustand Over Redux/React Query
- **Decision**: Zustand for all client state.
- **Rationale**: Call state needs to be readable outside React components (e.g., in hooks). Zustand stores are plain JS objects accessible anywhere. No boilerplate. React Query not adopted to avoid additional complexity at this scale.

### WebSocket Room Strategy: Per-Agent Rooms
- **Decision**: `agent:{userId}` rooms, agent joins on WebSocket connect.
- **Rationale**: Call status updates are agent-specific. Broadcasting to a room is simpler than tracking socket IDs. Supports multiple browser tabs per agent (both receive updates).

### JWT in localStorage (vs httpOnly cookies)
- **Decision**: JWT stored in `localStorage`; attached via axios interceptor.
- **Trade-off**: Simpler implementation but XSS-vulnerable. For v1 internal tool, accepted. Production should migrate to httpOnly cookies with CSRF protection.

### `isWrongNumber` and `isOptOut` as Separate Flags
- **Decision**: Boolean flags in addition to `LeadStatus` enum values.
- **Rationale**: Flags allow quick filtering at DB query level. `isWrongNumber=true` leads are excluded from all lead list queries and the dialer without requiring enum checks. `isOptOut=true` can be used for compliance-level filtering.

---

## 16. AI Handoff Context

### How the Codebase Is Organized

**Monorepo with three primary artifacts**:
1. `signalhunt/packages/shared-types` — TypeScript type package; imported by both `api` and `web`
2. `signalhunt/api` — NestJS backend; all business logic, DB access, telephony
3. `signalhunt/web` — Next.js frontend; all UI

**Schema lives at root**: `signalhunt/prisma/schema.prisma` is the single source of truth. Both api and worker reference it via relative path.

### Conventions to Follow

**Backend (NestJS)**:
- Every domain = one module folder: `controller.ts`, `service.ts`, `module.ts`, `dto/`
- Controllers are thin: validate input, call service, return result
- Services contain all business logic
- Always use `PrismaService` (never raw SQL)
- Always use `@Serialize(ResponseDto)` on controller endpoints that return entities
- Guards order: `JwtAuthGuard` first, then `RolesGuard`
- Public routes: add `@SetMetadata('isPublic', true)` or import `Public` decorator pattern
- All new routes must use `version: '1'` in `@Controller({path: '...', version: '1'})`
- Inject telephony via `@Inject(TELEPHONY_PROVIDER) private telephony: TelephonyProvider` — never import Twilio directly

**Frontend (Next.js)**:
- All API calls go through `apiClient` from `src/lib/api-client.ts`
- Global state goes in a Zustand store in `src/store/`
- Local component state uses `useState`/`useEffect`
- Route protection: handled by dashboard layout's auth check — no need to add per-page checks
- The `useSocket` hook is initialized once in dashboard layout; don't initialize it again in pages
- WebSocket events should only update Zustand store state (never local React state)

**Shared Types**:
- Enums used by both frontend and backend belong in `packages/shared-types/src/`
- WebSocket event payload shapes are defined in `websocket-events.ts`
- After modifying shared types: rebuild the package (Turborepo handles this with `npm run build`)

### How to Add a New Feature

**New API endpoint**:
1. Add DTO in `api/src/{module}/dto/`
2. Add method to `{module}.service.ts`
3. Add route to `{module}.controller.ts` with appropriate guards + `@Serialize`
4. If the module is new: create `{module}.module.ts` and add to `app.module.ts` imports

**New DB entity**:
1. Add model to `prisma/schema.prisma`
2. Run `npm run db:migrate` to create migration
3. Run `npm run db:generate` to regenerate Prisma client
4. Add corresponding `*-response.dto.ts` in `api/src/common/dto/`

**New frontend page**:
1. Create file in `web/src/app/(dashboard)/{route}/page.tsx` for protected pages
2. Use `apiClient` for all API calls
3. If real-time state is needed, connect via existing `useCallStore` or create new Zustand store

**New background job**:
1. Create a `{name}.processor.ts` with `@Processor('{queue-name}')` and extend `WorkerHost`
2. Register the queue in the module with `BullModule.registerQueue({name: '{queue-name}'})`
3. Import `@InjectQueue('{queue-name}')` in the producing service
4. The processor will auto-run in the worker process

### How to Avoid Breaking the Architecture

- **NEVER** import `twilio` or `telnyx` outside `src/telephony/{provider}/` folders
- **NEVER** call `prisma` directly in a controller — always through a service
- **NEVER** add versioning to webhook routes (`/api/webhooks/twilio/*`)
- **NEVER** expose `passwordHash` in API responses — use `@Serialize` with a DTO that excludes it
- **ALWAYS** check `lead.ownerId === agentId` in services before allowing BDR mutation
- **ALWAYS** run migrations (`npm run db:migrate`) after schema changes — the worker and API share the same DB
- **DO NOT** add stateful logic to the gateway (`CallsGateway`) — it should only relay events; business logic belongs in `CallsService`
- When changing `@signalhunt/shared-types`, rebuild before running the apps — both packages depend on compiled output
- Do not bypass `JwtAuthGuard` without explicitly adding `@SetMetadata('isPublic', true)` and documenting why

### Critical Files for Understanding the System

| File | Why It Matters |
|------|----------------|
| `prisma/schema.prisma` | Complete data model |
| `api/src/app.module.ts` | Module dependency graph |
| `api/src/main.ts` | Global middleware, versioning, CORS setup |
| `api/src/telephony/telephony.interface.ts` | Provider contract |
| `api/src/calls/calls.service.ts` | Core call business logic |
| `api/src/calls/calls.gateway.ts` | WebSocket room/event logic |
| `api/src/imports/imports.processor.ts` | Background job processing |
| `web/src/hooks/use-socket.ts` | Frontend WS connection + event routing |
| `web/src/store/call.store.ts` | Frontend call state model |
| `packages/shared-types/src/websocket-events.ts` | WS event contract (both sides) |
