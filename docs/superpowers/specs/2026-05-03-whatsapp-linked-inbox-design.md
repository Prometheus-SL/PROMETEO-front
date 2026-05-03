# WhatsApp Linked Inbox Design

**Date:** 2026-05-03

## Goal

Replace the current raw WhatsApp widget/session model with a user-scoped WhatsApp integration that:

- connects one WhatsApp account per authenticated user,
- surfaces new-message notifications and a lightweight inbox in the client,
- keeps message sending behind Spark with explicit user confirmation,
- avoids exposing one user's live WhatsApp session or message stream to other users.

## Why This Change

The current implementation is centered around a live `whatsapp-web.js` session plus a dashboard widget that reads conversations directly from that session. That is acceptable for a local personal setup, but it is too fragile for a hosted multi-user environment because:

- the product surface is tied to the transport session instead of a user-owned inbox abstraction,
- session lifecycle and UI lifecycle are coupled too closely,
- the client reads directly from the live transport instead of from a persisted, user-scoped message store,
- the product currently behaves like a chat client even though the intended UX is notifications plus lightweight reading, not full manual messaging.

## Product Decision

Selected approach: build a new WhatsApp integration layer with a lightweight inbox and Spark-mediated sending.

This keeps the backend transport behind a stable domain model:

1. `Linked WhatsApp account` owned by one user
2. `Inbound events and conversation snapshots` persisted per owner
3. `Client inbox and notifications` reading only persisted, scoped data
4. `Spark send flow` drafting and confirming replies before dispatch

## Constraints and Truths

- For personal WhatsApp accounts there is no generic end-user OAuth flow.
- The v1 connection flow must therefore remain QR-based.
- The system should treat that QR-based transport as an implementation detail of a `WhatsApp linked account`, not as the product surface itself.
- The design must allow a future `Cloud API / Business` transport without reworking the client inbox model.

## User Experience

### Account Linking

- The user sees `WhatsApp` in `Account > Connected Apps`.
- Linking opens a dedicated flow that starts a QR-based enrollment.
- The QR flow is explicitly user-scoped and bound to the authenticated session that initiated it.
- After successful linking, the account card shows:
  - linked status,
  - account display name / phone label when available,
  - last sync time,
  - transport health,
  - last error if the connection requires attention.

### Client Experience

- The client shows:
  - unread count,
  - recent conversations,
  - message preview,
  - sender/conversation name,
  - recent messages inside a lightweight detail view.
- The client does not provide a free-text input box in v1.
- The client offers an action such as `Reply with Spark`.

### Spark Reply Flow

- User selects a conversation and asks Spark to reply.
- Spark reads recent conversation context from persisted inbox data.
- Spark drafts a reply.
- The user must confirm before sending.
- Only after confirmation does the backend dispatch the outbound WhatsApp message.

## Non-Goals

- Building a full WhatsApp chat client in PROMETEO
- Manual typing from the lightweight client in v1
- Cross-user shared inboxes
- Multi-agent automated outbound messaging without user confirmation
- Solving business-grade omnichannel routing in this project phase

## Architecture Overview

The system is split into four layers.

### 1. Linked Account Layer

Purpose: own the relationship between a PROMETEO user and a WhatsApp account.

Responsibilities:

- create and revoke WhatsApp linked accounts,
- bind each linked account to one PROMETEO user,
- hold transport metadata and health state,
- expose status to `Account > Connected Apps`.

Key design point:

- do not treat the current `WhatsAppSession` archive as the account itself,
- instead introduce a first-class `linkedAccounts.whatsapp` entry in the user/provider model and a separate WhatsApp account record for transport/runtime state.

### 2. Transport Layer

Purpose: connect to WhatsApp and receive/send messages.

Responsibilities:

- enroll via QR for personal accounts,
- maintain transport session state,
- ingest inbound message events,
- send outbound messages after confirmation.

Key design point:

- transport state is private backend state and never queried directly by dashboard widgets,
- all client-facing reads go through persisted inbox data.

### 3. Inbox Projection Layer

Purpose: transform raw transport events into user-readable conversation data.

Responsibilities:

- store normalized conversations,
- store recent normalized messages,
- maintain unread counters,
- store last inbound/outbound preview,
- emit notification-friendly events for new inbound messages.

Key design point:

- this layer is the read model for the client and for Spark context gathering,
- it is the main boundary that prevents session leakage across users.

### 4. Client and Spark Layer

Purpose: expose the inbox and reply workflow safely.

Responsibilities:

- show the lightweight inbox,
- show new-message notifications,
- let Spark inspect scoped conversation context,
- gate outbound sends behind explicit confirmation.

## Data Model

### User Provider Summary

Extend the existing linked-account registry with a new `whatsapp` provider entry:

- `status`: `disconnected | linking | connected | reauth_required | error`
- `profile`: optional display label, phone hint, transport kind
- `connectedAt`
- `lastError`
- `capabilities`: `inbox.read`, `notifications.read`, `messages.send_via_spark`

This keeps WhatsApp aligned with `spotify`, `steam`, `google`, etc. in the account UI.

### WhatsApp Linked Account Record

Create a dedicated backend model, separate from the session archive, with fields like:

- `user`
- `providerId` (`whatsapp`)
- `transport` (`personal-web` for v1)
- `sessionKey`
- `state`
- `profile`
- `lastReadyAt`
- `lastSyncAt`
- `lastError`
- `connectedAt`
- `disconnectedAt`

This is the authoritative ownership record.

### Conversation Record

Per linked account and per chat:

- `user`
- `linkedAccountId`
- `chatId`
- `displayName`
- `isGroup`
- `lastMessagePreview`
- `lastMessageAt`
- `unreadCount`
- `lastInboundAt`
- `lastOutboundAt`
- `muted`
- `archived`

### Message Record

Per normalized message:

- `user`
- `linkedAccountId`
- `chatId`
- `messageId`
- `direction` (`inbound | outbound`)
- `body`
- `author`
- `timestamp`
- `transportMeta`
- `sparkDraftMeta` when a reply was produced through Spark

### Notification Record

Optional but recommended for clean client UX:

- `user`
- `source` (`whatsapp`)
- `chatId`
- `messageId`
- `title`
- `preview`
- `createdAt`
- `readAt`

## Main Flows

### Flow A: Link WhatsApp

1. User opens `Account > Connected Apps`.
2. User starts `Link WhatsApp`.
3. Backend creates or refreshes a user-scoped WhatsApp linked account in `linking` state.
4. Backend starts a QR enrollment session bound to that linked account and authenticated session.
5. Client polls or subscribes to QR/status updates for that specific linking attempt.
6. After successful pairing, backend marks the linked account as `connected`.
7. A background sync seeds recent conversations into the inbox projection.

### Flow B: Inbound Message

1. Transport receives a new WhatsApp message.
2. Backend resolves the owning linked account.
3. Backend normalizes and persists the message.
4. Backend updates conversation summary and unread count.
5. Backend emits a user-scoped notification event.
6. Client surfaces the notification and refreshed lightweight inbox state.

### Flow C: Read Conversation in Client

1. Client requests conversation list for the authenticated user.
2. Backend reads only normalized conversation records for that user.
3. Client opens a conversation detail view.
4. Backend returns recent normalized messages from the projection store, not from the live transport session.

### Flow D: Reply with Spark

1. User selects `Reply with Spark`.
2. Spark fetches recent scoped conversation context from projection records.
3. Spark drafts a reply.
4. Client displays the draft and asks for confirmation.
5. On confirmation, backend calls the transport send action.
6. Backend persists the outbound message and refreshes the conversation summary.

## API Shape

### Account / Linking

Add provider support under the existing account system:

- `POST /api/v1/account/linked-accounts/whatsapp/connect`
- `GET /api/v1/account/linked-accounts/whatsapp/link-status`
- `DELETE /api/v1/account/linked-accounts/whatsapp`

Unlike OAuth providers, `connect` returns a linking session payload and QR/status endpoint references instead of an external authorize URL.

### Inbox

Create user-scoped inbox endpoints:

- `GET /api/v1/integrations/whatsapp/conversations`
- `GET /api/v1/integrations/whatsapp/conversations/:chatId`
- `GET /api/v1/integrations/whatsapp/notifications`
- `POST /api/v1/integrations/whatsapp/notifications/:id/read`

These endpoints must read from persisted inbox data only.

### Spark

Add explicit WhatsApp Spark tools:

- `whatsapp_list_conversations`
- `whatsapp_get_conversation`
- `whatsapp_draft_reply`
- `whatsapp_send_reply_confirmed`

Important rule:

- Spark must not send a WhatsApp message directly from a plain natural-language request in v1.
- It must first produce a draft and wait for explicit client confirmation.

## Security and Isolation Rules

- Every WhatsApp linked account belongs to exactly one PROMETEO user.
- Every QR linking attempt is tied to:
  - one authenticated user,
  - one authenticated app session,
  - one pending linked-account record.
- Every conversation and message record stores both `user` and `linkedAccountId`.
- No client endpoint may read directly from the live transport client object.
- No Spark tool may query another user's WhatsApp targets.
- Deleting or disconnecting a linked account must revoke transport access and hide its inbox data from normal queries.

## Error Handling

Expected product states:

- `not linked`
- `linking`
- `waiting for QR scan`
- `connected`
- `reconnect required`
- `transport unavailable`
- `sync delayed`

Client behavior:

- account page shows transport health cleanly,
- inbox remains readable from last persisted sync where possible,
- outbound sending is blocked when provider state is not send-capable,
- Spark should explain why it cannot send instead of failing generically.

## Testing Strategy

### Backend

- provider summary tests for the new WhatsApp linked account
- QR linking flow tests scoped to authenticated user and session
- ownership tests ensuring one user's inbox cannot be read by another
- projection tests for inbound message normalization
- Spark tests for draft-then-confirm flow
- disconnect tests that revoke visibility and sending capability

### Frontend

- account page tests for WhatsApp provider card states
- inbox service tests for normalized conversation fetches
- widget/client tests for unread notifications and lightweight conversation detail
- Spark confirmation UI tests for draft review before send

### Regression Focus

The main regression to pin down is:

- linking or reading one user's WhatsApp account must never surface another user's account, QR, unread count, conversation list, or message preview.

## Rollout Strategy

1. Add the provider model and ownership records.
2. Add QR linking flow under `Account > Connected Apps`.
3. Add inbox projection and notification persistence.
4. Rebuild the client surface to read from the projection.
5. Add Spark draft + confirmation send flow.
6. Retire the current raw WhatsApp widget routes once the new inbox is complete.

## Migration Strategy

- Existing `whatsapp-web.js` session archives can remain as transport artifacts.
- They should no longer be the primary product record.
- Existing widget reads should be treated as legacy and phased out behind the new inbox model.
- If an existing user already has a stored session, the new linked-account layer may attach to it during migration if the ownership can be resolved safely; otherwise require re-linking.

## Recommendation

Implement the new WhatsApp experience as a `linked provider + inbox projection + Spark reply workflow`, not as a repaired version of the current raw widget.

That gives PROMETEO a user-scoped product surface that matches the intended UX and makes the transport replaceable later without rewriting the client again.
