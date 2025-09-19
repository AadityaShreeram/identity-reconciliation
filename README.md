# Identity Reconciliation API

This service provides an **identity reconciliation system** that consolidates user contacts (by `email` and `phoneNumber`) into a single cluster. It ensures that multiple records for the same person are grouped under a **primary contact**, while others are linked as **secondary contacts**.

## 🚀 Features

- Create a **primary contact** when no matching records exist
- Link new records as **secondary contacts** if they match an existing cluster
- Automatically update older records to maintain **one primary contact per cluster**
- Return a unified contact object with:
  - Primary contact ID
  - All unique emails
  - All unique phone numbers
  - Secondary contact IDs

## 📂 Project Structure

```
identity-reconciliation/
├── node_modules/
├── prisma/
│   ├── migrations/
│   │   └── 20250918143323_init/
│   │       └── migration.sql
│   ├── migration_lock.toml
│   └── schema.prisma        # Database schema (Contact model)
├── routes/
│   └── identify.js          # Routes for identity reconciliation
├── services/
│   └── contactService.js    # Contact cluster management logic
├── utils/
│   └── validation.js        # Request validation
├── .env
├── .gitignore
├── index.js                 # Main server file
├── package-lock.json
└── package.json
```

## 🛠 Tech Stack

- **Node.js + Express** - REST API
- **Prisma ORM** - Database abstraction  
- **PostgreSQL** - Contact storage
- **Render** - Deployment

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/AadityaShreeram/identity-reconciliation.git
cd identity-reconciliation
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Create a `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/identity?schema=public"
PORT=3000
```

### 4. Run migrations

```bash
npx prisma db push
```

### 5. Start the server

```bash
npm run dev    # For development with nodemon
npm start      # For production
```

## 🔗 Endpoints

### 1. Healthcheck

**GET** `/health`  
🔹 **Verifies server status**

**Example:**
```bash
curl --location 'https://identity-reconciliation-ikbg.onrender.com/health'
```

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

### 2. Identify (Reconciliation)

**POST** `/identify`  
- Accepts email and/or phoneNumber
- At least one must be provided

**Request body:**
```json
{
  "email": "aadityas@gmail.com",
  "phoneNumber": "31234567890"
}
```

**Example cURL:**
```bash
curl --location 'https://identity-reconciliation-ikbg.onrender.com/identify' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "aadityas@gmail.com",
    "phoneNumber": "31234567890"
}'
```

**Response (example):**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["aadityas@gmail.com", "aaditya@example.com"],
    "phoneNumbers": ["31234567890", "987654321"],
    "secondaryContactIds": [4]
  }
}
```

## 📜 Scripts

- `npm run dev` - Run server with hot reload
- `npm start` - Run server in production mode  
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run Prisma Studio

## 🌍 Deployment

Deployed at: https://identity-reconciliation-ikbg.onrender.com

## 📋 API Logic

1. **No existing contacts**: Creates a new primary contact
2. **Matching contacts found**: 
   - Links new contact as secondary if it provides additional information
   - Maintains existing primary contact
   - Returns consolidated contact information
3. **Multiple clusters**: Merges clusters by promoting one primary and demoting others to secondary
