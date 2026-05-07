# Implementation Task List

## Tasks

| # | Task | Description | Effort |
|---|------|-------------|--------|
| 1 | Referral entity + migration | Our `Referral` entity with all fields, enums, duplicate detection by phone on accept | Small-Medium |
| 2 | ReferralStatusHistory entity | Audit trail entity for referral state changes | Small |
| 3 | ReferralModule scaffold | NestJS module, controller, service | Small |
| 4 | FHIR Bundle parser | Service to extract Patient, ServiceRequest, Condition, Practitioner, Organization from a FHIR Bundle | Medium |
| 5 | `POST /referral/fhir` endpoint | Our ingestion endpoint — validates, parses, stores, notifies our admin | Medium |
| 6 | `POST /referral/:id/accept` | Creates/links Client in our system, routes to modal by age, updates status, logs history | Medium |
| 7 | `POST /referral/:id/reject` | Updates status with reason, logs history | Small |
| 8 | `referral_id` FK on our Client entity | Nullable OneToOne relation back to Referral | Tiny |
| 9 | Notification on new referral | Push notification to our admin via our existing Firebase setup | Small |
| 10 | Status callback to the HIE system | Outbound HTTP call with FHIR ServiceRequest status update | Medium |
| 11 | HIE endpoint auth | API key guard or OAuth validation for our ingestion endpoint | Small-Medium |

## Order of Implementation

```
Phase 1 — Core (get referrals into our system)
  Task 1 → Task 2 → Task 3 → Task 4 → Task 5

Phase 2 — Actions (process referrals on our side)
  Task 8 → Task 6 → Task 7

Phase 3 — Integration (communicate back to the HIE system)
  Task 9 → Task 10 → Task 11
```

## Out of Scope (for now)

- Encounter linking (sending therapy completion summaries back to the HIE system)
- FHIR CapabilityStatement endpoint
- HIE connectathon / conformance testing
- Complex ICD-10 to therapy type mapping (we are using age-based routing instead)
