# Questions for the HIE Team

We need answers to these questions before we begin implementation. We will update this file as answers come in.

## Must Answer Before We Start Development

| # | Question | Why it matters | Answer |
|---|----------|---------------|--------|
| 1 | What FHIR version is the HIE system using? | We are assuming R4 — we need to confirm | |
| 2 | How will referrals be sent — will the HIE system POST to our endpoint, or do we poll? | Determines our architecture (webhook vs polling job) | |
| 3 | What authentication method does the HIE system require? (mTLS, OAuth2, API key) | Determines our auth middleware for the ingestion endpoint | |
| 4 | What coding system is used for diagnoses? (ICD-10, SNOMED CT, local codes) | Affects how we store and display reason codes | |
| 5 | Does the HIE system expect status callbacks when we accept/reject a referral? | Determines if we need to build outbound FHIR calls | |
| 6 | If yes to callbacks — what endpoint and auth does the HIE system expect? | We need the HIE callback URL and credentials | |
| 7 | Is there a national patient identifier system / MRN we should store? | Affects our duplicate detection and patient matching | |
| 8 | What Bundle type will the HIE system send? (`message`, `transaction`, or individual resources) | Affects our parser implementation | |

## Good to Know

| # | Question | Answer |
|---|----------|--------|
| 9 | Is there a testing sandbox / staging environment we can develop against? | |
| 10 | Will the Bundle always include Practitioner and Organization, or are those optional? | |
| 11 | Does the HIE system include a Consent resource in the Bundle? | |
| 12 | What response format does the HIE system expect from us? (We plan to return FHIR OperationOutcome) | |
| 13 | Are there any rate limits or batch referral scenarios we should handle on our end? | |
| 14 | Is there documentation or an implementation guide for the HIE referral profile? | |
