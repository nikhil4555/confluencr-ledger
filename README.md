# Transaction Ledger API

A backend API for a simple transaction ledger system built with **NestJS**, **Prisma**, **PostgreSQL (NeonDB)**, and **Swagger**.

---

## Features

- Create accounts (initial balance always 0)
- Credit and debit transactions with balance enforcement
- Duplicate transaction detection via `reference_id` per account
- Atomic transaction + balance updates (database transactions)
- Paginated, filtered, and sorted transaction history
- Consistent JSON responses (success + error shapes)
- Full Swagger / OpenAPI documentation

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | NestJS 11 (TypeScript)              |
| ORM          | Prisma 6.8.2                        |
| Database     | PostgreSQL via NeonDB (serverless)  |
| Validation   | class-validator + class-transformer |
| API Docs     | @nestjs/swagger + Swagger UI        |

---

## Prerequisites

- Node.js >= 18
- npm >= 9

---

## Getting Started

### 1. Clone and install

```bash
git clone <repo-url>
cd ledger-api
npm install
```

### 2. Configure environment

Copy the example env file and fill in your database URL:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
PORT=3000
NODE_ENV=development
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

> For local development with auto-migration:
> ```bash
> npx prisma migrate dev
> ```

### 4. Start the server

```bash
# Development (watch mode)
npm run start:dev

# Production
npm run build
npm run start:prod
```

The API will be available at:
- **API base:** `http://localhost:3000/api/v1`
- **Swagger docs:** `http://localhost:3000/api/docs`

---

## API Endpoints

### Accounts

| Method | Path                          | Description           |
|--------|-------------------------------|-----------------------|
| POST   | `/api/v1/accounts`            | Create a new account  |
| GET    | `/api/v1/accounts/:id/balance`| Get account balance   |

### Transactions

| Method | Path                                       | Description                       |
|--------|--------------------------------------------|-----------------------------------|
| POST   | `/api/v1/accounts/:accountId/transactions` | Add a transaction (credit/debit)  |
| GET    | `/api/v1/accounts/:accountId/transactions` | Get paginated transaction history |

### Transfers (Bonus)

| Method | Path                  | Description                          |
|--------|-----------------------|--------------------------------------|
| POST   | `/api/v1/transfers`   | Transfer money between two accounts  |

#### Request body:

| Field           | Type   | Required | Description                                      |
|-----------------|--------|----------|--------------------------------------------------|
| `fromAccountId` | UUID   | ✅        | Source account (funds debited)                   |
| `toAccountId`   | UUID   | ✅        | Destination account (funds credited)             |
| `amount`        | number | ✅        | Amount to transfer (> 0, max 2 decimal places)   |
| `description`   | string | ✅        | Description of the transfer                      |
| `referenceId`   | string | ✅        | Client-generated idempotency key                 |

| Parameter | Type   | Default | Description                    |
|-----------|--------|---------|--------------------------------|
| `type`    | string | —       | Filter: `credit` or `debit`    |
| `page`    | number | `1`     | Page number                    |
| `limit`   | number | `10`    | Records per page               |

---

## Response Format

### Success (regular)

```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Account balance retrieved successfully",
  "data": [ { "accountId": "...", "balance": "150.00" } ]
}
```

`data` is always an array. Single-item responses are wrapped in a single-element array.

### Success (paginated — transaction history)

```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Transaction history retrieved successfully",
  "data": [ ...transactions ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalRecords": 42,
    "totalPages": 5
  }
}
```

### Failure

```json
{
  "status": "failure",
  "statusCode": 404,
  "message": "Account with id 'xyz' not found"
}
```

### Failure with extra details (e.g. insufficient balance)

```json
{
  "status": "failure",
  "statusCode": 400,
  "message": "Insufficient balance",
  "details": {
    "currentBalance": "100.00",
    "requestedDebit": "150.00"
  }
}
```

---

## Business Rules

- **Initial balance** is always `0`. Clients cannot set it.
- **Credits** increase balance; **debits** decrease balance.
- **Insufficient balance** for debits → `400 Bad Request` with `details.currentBalance` and `details.requestedDebit`.
- **Duplicate `reference_id`** within the same account → returns `200` with the existing transaction (no new record, no balance change).
- The same `reference_id` may be used across different accounts.
- Transaction + balance update is **atomic** — if either fails, neither is persisted.
- Transactions are **immutable** — no update or delete endpoints exist.
- **Transfers** debit the source and credit the destination in a single atomic DB transaction — a partial transfer is never possible.
- Source and destination accounts for a transfer must be different.
- A duplicate transfer (same `referenceId`) returns the original result without re-executing.

---

## Validations

### Create Account
| Field  | Rule |
|--------|------|
| `name` | Required, non-empty (whitespace-only rejected), max 255 chars |

### Add Transaction
| Field         | Rule |
|---------------|------|
| `type`        | Required, must be `credit` or `debit` |
| `amount`      | Required, number > 0, max 2 decimal places |
| `description` | Required, non-empty (whitespace-only rejected), max 500 chars |
| `referenceId` | Required, non-empty (whitespace-only rejected), max 255 chars |

### Get Transaction History (query params)
| Field   | Rule |
|---------|------|
| `type`  | Optional, must be `credit` or `debit` if provided |
| `page`  | Optional integer ≥ 1, defaults to 1 |
| `limit` | Optional integer ≥ 1, defaults to 10 |

### Transfer
| Field           | Rule |
|-----------------|------|
| `fromAccountId` | Required, valid UUID v4 |
| `toAccountId`   | Required, valid UUID v4, must differ from `fromAccountId` |
| `amount`        | Required, number > 0, max 2 decimal places |
| `description`   | Required, non-empty (whitespace-only rejected), max 500 chars |
| `referenceId`   | Required, non-empty (whitespace-only rejected), max 255 chars |

All account/transaction ID path params are validated as UUID v4. Unknown request body fields are rejected (`403`).

---

## Assumptions

1. `amount` supports up to 2 decimal places. Values like `100.999` are rejected.
2. `balance` is stored as `DECIMAL(20, 2)` for financial precision (avoids floating-point drift).
3. Account IDs and Transaction IDs are UUID v4, generated server-side.
4. Transactions are always returned in **latest-first** order (`created_at DESC`).
5. The `reference_id` uniqueness constraint is scoped **per account** — the same reference ID may appear across different accounts.
6. Swagger UI is enabled in all environments for demo/review purposes.
7. Account names are not required to be unique. Two accounts may share the same name — the `id` (UUID) is the sole unique identifier for an account. `name` is treated as a display label only, not a business identifier.
8. Transfer idempotency is tracked by storing two transaction records per transfer — one debit leg (`TRANSFER-DEBIT-{referenceId}`) and one credit leg (`TRANSFER-CREDIT-{referenceId}`). This ensures the transfer `referenceId` namespace is separate from regular transaction `referenceId`s.

---

## Project Structure

```
src/
├── accounts/
│   ├── dto/
│   │   ├── create-account.dto.ts
│   │   └── account-response.dto.ts
│   ├── accounts.controller.ts
│   ├── accounts.module.ts
│   └── accounts.service.ts
├── transactions/
│   ├── dto/
│   │   ├── add-transaction.dto.ts
│   │   ├── get-transaction-history.dto.ts
│   │   └── transaction-response.dto.ts
│   ├── transactions.controller.ts
│   ├── transactions.module.ts
│   └── transactions.service.ts
├── transfers/
│   ├── dto/
│   │   ├── create-transfer.dto.ts
│   │   └── transfer-response.dto.ts
│   ├── transfers.controller.ts
│   ├── transfers.module.ts
│   └── transfers.service.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── common/
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   └── interceptors/
│       └── response.interceptor.ts
├── app.module.ts
└── main.ts
prisma/
├── schema.prisma
└── migrations/
```
