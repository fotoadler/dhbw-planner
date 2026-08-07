import type { PluginListenerHandle } from '@capacitor/core';

export type CommunityMessagingPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface CommunityNotification {
  id?: string;
  title?: string;
  body?: string;
  data: Record<string, string>;
}

export interface CommunityMessagingPlugin {
  checkPermission(): Promise<{ receive: CommunityMessagingPermissionState }>;
  requestPermission(): Promise<{ receive: CommunityMessagingPermissionState }>;
  register(): Promise<void>;
  getToken(): Promise<{ token: string | null }>;
  deleteToken(): Promise<void>;
  getInitialNotification(): Promise<{ notification: CommunityNotification | null }>;
  addListener(
    eventName: 'tokenReceived',
    listenerFunc: (event: { token: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'notificationReceived',
    listenerFunc: (notification: CommunityNotification) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'notificationActionPerformed',
    listenerFunc: (event: { notification: CommunityNotification; actionId: string }) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
