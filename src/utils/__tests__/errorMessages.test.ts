import { getUserFriendlyMessage } from '../errorMessages';

describe('getUserFriendlyMessage', () => {
  it('maps Instagram oversize image errors (2207004) to actionable text', () => {
    const message = getUserFriendlyMessage(
      new Error('OAuthException 2207004: The image is too large to download. It should be less than 8 MiB.')
    );

    expect(message).toContain('8 MB');
    expect(message).toContain('Compacte ou substitua');
  });
});

