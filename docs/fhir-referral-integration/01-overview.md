# FHIR Referral Integration — Overview

## Purpose

Enable hospitals connected to the national Health Information Exchange (HIE) to refer patients to our platform for mental health therapy services. The integration follows a **sideloading strategy** — a new Referral module receives and stores FHIR data alongside our existing system, with minimal changes to our existing entities.

## High-Level Flow

```
Hospital EHR
    │
    ▼
National HIE
    │
    ▼
POST /referral/fhir (our system receives FHIR Bundle)
    │
    ▼
Referral stored (raw FHIR + extracted fields)
    │
    ▼
Our admin reviews incoming referral
    │
    ├─ ACCEPT → Client created/linked → normal matching flow begins
    │
    └─ REJECT → reason recorded → status callback to the HIE system
    │
    ▼
Status updates sent back to the HIE system as the referral progresses
```

## What Changes in Our Existing System

| Area | Change |
|------|--------|
| `Client` entity | Add nullable `referral_id` FK |
| Everything else | **No changes** — matching, subscriptions, sessions, payments all work as-is |

## What Gets Added

| New Component | Purpose |
|---------------|---------|
| `Referral` entity | Stores incoming referral data + raw FHIR bundle |
| `ReferralStatusHistory` entity | Audit trail of referral state changes |
| `ReferralModule` | Controller, service, FHIR parser |
| FHIR ingestion endpoint | `POST /referral/fhir` |
| Referral management endpoints | Accept, reject, list, view |
| HIE status callback | Notify the HIE system when referral status changes |
