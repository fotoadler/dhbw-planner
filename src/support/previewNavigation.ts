// Let Android Back dismiss a feature preview before its settings/purchase parent.
const previews: Array<() => void> = [];
export function registerSupportPreview(close: () => void) {
  previews.push(close);
  return () => { const index = previews.lastIndexOf(close); if (index >= 0) previews.splice(index, 1); };
}
export function closeSupportPreview(): boolean {
  const close = previews[previews.length - 1];
  if (!close) return false;
  close(); return true;
}
