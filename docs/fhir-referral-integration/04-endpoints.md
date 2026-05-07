# API Endpoints — Referral Module

## FHIR Ingestion (called by the HIE system)

### `POST /referral/fhir`

Receives a FHIR Bundle from the HIE system.

**Auth:** API key or OAuth token (to be agreed upon with the HIE team)
**Content-Type:** `application/fhir+json`

**Request:** FHIR Bundle (see 02-data-requirements.md for full example)

**Response (success):**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "information",
      "code": "informational",
      "diagnostics": "Referral received successfully. ID: referral-001"
    }
  ]
}
```

**Response (error — missing required fields):**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "required",
      "diagnostics": "Bundle must contain a ServiceRequest and Patient resource"
    }
  ]
}
```

**Response (error — duplicate):**
```json
{
  "resourceType": "OperationOutcome",
  "issue": [
    {
      "severity": "error",
      "code": "duplicate",
      "diagnostics": "ServiceRequest referral-001 has already been received"
    }
  ]
}
```

**Our processing logic:**
1. Validate the Bundle contains at minimum: ServiceRequest + Patient
2. Check `fhir_service_request_id` for duplicates in our system
3. Extract fields from Patient, ServiceRequest, Condition, Practitioner, Organization
4. Create a Referral record with status PENDING
5. Set `expires_at` to `referred_at + 30 days`
6. Fire a notification to our admin
7. Return an OperationOutcome to the HIE system

---

## Referral Management (internal — used by our admin)

All endpoints below require our Admin JWT auth.

### `GET /referral`

List all referrals with filtering.

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status: PENDING, ACCEPTED, REJECTED, EXPIRED |
| priority | string | Filter by priority |
| from | date | Referred after this date |
| to | date | Referred before this date |
| page | number | Pagination |
| limit | number | Page size |

**Response:** Paginated list of referrals (without raw fhir_bundle for performance)

---

### `GET /referral/:id`

View a single referral with full details including the raw FHIR bundle.

---

### `POST /referral/:id/accept`

Accept a referral and onboard the patient into our system.

**Our processing logic:**
1. Check referral status is PENDING and not expired
2. Search for an existing Client in our system by `patient_phone`
3. If found → link the existing Client to the referral
4. If not found → create a new Client with:
   - `firstName`, `lastName` from `patient_name`
   - `phoneNumber` from `patient_phone`
   - `email` from `patient_email`
   - `gender` from `patient_gender`
   - `dob` from `patient_dob`
5. Route to our therapy modal based on age:
   - Under 18 → teen therapy modal
   - 18+ → individual therapy modal
6. Update referral status to ACCEPTED, set `accepted_at`
7. Log the status change to ReferralStatusHistory
8. Send a status callback to the HIE system (ServiceRequest.status → "active")
9. Notify our relevant parties

**Response:**
```json
{
  "referral_id": "uuid",
  "status": "ACCEPTED",
  "client_id": "uuid",
  "is_new_client": true,
  "routed_to_modal": "individual"
}
```

---

### `POST /referral/:id/reject`

Reject a referral with a reason.

**Body:**
```json
{
  "reason": "Patient needs psychiatric care beyond our scope of services"
}
```

**Our processing logic:**
1. Update status to REJECTED, set `rejected_at`, store reason
2. Log to ReferralStatusHistory
3. Send a status callback to the HIE system (ServiceRequest.status → "revoked")

---

## Status Callback to the HIE System (outbound)

When a referral status changes on our end, we notify the HIE system.

**Outbound request to the HIE system:**
```json
{
  "resourceType": "ServiceRequest",
  "id": "referral-001",
  "status": "active",
  "note": [
    {
      "text": "Referral accepted. Patient onboarded for individual therapy."
    }
  ]
}
```

**Status mapping:**

| Our Status | FHIR ServiceRequest.status sent to the HIE system |
|------------|---------------------------------------------------|
| PENDING | active (no callback — already active on the HIE side) |
| ACCEPTED | active (with acceptance note) |
| REJECTED | revoked |
| EXPIRED | revoked |
