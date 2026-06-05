# NexChat — Production Architecture

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                   │
│   Browser (React SPA)    Mobile (PWA)    Future: Native App     │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS / WSS
┌─────────────────────▼───────────────────────────────────────────┐
│                    NGINX Reverse Proxy                           │
│        Rate Limiting · SSL Termination · Load Balancing         │
└────────────────┬──────────────────────┬────────────────────────┘
                 │ REST /api            │ WebSocket /socket.io
┌────────────────▼──────────────────────▼────────────────────────┐
│               Node.js / Express + Socket.IO                      │
│          (3-10 instances via Kubernetes HPA)                     │
│   Auth · Messages · Groups · Media · AI · Calls · Whiteboard    │
└──────┬────────────────┬───────────────────────┬────────────────┘
       │                │                       │
┌──────▼──────┐  ┌──────▼──────┐  ┌────────────▼────────────────┐
│  MongoDB     │  │    Redis    │  │   Cloudinary / AWS S3       │
│  (Primary   │  │  (Cache +   │  │   (Media Storage)           │
│  + Replica) │  │  Pub/Sub +  │  └────────────────────────────┘
│             │  │  Presence)  │
└─────────────┘  └─────────────┘
```

## 2. Folder Structure

```
nexchat/
├── client/                          # React 18 SPA
│   ├── public/
│   │   └── manifest.json            # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/                # Login, Register forms
│   │   │   ├── chat/                # Sidebar, ChatWindow, MessageBubble, etc.
│   │   │   ├── video/               # CallModal (WebRTC)
│   │   │   ├── whiteboard/          # Collaborative canvas
│   │   │   └── common/              # Avatar, LoadingScreen, NotificationPanel
│   │   ├── features/                # Redux Toolkit slices
│   │   │   ├── auth/authSlice.js
│   │   │   ├── chat/chatSlice.js
│   │   │   ├── messages/messageSlice.js
│   │   │   ├── notifications/notificationSlice.js
│   │   │   └── ui/uiSlice.js
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── pages/                   # Route-level components
│   │   ├── services/
│   │   │   ├── api.js               # Axios + token refresh interceptor
│   │   │   ├── socket.js            # Socket.IO client + event handlers
│   │   │   └── encryption.js        # Web Crypto API E2EE
│   │   ├── store/index.js           # Redux store
│   │   └── utils/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # MongoDB connection
│   │   │   ├── redis.js             # Redis connection
│   │   │   └── cloudinary.js        # Cloudinary / Multer config
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register/login/refresh/reset
│   │   │   └── messageController.js # CRUD + reactions + read receipts
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT protect + RBAC
│   │   │   ├── errorHandler.js      # Centralized error handling
│   │   │   ├── notFound.js
│   │   │   └── validate.js          # express-validator wrapper
│   │   ├── models/
│   │   │   ├── User.js              # Auth + profile + presence + E2EE pubkey
│   │   │   ├── Chat.js              # Direct + group chats
│   │   │   ├── Message.js           # Full message schema
│   │   │   ├── Notification.js
│   │   │   ├── Call.js              # Call logs + WebRTC metadata
│   │   │   ├── Bookmark.js
│   │   │   ├── Reminder.js
│   │   │   ├── Whiteboard.js
│   │   │   └── Analytics.js
│   │   ├── routes/                  # Express routers
│   │   ├── services/
│   │   │   ├── emailService.js      # Nodemailer
│   │   │   └── reminderService.js   # node-cron scheduler
│   │   ├── sockets/
│   │   │   ├── index.js             # Socket.IO init + Redis adapter
│   │   │   ├── presenceHandlers.js  # Online/offline + typing
│   │   │   ├── chatHandlers.js      # Room join + delivery receipts
│   │   │   ├── callHandlers.js      # WebRTC signaling
│   │   │   └── whiteboardHandlers.js
│   │   └── utils/
│   │       ├── logger.js            # Winston
│   │       └── encryption.js        # AES-256-GCM server utility
│   ├── tests/
│   │   └── auth.test.js
│   ├── Dockerfile
│   └── package.json
│
├── nginx/nginx.conf                 # Production reverse proxy
├── docker-compose.yml
├── k8s/
│   └── base/
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secrets.yaml             # Template only — use Sealed Secrets
│       ├── server-deployment.yaml   # 3 replicas + rolling update
│       ├── client-deployment.yaml
│       ├── hpa.yaml                 # 3-10 pods, CPU/mem triggers
│       └── ingress.yaml             # HTTPS + WebSocket routing
└── .github/workflows/ci-cd.yml     # Test → Build → Push → Deploy
```

## 3. MongoDB Schema Design

### Users Collection
```javascript
{
  _id, username (indexed), email (indexed, unique),
  password (hashed), role,
  profile: { avatar, bio, displayName },
  presence: { isOnline (indexed), status, lastSeen },
  settings: { notifications, soundEnabled, theme },
  publicKey,               // ECDH public key for E2EE
  isEmailVerified,
  refreshTokens: [],       // Stored refresh tokens (max 5)
  blockedUsers: [],
  contacts: [],
  timestamps
}
```

### Chats Collection
```javascript
{
  _id, type: 'direct'|'group',
  participants: [userId, ...],      // indexed
  lastMessage: messageId,
  // Group-only fields:
  name, description, avatar,
  admins: [], createdBy,
  isE2EE,
  mutedBy: [], pinnedBy: [], archivedBy: [],
  unreadCounts: [{ user, count }],
  timestamps
}
```

### Messages Collection
```javascript
{
  _id, chat (indexed),
  sender (indexed),
  content,                    // encrypted ciphertext for E2EE
  encryptedContent: Map,       // { recipientId: encryptedBlob } for groups
  isEncrypted,
  type: 'text'|'image'|'video'|'audio'|'file'|'gif'|'system'|'call',
  media: { url, publicId, mimeType, size, name, thumbnail, duration },
  replyTo, forwardedFrom,
  reactions: [{ emoji, users: [] }],
  readBy: [{ user, readAt }],
  deliveredTo: [{ user, deliveredAt }],
  isEdited, editHistory: [],
  isDeleted, deletedFor: [], deletedAt,
  timestamps                  // text-indexed for full-text search
}
```

## 4. API Design

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register + send verification email |
| GET | /api/auth/verify-email/:token | Email verification |
| POST | /api/auth/login | Login → access + refresh tokens |
| POST | /api/auth/refresh | Rotate refresh token |
| POST | /api/auth/logout | Blacklist access token in Redis |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password/:token | Reset password |
| GET | /api/users/me | Current user profile |
| PATCH | /api/users/me | Update profile/settings/public key |
| POST | /api/users/me/avatar | Upload avatar |
| GET | /api/users/:id | Public user profile |
| POST | /api/users/block/:id | Block user |
| GET | /api/chats | All user chats |
| POST | /api/chats/direct | Create/get direct chat |
| GET | /api/messages/chat/:chatId | Paginated messages |
| POST | /api/messages | Send message |
| PATCH | /api/messages/:id | Edit message |
| DELETE | /api/messages/:id | Delete message |
| POST | /api/messages/:id/react | Add/toggle reaction |
| POST | /api/messages/chat/:chatId/read | Mark all as read |
| POST | /api/media/upload/:chatId | Upload file/media |
| POST | /api/groups | Create group |
| PATCH | /api/groups/:id | Edit group |
| POST | /api/groups/:id/members | Add member |
| DELETE | /api/groups/:id/members/:userId | Remove member |
| GET | /api/search | Search users/messages/groups |
| POST | /api/ai/chat | AI assistant |
| POST | /api/ai/summarize/:chatId | Summarize conversation |
| POST | /api/ai/smart-replies | Generate reply suggestions |
| GET | /api/analytics/:chatId | Chat analytics |
| GET | /api/notifications | User notifications |
| PATCH | /api/notifications/read-all | Mark all read |
| GET | /api/bookmarks | Bookmarked messages |
| POST | /api/bookmarks | Bookmark message |
| GET | /api/reminders | User reminders |
| POST | /api/reminders | Create reminder |
| GET | /api/calls/history | Call history |
| GET | /api/whiteboard/:chatId | Whiteboard state |

## 5. Socket.IO Event Design

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| heartbeat | — | Keep presence alive |
| set_status | { status } | Set online/away/busy |
| typing_start | { chatId } | Start typing indicator |
| typing_stop | { chatId } | Stop typing indicator |
| join_chat | { chatId } | Join Socket.IO room |
| message_delivered | { messageId, chatId } | Delivery receipt |
| call:initiate | { chatId, type, offer } | Initiate call + SDP offer |
| call:answer | { callId, answer, chatId } | Accept + SDP answer |
| call:reject | { callId, chatId } | Reject call |
| call:end | { callId, chatId } | End call |
| call:ice_candidate | { callId, chatId, candidate, to } | ICE relay |
| call:screen_share_start | { chatId } | Screen share notification |
| whiteboard:join | { chatId } | Join whiteboard room |
| whiteboard:draw | { chatId, drawData } | Broadcast draw event |
| whiteboard:save | { chatId, canvasData } | Persist canvas |
| whiteboard:clear | { chatId } | Clear canvas |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| new_message | { chatId, message } | New incoming message |
| message_edited | { chatId, messageId, content } | Message edited |
| message_deleted | { chatId, messageId, deleteFor } | Message deleted |
| message_reaction | { chatId, messageId, reactions } | Reaction updated |
| messages_read | { chatId, readBy, readAt } | Read receipt |
| message_delivered_ack | { messageId, deliveredTo } | Delivery confirmed |
| user_online | { userId } | User came online |
| user_offline | { userId, lastSeen } | User went offline |
| user_typing | { chatId, userId } | Typing indicator |
| user_stopped_typing | { chatId, userId } | Stopped typing |
| group_created | { group } | New group created |
| group_updated | { groupId, ... } | Group metadata changed |
| member_added | { groupId, userId } | Member added to group |
| member_removed | { groupId, userId } | Member removed |
| call:incoming | { callId, chatId, type, offer } | Incoming call |
| call:answered | { callId, answer } | Call accepted |
| call:rejected | { callId } | Call rejected |
| call:ended | { callId, duration } | Call ended |
| call:ice_candidate | { callId, candidate, from } | ICE candidate |
| whiteboard:state | { canvasData } | Initial canvas state |
| whiteboard:draw | { drawData, by } | Remote draw event |
| whiteboard:cleared | { by } | Canvas cleared |
| reminder_triggered | { reminderId, title } | Reminder fired |

## 6. WebRTC Architecture

```
Client A                    Server (Signaling)                Client B
   │                              │                              │
   │── call:initiate (offer) ────>│                              │
   │                              │── call:incoming (offer) ───>│
   │                              │<── call:answer (answer) ────│
   │<── call:answered (answer) ───│                              │
   │── call:ice_candidate ───────>│── call:ice_candidate ──────>│
   │<── call:ice_candidate ───────│<── call:ice_candidate ──────│
   │                              │                              │
   │◄══════════ P2P WebRTC Stream (audio/video) ══════════════►│
```

- Uses `simple-peer` library wrapping native WebRTC APIs
- Server acts as signaling relay only — media is P2P
- ICE candidates relayed through Socket.IO rooms
- TURN server (e.g. coturn) needed for NAT traversal in production

## 7. Redis Architecture

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `presence:{userId}` | 35s | Online/offline tracking |
| `blacklist:{token}` | token TTL | Logout token invalidation |
| `messages:{chatId}:page:{n}` | 300s | Message list cache |
| `session:{userId}` | 1h | Session data |
| Socket.IO adapter | — | Pub/Sub for multi-instance |

## 8. E2EE Architecture

```
Client A generates ECDH key pair (P-256)
  └─► Public key stored on server (User.publicKey)
  └─► Private key stored in sessionStorage (never leaves browser)

Key Exchange:
  Client A fetches Client B's publicKey from server
  Derives shared secret via ECDH: sharedKey = deriveKey(A.private, B.public)
  Encrypts message: ciphertext = AES-GCM-256(sharedKey, plaintext)
  Sends ciphertext to server → stored as-is (server cannot decrypt)

Client B:
  Derives same shared secret: sharedKey = deriveKey(B.private, A.public)
  Decrypts: plaintext = AES-GCM-256-decrypt(sharedKey, ciphertext)
```

## 9. Security Architecture

| Layer | Measure |
|-------|---------|
| Transport | HTTPS/WSS, HSTS, TLS 1.2+ |
| Auth | JWT (15m) + Refresh Tokens (7d, rotated) |
| Token Revocation | Redis blacklist on logout |
| Password | bcrypt cost 12 |
| Input | express-validator + mongoSanitize + xss-clean |
| Rate Limiting | Global 100/15min, Auth 10/15min (Nginx + Express) |
| Headers | Helmet (CSP, X-Frame-Options, etc.) |
| DoS | Nginx worker_connections, body size limits |
| E2EE | ECDH + AES-256-GCM, keys never leave client |
| Secrets | Kubernetes Secrets (template for Sealed Secrets) |
| Container | Non-root user, read-only filesystem, no privilege escalation |

## 10. Step-by-Step Implementation Roadmap

### Phase 1 — Foundation (Week 1-2)
- [ ] Initialize monorepo structure
- [ ] Set up MongoDB + Redis + Express server
- [ ] Implement full JWT auth (register, verify email, login, refresh, logout, reset password)
- [ ] Basic React app with Redux Toolkit + React Router
- [ ] Login/Register pages

### Phase 2 — Core Messaging (Week 3-4)
- [ ] Socket.IO setup with Redis adapter
- [ ] Presence system (online/offline/last seen)
- [ ] Direct chat creation
- [ ] Real-time message send/receive
- [ ] Message history with pagination
- [ ] Typing indicators
- [ ] Read receipts + delivery status

### Phase 3 — Rich Messaging (Week 5-6)
- [ ] Message reactions (6 emojis)
- [ ] Message edit + delete (for me / for everyone)
- [ ] Reply to message
- [ ] Forward message
- [ ] Emoji picker
- [ ] Message search (full-text)

### Phase 4 — Groups + Media (Week 7-8)
- [ ] Group creation + management
- [ ] Admin controls (add/remove members)
- [ ] File/image upload via Cloudinary
- [ ] Drag & drop upload
- [ ] Upload progress indicator
- [ ] Video/audio/PDF sharing

### Phase 5 — Voice & Video (Week 9-10)
- [ ] WebRTC signaling via Socket.IO
- [ ] Voice calls (1-to-1)
- [ ] Video calls (1-to-1)
- [ ] Camera + mic toggle
- [ ] Screen sharing
- [ ] Call logs

### Phase 6 — E2EE + AI (Week 11-12)
- [ ] ECDH key pair generation on client
- [ ] Key exchange mechanism
- [ ] AES-GCM message encryption/decryption
- [ ] AI chat assistant (OpenAI integration)
- [ ] Chat summarization
- [ ] Smart replies

### Phase 7 — Advanced Features (Week 13-14)
- [ ] Collaborative whiteboard (Socket.IO + Canvas)
- [ ] Message bookmarks with categories
- [ ] Reminder system (node-cron)
- [ ] Analytics dashboard (Chart.js)
- [ ] Push notifications (Web Push API)
- [ ] PWA service worker

### Phase 8 — DevOps (Week 15-16)
- [ ] Dockerfile for client + server
- [ ] docker-compose for local dev
- [ ] GitHub Actions CI/CD
- [ ] Kubernetes manifests
- [ ] HPA configuration
- [ ] Production Nginx config
- [ ] Monitoring (Prometheus + Grafana)

## 11. Production Deployment Plan

### Infrastructure
- **Kubernetes cluster**: 3+ nodes (e.g., GKE, EKS, DigitalOcean Kubernetes)
- **MongoDB**: MongoDB Atlas (M10+) or self-hosted with replica set
- **Redis**: Redis Cloud or self-hosted with persistence
- **CDN**: Cloudflare for static assets
- **Media**: Cloudinary or AWS S3 + CloudFront

### Scaling Strategy
- Server pods: 3 replicas minimum, auto-scale to 10 (HPA on CPU/memory)
- Socket.IO: Multiple instances share state via Redis pub/sub adapter
- MongoDB: Read replicas for analytics queries
- Redis: Sentinel or Cluster mode for HA

### Monitoring Stack
```
Prometheus ──► Grafana dashboards
Node.js metrics (/metrics with prom-client)
MongoDB Atlas monitoring
Redis monitoring
Nginx access logs ──► ELK Stack or CloudWatch
```
