# NexChat — Production-Grade Real-Time Chat Application

A full-stack, production-ready chat application built with the MERN stack + Socket.IO. Architected like a modern SaaS product — not a tutorial project.

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/nexchat.git
cd nexchat

# 2. Install server dependencies
cd server
npm install

# 3. Install client dependencies
cd ../client
npm install

# 4. Go back to root
cd ..
```

### Run locally (2 terminals)

**Terminal 1 — Backend**
```bash
cd nexchat/server
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend**
```bash
cd nexchat/client
npm start
# App opens at http://localhost:3000
```

### Run with Docker (single command)
```bash
docker-compose up --build
# App available at http://localhost:80
```

> **Prerequisites:** Node.js 18+, Redis running locally (`redis-server`), MongoDB Atlas URI in `.env`

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Authentication System](#authentication-system)
- [Real-Time Messaging](#real-time-messaging)
- [End-to-End Encryption](#end-to-end-encryption)
- [Voice & Video Calls](#voice--video-calls)
- [Group Chats](#group-chats)
- [Media & File Sharing](#media--file-sharing)
- [Message Features](#message-features)
- [AI Assistant](#ai-assistant-powered-by-gemini)
- [Collaborative Whiteboard](#collaborative-whiteboard)
- [Bookmarks & Reminders](#bookmarks--reminders)
- [Analytics Dashboard](#analytics-dashboard)
- [Push Notifications](#push-notifications)
- [Redis Architecture](#redis-architecture)
- [Security](#security)
- [API Reference](#api-reference)
- [Socket.IO Events](#socketio-events)
- [Docker & Kubernetes](#docker--kubernetes)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)

---

## Features

### Core Chat
- Real-time one-to-one messaging via Socket.IO
- Group chats with admin controls
- Typing indicators
- Read receipts (Sent → Delivered → Read, like WhatsApp)
- Online/offline presence with last-seen timestamps
- Message pagination with infinite scroll

### Message Capabilities
- Text, images, videos, audio, PDFs, ZIP files
- Drag & drop file upload with progress bar (Cloudinary)
- Message reactions (👍 ❤️ 😂 😮 😢 🔥) — real-time synced
- Edit messages (with edit history)
- Delete for me / Delete for everyone
- Reply to specific messages
- Forward messages
- Message bookmarking with categories

### Authentication
- JWT access tokens (15 min) + Refresh token rotation (7 days)
- Email verification on signup (Gmail)
- Forgot password / Reset password via email
- Secure logout with Redis token blacklisting
- Role-based access control (user / moderator / admin)

### End-to-End Encryption (E2EE)
- ECDH (P-256) key pair generated in the browser via Web Crypto API
- AES-256-GCM message encryption — server never stores plaintext
- Public keys stored on server; private keys stay in sessionStorage
- Lock icon shown on encrypted messages

### Voice & Video Calls
- WebRTC peer-to-peer audio/video calls via `simple-peer`
- Socket.IO used as signaling relay (SDP offer/answer, ICE candidates)
- Camera toggle, microphone mute/unmute
- Screen sharing
- Call logs with duration

### AI Assistant (Gemini 1.5 Flash)
- In-chat AI panel (Sparkles button in header)
- Chat summarization (last 50 messages → 3–5 bullet points)
- Smart reply suggestions (3 contextual one-liners)
- Key topic extraction
- Free-form Q&A

### Collaborative Whiteboard
- Real-time shared canvas (Socket.IO + HTML Canvas)
- Tools: Pen, Eraser, Line, Rectangle, Circle
- 8 colors + adjustable stroke width
- Multi-user drawing with live sync
- Download as PNG
- Canvas auto-saved to MongoDB

### Bookmarks
- Save any message with a single click
- Categories: Study / Work / Personal / Custom
- Search and filter saved messages
- Jump back to original message in chat

### Reminders
- Set a reminder from any message
- Datetime picker with future-only validation
- node-cron fires every minute, pushes via Socket.IO
- Reminder dashboard showing upcoming and past reminders

### Analytics Dashboard
- Messages per day (bar chart)
- Messages by user breakdown (doughnut chart)
- Media type distribution (horizontal bar chart)
- Total calls + call duration stats
- 7 / 14 / 30 day range selector

### Search
- Full-text message search (MongoDB text index)
- User search by username
- Group search by name
- Filter by: date range, sender, media type, chat

### Notifications
- In-app notification center with unread badge
- Toast alerts for new messages in other chats
- Call incoming alerts
- Reminder triggered alerts
- Mark all read

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React 18 | UI framework |
| Redux Toolkit | Global state management |
| React Query | Server state & caching |
| Tailwind CSS | Styling (dark-first design) |
| Socket.IO Client | Real-time communication |
| simple-peer | WebRTC wrapper for calls |
| Chart.js + react-chartjs-2 | Analytics charts |
| react-dropzone | Drag & drop file upload |
| date-fns | Date formatting |
| lucide-react | Icons |
| Web Crypto API | E2EE (built-in browser API) |

### Backend
| Technology | Purpose |
|---|---|
| Node.js 20 + Express | HTTP server |
| Socket.IO 4 | WebSocket server |
| MongoDB + Mongoose | Primary database |
| Redis (ioredis) | Cache, presence, pub/sub |
| @socket.io/redis-adapter | Multi-instance Socket.IO |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| Cloudinary | Media storage |
| Nodemailer | Email (Gmail) |
| @google/generative-ai | Gemini AI features |
| node-cron | Reminder scheduler |
| Helmet + express-validator | Security |
| Winston | Structured logging |
| multer | File upload handling |

### DevOps
| Technology | Purpose |
|---|---|
| Docker + Docker Compose | Containerization |
| Kubernetes | Orchestration (3–10 pod HPA) |
| Nginx | Reverse proxy + SSL |
| GitHub Actions | CI/CD pipeline |
| MongoDB Atlas | Managed database |

---

## Project Structure

```
nexchat/
├── client/                        # React SPA
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json          # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              # Login, Register forms
│   │   │   ├── chat/
│   │   │   │   ├── Sidebar.js     # Chat list + nav
│   │   │   │   ├── ChatWindow.js  # Main chat view
│   │   │   │   ├── ChatHeader.js  # Header with call/AI/whiteboard buttons
│   │   │   │   ├── MessageList.js
│   │   │   │   ├── MessageBubble.js  # Reactions, E2EE decrypt, read status
│   │   │   │   ├── MessageInput.js   # Send + E2EE encrypt + file upload
│   │   │   │   ├── TypingIndicator.js
│   │   │   │   ├── AIPanel.js        # Gemini AI chat panel
│   │   │   │   ├── UserSearchModal.js
│   │   │   │   └── CreateGroupModal.js
│   │   │   ├── video/
│   │   │   │   └── CallModal.js   # WebRTC voice/video
│   │   │   ├── whiteboard/
│   │   │   │   └── Whiteboard.js  # Collaborative canvas
│   │   │   └── common/
│   │   │       ├── Avatar.js
│   │   │       ├── LoadingScreen.js
│   │   │       └── NotificationPanel.js
│   │   ├── features/              # Redux Toolkit slices
│   │   │   ├── auth/authSlice.js
│   │   │   ├── chat/chatSlice.js
│   │   │   ├── messages/messageSlice.js
│   │   │   ├── notifications/notificationSlice.js
│   │   │   └── ui/uiSlice.js
│   │   ├── hooks/
│   │   │   └── useE2EE.js         # E2EE key management hook
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── RegisterPage.js
│   │   │   ├── VerifyEmailPage.js
│   │   │   ├── ForgotPasswordPage.js
│   │   │   ├── ResetPasswordPage.js
│   │   │   ├── ChatLayout.js      # Root layout + routing
│   │   │   ├── AnalyticsPage.js   # Charts dashboard
│   │   │   ├── BookmarksPage.js
│   │   │   ├── RemindersPage.js
│   │   │   └── CallHistoryPage.js
│   │   ├── services/
│   │   │   ├── api.js             # Axios + JWT refresh interceptor
│   │   │   ├── socket.js          # Socket.IO client + event handlers
│   │   │   └── encryption.js      # Web Crypto API (ECDH + AES-GCM)
│   │   └── store/index.js
│   ├── .env
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── Dockerfile
│
├── server/                        # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js        # MongoDB connection
│   │   │   ├── redis.js           # Redis connection
│   │   │   └── cloudinary.js      # Multer + Cloudinary storage
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register/login/refresh/logout/reset
│   │   │   └── messageController.js
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT protect + Redis blacklist check
│   │   │   ├── errorHandler.js    # Centralized error handling
│   │   │   └── validate.js        # express-validator wrapper
│   │   ├── models/
│   │   │   ├── User.js            # Auth + presence + E2EE pubkey
│   │   │   ├── Chat.js            # Direct + group chats
│   │   │   ├── Message.js         # Full message + reactions + E2EE
│   │   │   ├── Notification.js
│   │   │   ├── Call.js
│   │   │   ├── Bookmark.js
│   │   │   ├── Reminder.js
│   │   │   ├── Whiteboard.js
│   │   │   └── Analytics.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── chats.js
│   │   │   ├── messages.js
│   │   │   ├── groups.js
│   │   │   ├── media.js
│   │   │   ├── calls.js
│   │   │   ├── notifications.js
│   │   │   ├── bookmarks.js
│   │   │   ├── reminders.js
│   │   │   ├── search.js
│   │   │   ├── analytics.js
│   │   │   ├── ai.js              # Gemini AI endpoints
│   │   │   └── whiteboard.js
│   │   ├── sockets/
│   │   │   ├── index.js           # Socket.IO init + Redis adapter
│   │   │   ├── presenceHandlers.js
│   │   │   ├── chatHandlers.js
│   │   │   ├── callHandlers.js    # WebRTC signaling
│   │   │   └── whiteboardHandlers.js
│   │   ├── services/
│   │   │   ├── emailService.js    # Nodemailer / Gmail
│   │   │   └── reminderService.js # node-cron scheduler
│   │   └── utils/
│   │       ├── logger.js          # Winston
│   │       └── encryption.js      # AES-256-GCM server utility
│   ├── tests/
│   │   └── auth.test.js
│   ├── .env                       # Your secrets (never commit this)
│   ├── .env.example               # Template for teammates
│   └── Dockerfile
│
├── nginx/nginx.conf               # Production reverse proxy
├── docker-compose.yml
├── k8s/
│   └── base/
│       ├── namespace.yaml
│       ├── configmap.yaml
│       ├── secrets.yaml           # Template — use Sealed Secrets in prod
│       ├── server-deployment.yaml # 3 replicas + rolling update
│       ├── client-deployment.yaml
│       ├── hpa.yaml               # Auto-scale 3→10 pods
│       └── ingress.yaml
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # Test → Build → Push → Deploy
└── docs/
    └── ARCHITECTURE.md
```

---

## Environment Variables

Create `server/.env` (already done — never commit this file):

```env
# Server
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/nexchat

# JWT (generated automatically — do not change)
JWT_SECRET=<64-char-hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<64-char-hex>
JWT_REFRESH_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM=NexChat <your@gmail.com>

# Cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google Gemini AI
GEMINI_API_KEY=            # aistudio.google.com/app/apikey (free)

# Security
ENCRYPTION_KEY=<32-char-hex>
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

Create `client/.env`:
```env
REACT_APP_WS_URL=http://localhost:5000
```

---

## Authentication System

### Endpoints
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account + send verification email |
| `GET` | `/api/auth/verify-email/:token` | Verify email address |
| `POST` | `/api/auth/login` | Login → returns JWT + sets HttpOnly cookies |
| `POST` | `/api/auth/refresh` | Rotate refresh token |
| `POST` | `/api/auth/logout` | Blacklist token in Redis |
| `POST` | `/api/auth/forgot-password` | Send reset link (always 200 — prevents enumeration) |
| `POST` | `/api/auth/reset-password/:token` | Set new password + invalidate all sessions |

### How token rotation works
```
Login ──► access token (15 min) + refresh token (7 days, HttpOnly cookie)
          │
          ▼  access token expires
Axios interceptor ──► POST /api/auth/refresh
          │
          ▼  server checks refresh token in DB, issues new pair, rotates
New access token ──► queued failed requests retry automatically
```

---

## Real-Time Messaging

### Socket.IO Events (Client → Server)
| Event | Payload | Description |
|---|---|---|
| `typing_start` | `{ chatId }` | Show typing indicator |
| `typing_stop` | `{ chatId }` | Hide typing indicator |
| `message_delivered` | `{ messageId, chatId }` | Mark delivered |
| `heartbeat` | — | Keep presence alive (every 25s) |
| `set_status` | `{ status }` | Set online/away/busy |

### Socket.IO Events (Server → Client)
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ chatId, message }` | New message pushed to all chat members |
| `message_edited` | `{ chatId, messageId, content }` | Edit propagated live |
| `message_deleted` | `{ chatId, messageId }` | Delete propagated live |
| `message_reaction` | `{ chatId, messageId, reactions }` | Reaction updated |
| `messages_read` | `{ chatId, readBy, readAt }` | Read receipt ticks |
| `user_typing` | `{ chatId, userId }` | Show "..." indicator |
| `user_online` | `{ userId }` | Green dot appears |
| `user_offline` | `{ userId, lastSeen }` | Grey dot + last seen |
| `reminder_triggered` | `{ reminderId, title }` | Reminder toast |

---

## End-to-End Encryption

Architecture overview:
```
Client A                          Server                         Client B
   │                                │                               │
   │  Generate ECDH P-256 keypair   │                               │
   │  Store privKey in sessionStorage│                              │
   │──── Upload pubKey ────────────►│                               │
   │                                │◄──── Upload pubKey ───────────│
   │                                │                               │
   │◄─── Fetch B's pubKey ──────────│                               │
   │  Derive sharedKey (ECDH)       │                               │
   │  Encrypt: AES-256-GCM          │                               │
   │──── Send ciphertext ──────────►│──── Forward ciphertext ──────►│
   │                                │  (server cannot read this)    │
   │                                │                               │
   │                                │     Derive same sharedKey     │
   │                                │     Decrypt: AES-256-GCM      │
   │                                │     Display plaintext         │
```

Encrypted messages show a 🔒 lock icon in the bubble. The `isEncrypted: true` flag is stored on the Message document.

---

## Voice & Video Calls

WebRTC signaling flow:
```
Caller                  Socket.IO Server              Callee
  │── call:initiate (SDP offer) ──►│── call:incoming ──────────►│
  │◄── call:answered (SDP answer)──│◄── call:answer ────────────│
  │── call:ice_candidate ─────────►│── call:ice_candidate ─────►│
  │◄──────────── P2P Media Stream (audio/video) ───────────────►│
```

**Controls available during call:**
- Mute / unmute microphone
- Camera on / off (video calls)
- Screen share
- End call (logs duration to database)

> For calls across different networks (not localhost), configure a TURN server in `CallModal.js`.

---

## Group Chats

| Feature | Details |
|---|---|
| Create group | Name, description, add members |
| Admin controls | Add/remove members, edit group |
| Group avatar | Upload via Cloudinary |
| Member limit | No hard limit (configurable) |
| Real-time updates | All members notified via Socket.IO |
| Unread counts | Per-user unread counters tracked |

---

## Media & File Sharing

Supported formats:
- **Images:** JPG, PNG, GIF, WebP
- **Video:** MP4, WebM
- **Audio:** MP3, WAV, OGG
- **Documents:** PDF, DOC, DOCX
- **Archives:** ZIP

All files stored on **Cloudinary** with auto quality optimization for images. Max upload size: **50 MB**. Drag & drop supported with live upload progress bar.

---

## AI Assistant (Powered by Gemini)

Click the **✨ Sparkles** button in any chat header to open the AI panel.

| Feature | How it works |
|---|---|
| **Chat assistant** | Ask anything; context-aware of the current chat |
| **Summarize** | Fetches last 50 messages → Gemini → 3–5 bullet summary |
| **Smart replies** | Sends last message to Gemini → 3 suggested replies as chips |
| **Key topics** | One-click preset asking Gemini for key discussion points |

Model used: `gemini-1.5-flash` (free tier, fast).

---

## Collaborative Whiteboard

Click the **⊞ Grid** button in the chat header to open.

| Tool | Description |
|---|---|
| ✏️ Pen | Freehand drawing |
| ◻ Eraser | Erase strokes |
| — Line | Straight line |
| □ Rectangle | Hollow rectangle |
| ○ Circle | Hollow ellipse |

- 8 preset colors + adjustable stroke width
- All strokes broadcast via `whiteboard:draw` Socket.IO events to all participants in real time
- Canvas state persisted to MongoDB on every stroke
- Download as PNG
- Touch/stylus support

---

## Bookmarks & Reminders

### Bookmarks
Hover any message → 🔖 bookmark icon → saved to your Bookmarks page.

Categories: **Study · Work · Personal · Custom**

Access via sidebar bottom nav → Bookmarks icon.

### Reminders
From the Reminders page, set a reminder with:
- Title (required)
- Note (optional)
- Date & time (future only)

When the time comes, `node-cron` (runs every minute) triggers the reminder via:
1. Creates a `Notification` document
2. Emits `reminder_triggered` via Socket.IO → toast notification appears live

---

## Analytics Dashboard

Click the **📊 Bar chart** button in the chat header.

Charts rendered with Chart.js:
- **Messages per day** — bar chart, selectable 7/14/30 day window
- **Messages by user** — doughnut chart showing per-member contribution
- **Media types** — horizontal bar chart (image vs video vs file vs audio)
- **Call stats** — total calls + total call duration in minutes
- **Stat cards** — total messages, calls, media count, most active user

---

## Push Notifications

In-app notifications delivered via:
- **Socket.IO** — real-time when user is online (new message, call, reminder)
- **Notification center** — bell icon in sidebar, with unread badge counter

Browser Web Push (service worker) skeleton is present — VAPID keys needed for full offline delivery.

---

## Redis Architecture

| Key Pattern | TTL | Purpose |
|---|---|---|
| `presence:{userId}` | 35s | Online/offline status (heartbeat-refreshed) |
| `blacklist:{token}` | Token TTL | Logout invalidation |
| `messages:{chatId}:page:{n}` | 300s | Message list cache |
| Socket.IO adapter | — | Pub/Sub for multi-pod message fan-out |

---

## Security

| Layer | Implementation |
|---|---|
| Transport | HTTPS/WSS, HSTS via Nginx |
| Auth | JWT 15min + Refresh Token rotation |
| Token revocation | Redis blacklist on logout |
| Password hashing | bcrypt (cost 12) |
| Input sanitization | express-validator + express-mongo-sanitize + sanitize-html |
| Rate limiting | 100 req/15min (global), 10 req/15min (auth routes) |
| Security headers | Helmet (CSP, X-Frame-Options, nosniff, XSS protection) |
| E2EE | ECDH P-256 + AES-256-GCM (keys never leave client) |
| Cookies | HttpOnly, Secure (prod), SameSite: strict |
| Container | Non-root user, read-only filesystem, no privilege escalation |

---

## API Reference

### Users
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/me` | ✅ | Get own profile |
| `PATCH` | `/api/users/me` | ✅ | Update profile / settings / public key |
| `POST` | `/api/users/me/avatar` | ✅ | Upload avatar |
| `GET` | `/api/users/:id` | ✅ | Get public profile |
| `POST` | `/api/users/block/:id` | ✅ | Block user |
| `DELETE` | `/api/users/block/:id` | ✅ | Unblock user |

### Chats
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/chats` | ✅ | All chats for current user |
| `POST` | `/api/chats/direct` | ✅ | Create or get direct chat |
| `GET` | `/api/chats/:chatId` | ✅ | Get single chat with participants |

### Messages
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/messages/chat/:chatId` | ✅ | Paginated messages |
| `POST` | `/api/messages` | ✅ | Send text message |
| `PATCH` | `/api/messages/:id` | ✅ | Edit message |
| `DELETE` | `/api/messages/:id` | ✅ | Delete (me or everyone) |
| `POST` | `/api/messages/:id/react` | ✅ | Add / toggle reaction |
| `POST` | `/api/messages/chat/:chatId/read` | ✅ | Mark all read |

### Groups
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/groups` | ✅ | Create group |
| `PATCH` | `/api/groups/:id` | ✅ Admin | Edit name/description/avatar |
| `POST` | `/api/groups/:id/members` | ✅ Admin | Add member |
| `DELETE` | `/api/groups/:id/members/:userId` | ✅ Admin | Remove member |

### Media
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/media/upload/:chatId` | ✅ | Upload file → sends as message |

### AI (Gemini)
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/chat` | ✅ | Chat with AI assistant |
| `POST` | `/api/ai/summarize/:chatId` | ✅ | Summarize conversation |
| `POST` | `/api/ai/smart-replies` | ✅ | Generate 3 reply suggestions |

### Others
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/api/search` | ✅ | Search users / messages / groups |
| `GET` | `/api/analytics/:chatId` | ✅ | Chat analytics (7/14/30 days) |
| `GET` | `/api/notifications` | ✅ | User notifications |
| `PATCH` | `/api/notifications/read-all` | ✅ | Mark all read |
| `GET` | `/api/bookmarks` | ✅ | Get saved messages |
| `POST` | `/api/bookmarks` | ✅ | Save a message |
| `DELETE` | `/api/bookmarks/:id` | ✅ | Remove bookmark |
| `GET` | `/api/reminders` | ✅ | Get reminders |
| `POST` | `/api/reminders` | ✅ | Create reminder |
| `DELETE` | `/api/reminders/:id` | ✅ | Cancel reminder |
| `GET` | `/api/calls/history` | ✅ | Call logs |
| `GET` | `/api/whiteboard/:chatId` | ✅ | Get canvas state |
| `GET` | `/health` | ❌ | Health check (used by K8s probes) |

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|---|---|---|
| `heartbeat` | — | Refresh presence TTL in Redis |
| `set_status` | `{ status }` | online / away / busy |
| `typing_start` | `{ chatId }` | Start typing indicator |
| `typing_stop` | `{ chatId }` | Stop typing indicator |
| `join_chat` | `{ chatId }` | Join Socket.IO room |
| `message_delivered` | `{ messageId, chatId }` | Delivery receipt |
| `call:initiate` | `{ chatId, type, offer }` | Start call + SDP offer |
| `call:answer` | `{ callId, answer, chatId }` | Accept call |
| `call:reject` | `{ callId, chatId }` | Decline call |
| `call:end` | `{ callId, chatId }` | Hang up |
| `call:ice_candidate` | `{ callId, candidate, to }` | ICE relay |
| `call:screen_share_start` | `{ chatId }` | Notify screen share |
| `whiteboard:join` | `{ chatId }` | Join whiteboard room |
| `whiteboard:draw` | `{ chatId, drawData }` | Broadcast stroke |
| `whiteboard:save` | `{ chatId, canvasData }` | Persist canvas |
| `whiteboard:clear` | `{ chatId }` | Clear canvas |
| `whiteboard:leave` | `{ chatId }` | Leave whiteboard room |

### Server → Client
| Event | Payload | Description |
|---|---|---|
| `new_message` | `{ chatId, message }` | New message |
| `message_edited` | `{ chatId, messageId, content }` | Edit applied |
| `message_deleted` | `{ chatId, messageId }` | Delete applied |
| `message_reaction` | `{ chatId, messageId, reactions }` | Reactions updated |
| `messages_read` | `{ chatId, readBy, readAt }` | Read receipts |
| `user_online` | `{ userId }` | User connected |
| `user_offline` | `{ userId, lastSeen }` | User disconnected |
| `user_typing` | `{ chatId, userId }` | Typing indicator on |
| `user_stopped_typing` | `{ chatId, userId }` | Typing indicator off |
| `call:incoming` | `{ callId, chatId, type, offer }` | Incoming call |
| `call:answered` | `{ callId, answer }` | Call accepted |
| `call:rejected` | `{ callId }` | Call declined |
| `call:ended` | `{ callId, duration }` | Call ended |
| `call:ice_candidate` | `{ callId, candidate, from }` | ICE relay |
| `group_created` | `{ group }` | New group |
| `member_added` | `{ groupId, userId }` | Member joined |
| `member_removed` | `{ groupId, userId }` | Member removed |
| `whiteboard:state` | `{ canvasData }` | Initial canvas on join |
| `whiteboard:draw` | `{ drawData, by }` | Remote stroke |
| `whiteboard:cleared` | `{ by }` | Canvas cleared |
| `reminder_triggered` | `{ reminderId, title }` | Reminder fired |

---

## Docker & Kubernetes

### Docker Compose (local / staging)
```bash
# Build and start all services
docker-compose up --build

# Stop everything
docker-compose down

# View logs
docker-compose logs -f server
```

Services started: `nginx`, `client`, `server`, `mongodb`, `redis`

### Kubernetes (production)
```bash
# Apply all manifests
kubectl apply -f k8s/base/

# Check pod status
kubectl get pods -n nexchat

# Scale manually
kubectl scale deployment nexchat-server --replicas=5 -n nexchat

# View HPA
kubectl get hpa -n nexchat
```

The HPA auto-scales server pods from **3 → 10** based on CPU (70%) and memory (80%) usage.

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci-cd.yml`) runs on every push to `main`:

```
Push to main
    │
    ├── Job 1: test-server  ── npm test (Jest + Supertest, MongoDB + Redis services)
    ├── Job 2: test-client  ── npm test (React Testing Library)
    │
    └── (both pass) ──► Job 3: build-push
                              │  Build server Docker image
                              │  Build client Docker image
                              │  Push to GitHub Container Registry (ghcr.io)
                              │
                              └──► Job 4: deploy
                                        │  Update image tags in K8s manifests
                                        │  kubectl apply -f k8s/base/
                                        │  kubectl rollout status
                                        └──► Production live ✅
```

---

## Deployment

### Production checklist
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Point `MONGODB_URI` to MongoDB Atlas (M10+ for production)
- [ ] Point `REDIS_URL` to Redis Cloud or Upstash
- [ ] Set `CLIENT_URL` to your actual domain
- [ ] Configure SSL certificates in `nginx/ssl/`
- [ ] Replace `<base64-encoded>` values in `k8s/base/secrets.yaml` (or use Sealed Secrets)
- [ ] Update `your-registry` references in K8s deployment manifests
- [ ] Set up TURN server for cross-network WebRTC calls
- [ ] Generate VAPID keys for Web Push notifications

### Recommended cloud providers
| Service | Provider |
|---|---|
| Kubernetes | Google GKE / DigitalOcean Kubernetes |
| MongoDB | MongoDB Atlas (free M0 for dev, M10+ for prod) |
| Redis | Upstash (free tier) or Redis Cloud |
| Container Registry | GitHub Container Registry (ghcr.io) |
| Media Storage | Cloudinary (free 25GB) |
| AI | Google AI Studio (Gemini — free tier) |
| Email | Gmail App Password |

---

## Database Collections

| Collection | Description |
|---|---|
| `users` | Auth, profile, presence, E2EE public key |
| `chats` | Direct + group conversations |
| `messages` | All messages with reactions, E2EE content |
| `notifications` | In-app notification feed |
| `calls` | WebRTC call logs + duration |
| `bookmarks` | Saved messages with categories |
| `reminders` | Scheduled message reminders |
| `whiteboards` | Persisted canvas state per chat |
| `analytics` | Daily aggregated metrics per chat |

---

## License

MIT — built as a flagship portfolio project.
