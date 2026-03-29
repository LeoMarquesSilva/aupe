jest.mock('axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

import { getInstagramAppId, getInstagramRedirectUri, getAuthorizationUrl } from '../instagramAuthService';

describe('instagramAuthService (Facebook Login / Graph)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('getInstagramAppId exige variável de ambiente', () => {
    delete process.env.REACT_APP_FACEBOOK_APP_ID;
    delete process.env.REACT_APP_INSTAGRAM_APP_ID;
    expect(() => getInstagramAppId()).toThrow(/REACT_APP_FACEBOOK_APP_ID/);
  });

  it('getInstagramAppId usa REACT_APP_INSTAGRAM_APP_ID', () => {
    process.env.REACT_APP_INSTAGRAM_APP_ID = '999888777';
    delete process.env.REACT_APP_FACEBOOK_APP_ID;
    expect(getInstagramAppId()).toBe('999888777');
  });

  it('getInstagramAppId prefere REACT_APP_FACEBOOK_APP_ID', () => {
    process.env.REACT_APP_FACEBOOK_APP_ID = '111';
    process.env.REACT_APP_INSTAGRAM_APP_ID = '222';
    expect(getInstagramAppId()).toBe('111');
  });

  it('getAuthorizationUrl uses Facebook dialog oauth and Graph scopes', () => {
    process.env.REACT_APP_INSTAGRAM_APP_ID = '123';
    process.env.REACT_APP_INSTAGRAM_REDIRECT_URI = 'https://app.test/callback';
    const url = getAuthorizationUrl('client-uuid');
    expect(url).toContain('https://www.facebook.com/v21.0/dialog/oauth');
    expect(url).toContain('client_id=123');
    expect(url).toContain('instagram_basic');
    expect(url).toContain('state=client-uuid');
  });

  it('getInstagramRedirectUri ignora env de outro host (evita popup sem sessão Supabase)', () => {
    const prev = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...prev, origin: 'https://app.deployed.test' },
    });
    process.env.REACT_APP_INSTAGRAM_REDIRECT_URI = 'https://fixed/callback';
    delete process.env.REACT_APP_FACEBOOK_REDIRECT_URI;
    expect(getInstagramRedirectUri()).toBe('https://app.deployed.test/callback');
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: prev });
  });

  it('getInstagramRedirectUri usa env quando o host coincide com a página', () => {
    const prev = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { ...prev, origin: 'https://app.test' },
    });
    process.env.REACT_APP_INSTAGRAM_REDIRECT_URI = 'https://app.test/callback';
    delete process.env.REACT_APP_FACEBOOK_REDIRECT_URI;
    expect(getInstagramRedirectUri()).toBe('https://app.test/callback');
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: prev });
  });
});
