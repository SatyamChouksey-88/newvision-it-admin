import { PrismaClient, TicketStatus } from '@prisma/client';

/** Highest-volume L1 playbook. NewVision records the reset; IT still does M365/VPN in the IdP. */
export const ACCOUNT_LOCKOUT_TEMPLATE = {
  title: 'Account lockout / password / MFA',
  subject: 'Account lockout / password / MFA',
  description: `Identity verification — do not reset until this is complete.

- Employee: {{employee}}
- Manager / photo ID shown:
- Which system: [ ] NewVision  [ ] M365 / Entra  [ ] VPN  [ ] Biometric  [ ] Other:
- Last successful login (if known):
- Verified by / at:

Do not reset credentials until identity is verified.
NewVision login can be reset from this ticket. M365 / VPN / biometric are reset in Entra/AD — record that it happened here.`,
};

export const RESET_COMPLETED_MACRO = {
  title: 'Reset completed — verify & close',
  body: 'Your password / MFA has been reset. Please sign in and reply here if you still cannot access the system.',
  statusOnSend: 'resolved' as const satisfies TicketStatus,
};

type PlaybookDb = Pick<PrismaClient, 'ticketCategory' | 'ticketTemplate' | 'cannedResponse' | 'user'>;

/**
 * Idempotent: upgrades the old "Password reset" template, and inserts the resolve macro
 * if missing. Safe to call on every boot / first ticket-templates fetch.
 */
export async function ensureAccountPlaybook(prisma: PlaybookDb): Promise<void> {
  const category = await prisma.ticketCategory.findFirst({ where: { code: 'access_account' } });
  if (!category) return;
  const actor = await prisma.user.findFirst({
    where: { isActive: true, role: { name: { in: ['SUPER_ADMIN', 'IT_ADMIN'] } } },
    orderBy: { id: 'asc' },
  });
  if (!actor) return;

  const existingTpl = await prisma.ticketTemplate.findFirst({
    where: { OR: [{ title: ACCOUNT_LOCKOUT_TEMPLATE.title }, { title: 'Password reset' }] },
    orderBy: { id: 'asc' },
  });
  if (existingTpl) {
    await prisma.ticketTemplate.update({
      where: { id: existingTpl.id },
      data: {
        title: ACCOUNT_LOCKOUT_TEMPLATE.title,
        subject: ACCOUNT_LOCKOUT_TEMPLATE.subject,
        description: ACCOUNT_LOCKOUT_TEMPLATE.description,
        categoryId: category.id,
      },
    });
  } else {
    await prisma.ticketTemplate.create({
      data: {
        title: ACCOUNT_LOCKOUT_TEMPLATE.title,
        subject: ACCOUNT_LOCKOUT_TEMPLATE.subject,
        description: ACCOUNT_LOCKOUT_TEMPLATE.description,
        categoryId: category.id,
        createdById: actor.id,
        ...('tenantId' in category ? { tenantId: (category as { tenantId: number }).tenantId } : {}),
      },
    });
  }

  const existingMacro = await prisma.cannedResponse.findFirst({
    where: { title: RESET_COMPLETED_MACRO.title },
  });
  if (!existingMacro) {
    await prisma.cannedResponse.create({
      data: {
        title: RESET_COMPLETED_MACRO.title,
        body: RESET_COMPLETED_MACRO.body,
        statusOnSend: RESET_COMPLETED_MACRO.statusOnSend,
        createdById: actor.id,
        ...('tenantId' in actor ? { tenantId: (actor as { tenantId: number }).tenantId } : {}),
      },
    });
  }
}
