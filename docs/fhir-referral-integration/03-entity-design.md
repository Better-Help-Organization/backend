# Entity Design — Referral Module

## Referral Entity

```typescript
@Entity()
export class Referral extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Raw FHIR storage ---
  @Column({ type: 'json' })
  fhir_bundle: object;                    // Entire raw Bundle preserved (MySQL json type)

  @Column({ unique: true })
  fhir_service_request_id: string;        // ServiceRequest.id — for dedup & callbacks

  // --- Referral metadata ---
  @Column({ type: 'enum', enum: ReferralStatus, default: ReferralStatus.PENDING })
  status: ReferralStatus;                 // PENDING | ACCEPTED | REJECTED | EXPIRED

  @Column({ type: 'enum', enum: ReferralPriority, default: ReferralPriority.ROUTINE })
  priority: ReferralPriority;             // routine | urgent | asap | stat

  @Column({ nullable: true })
  rejection_reason: string;

  // --- Referring party ---
  @Column()
  referring_organization: string;         // Hospital name

  @Column({ nullable: true })
  referring_organization_id: string;      // Facility code from the HIE system

  @Column()
  referring_practitioner: string;         // Doctor name

  @Column({ nullable: true })
  referring_practitioner_id: string;      // Doctor license/ID

  // --- Diagnosis ---
  @Column({ nullable: true })
  reason_code: string;                    // ICD-10 code (e.g. "F32.1")

  @Column({ nullable: true })
  reason_display: string;                 // Human-readable (e.g. "Moderate depressive episode")

  @Column({ nullable: true, type: 'text' })
  clinical_notes: string;                 // Free-text notes from the referring doctor

  // --- Patient data (extracted from FHIR Patient) ---
  @Column()
  patient_name: string;

  @Column()
  patient_phone: string;                  // Primary match key for our duplicate detection

  @Column({ nullable: true })
  patient_email: string;

  @Column({ nullable: true })
  patient_gender: string;

  @Column({ nullable: true, type: 'date' })
  patient_dob: Date;

  @Column({ nullable: true })
  patient_national_id: string;            // National health ID if available

  // --- Consent ---
  @Column({ nullable: true })
  consent_reference: string;              // FHIR Consent resource ID if provided

  // --- Linking ---
  @OneToOne(() => Client, { nullable: true })
  @JoinColumn()
  client: Client;                         // Populated when we accept the referral

  // --- Timestamps ---
  @Column({ type: 'timestamp' })
  referred_at: Date;                      // ServiceRequest.authoredOn

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date;                       // Auto-set to referred_at + 30 days

  @Column({ type: 'timestamp', nullable: true })
  accepted_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  rejected_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

### Enums

```typescript
enum ReferralStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

enum ReferralPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  ASAP = 'asap',
  STAT = 'stat',
}
```

---

## ReferralStatusHistory Entity

Audit trail for every state change.

```typescript
@Entity()
export class ReferralStatusHistory extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Referral)
  @JoinColumn()
  referral: Referral;

  @Column({ type: 'enum', enum: ReferralStatus })
  from_status: ReferralStatus;

  @Column({ type: 'enum', enum: ReferralStatus })
  to_status: ReferralStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  changed_by: string;                     // Our admin user ID who made the change

  @CreateDateColumn()
  created_at: Date;
}
```

---

## Change to Our Client Entity

Single nullable field addition:

```typescript
// In client.entity.ts — add:
@OneToOne(() => Referral, { nullable: true })
@JoinColumn()
referral: Referral;
```

This links a client back to the referral that created them. Nullable because most clients will continue to sign up directly through our platform.

---

## Duplicate Detection Strategy

When we accept a referral, before creating a new Client:

1. Query our `Client` table by `phoneNumber` matching `referral.patient_phone`
2. If a match is found → link the existing Client to the Referral (set `referral.client = existingClient`)
3. If no match → create a new Client from the referral patient data, then link

This avoids duplicate accounts when a patient is referred but already has an account on our platform.
