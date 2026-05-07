/**
 * Seed client(s) with active subscription, therapist, and sessions.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-client.ts
 *   npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --type monthly --therapist --sessions
 *   npx ts-node -r tsconfig-paths/register scripts/seed-client.ts --clients trial,monthly --modal group --therapist --sessions
 *
 * Flags:
 *   --type       trial | monthly | quarterly | semi | yearly       (default: monthly, single client)
 *   --clients    comma-separated sub types (e.g. trial,monthly)    creates multiple clients
 *   --modal      individual | teen | couple | group                (default: first match in DB)
 *   --level      associate | moderate | advanced                   (default: from catalog sub)
 *   --therapist  create a therapist with level + expertise + lang
 *   --sessions   create weekly sessions (requires --therapist)
 *   --lang       language name                                     (default: English)
 *   --gender     male | female                                     (default: male)
 *   --email      client email override (single client only)
 *   --phone      client phone override (single client only)
 *   --username   client username override (single client only)
 *
 * All seeded records have firstName prefixed with "[seed]".
 * Password is always: secure12
 */

import { DataSource } from 'typeorm';
import { hash } from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── CLI helpers ──────────────────────────────────────

function getArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// ─── Constants ────────────────────────────────────────

const PASSWORD = 'secure12';
const SEED_PREFIX = '[seed]';

const SUB_TYPE_MAP: Record<string, number> = {
  trial: 0, monthly: 1, quarterly: 3, semi: 6, yearly: 12,
};

const SUB_TYPE_LABEL: Record<number, string> = {
  0: 'trial', 1: 'monthly', 3: 'quarterly', 6: 'semi', 12: 'yearly',
};

const MODAL_MAP: Record<string, string> = {
  individual: 'Individual Therapy',
  teen: 'Teen Therapy',
  couple: 'Couple Therapy',
  group: 'Group Therapy',
};

const LEVEL_MAP: Record<string, string> = {
  associate: 'associate',
  moderate: 'moderate',
  advanced: 'advanced',
};

const DEFAULT_EXPERTISE = [
  'Anxiety', 'Depression', 'Stress Management',
  'Trauma', 'Grief / Loss', 'Relationship Problems',
];

// ─── Parse args ───────────────────────────────────────

const modalArg = getArg('modal');
const levelArg = getArg('level');
const langArg = getArg('lang', 'English');
const genderArg = getArg('gender', 'male');
const wantTherapist = hasFlag('therapist');
const wantSessions = hasFlag('sessions');
const clientsArg = getArg('clients');

// Build list of sub types to create
let clientSubTypes: number[];

if (clientsArg) {
  const parts = clientsArg.split(',').map(s => s.trim());
  clientSubTypes = parts.map(p => {
    const v = SUB_TYPE_MAP[p];
    if (v === undefined) {
      console.error(`Invalid sub type "${p}" in --clients. Use: trial, monthly, quarterly, semi, yearly`);
      process.exit(1);
    }
    return v;
  });
} else {
  const subTypeArg = getArg('type', 'monthly');
  const v = SUB_TYPE_MAP[subTypeArg];
  if (v === undefined) {
    console.error(`Invalid --type: ${subTypeArg}. Use: trial, monthly, quarterly, semi, yearly`);
    process.exit(1);
  }
  clientSubTypes = [v];
}

const ts = Date.now().toString().slice(-6);

// ─── DB ───────────────────────────────────────────────

const ds = new DataSource({
  type: 'mysql',
  host: process.env.MYSQL_DB_HOST || 'localhost',
  port: Number(process.env.MYSQL_DB_PORT) || 3306,
  username: process.env.MYSQL_DB_USER || 'root',
  password: process.env.MYSQL_DB_PASSWORD || '',
  database: process.env.MYSQL_DB || 'nc',
  entities: [path.resolve(__dirname, '../src/common/entities/*.entity{.ts,.js}')],
  synchronize: false,
});

// ─── Helpers ──────────────────────────────────────────

async function queryOne(mgr: any, sql: string, params: any[], errMsg: string): Promise<any> {
  const rows = await mgr.query(sql, params);
  if (!rows.length) {
    console.error(errMsg);
    await ds.destroy();
    process.exit(1);
  }
  return rows[0];
}

function printSection(title: string, fields: [string, any][]) {
  const bar = '─'.repeat(60);
  console.log(bar);
  console.log(`  ${title}`);
  console.log(bar);
  for (const [k, v] of fields) {
    if (v != null) console.log(`  ${k.padEnd(20)} ${v}`);
  }
}

function weeksForType(subType: number): number {
  return subType === 0 ? 1 : subType * 4;
}

// ─── Types ────────────────────────────────────────────

interface CreatedClient {
  id: string;
  email: string;
  phone: string;
  username: string;
  subType: number;
  subId: string;        // client_subscription ID
  catalogSubId: string; // subscription catalog ID
}

// ─── Main ─────────────────────────────────────────────

async function main() {
  await ds.initialize();
  console.log('Connected to DB\n');
  const mgr = ds.manager;
  const hashedPw = await hash(PASSWORD, 10);

  // ── Resolve modal ──────────────────────────────────
  let modal: any = null;
  if (modalArg) {
    const modalName = MODAL_MAP[modalArg];
    if (!modalName) { console.error(`Invalid --modal. Use: individual, teen, couple, group`); process.exit(1); }
    modal = await queryOne(mgr,
      `SELECT * FROM modal WHERE name = ?`, [modalName],
      `Modal "${modalName}" not found. Run seedOnboarding() first.`,
    );
  }

  // ── Resolve level ──────────────────────────────────
  let level: any = null;
  if (levelArg) {
    const lt = LEVEL_MAP[levelArg];
    if (!lt) { console.error(`Invalid --level. Use: associate, moderate, advanced`); process.exit(1); }
    level = await queryOne(mgr,
      `SELECT * FROM level WHERE type = ?`, [lt],
      `Level "${lt}" not found. Run seedOnboarding() first.`,
    );
  }

  // ── Resolve language ───────────────────────────────
  const lang = await queryOne(mgr,
    `SELECT * FROM language WHERE name = ?`, [langArg],
    `Language "${langArg}" not found. Run seedOnboarding() first.`,
  );

  // ── Find catalog subscriptions per type ────────────
  // We may need different catalog subs for different types
  const catalogSubCache = new Map<number, any>();

  for (const subType of new Set(clientSubTypes)) {
    let subSql = `
      SELECT s.*, m.name AS modalName, l.type AS levelType
      FROM subscription s
      LEFT JOIN modal m ON m.id = s.modalId
      LEFT JOIN level l ON l.id = s.levelId
      WHERE s.type = ? AND s.is_admin_created = 1`;
    const subParams: any[] = [String(subType)];

    if (modal) { subSql += ` AND s.modalId = ?`; subParams.push(modal.id); }
    if (level) { subSql += ` AND s.levelId = ?`; subParams.push(level.id); }
    subSql += ` LIMIT 1`;

    const catSub = await queryOne(mgr, subSql, subParams,
      `No subscription found for type=${SUB_TYPE_LABEL[subType]}${modalArg ? ' modal=' + modalArg : ''}${levelArg ? ' level=' + levelArg : ''}. Run seedSubscriptions() first.`,
    );
    catalogSubCache.set(subType, catSub);
  }

  // Backfill modal/level from first catalog sub
  const firstCatSub = catalogSubCache.values().next().value;
  if (!modal && firstCatSub.modalId) {
    [modal] = await mgr.query(`SELECT * FROM modal WHERE id = ?`, [firstCatSub.modalId]);
  }
  if (!level && firstCatSub.levelId) {
    [level] = await mgr.query(`SELECT * FROM level WHERE id = ?`, [firstCatSub.levelId]);
  }

  // ── Create therapist (optional) ────────────────────
  let therapistId: string | null = null;
  let therapistEmail: string | null = null;
  let therapistPhone: string | null = null;

  if (wantTherapist) {
    therapistEmail = `seedth${ts}@test.com`;
    therapistPhone = `88${ts}`;

    therapistId = uuidv4();
    await mgr.query(
      `INSERT INTO therapist
        (id, firstName, lastName, email, phoneNumber, password, gender, status,
         bio, verified, hoursDedicatedPerWeek, avatar, isEmailAuthenticated,
         isPhoneNumberAuthenticated, isLinked, isOnline, levelId)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, true, 40, 0, true, false, false, false, ?)`,
      [therapistId, `${SEED_PREFIX} Therapist`, ts, therapistEmail, therapistPhone, hashedPw, genderArg,
        'Seeded therapist for testing', level?.id ?? null],
    );

    for (const exp of DEFAULT_EXPERTISE) {
      await mgr.query(`INSERT INTO expertise (id, therapistId, expertise) VALUES (?, ?, ?)`, [uuidv4(), therapistId, exp]);
    }

    await mgr.query(
      `INSERT INTO therapist_language_language (therapistId, languageId) VALUES (?, ?)`,
      [therapistId, lang.id],
    );
  }

  // ── Create clients ─────────────────────────────────
  const createdClients: CreatedClient[] = [];

  for (let ci = 0; ci < clientSubTypes.length; ci++) {
    const subType = clientSubTypes[ci];
    const catSub = catalogSubCache.get(subType);
    const label = SUB_TYPE_LABEL[subType];
    const suffix = clientSubTypes.length > 1 ? `${ci + 1}` : '';

    // Use overrides only for single client
    const cEmail = clientSubTypes.length === 1
      ? getArg('email', `seedclient${ts}@test.com`)
      : `seed${label}${ts}${ci}@test.com`;
    const cPhone = clientSubTypes.length === 1
      ? getArg('phone', `99${ts}`)
      : `99${ts}${ci}`;
    const cUsername = clientSubTypes.length === 1
      ? getArg('username', `seed_${ts}`)
      : `seed_${label}_${ts}${ci}`;

    // Create client
    const clientId = uuidv4();
    await mgr.query(
      `INSERT INTO client
        (id, firstName, lastName, email, phoneNumber, username, password, gender, status,
         isInGroup, isVisible, avatar, isEmailAuthenticated, isPhoneNumberAuthenticated, isLinked, isOnline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', false, false, 0, true, false, false, false)`,
      [clientId, `${SEED_PREFIX} Client${suffix}`, `${label}_${ts}`, cEmail, cPhone, cUsername, hashedPw, genderArg],
    );

    // Client language
    await mgr.query(
      `INSERT INTO client_language_language (clientId, languageId) VALUES (?, ?)`,
      [clientId, lang.id],
    );

    // Client subscription
    const now = new Date();
    const months = subType === 0 ? 1 : subType;
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + months);

    const csId = uuidv4();
    await mgr.query(
      `INSERT INTO client_subscription
        (id, clientId, subscriptionId, therapistId, status, start_date, end_date, price, old_price)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)`,
      [csId, clientId, catSub.id, therapistId, now, endDate, catSub.price, catSub.old_price],
    );
    const csRow = { id: csId };

    await mgr.query(`UPDATE client SET active_subscription_id = ? WHERE id = ?`, [csRow.id, clientId]);

    // Preference
    if (modal) {
    const prefId = uuidv4();
      await mgr.query(
        `INSERT INTO preference (id, clientId, modalId, levelId, gender) VALUES (?, ?, ?, ?, ?)`,
        [prefId, clientId, modal.id, level?.id ?? null, genderArg],
      );
      const prefRow = { id: prefId };
      await mgr.query(
        `INSERT INTO preference_language_language (preferenceId, languageId) VALUES (?, ?)`,
        [prefRow.id, lang.id],
      );
    }

    // Mark as group member if group modal
    if (modal && firstCatSub.modalName?.includes('Group')) {
      await mgr.query(`UPDATE client SET isInGroup = true WHERE id = ?`, [clientId]);
    }

    createdClients.push({
      id: clientId,
      email: cEmail,
      phone: cPhone,
      username: cUsername,
      subType,
      subId: csRow.id,
      catalogSubId: catSub.id,
    });
  }

  // ── Create sessions (optional) ─────────────────────
  const sessionIds: string[] = [];
  const sessionDates: string[] = [];
  const sessionMembers: number[] = []; // members count per session

  if (wantSessions) {
    if (!therapistId) {
      console.error('--sessions requires --therapist. Add --therapist flag.');
      await ds.destroy();
      process.exit(1);
    }

    const isGroup = firstCatSub.modalName?.includes('Group');
    const maxWeeks = Math.max(...clientSubTypes.map(weeksForType));
    const duration = 60;
    const commonId = uuidv4();

    // Next Monday at 10:00
    const baseDate = new Date();
    const dayOfWeek = baseDate.getDay();
    const daysUntilMonday = (8 - dayOfWeek) % 7 || 7;
    baseDate.setDate(baseDate.getDate() + daysUntilMonday);
    baseDate.setHours(10, 0, 0, 0);

    for (let i = 0; i < maxWeeks; i++) {
      const schedule = new Date(baseDate);
      schedule.setDate(baseDate.getDate() + i * 7);

      // Filter clients eligible for this week
      const eligibleClients = createdClients.filter(c => weeksForType(c.subType) > i);
      if (!eligibleClients.length) continue;

      if (isGroup) {
        // Group session
        const sessId = uuidv4();
        await mgr.query(
          `INSERT INTO session
            (id, therapistId, schedule, duration, type, approvalStatus, commonId, modalId, groupName)
           VALUES (?, ?, ?, ?, 'video', 'confirmed', ?, ?, ?)`,
          [sessId, therapistId, schedule, duration, commonId, modal?.id ?? firstCatSub.modalId, `${SEED_PREFIX} Group`],
        );

        // Add each eligible client + their subscription
        for (const c of eligibleClients) {
          await mgr.query(
            `INSERT INTO session_group_clients (session_id, client_id) VALUES (?, ?)`,
            [sessId, c.id],
          );
          await mgr.query(
            `INSERT INTO session_group_subscriptions (session_id, subscription_id) VALUES (?, ?)`,
            [sessId, c.subId],
          );
        }

        sessionIds.push(sessId);
        sessionMembers.push(eligibleClients.length);
      } else {
        // Individual/teen/couple — one session per client
        for (const c of eligibleClients) {
          const sessId = uuidv4();
          await mgr.query(
            `INSERT INTO session
              (id, therapistId, clientId, schedule, duration, type, approvalStatus, commonId, modalId, subscriptionId)
             VALUES (?, ?, ?, ?, ?, 'video', 'confirmed', ?, ?, ?)`,
            [sessId, therapistId, c.id, schedule, duration, commonId, modal?.id ?? firstCatSub.modalId, c.subId],
          );

          sessionIds.push(sessId);
          sessionMembers.push(1);
        }
      }

      sessionDates.push(schedule.toISOString().slice(0, 16).replace('T', ' '));
    }

    // Mark group clients
    if (isGroup) {
      for (const c of createdClients) {
        await mgr.query(`UPDATE client SET isInGroup = true WHERE id = ?`, [c.id]);
      }
    }
  }

  // ── Output ─────────────────────────────────────────
  console.log('');

  for (let ci = 0; ci < createdClients.length; ci++) {
    const c = createdClients[ci];
    const catSub = catalogSubCache.get(c.subType);
    const label = SUB_TYPE_LABEL[c.subType];

    printSection(`CLIENT ${ci + 1} (${label})`, [
      ['ID', c.id],
      ['Email', c.email],
      ['Phone', c.phone],
      ['Username', c.username],
      ['Password', PASSWORD],
      ['Gender', genderArg],
      ['Language', langArg],
      ['Sub Type', `${label} (${c.subType})`],
      ['Sub ID', c.subId],
      ['Modal', catSub.modalName],
      ['Level', catSub.levelType ?? 'N/A'],
      ['Price', catSub.price],
      ['Sessions allowed', `${weeksForType(c.subType)}`],
    ]);
  }

  if (wantTherapist) {
    printSection('THERAPIST', [
      ['ID', therapistId],
      ['Email', therapistEmail],
      ['Phone', therapistPhone],
      ['Password', PASSWORD],
      ['Level', level?.type ?? 'N/A'],
      ['Expertise', DEFAULT_EXPERTISE.join(', ')],
      ['Language', langArg],
    ]);
  }

  if (sessionIds.length) {
    const isGroup = firstCatSub.modalName?.includes('Group');
    const commonId = (await mgr.query(`SELECT commonId FROM session WHERE id = ?`, [sessionIds[0]]))[0]?.commonId;

    if (isGroup) {
      printSection(`SESSIONS (${sessionIds.length} group)`, [
        ['Common ID', commonId],
        ['Duration', '60 min'],
        ...sessionDates.map((d, i) => [
          `  Week ${i + 1}`,
          `${d}  ${sessionMembers[i]} member(s)  (${sessionIds[i].slice(0, 8)}...)`,
        ] as [string, any]),
      ]);
    } else {
      printSection(`SESSIONS (${sessionIds.length} individual)`, [
        ['Common ID', commonId],
        ['Duration', '60 min'],
        ...sessionIds.map((sid, i) => [
          `  #${i + 1}`,
          `${sessionDates[Math.floor(i / createdClients.length)] ?? ''}  (${sid.slice(0, 8)}...)`,
        ] as [string, any]),
      ]);
    }
  }

  console.log('─'.repeat(60));
  console.log(`\nDone. Find seeded records by: WHERE firstName LIKE '${SEED_PREFIX}%'\n`);

  await ds.destroy();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message ?? err);
  await ds.destroy().catch(() => {});
  process.exit(1);
});
