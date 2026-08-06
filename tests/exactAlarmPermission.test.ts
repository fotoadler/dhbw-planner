import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: 'android' as 'android' | 'ios' | 'web',
  checkExactNotificationSetting: vi.fn(),
  changeExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: 'granted' }),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkExactNotificationSetting: mocks.checkExactNotificationSetting,
    changeExactNotificationSetting: mocks.changeExactNotificationSetting,
  },
}));

import { ensureExactAlarmPermission } from '../src/notifications/scheduler';

describe('ensureExactAlarmPermission', () => {
  beforeEach(() => {
    mocks.platform = 'android';
    mocks.checkExactNotificationSetting.mockReset();
    mocks.changeExactNotificationSetting.mockClear();
  });

  it('opens Android settings when exact alarms are denied', async () => {
    mocks.checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'denied' });

    await ensureExactAlarmPermission();

    expect(mocks.changeExactNotificationSetting).toHaveBeenCalledOnce();
  });

  it('does not reopen settings when exact alarms are already granted', async () => {
    mocks.checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'granted' });

    await ensureExactAlarmPermission();

    expect(mocks.changeExactNotificationSetting).not.toHaveBeenCalled();
  });
});
