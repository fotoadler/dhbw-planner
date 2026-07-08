export interface CourseLiveActivityPayload {
  id: string;
  title: string;
  room?: string;
  lecturer?: string;
  startTime: number;
  endTime: number;
  nextTitle?: string;
  nextStartTime?: number;
}

export interface CourseLiveActivityAvailability {
  available: boolean;
  platform: string;
  reason?: string;
}

export interface CourseLiveActivityPlugin {
  isAvailable(): Promise<CourseLiveActivityAvailability>;
  start(options: CourseLiveActivityPayload): Promise<void>;
  update(options: CourseLiveActivityPayload): Promise<void>;
  end(options: { id: string }): Promise<void>;
  endAll(): Promise<void>;
}
