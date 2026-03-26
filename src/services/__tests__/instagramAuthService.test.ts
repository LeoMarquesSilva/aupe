jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import { getInstagramAppId, getInstagramRedirectUri, getAuthorizationUrl } from '../instagramAuthService';

describe('instagramAuthService (Business Login)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('getInstagramAppId falls back to default when env unset', () => {
    delete process.env.REACT_APP_INSTAGRAM_APP_ID;
    expect(getInstagramAppId()).toBe('1087259016929287');
  });

  it('getAuthorizationUrl uses www.instagram.com and business scopes', () => {
    process.env.REACT_APP_INSTAGRAM_APP_ID = '123';
    process.env.REACT_APP_INSTAGRAM_REDIRECT_URI = 'https://app.test/callback';
    const url = getAuthorizationUrl('client-uuid');
    expect(url).toContain('https://www.instagram.com/oauth/authorize');
    expect(url).toContain('client_id=123');
    expect(url).toContain('instagram_business_basic');
    expect(url).toContain('state=client-uuid');
  });

  it('getInstagramRedirectUri reads env', () => {
    process.env.REACT_APP_INSTAGRAM_REDIRECT_URI = 'https://fixed/callback';
    expect(getInstagramRedirectUri()).toBe('https://fixed/callback');
  });
});
