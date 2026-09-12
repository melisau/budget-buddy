import { getSupabaseServerClient } from "@/lib/supabase/server";

const bucket = "budgetbuddy-receipts";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 5 * 1024 * 1024;
let bucketPromise: Promise<void> | undefined;

function extension(contentType: string) {
  return contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
}

export function validateReceipt(file: File) {
  if (!allowedTypes.has(file.type)) throw new Error("Only JPG, PNG, or WEBP receipt images are supported.");
  if (file.size > maxBytes) throw new Error("Receipt images must be 5 MB or smaller.");
}

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

export async function uploadReceipt(transactionId: string, file: File) {
  validateReceipt(file);
  await ensureBucket();
  const path = `transactions/${transactionId}/${crypto.randomUUID()}.${extension(file.type)}`;
  const { error } = await getSupabaseServerClient().storage.from(bucket).upload(path, await file.arrayBuffer(), { contentType: file.type, upsert: false });
  if (error) throw new Error(`Unable to upload the receipt: ${error.message}`);
  return { path, contentType: file.type };
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
