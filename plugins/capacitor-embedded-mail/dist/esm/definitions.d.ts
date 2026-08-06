export interface EmbeddedMailOpenOptions {
  url: string;
  /** Height reserved for the app's bottom tabbar, in CSS points. */
  bottomInset?: number;
}

export interface EmbeddedMailPlugin {
  open(options: EmbeddedMailOpenOptions): Promise<void>;
  close(): Promise<void>;
}
