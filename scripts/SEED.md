# Seed Client Script

Creates a client with an active subscription directly in the database, bypassing all forms and onboarding flows. Optionally creates a therapist and sessions.

All seeded records have `firstName` prefixed with `[seed]` so you can find or delete them easily:

```sql
SELECT * FROM client WHERE firstName LIKE '[seed]%';
SELECT * FROM therapist WHERE firstName LIKE '[seed]%';
```

Password is always: **secure12**

## Prerequisites

- Database must be running and accessible via `.env` config
- Base data must exist (modals, levels, subscriptions). If not, run:
  ```bash
  # From the NestJS app (via API or onModuleInit)
  seedOnboarding()
  seedSubscriptions()
  seedParameters()
  ```

## Usage

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts [flags]
```

## Flags

| Flag | Values | Default | Description |
|------|--------|---------|-------------|
| `--type` | `trial`, `monthly`, `quarterly`, `semi`, `yearly` | `monthly` | Subscription type (single client) |
| `--clients` | Comma-separated types, e.g. `trial,monthly` | *(none)* | Create multiple clients with different sub types |
| `--modal` | `individual`, `teen`, `couple`, `group` | First match in DB | Therapy modal |
| `--level` | `associate`, `moderate`, `advanced` | From catalog sub | Therapist level |
| `--therapist` | *(no value)* | off | Create a therapist and link to subscription |
| `--sessions` | *(no value)* | off | Create weekly sessions (requires `--therapist`) |
| `--lang` | Language name (must exist in DB) | `English` | Language for client, therapist, and preference |
| `--gender` | `male`, `female` | `male` | Gender for client and therapist |
| `--email` | Any valid email | auto-generated | Client email (single client only) |
| `--phone` | Any phone string | auto-generated | Client phone (single client only) |
| `--username` | Any string | auto-generated | Client username (single client only) |

> `--type` creates one client. `--clients` creates multiple. They are mutually exclusive — if `--clients` is provided, `--type` is ignored.

## Examples

### Bare client with monthly subscription

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts
```

Creates: client + monthly subscription (first catalog match).

### Trial client for group therapy

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --type trial --modal group
```

Creates: client + trial subscription for group therapy modal + preference.

### Monthly client with therapist

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --type monthly --modal individual --therapist
```

Creates: client + therapist (with level, expertise, language) + monthly subscription linked to both + preference.

### Quarterly client with therapist and sessions

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --type quarterly --modal individual --level advanced --therapist --sessions
```

Creates: client + therapist (advanced level) + quarterly subscription + 12 weekly sessions + preference.

### Group therapy with sessions

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --type monthly --modal group --therapist --sessions
```

Creates: client + therapist + monthly subscription + 4 weekly group sessions (client added to `session_group_clients` and subscription to `session_group_subscriptions`).

### Multiple clients in the same group (trial + monthly)

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --clients trial,monthly --modal group --therapist --sessions
```

Creates: 2 clients (one trial, one monthly) + therapist + subscriptions + 4 weekly group sessions. The trial client appears in session 1 only. The monthly client appears in all 4. Each session's `session_group_clients` and `session_group_subscriptions` only contain the eligible clients for that week.

### Three clients (trial + monthly + quarterly)

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --clients trial,monthly,quarterly --modal group --therapist --sessions
```

Creates: 3 clients + therapist + 12 weekly sessions. Trial in 1, monthly in 4, quarterly in all 12.

### Custom credentials

```bash
npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --email john@test.com --phone 0911223344 --username john_test --gender female --lang Amharic --therapist
```

## What gets created

| Flag combination | Client | Subscription | Therapist | Preference | Sessions |
|------------------|--------|-------------|-----------|------------|----------|
| *(none)* | Y | Y | - | - | - |
| `--modal` | Y | Y | - | Y | - |
| `--therapist` | Y | Y | Y | - | - |
| `--modal --therapist` | Y | Y | Y | Y | - |
| `--therapist --sessions` | Y | Y | Y | - | Y |
| `--modal --therapist --sessions` | Y | Y | Y | Y | Y |

## Session counts by subscription type

| `--type` | Sessions created |
|----------|-----------------|
| `trial` | 1 |
| `monthly` | 4 |
| `quarterly` | 12 |
| `semi` | 24 |
| `yearly` | 48 |

Sessions are scheduled weekly starting from next Monday at 10:00 AM. All sessions share a `commonId` and are set to `confirmed` status.

- **Individual/teen/couple**: session uses `clientId` and `subscriptionId` columns.
- **Group**: session uses `session_group_clients` and `session_group_subscriptions` join tables, with `groupName` set to `[seed] Group`.

## Output

The script prints all created records with their IDs, emails, and credentials so you can immediately use them to log in or reference in tests.

## Cleanup

```sql
-- Delete all seeded data
DELETE FROM session WHERE groupName LIKE '[seed]%' OR clientId IN (SELECT id FROM client WHERE firstName LIKE '[seed]%');
DELETE FROM preference WHERE clientId IN (SELECT id FROM client WHERE firstName LIKE '[seed]%');
DELETE FROM client_subscription WHERE clientId IN (SELECT id FROM client WHERE firstName LIKE '[seed]%');
DELETE FROM expertise WHERE therapistId IN (SELECT id FROM therapist WHERE firstName LIKE '[seed]%');
DELETE FROM client WHERE firstName LIKE '[seed]%';
DELETE FROM therapist WHERE firstName LIKE '[seed]%';
```
