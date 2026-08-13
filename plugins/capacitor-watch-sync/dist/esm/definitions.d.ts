export interface WatchSyncAvailability {
    available: boolean;
    platform: 'ios' | 'android' | 'web';
    watchInstalled?: boolean;
    reason?: string;
}

export interface WatchSyncResult {
    queued: boolean;
    watchInstalled?: boolean;
}

export interface WatchSyncPlugin {
    isAvailable(): Promise<WatchSyncAvailability>;
    sync(options: { snapshot: string }): Promise<WatchSyncResult>;
}
