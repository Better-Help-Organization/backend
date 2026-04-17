# Data Requirements — What We Need From the HIE System

## FHIR Version

We need to confirm with the HIE team: **FHIR R4** is expected (most common in African HIEs).

## Transport & Authentication

Questions we need to clarify with the HIE team:

| Question | Why it matters |
|----------|---------------|
| Will the HIE system POST to our endpoint, or do we poll/subscribe? | Determines if we build a webhook receiver or a polling job |
| Authentication method — mTLS, OAuth2, or API key? | Determines our auth middleware |
| Is there a testing sandbox / staging environment we can develop against? | Needed for our development and integration testing |
| What is the expected response format? | We plan to return a FHIR OperationOutcome |

---

## FHIR Bundle Structure

We expect to receive a FHIR **Bundle** (type: `message` or `transaction`) from the HIE system containing the following resources:

### 1. ServiceRequest (REQUIRED)

This is the referral itself.

| Field | FHIR Path | How we use it |
|-------|-----------|---------------|
| Referral ID | `ServiceRequest.id` | Stored as `fhir_service_request_id` for deduplication and callbacks |
| Status | `ServiceRequest.status` | Should be `active` on arrival |
| Intent | `ServiceRequest.intent` | Should be `order` (a referral directive) |
| Priority | `ServiceRequest.priority` | `routine`, `urgent`, `asap`, `stat` — displayed to our admin during review |
| Category | `ServiceRequest.category` | Should indicate mental health / behavioral health referral |
| Reason Reference | `ServiceRequest.reasonReference` | Points to the Condition resource in the bundle |
| Subject | `ServiceRequest.subject` | Points to the Patient resource in the bundle |
| Requester | `ServiceRequest.requester` | Points to the Practitioner resource in the bundle |
| Note | `ServiceRequest.note` | Free-text clinical notes from the referring doctor — shown to our therapists |
| Authored On | `ServiceRequest.authoredOn` | When the referral was created |
| Performer | `ServiceRequest.performer` | May reference our Organization if the HIE system knows our system ID |

**Example:**
```json
{
  "resourceType": "ServiceRequest",
  "id": "referral-001",
  "status": "active",
  "intent": "order",
  "priority": "routine",
  "category": [
    {
      "coding": [
        {
          "system": "http://snomed.info/sct",
          "code": "390893007",
          "display": "Referral to mental health service"
        }
      ]
    }
  ],
  "code": {
    "coding": [
      {
        "system": "http://snomed.info/sct",
        "code": "183583007",
        "display": "Refer to mental health counselor"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-001"
  },
  "requester": {
    "reference": "Practitioner/dr-abebe-001"
  },
  "reasonReference": [
    {
      "reference": "Condition/condition-001"
    }
  ],
  "authoredOn": "2026-04-13",
  "note": [
    {
      "text": "Patient presenting with persistent low mood and sleep disturbance for 3 months. Recommend counseling."
    }
  ]
}
```

---

### 2. Patient (REQUIRED)

The person being referred. This maps to our `Client` entity.

| Field | FHIR Path | Maps to our Client field | Notes |
|-------|-----------|---------------------|-------|
| Name | `Patient.name[0].given`, `.family` | `firstName`, `lastName` | |
| Phone | `Patient.telecom` (system: phone) | `phoneNumber` | **Primary match key** for our duplicate detection |
| Email | `Patient.telecom` (system: email) | `email` | Optional |
| Gender | `Patient.gender` | `gender` | FHIR uses: `male`, `female`, `other`, `unknown` |
| Date of Birth | `Patient.birthDate` | `dob` | **Used to route to teen vs adult therapy modal** |
| National ID | `Patient.identifier` (system: national) | Stored on our Referral entity | If a national health ID exists |
| Emergency Contact | `Patient.contact[0]` | `emergencyContact` | Optional |
| Address | `Patient.address` | Not mapped | Stored in raw bundle only |
| Language | `Patient.communication` | Link to our `Language` entity | If available |

**Our age-based routing logic:**
- Under 18 → Teen therapy modal
- 18 and above → Individual therapy modal

**Example:**
```json
{
  "resourceType": "Patient",
  "id": "patient-001",
  "identifier": [
    {
      "system": "http://moh.gov.et/fhir/patient-id",
      "value": "ETH-P-2024-00123"
    }
  ],
  "name": [
    {
      "family": "Tadesse",
      "given": ["Abeba"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+251911234567",
      "use": "mobile"
    },
    {
      "system": "email",
      "value": "abeba.t@email.com"
    }
  ],
  "gender": "female",
  "birthDate": "1995-06-15",
  "address": [
    {
      "city": "Addis Ababa",
      "country": "ET"
    }
  ]
}
```

---

### 3. Condition (REQUIRED)

The diagnosis or reason for referral. Contains the ICD-10 code.

| Field | FHIR Path | How we use it |
|-------|-----------|---------------|
| ICD-10 Code | `Condition.code.coding[0].code` | Stored as `reason_code` on our Referral entity — metadata for our therapists |
| Display Name | `Condition.code.coding[0].display` | Stored as `reason_display` — shown to our admin and therapists |
| Severity | `Condition.severity` | Optional — can inform priority |
| Clinical Notes | `Condition.note` | Additional context for our therapists |

**We do NOT programmatically interpret the ICD-10 code for routing.** Our routing is based on patient age. The code is informational for our therapists.

**Common ICD-10 codes the HIE system might include:**

| Code | Description |
|------|-------------|
| F32.0 | Mild depressive episode |
| F32.1 | Moderate depressive episode |
| F32.2 | Severe depressive episode without psychotic symptoms |
| F41.0 | Panic disorder |
| F41.1 | Generalized anxiety disorder |
| F43.1 | Post-traumatic stress disorder |
| F43.2 | Adjustment disorders |
| F90.0 | ADHD (predominantly inattentive) |
| F91.3 | Oppositional defiant disorder |

**Example:**
```json
{
  "resourceType": "Condition",
  "id": "condition-001",
  "subject": {
    "reference": "Patient/patient-001"
  },
  "code": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/icd-10",
        "code": "F32.1",
        "display": "Moderate depressive episode"
      }
    ]
  },
  "note": [
    {
      "text": "Onset approximately 3 months ago following family bereavement."
    }
  ]
}
```

---

### 4. Practitioner (RECOMMENDED)

The referring doctor. Stored for our reference — not mapped to any of our entities.

| Field | FHIR Path | How we use it |
|-------|-----------|---------------|
| Name | `Practitioner.name` | Stored as `referring_practitioner` |
| Identifier / License | `Practitioner.identifier` | Reference only |
| Contact | `Practitioner.telecom` | In case we need to follow up |

---

### 5. Organization (RECOMMENDED)

The referring hospital/facility.

| Field | FHIR Path | How we use it |
|-------|-----------|---------------|
| Name | `Organization.name` | Stored as `referring_organization` |
| Identifier | `Organization.identifier` | Facility code for HIE tracking |
| Contact | `Organization.telecom` | Reference only |

---

### 6. Consent (OPTIONAL)

Proof that the patient agreed to the mental health referral.

| Field | FHIR Path | How we use it |
|-------|-----------|---------------|
| Consent ID | `Consent.id` | Stored as `consent_reference` on our Referral entity |
| Status | `Consent.status` | Should be `active` |

If the HIE system does not include a Consent resource, the act of sending the referral itself implies consent was obtained at the referring hospital. We store the reference ID if present, but we do not require it.

---

## Complete Example Bundle

```json
{
  "resourceType": "Bundle",
  "type": "message",
  "entry": [
    {
      "resource": {
        "resourceType": "ServiceRequest",
        "id": "referral-001",
        "status": "active",
        "intent": "order",
        "priority": "routine",
        "subject": { "reference": "Patient/patient-001" },
        "requester": { "reference": "Practitioner/dr-abebe-001" },
        "reasonReference": [{ "reference": "Condition/condition-001" }],
        "authoredOn": "2026-04-13",
        "note": [{ "text": "Persistent low mood, recommend counseling." }]
      }
    },
    {
      "resource": {
        "resourceType": "Patient",
        "id": "patient-001",
        "name": [{ "family": "Tadesse", "given": ["Abeba"] }],
        "telecom": [{ "system": "phone", "value": "+251911234567" }],
        "gender": "female",
        "birthDate": "1995-06-15"
      }
    },
    {
      "resource": {
        "resourceType": "Condition",
        "id": "condition-001",
        "code": {
          "coding": [{
            "system": "http://hl7.org/fhir/sid/icd-10",
            "code": "F32.1",
            "display": "Moderate depressive episode"
          }]
        }
      }
    },
    {
      "resource": {
        "resourceType": "Practitioner",
        "id": "dr-abebe-001",
        "name": [{ "family": "Bekele", "given": ["Abebe"] }]
      }
    },
    {
      "resource": {
        "resourceType": "Organization",
        "id": "org-001",
        "name": "Tikur Anbessa Specialized Hospital"
      }
    }
  ]
}
```
