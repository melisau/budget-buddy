// The billing migrations (0005/0006) are not applied in every environment.
export { isMissingSchemaError as isMissingBillingSchemaError } from "@/lib/supabase/schema-errors";
