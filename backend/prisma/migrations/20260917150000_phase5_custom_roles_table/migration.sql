-- Phase 5: tenant-scoped custom roles (separate from enum-backed system roles).
CREATE TABLE "custom_roles" (
    "id" SERIAL NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "role_key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_CustomRolePermissions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CustomRolePermissions_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE UNIQUE INDEX "custom_roles_tenant_id_role_key_key" ON "custom_roles"("tenant_id", "role_key");
CREATE INDEX "custom_roles_tenant_id_idx" ON "custom_roles"("tenant_id");
CREATE INDEX "_CustomRolePermissions_B_index" ON "_CustomRolePermissions"("B");

ALTER TABLE "custom_roles" ADD CONSTRAINT "custom_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD COLUMN "custom_role_id" INTEGER;
ALTER TABLE "users" ADD CONSTRAINT "users_custom_role_id_fkey" FOREIGN KEY ("custom_role_id") REFERENCES "custom_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "_CustomRolePermissions" ADD CONSTRAINT "_CustomRolePermissions_A_fkey" FOREIGN KEY ("A") REFERENCES "custom_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_CustomRolePermissions" ADD CONSTRAINT "_CustomRolePermissions_B_fkey" FOREIGN KEY ("B") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
