import { useCallback, useRef, useState } from "react";

export function useVerticalResize(
  defaultHeight: number,
  { minHeight = 160, maxHeightRatio = 0.85 }: { minHeight?: number; maxHeightRatio?: number } = {},
) {
  const [height, setHeight] = useState(defaultHeight);
  const heightRef = useRef(height);
  heightRef.current = height;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      const startY = e.clientY;
      const startHeight = heightRef.current;
      const maxHeight = window.innerHeight * maxHeightRatio;
      const target = e.currentTarget;

      target.setPointerCapture(e.pointerId);
      document.body.style.cursor = "row-resize";

      const onMove = (ev: PointerEvent) => {
        const next = Math.min(maxHeight, Math.max(minHeight, startHeight + (ev.clientY - startY)));
        setHeight(next);
      };

      const onEnd = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onEnd);
        target.removeEventListener("pointercancel", onEnd);
        document.body.style.cursor = "";
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onEnd);
      target.addEventListener("pointercancel", onEnd);
    },
    [minHeight, maxHeightRatio],
  );

  return { height, onPointerDown };
}
