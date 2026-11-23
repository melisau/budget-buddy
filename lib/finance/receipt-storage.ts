import { getSupabaseServerClient } from "@/lib/supabase/server";

const bucket = "budgetbuddy-receipts";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;
let bucketPromise: Promise<void> | undefined;

async function ensureBucket() {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const storage = getSupabaseServerClient().storage;
      const { data, error } = await storage.getBucket(bucket);
      if (data) return;
      const { error: createError } = await storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: maxBytes,
        allowedMimeTypes: [...allowedTypes],
      });
      if (createError && !/already exists/i.test(createError.message)) throw new Error(`Unable to create the receipt storage bucket: ${createError.message}`);
      if (error && !/not found/i.test(error.message)) throw new Error(`Unable to access the receipt storage bucket: ${error.message}`);
    })();
  }
  return bucketPromise;
}

export async function deleteStoredReceipt(path: string | null | undefined) {
  if (!path) return;
  await ensureBucket();
  const { error } = await getSupabaseServerClient().storage.from(bucket).remove([path]);
  if (error) throw new Error(`Unable to remove the receipt: ${error.message}`);
}

export async function createReceiptUrl(path: string) {
  await ensureBucket();
  const { data, error } = await getSupabaseServerClient().storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error(`Unable to create a receipt link: ${error?.message ?? "Unknown storage error"}`);
  return data.signedUrl;
}

/** Removes many receipt files. Storage accepts up to 1000 paths per call. */
export async function deleteStoredReceipts(paths: ReadonlyArray<string>) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return;
  await ensureBucket();
  const storage = getSupabaseServerClient().storage.from(bucket);
  for (let start = 0; start < unique.length; start += 1000) {
    const { error } = await storage.remove(unique.slice(start, start + 1000));
    if (error) throw new Error(`Unable to remove receipts: ${error.message}`);
  }
}
