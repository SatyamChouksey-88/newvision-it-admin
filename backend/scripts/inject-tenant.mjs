/**
 * One-shot: add Tenant + tenantId to every operational model.
 * Run from backend/: node scripts/inject-tenant.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = path.join(root, 'prisma', 'schema.prisma');

const SKIP = new Set(['Role', 'Permission', 'Tenant']);

const PER_TENANT_UNIQUE = {
  Location: ['code'],
  Department: ['name'],
  Employee: ['employeeCode', 'email'],
  AssetCategory: ['code'],
  Asset: ['assetCode', 'serialNumber'],
  TicketCategory: ['code'],
  SupportTicket: ['ticketNumber'],
  TicketPriorityTarget: ['priority'],
  Vendor: ['vendorCode'],
  PurchaseRequisition: ['requisitionNumber'],
  PurchaseOrder: ['poNumber'],
  GoodsReceipt: ['grnNumber'],
};

function uncapitalize(name) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function pluralize(name) {
  const base = uncapitalize(name);
  if (base.endsWith('y') && !/[aeiou]y$/i.test(base)) return `${base.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(base)) return `${base}es`;
  return `${base}s`;
}

let src = fs.readFileSync(schemaPath, 'utf8');
if (src.includes('model Tenant {')) {
  console.log('Tenant model already present — skip inject.');
  process.exit(0);
}

const TENANT_BLOCK = `
enum TenantPlan {
  starter
  team
}

enum TenantStatus {
  trial
  active
  expired
  cancelled
}

model Tenant {
  id               Int          @id @default(autoincrement())
  slug             String       @unique
  name             String
  logoUrl          String?      @map("logo_url")
  mailFromName     String?      @map("mail_from_name")
  mailFromAddress  String?      @map("mail_from_address")
  helpdeskMailbox  String?      @map("helpdesk_mailbox")
  plan             TenantPlan   @default(team)
  status           TenantStatus @default(trial)
  trialEndsAt      DateTime?    @map("trial_ends_at")
  modules          Json         @default("{\\"procurement\\":true,\\"chat\\":true,\\"maintenance\\":true}")
  seatCap          Int          @default(10) @map("seat_cap")
  onboarding       Json?
  activatedAt      DateTime?    @map("activated_at")
  activationA1At   DateTime?    @map("activation_a1_at")
  activationA2At   DateTime?    @map("activation_a2_at")
  profileOpenedAt  DateTime?    @map("profile_opened_at")
  closedAt         DateTime?    @map("closed_at")
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  // TENANT_RELATIONS

  @@map("tenants")
}

`;

src = src.replace(
  '// ---------------------------------------------------------------------------\n// Auth / RBAC\n// ---------------------------------------------------------------------------',
  `${TENANT_BLOCK}// ---------------------------------------------------------------------------\n// Auth / RBAC\n// ---------------------------------------------------------------------------`,
);

const modelRe = /^model (\w+) \{([\s\S]*?)\n\}/gm;
const models = [];
let m;
while ((m = modelRe.exec(src))) {
  models.push({ name: m[1], body: m[2], full: m[0] });
}

const relationLines = [];

for (const model of models) {
  if (SKIP.has(model.name)) continue;
  if (/\btenantId\b/.test(model.body)) continue;

  let body = model.body;

  const uniques = PER_TENANT_UNIQUE[model.name] ?? [];
  for (const field of uniques) {
    const fieldRe = new RegExp(`^(\\s+${field}\\s+[^\\n]*?)\\s+@unique\\b`, 'm');
    body = body.replace(fieldRe, '$1');
  }

  const tenantFields = `
  tenantId Int @map("tenant_id")
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
`;

  if (/^\s+id\s+/m.test(body)) {
    body = body.replace(/^(\s+id\s+[^\n]+\n)/m, `$1${tenantFields}`);
  } else {
    body = tenantFields + body;
  }

  const extraUniques = uniques.map((f) => `  @@unique([tenantId, ${f}])`).join('\n');
  const indexLine = `  @@index([tenantId])`;

  if (body.includes('@@map(')) {
    body = body.replace(
      /(\n)(\s+@@map\()/,
      `\n${extraUniques ? `${extraUniques}\n` : ''}${indexLine}$1$2`,
    );
  } else {
    body += `\n${extraUniques ? `${extraUniques}\n` : ''}${indexLine}\n`;
  }

  if (model.name === 'EmailIngestState') {
    body = body.replace('@id @default(1)', '@id @default(autoincrement())');
    if (!body.includes('@@unique([tenantId])')) {
      body = body.replace('@@index([tenantId])', '@@unique([tenantId])\n  @@index([tenantId])');
    }
  }

  src = src.replace(model.full, `model ${model.name} {${body}\n}`);
  relationLines.push(`  ${pluralize(model.name)} ${model.name}[]`);
}

src = src.replace('  // TENANT_RELATIONS\n', `${relationLines.join('\n')}\n`);

fs.writeFileSync(schemaPath, src);
console.log(`Injected tenantId into ${relationLines.length} models.`);
