/**
 * Generates route-permissions.generated.ts from @Roles usage on controllers.
 * Run: node scripts/gen-route-permissions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'src');

function walkControllers(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkControllers(p, out);
    else if (ent.name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

const CONTROLLER_DOMAIN = {
  AccessoriesController: 'asset',
  AssetsController: 'asset',
  IssueKitsController: 'asset',
  EmployeesController: 'employee',
  ChecklistsController: 'employee',
  TicketsController: 'ticket',
  EmailInboxController: 'ticket',
  LocationsController: 'location',
  DepartmentsController: 'department',
  CategoriesController: 'category',
  MaintenanceController: 'maintenance',
  ConsumablesController: 'asset',
  AssetRequestsController: 'asset',
  Procurement: 'procurement',
  VendorsController: 'procurement',
  RequisitionsController: 'procurement',
  PurchaseOrdersController: 'procurement',
  ContractsController: 'procurement',
  ReportsController: 'report',
  AuditController: 'audit',
  AuditCyclesController: 'audit',
  ReconciliationController: 'audit',
  ImportExportController: 'asset',
  ImportJobsController: 'asset',
  UsersController: 'user',
  CustomRolesController: 'user',
  TenantController: 'user',
  AuthController: 'user',
  WebhooksController: 'user',
  DashboardController: 'report',
  SearchController: 'asset',
  ChatController: 'ticket',
  NotificationsController: 'ticket',
  NotesController: 'asset',
  RecordsController: 'audit',
  ClientsController: 'asset',
  SavedViewsController: 'asset',
  FeedbackController: 'asset',
};

function domainForClass(cls) {
  if (CONTROLLER_DOMAIN[cls]) return CONTROLLER_DOMAIN[cls];
  for (const [k, v] of Object.entries(CONTROLLER_DOMAIN)) {
    if (cls.includes(k.replace('Controller', ''))) return v;
  }
  return 'asset';
}

function actionForMethod(method, domain) {
  const m = method.toLowerCase();
  if (m.includes('delete') || m === 'remove') {
    if (domain === 'user') return 'user:manage';
    if (domain === 'ticket') return 'ticket:manage';
    if (domain === 'employee') return 'employee:manage';
    if (domain === 'procurement') return 'procurement:manage';
    return `${domain}:delete`;
  }
  if (m.includes('create') || m === 'add' || m === 'provision' || m === 'invite') {
    if (domain === 'ticket') return 'ticket:manage';
    if (domain === 'procurement') return 'procurement:manage';
    if (domain === 'user') return 'user:manage';
    if (domain === 'report') return 'report:run';
    return `${domain}:create`;
  }
  if (m.includes('update') || m.includes('patch') || m.includes('put') || m.includes('assign') || m.includes('transfer') || m.includes('retire') || m.includes('approve') || m.includes('reject') || m.includes('fulfill') || m.includes('offboard') || m.includes('reinstate') || m.includes('reset') || m.includes('enable') || m.includes('disable') || m.includes('commit') || m.includes('upload') || m.includes('stamp') || m.includes('audit')) {
    if (domain === 'ticket') return 'ticket:manage';
    if (domain === 'procurement') return 'procurement:manage';
    if (domain === 'user') return 'user:manage';
    if (domain === 'employee') return 'employee:manage';
    if (domain === 'maintenance') return 'maintenance:manage';
    if (domain === 'location' || domain === 'department' || domain === 'category') return `${domain}:manage`;
    if (m.includes('audit')) return 'audit:read';
    return `${domain}:update`;
  }
  if (m.includes('import')) return domain === 'employee' ? 'employee:manage' : 'asset:import';
  if (m.includes('export') || m.includes('download') || m.includes('labels') || m.includes('report') || m.includes('csv') || m.includes('pdf')) {
    if (domain === 'report') return 'report:run';
    if (domain === 'audit') return 'audit:read';
    return `${domain}:export`;
  }
  if (m.includes('list') || m === 'get' || m.includes('find') || m.includes('search') || m.includes('counts') || m.includes('summary') || m.includes('stats') || m.includes('growth') || m.includes('queue') || m.includes('me')) {
    if (domain === 'ticket') return 'ticket:manage';
    if (domain === 'report') return 'report:run';
    if (domain === 'user') return 'user:manage';
    if (domain === 'audit') return 'audit:read';
    if (domain === 'employee') return 'employee:read';
    if (domain === 'maintenance') return 'maintenance:read';
    return `${domain}:read`;
  }
  if (domain === 'ticket') return 'ticket:manage';
  if (domain === 'procurement') return 'procurement:manage';
  if (domain === 'user') return 'user:manage';
  return `${domain}:read`;
}

function resolveRolesExpr(expr, fileText) {
  let e = expr.trim();
  if (!fileText) return e;
  while (e.startsWith('...')) {
    const constName = e.slice(3).trim();
    const m = fileText.match(
      new RegExp(`const ${constName}\\s*=\\s*\\[([\\s\\S]*?)\\](?:\\s*as const)?`),
    );
    if (!m) break;
    e = m[1].trim();
  }
  return e;
}

function rolesFromDecorator(expr, fileText) {
  const resolved = resolveRolesExpr(expr, fileText);
  return resolved
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace('RoleName.', ''));
}

function permissionsForRoute(cls, method, rolesExpr, fileText) {
  const roles = rolesFromDecorator(rolesExpr, fileText);
  const domain = domainForClass(cls);
  if (domain === 'audit' || domain === 'category') {
    return [domain === 'category' ? 'category:manage' : 'audit:read'];
  }
  if (domain === 'location' || domain === 'department') {
    return [`${domain}:manage`];
  }
  if (roles.length === 1 && roles[0] === 'SUPER_ADMIN') {
    return ['user:manage'];
  }
  if (roles.includes('MANAGER') && !roles.includes('IT_ADMIN') && !roles.includes('SUPER_ADMIN')) {
    if (method.toLowerCase().includes('approve')) return ['request:approve'];
    return ['report:run'];
  }
  if (roles.includes('EMPLOYEE') && roles.length <= 2 && !roles.includes('IT_ADMIN')) {
    return ['asset:read'];
  }
  const primary = actionForMethod(method, domain);
  const perms = [primary];
  if (roles.includes('IT_SUPPORT') && primary === 'asset:update') perms.push('maintenance:manage');
  return [...new Set(perms)];
}

const routes = {};
for (const file of walkControllers(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const cls =
    (text.match(/@Controller\([\s\S]*?export class (\w+)/) || [])[1] ||
    (text.match(/export class (\w+Controller)/) || [])[1];
  if (!cls) continue;
  const classRolesMatch = text.match(/@Roles\(([^)]*)\)\s*\nexport class/);
  const classRoles = classRolesMatch ? classRolesMatch[1] : null;
  const lines = text.split('\n');
  let pendingRoles = classRoles ? classRoles.trim() : null;
  for (let i = 0; i < lines.length; i++) {
    const rm = lines[i].match(/@Roles\(([^)]*)\)/);
    if (rm) {
      pendingRoles = rm[1].trim();
      continue;
    }
    const hm = lines[i].match(/^\s+(async\s+)?(\w+)\s*\(/);
    if (!hm) continue;
    const method = hm[2];
    if (['constructor', 'if', 'for', 'while', 'switch', 'present'].includes(method)) continue;
    if (pendingRoles) {
      const key = `${cls}.${method}`;
      routes[key] = permissionsForRoute(cls, method, pendingRoles, text);
      if (!lines[i - 1]?.includes('@Roles')) pendingRoles = classRoles ? classRoles.trim() : null;
      else pendingRoles = classRoles ? classRoles.trim() : null;
    }
  }
}

const outPath = path.join(SRC, 'common/rbac/route-permissions.generated.ts');
const body = `/** Auto-generated by scripts/gen-route-permissions.mjs — do not edit by hand. */
import type { PermissionKey } from './permissions';

export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = ${JSON.stringify(routes, null, 2)} as unknown as Record<string, PermissionKey[]>;
`;
fs.writeFileSync(outPath, body);
console.log(`Wrote ${Object.keys(routes).length} routes to ${outPath}`);
