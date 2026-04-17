/**
 * Dedicated Meta App Review test user (see docs/META_APP_REVIEW_CREDENTIALS.md).
 * After login, this email is redirected to the English Instagram Business flow
 * without affecting other users.
 */
export const META_APP_REVIEW_TEST_EMAIL = 'meta-app-review@insyt.com.br';

export function isMetaAppReviewEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === META_APP_REVIEW_TEST_EMAIL;
}
