# GST Platform

Compliance and business intelligence platform for MSMEs — GST is the entry point; the product helps business owners manage compliance, taxes, invoices, and financial health without depending on accountants for every small task.

## Architecture

```
React (Vite + Tailwind)  →  .NET Web API  →  Business Services  →  PostgreSQL
                                      ↓
                            Background Jobs (Hangfire — Phase 2)
                                      ↓
                            External APIs (GSTN, WhatsApp, SendGrid — Phase 2)
```

## What's included (MVP)

| Module | Status |
|--------|--------|
| JWT Auth (`/register`, `/login`, `/refresh-token`) | ✅ |
| Business management | ✅ |
| GST Dashboard (payable, ITC, net liability, alerts) | ✅ |
| GST Engine (output − ITC = liability) | ✅ |
| GSTR-1 / GSTR-2B JSON parser | ✅ |
| ITC Tracker (mismatch detection) | ✅ |
| GST Health Score | ✅ |
| Invoice API | ✅ |
| Login, Dashboard, Uploads, ITC, Invoices UI | ✅ |
| Hangfire jobs, AI layer, Analytics charts | 🔜 Phase 2 |

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Quick start

### 1. Database

**Local dev (default):** SQLite — no setup required. The API creates `gstplatform.db` automatically.

**Production / Docker:** PostgreSQL

```bash
docker compose up -d
```

Set in `appsettings.json`:

```json
"Database": { "Provider": "Postgres" },
"ConnectionStrings": { "DefaultConnection": "Host=localhost;..." }
```

### 2. Run the API

```bash
cd backend/GstPlatform.Api
dotnet run
```

API: http://localhost:5253 — Swagger: http://localhost:5253/swagger

**Can't reach Swagger?** Check the terminal line `Now listening on: ...` and use that exact URL with **http** (not https). If you see port `5000`, open http://localhost:5000/swagger — then restart the API after pulling latest changes to use port `5253` consistently.

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

### 4. Create an account

1. Open http://localhost:5173/register
2. Enter your details and optional GSTIN (demo data is seeded when you add a business)
3. Explore the dashboard, ITC tracker, and GST file uploads

## Sample GSTR-1 upload

Save as `gstr1-sample.json`:

```json
{
  "gstin": "29ABCDE1234F1Z5",
  "sales": [
    { "taxableValue": 100000, "cgst": 9000, "sgst": 9000, "igst": 0 }
  ]
}
```

Upload via **GST Uploads** → GSTR-1 JSON.

## Project structure

```
GST App/
├── backend/
│   ├── GstPlatform.Api/          # Controllers, Program.cs
│   ├── GstPlatform.Core/         # Entities, DTOs, interfaces
│   └── GstPlatform.Infrastructure/  # EF Core, services
├── frontend/                     # React + Vite + Tailwind
├── docker-compose.yml
└── README.md
```

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh-token` | Refresh JWT |
| GET | `/api/businesses` | List businesses |
| POST | `/api/businesses` | Create business (seeds demo GST data) |
| GET | `/api/businesses/{id}/dashboard` | Dashboard summary |
| GET | `/api/businesses/{id}/dashboard/health-score` | GST health score |
| GET | `/api/businesses/{id}/itc/mismatches` | ITC mismatches |
| POST | `/api/businesses/{id}/uploads/gstr-1` | Upload GSTR-1 JSON |
| POST | `/api/businesses/{id}/uploads/gstr-2b` | Upload GSTR-2B JSON |
| GET | `/api/businesses/{id}/invoices` | List invoices |
| POST | `/api/businesses/{id}/invoices` | Create invoice |

## Roadmap (from product spec)

- **Phase 2:** Hangfire reminders, SendGrid/Twilio, PDF invoice generation, Excel parsers, Azure Blob storage
- **Phase 3:** AI GST Assistant, Notice Interpreter, Rate Change Detector
- **Phase 4:** GSTN API integration, WhatsApp invoice delivery, multi-tenant CA firm workflows

## Revenue tiers (planned)

| Plan | Price | Highlights |
|------|-------|------------|
| Free | ₹0 | 1 GSTIN, 100 invoices, basic dashboard |
| Starter | ₹499/mo | Unlimited uploads, ITC tracker, alerts |
| Growth | ₹1499/mo | Analytics, inventory, multi-user |
| CA Plan | ₹4999+/mo | Multi-client, bulk processing |
