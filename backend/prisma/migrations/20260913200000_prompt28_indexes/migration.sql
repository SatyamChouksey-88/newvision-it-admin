-- Warranty / audit dashboard and daily alert jobs filter these columns.
CREATE INDEX "assets_warranty_end_idx" ON "assets"("warranty_end");
CREATE INDEX "assets_next_audit_due_at_idx" ON "assets"("next_audit_due_at");

-- Digest and warranty de-dupe look up notifications by type.
CREATE INDEX "notifications_type_idx" ON "notifications"("type");
