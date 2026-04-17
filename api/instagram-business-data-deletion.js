/**
 * Data Deletion Request callback required by Meta.
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-use-checkup#data-deletion-callback
 *
 * Returns a status URL + confirmation code that the user can use to verify
 * the deletion request. Stub is acceptable while the App Review demo stores
 * tokens only in sessionStorage.
 */
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res
      .status(200)
      .json({ status: 'ok', handler: 'instagram-business-data-deletion' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const confirmationCode = `DELETE-${Date.now()}`;
  return res.status(200).json({
    url: `${getOrigin(req)}/data-deletion-status?code=${confirmationCode}`,
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
