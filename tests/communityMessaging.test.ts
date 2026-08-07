import { describe, expect, it } from 'vitest';
import { CommunityMessaging } from '@dhbw/capacitor-community-messaging';

describe('community messaging web fallback', () => {
  it('reports native messaging as unsupported without creating a token', async () => {
    await expect(CommunityMessaging.checkPermission()).resolves.toEqual({ receive: 'unsupported' });
    await expect(CommunityMessaging.getToken()).resolves.toEqual({ token: null });
    await expect(CommunityMessaging.getInitialNotification()).resolves.toEqual({ notification: null });
  });
});
