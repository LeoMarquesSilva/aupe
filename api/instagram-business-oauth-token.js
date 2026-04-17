const {
  handleInstagramBusinessOAuthToken,
} = require('../server/instagram-business-oauth-token-handler');

module.exports = async (req, res) => {
  await handleInstagramBusinessOAuthToken(req, res);
};
