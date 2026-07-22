import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getAppSchemaFromEnv } from '@/lib/config/env';

type Bucket = { count: number; resetAt: number };
type MagicLinkGlobal = typeof globalThis & {
  __sienaMagicLinkBuckets?: Map<string, Bucket>;
};

const bucketStore = globalThis as MagicLinkGlobal;
const buckets = bucketStore.__sienaMagicLinkBuckets ?? new Map<string, Bucket>();
bucketStore.__sienaMagicLinkBuckets = buckets;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function consumeBucket(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

export function allowSienaMagicLinkRequest(email: string, clientAddress: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const emailAllowed = consumeBucket(`email:${digest(normalized)}`, 1, 60_000);
  const clientAllowed = consumeBucket(`client:${digest(clientAddress || 'unknown')}`, 5, 10 * 60_000);
  return emailAllowed && clientAllowed;
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error('Siena magic-link server credentials are not configured.');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}

async function findAuthUserId(email: string) {
  const admin = adminClient();
  const target = normalizeEmail(email);
  const perPage = 1000;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = (data.users ?? []).find((user) => normalizeEmail(user.email ?? '') === target);
    if (found) return found.id;
    if ((data.users ?? []).length < perPage) return null;
  }
  return null;
}

async function hasSienaAccess(userId: string) {
  const db = adminClient().schema(getAppSchemaFromEnv());
  const [membership, profile] = await Promise.all([
    db.rpc('is_app_member', { p_user_id: userId }),
    db.from('profiles').select('id').eq('id', userId).eq('is_active', true).maybeSingle(),
  ]);
  if (membership.error) throw membership.error;
  if (profile.error) throw profile.error;
  return membership.data === true && Boolean(profile.data);
}

async function createDirectLink(email: string, redirectTo: string) {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  const tokenHash = String(data?.properties?.hashed_token ?? '').trim();
  if (error || !tokenHash) throw error ?? new Error('Supabase did not return a magic-link token.');
  const callback = new URL(redirectTo);
  callback.searchParams.set('token_hash', tokenHash);
  callback.searchParams.set('type', 'magiclink');
  return callback.toString();
}

async function sendEmail(email: string, link: string) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAGIC_LINK_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error('Siena magic-link email credentials are not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `siena-magic-${randomUUID()}`,
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Your Siena Maps sign-in link',
      text: `Use this one-time link to sign in to Siena Maps:\n\n${link}\n\nIf you did not request this link, you can ignore this email.`,
      html: `<h2>Sign in to Siena Maps</h2><p>Use the one-time link below to open the Siena Maps publishing workspace.</p><p><a href="${link}">Open Siena Maps</a></p><p>If you did not request this link, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Siena magic-link email delivery failed (${response.status}).`);
}

export async function sendAuthorizedSienaMagicLink(email: string, redirectTo: string) {
  const normalized = normalizeEmail(email);
  const userId = await findAuthUserId(normalized);
  if (!userId || !(await hasSienaAccess(userId))) return;
  const link = await createDirectLink(normalized, redirectTo);
  await sendEmail(normalized, link);
}
