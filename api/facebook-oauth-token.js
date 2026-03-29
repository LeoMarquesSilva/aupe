const { handleFacebookOAuthToken } = require('../server/facebook-oauth-token-handler');

module.exports = async (req, res) => {
  await handleFacebookOAuthToken(req, res);
};
