/**
 * Deauthorize callback required by Meta.
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-use-checkup#deauth-callback
 *
 * Meta sends a signed_request POST whenever a user removes the app. For the
 * App Review demo we acknowledge with 200 — data persistence is intentionally
 * scoped to sessionStorage in the front-end until the submission is approved.
 * Once we start persisting tokens in Supabase, extend this handler to parse
 * the `signed_request` and delete server-side data.
 */
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', handler: 'instagram-business-deauthorize' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const confirmationCode = `DEAUTH-${Date.now()}`;
  return res.status(200).json({
    url: `${getOrigin(req)}/deauthorize-status?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
};

function getOrigin(req) {
  const proto =
    (req.headers['x-forwarded-proto'] && String(req.headers['x-forwarded-proto']).split(',')[0]) ||
    'https';
  const host =
    (req.headers['x-forwarded-host'] && String(req.headers['x-forwarded-host']).split(',')[0]) ||
    req.headers.host ||
    'localhost';
  return `${proto}://${host}`;
}
