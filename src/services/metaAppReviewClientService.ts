import { Client } from '../types';
import { supabase } from './supabaseClient';
import { isMetaAppReviewEmail } from '../config/metaAppReview';
import { logClientError } from '../utils/clientLogger';

/**
 * Stable display name used for the dedicated App Review client row. The lookup
 * in `ensureMetaAppReviewClient` is idempotent on `(user_id, name)` inside the
 * reviewer's organization, so we always reuse the same row across sessions.
 */
export const META_APP_REVIEW_CLIENT_NAME = 'Meta App Review Client';

/**
 * Placeholder value for the `instagram` NOT NULL column. The real Instagram
 * handle + credentials are filled in later by
 * `persistInstagramBusinessAuthToClient` once the OAuth callback runs.
 */
const META_APP_REVIEW_PLACEHOLDER_INSTAGRAM = 'meta_app_review';

function mapClientRow(row: Record<string, any>): Client {
  return {
    id: row.id,
    name: row.name,
    instagram: row.instagram,
    logoUrl: row.logo_url,
    accessToken: row.access_token,
    userId: row.user_id,
    appId: row.app_id,
    instagramAccountId: row.instagram_account_id,
    username: row.instagram_username,
    profilePicture: row.profile_picture,
    tokenExpiry: row.token_expiry ? new Date(row.token_expiry) : undefined,
    pageId: row.page_id,
    pageName: row.page_name,
    isActive: row.is_active !== false,
  };
}

/**
 * Idempotently make sure there is a `clients` row owned by the currently
 * signed-in Meta App Review user. If the row already exists, return it as-is;
 * otherwise insert a minimal row (only the NOT NULL columns) using the
 * reviewer's organization. The Instagram credentials are filled in later by
 * the OAuth callback via `persistInstagramBusinessAuthToClient`.
 *
 * Safe to call on every `/connect/instagram-business` visit.
 *
 * @throws when the caller is not the reviewer, is not signed in, or has no
 *         organization (should never happen after running the seed migration).
 */
export async function ensureMetaAppReviewClient(): Promise<Client> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    logClientError('ensureMetaAppReviewClient: getSession failed', sessionError);
    throw new Error('Could not read the current session.');
  }
  const user = sessionData?.session?.user;
  if (!user) {
    throw new Error('No authenticated session — reviewer must be signed in.');
  }
  if (!isMetaAppReviewEmail(user.email)) {
    throw new Error(
      'ensureMetaAppReviewClient can only be called for the Meta App Review reviewer account.',
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    logClientError('ensureMetaAppReviewClient: profile lookup failed', profileError);
    throw new Error('Reviewer profile not found. Run the seed migration.');
  }
  if (!profile.organization_id) {
    throw new Error('Reviewer profile is missing organization_id.');
  }

  const { data: existing, error: existingError } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', profile.organization_id)
    .eq('name', META_APP_REVIEW_CLIENT_NAME)
    .maybeSingle();

  if (existingError) {
    logClientError('ensureMetaAppReviewClient: existing lookup failed', existingError);
    throw new Error(`Supabase error: ${existingError.message}`);
  }

  if (existing) {
    return mapClientRow(existing);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('clients')
    .insert([
      {
        name: META_APP_REVIEW_CLIENT_NAME,
        instagram: META_APP_REVIEW_PLACEHOLDER_INSTAGRAM,
        organization_id: profile.organization_id,
        user_id: user.id,
        is_active: true,
      },
    ])
    .select('*')
    .single();

  if (insertError || !inserted) {
    logClientError('ensureMetaAppReviewClient: insert failed', insertError);
    throw new Error(
      `Could not create the Meta App Review client row: ${
        insertError?.message || 'unknown error'
      }`,
    );
  }

  return mapClientRow(inserted);
}
