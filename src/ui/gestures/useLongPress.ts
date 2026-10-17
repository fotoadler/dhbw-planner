import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react';
import { selectionHaptic } from '../../lib/haptics';

/** Arm after holding, invoke only on release so a modal never appears under a held finger. */
export function useLongPress(action?: () => void) {
  const actionRef = useRef(action);
  actionRef.current = action;
  const timer = useRef<number | null>(null);
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const ready = useRef(false);
  const suppressClick = useRef(false);
  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    ready.current = false;
  };
  useEffect(() => cancel, []);

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!actionRef.current || event.isPrimary === false || event.button !== 0) return;
      cancel();
      suppressClick.current = false;
      origin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      timer.current = window.setTimeout(() => {
        timer.current = null;
        ready.current = true;
        suppressClick.current = true;
        selectionHaptic();
      }, 450);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) >= 8) cancel();
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (!origin.current || event.pointerId !== origin.current.id) return;
      const invoke = ready.current;
      cancel();
      if (!invoke) return;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
      actionRef.current?.();
    },
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onContextMenu(event: MouseEvent<HTMLElement>) {
      if (!actionRef.current) return;
      event.preventDefault();
      window.getSelection()?.removeAllRanges();
    },
    consumeClick() {
      if (!suppressClick.current) return false;
      suppressClick.current = false;
      return true;
    },
  };
}
