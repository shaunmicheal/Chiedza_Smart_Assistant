-- Allow different schools to use the same alert rule name.
-- School-level uniqueness is preserved by AlertRule_schoolId_name_key.

DROP INDEX "AlertRule_name_key";
