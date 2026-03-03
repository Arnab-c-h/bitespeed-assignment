# Bitespeed Identity Reconciliation


> **Live Endpoint:** `https://bitespeed-assignment-zoao.onrender.com/identify`

---

## Problem Statement

FluxKart.com uses Bitespeed to track customer identity. A customer may use different email/phone combinations across orders, but they're still the same person. This service reconciles those contacts into a single unified profile with one **primary** contact and any number of **secondary** contacts linked to it.

---

## API Reference

### `POST /identify`

Identifies and consolidates a customer's contact information.

**URL (Production):** `https://bitespeed-assignment-zoao.onrender.com/`



---

### Request Body

At least one of `email` or `phoneNumber` must be provided.

```json
{
  "email": "string | null",
  "phoneNumber": "string | null"
}
```

**Examples:**

```json
{ "email": "test@techccu.edu", "phoneNumber": "123456" }
```
```json
{ "email": "test2@techccu.edu" }
```
```json
{ "phoneNumber": "123456" }
```

---

### Response

**Status:** `200 OK`

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["test@techccu.edu", "test2@techccu.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23, 47]
  }
}
```

| Field | Description |
|-------|-------------|
| `primaryContatctId` | ID of the oldest/root contact in the cluster |
| `emails` | All emails in the cluster, primary's first |
| `phoneNumbers` | All phone numbers in the cluster, primary's first |
| `secondaryContactIds` | IDs of all secondary contacts linked to the primary |

---

### Error Responses

```json
{ "status": "fail", "message": "Please provide an email or phoneNumber" }
```
**Status:** `400 Bad Request` — when neither email nor phoneNumber is provided.

---

## Database Schema

Built with **Prisma ORM** and **PostgreSQL**.

```prisma
model Contact {
  id             Int       @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?
  linkPrecedence String    @default("primary")  // "primary" | "secondary"
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?

  linkedTo       Contact?  @relation("ContactToContact", fields: [linkedId], references: [id])
  linkedFrom     Contact[] @relation("ContactToContact")
}
```

- `linkPrecedence`: `"primary"` for the root contact, `"secondary"` for all linked contacts
- `linkedId`: Points to the primary contact's `id` (null for primary contacts)
- `deletedAt`: Soft delete support

---

## Test Cases

### Case 1 — New Customer
**Request:**
```json
{ "email": "new@customer.com", "phoneNumber": "999" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["new@customer.com"],
    "phoneNumbers": ["999"],
    "secondaryContactIds": []
  }
}
```

---

### Case 2 — Returning Customer with New Info
Assuming contact ID 1 exists with `email: test2@techccu.edu, phone: 123456`:

**Request:**
```json
{ "email": "test2@techccu.edu", "phoneNumber": "999999" }
```
**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["test2@techccu.edu"],
    "phoneNumbers": ["123456", "999999"],
    "secondaryContactIds": [2]
  }
}
```

---

### Case 3 — Merging Two Separate Primaries
If `email: A` links to Primary 1 and `phone: B` links to Primary 2:

**Request:**
```json
{ "email": "A", "phoneNumber": "B" }
```
Primary 2 (newer) gets downgraded to secondary under Primary 1 (older).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v22 |
| Framework | Express v5 |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Hosting | Render.com |
| Process Manager | Nodemon (dev only) |

---

## Project Architecture

```
assignment/
├── prisma/
│   ├── schema.prisma        # Database schema & Prisma config
│   └── migrations/          # Auto-generated migration files
├── src/
│   ├── controllers/
│   │   ├── contactController.js  # Core /identify logic (8-step pipeline)
│   │   └── errorController.js    # Global error handler
│   ├── routes/
│   │   └── contactRoutes.js      # POST /identify route
│   ├── utils/
│   │   ├── appError.js           # Custom error class
│   │   └── catchAsync.js         # Async error wrapper
│   ├── app.js                    # Express app setup
│   └── server.js                 # Server entry point
├── .env                          # Local environment variables (git-ignored)
├── .gitignore
└── package.json
```

---

## Running Locally

### Prerequisites
- Node.js v18+
- PostgreSQL installed and running

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Arnab-c-h/bitespeed-assignment.git
cd bitespeed-assignment

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Create a .env file in the root with:
# DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DBNAME"
# PORT=3000

# 4. Run database migrations
npx prisma migrate dev

# 5. Start the development server
npm run dev
```

Server runs at `http://localhost:3000`

---

## Deployment (Render.com)

| Setting | Value |
|---------|-------|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Environment Vars** | `DATABASE_URL` = Render internal PostgreSQL URL |

Using **Postman**:
1. Set method → `POST`
2. URL → `https://your-service-name.onrender.com/identify`
3. Headers → `Content-Type: application/json`
4. Body → `raw` → `JSON`:
```json
{
  "email": "test@example.com",
  "phoneNumber": "9876543210"
}
```
5. Hit **Send**

> ⚠️ **Note:** Hosted on Render's free tier. The first request after a period of inactivity may take ~60 seconds as the server wakes from sleep.

---

