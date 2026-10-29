# Ledgr

A personal finance tracker for monitoring income, expenses, budgets, and account balances. Built as a full-stack monorepo with a React frontend and an Express REST API backed by MySQL.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [Database Systems (DBS) Academic Reference](#database-systems-dbs-academic-reference)
- [API Overview](#api-overview)

---

## Features

- **Transaction management** — add, edit, and delete transactions with daily, calendar, and monthly views
- **Global search** — search all transactions across all time with filters for type, category, and amount range
- **Statistics** — monthly and annual income/expense charts with interactive hover to show amounts; category breakdown split into income and expenses showing all categories
- **Budget tracking** — set default monthly limits per category with per-month overrides; over-budget categories highlighted with a red bar, red amount, and surplus pill in the stats breakdown
- **Account management** — track balances across multiple accounts grouped by type
- **Settings** — configurable currency, symbol position, week start day, categories, and budgets
- **Responsive design** — full mobile support with bottom navigation and bottom-sheet modals

---

## Screenshots

| Transactions - Daily View                                | Transactions - Calendar View                                |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| ![Transactions](docs/screenshots/transactions-daily.png) | ![Transactions](docs/screenshots/transactions-calendar.png) |

| Transactions - Monthly View                                | Add Transactions Modal                                 |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| ![Transactions](docs/screenshots/transactions-monthly.png) | ![Transactions](docs/screenshots/add-transactions.png) |

| Statistics - Monthly                            | Statistics - Annual                              |
| ----------------------------------------------- | ------------------------------------------------ |
| ![Statistics](docs/screenshots/stats-month.png) | ![Statistics](docs/screenshots/stats-annual.png) |

| Accounts                                   | Settings - Preferences, Currency, Categories |
| ------------------------------------------ | -------------------------------------------- |
| ![Accounts](docs/screenshots/accounts.png) | ![Settings](docs/screenshots/settings1.png)  |

| Settings - Accounts                         | Settings - Budgets                          |
| ------------------------------------------- | ------------------------------------------- |
| ![Settings](docs/screenshots/settings2.png) | ![Settings](docs/screenshots/settings3.png) |

---

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| State    | TanStack React Query v5                     |
| Icons    | Lucide React                                |
| Backend  | Node.js, Express 5, TypeScript              |
| Database | MySQL 8.4                                   |
| Infra    | Docker Compose                              |

---

## Project Structure

```
ledgr/
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── components/
│       │   ├── settings/    # Settings sub-components (Preferences, Currency, Categories, Accounts, Budgets)
│       │   ├── stats/       # Chart and category breakdown components
│       │   ├── transactions/# Transaction views (Daily, Calendar, Monthly, Search, Add)
│       │   └── ui/          # Shared UI primitives (SettingCard)
│       ├── hooks/           # Custom React hooks (useSettings, useMonth)
│       ├── lib/             # API client, utilities, constants
│       ├── pages/           # Page-level components (Transactions, Stats, Accounts, Settings)
│       └── types/           # Shared TypeScript interfaces
├── server/                  # Express REST API
│   └── src/
│       ├── controllers/     # Route handler logic
│       ├── db/              # MySQL connection and schema
│       ├── middleware/      # Request validation (Zod)
│       └── routes/          # Express route definitions
├── docker-compose.yml       # MySQL service
└── package.json             # Workspace root
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Docker](https://www.docker.com/) (for the MySQL database)
- npm v8 or later (workspaces support)

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd ledgr
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the database

```bash
docker compose up -d
```

The MySQL container initialises on first start using `server/src/db/schema.sql`, which creates all tables and seeds default data automatically.

### 4. Start the development servers

```bash
npm run dev
```

This starts both the client (port **5173**) and server (port **3000**) concurrently.

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

Run from the project root:

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `npm run dev`       | Start client and server in development mode       |
| `npm run build`     | Build both client and server for production       |
| `npm run lint`      | Lint both workspaces                              |
| `npm run typecheck` | Run TypeScript type checks across both workspaces |
| `npm run test`      | Run automated test suite for backend and database |

---

## Environment Variables

The server reads the following variables from `server/.env` (or environment defaults):

| Variable      | Default                 | Description                                      |
| ------------- | ----------------------- | ------------------------------------------------ |
| `PORT`        | `3001`                  | Express server port                              |
| `CLIENT_URL`  | `http://localhost:5173` | Allowed frontend origin for CORS                 |
| `DB_HOST`     | `127.0.0.1`             | MySQL host (`localhost` or IP)                   |
| `DB_PORT`     | `3306`                  | MySQL port                                       |
| `DB_NAME`     | `ledgr`                 | Database name                                    |
| `DB_USER`     | `ledgr`                 | Database user                                    |
| `DB_PASSWORD` | `ledgr_password`        | Database password                                |

---

## Database

The database schema is defined in [`server/src/db/schema.sql`](server/src/db/schema.sql) and is applied automatically when the Docker container is first created.

To reset the database and re-apply the schema:

```bash
docker compose down -v   # removes the volume (all data)
docker compose up -d     # re-creates with fresh schema and seed data
```

---

## Database Systems (DBS) Academic Reference

This repository has been documented and enhanced for academic Database Systems (DBS) coursework:

| Document / Resource | Description |
| ------------------- | ----------- |
| [**DBS Project Report**](docs/DBS_PROJECT_REPORT.md) | Comprehensive academic report covering system architecture, ER modeling, normalization proofs, advanced SQL showcase, and testing. |
| [**Database Schema & ER Diagram**](docs/DATABASE_SCHEMA.md) | Formal relational schema notation, Mermaid ER diagram, comprehensive table dictionaries, constraints, and cardinalities. |
| [**Normalization Report**](docs/NORMALIZATION_REPORT.md) | Functional dependency (FD) minimal covers, step-by-step 1NF/2NF/3NF/BCNF proofs, and controlled denormalization analysis. |
| [**Comprehensive SQL Suite**](server/src/db/dbs_queries.sql) | Standalone SQL script with SELECT, INSERT, UPDATE, DELETE, Joins, Aggregations, CTEs, financial queries, views, indexes, and ACID transactions. |
| [**Testing & Verification Plan**](docs/TESTING_PLAN.md) | Test cases for referential integrity, unique constraints, quantitative data assertions, and an automated verification script. |

---

## API Overview

All endpoints are prefixed with `/api`.

| Method | Path                                             | Description                           |
| ------ | ------------------------------------------------ | ------------------------------------- |
| GET    | `/api/transactions`                              | List transactions (year/month filter) |
| POST   | `/api/transactions`                              | Create a transaction                  |
| PATCH  | `/api/transactions/:id`                          | Update a transaction                  |
| DELETE | `/api/transactions/:id`                          | Delete a transaction                  |
| GET    | `/api/categories`                                | List all categories                   |
| POST   | `/api/categories`                                | Create a category                     |
| PATCH  | `/api/categories/:id`                            | Update a category                     |
| DELETE | `/api/categories/:id`                            | Delete a category                     |
| GET    | `/api/accounts`                                  | List all accounts                     |
| POST   | `/api/accounts`                                  | Create an account                     |
| PATCH  | `/api/accounts/:id`                              | Update an account                     |
| DELETE | `/api/accounts/:id`                              | Delete an account                     |
| GET    | `/api/account-groups`                            | List account groups                   |
| POST   | `/api/account-groups`                            | Create an account group               |
| PATCH  | `/api/account-groups/:id`                        | Update an account group               |
| DELETE | `/api/account-groups/:id`                        | Delete an account group               |
| GET    | `/api/budgets`                                   | Get budgets for a month               |
| PUT    | `/api/budgets/:categoryId/default`               | Set or update a default budget        |
| PUT    | `/api/budgets/:categoryId/override/:year/:month` | Set a month-specific override         |
| DELETE | `/api/budgets/:categoryId/override/:year/:month` | Remove a budget override              |
| DELETE | `/api/budgets/:categoryId`                       | Remove all budgets for a category     |
| GET    | `/api/stats/monthly`                             | Monthly income/expense summaries      |
| GET    | `/api/stats/categories`                          | Category breakdown for a period       |
| GET    | `/api/settings`                                  | Get user settings                     |
| PATCH  | `/api/settings`                                  | Update user settings                  |

---

## Backend Architecture & Design

The backend is built with Express 5 on Node.js using TypeScript with clean separation of concerns:

* **Routes (`server/src/routes/`)**: Define RESTful HTTP endpoints, validate input schemas via Zod middleware, and route requests to controllers.
* **Controllers (`server/src/controllers/`)**: Parse HTTP parameters, execute database operations via SQL pool, enforce business logic invariants, and format JSON responses.
* **Database Connection (`server/src/db/connection.ts`)**: Manages a MySQL connection pool using `mysql2/promise` with automatic reconnection, UTC timezone, and decimal number parsing.
* **Middleware (`server/src/middleware/`)**:
  * `validate.ts`: Strict schema validation using Zod for request bodies, path parameters, and query parameters.
  * `errorHandler.ts`: Centralized error handler returning standardized JSON errors (`AppError`, Zod validation errors, MySQL error translation for codes 1062, 1451, and 1452).
* **ACID Transactions**: Multi-step persistent changes (e.g., creating/updating/deleting transactions with account balance adjustments, or deleting categories with transaction reassignment) execute within explicit database transactions (`beginTransaction`, `commit`, `rollback`).

---

## Project Modifications & Customizations

This project incorporates specific modifications distinguishing it from the base repository:

1. **Transaction Description & Metadata Field**: Added `description TEXT NULL` to `transactions` table. Used across frontend search, transaction editing, and academic JSON metadata tagging.
2. **Dynamic Category Colors**: Category colors are derived on-the-fly via client palette hashing rather than stored as a mutable database column, eliminating schema redundancy.
3. **Dual Routing Architecture**: Server mounts both root routes (e.g. `/transactions`) and API-prefixed routes (e.g. `/api/transactions`), providing dual compatibility for Vite reverse-proxy development and direct REST API clients / automated test harnesses.
4. **Comprehensive Academic DBS Suite**: Added relational views (`v_monthly_category_summary`, `v_account_financial_overview`), secondary B-Tree indexing (`idx_tx_date`, `idx_tx_cat_date`, `idx_tx_account_date`), and analytical SQL query suite (`server/src/db/dbs_queries.sql`).

---

## Automated Testing

The backend includes automated test coverage spanning database integrity, API contract verification, and ledger reconciliation:

```bash
# Run complete test suite (from workspace root)
npm run test

# Run tests directly in server workspace
npm run test --workspace=server
```

### Test Coverage Highlights:
* **Database Integrity (`server/tests/db.test.ts`)**: Tests baseline row counts, `ON DELETE RESTRICT` foreign key enforcement, unique constraints (`uq_name_type`, `uq_cat_start`), and atomic rollback semantics.
* **API Endpoints (`server/tests/api.test.ts`)**: Tests CRUD lifecycle, conflict detection (409), validation rejection (400), and missing resource handling (404) across all resources.
* **Integration (`server/tests/integration.test.ts`)**: Tests end-to-end transaction insertion, atomic account balance synchronization, transaction amount/account modifications, and clean balance reversal on deletion.
