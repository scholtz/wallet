/**
 * Window sizing for the Biatec Direct popup. Older dApp adapters open the popup at 480x720;
 * the wallet enlarges such a window itself (browsers allow `resizeTo` for windows a script
 * opened) so the review screen is comfortable. Pure functions, no DOM access.
 */
export interface ScreenArea {
  width: number;
  height: number;
  left: number;
  top: number;
}

export interface WindowSize {
  width: number;
  height: number;
}

export const DIRECT_PREFERRED_WIDTH = 1100;
export const DIRECT_PREFERRED_HEIGHT = 860;
/** A popup narrower than this is treated as "small" and enlarged. */
export const DIRECT_SMALL_WIDTH = 800;
const MIN_WIDTH = 640;
const MIN_HEIGHT = 560;

const finite = (value: number): boolean => Number.isFinite(value) && value > 0;

/**
 * Target geometry for a small popup, or `undefined` when it is already large enough (or the
 * screen is unknown). The result is centred in the available screen area and always inside it.
 */
export function enlargedPopupGeometry(
  screen: ScreenArea,
  current: WindowSize,
): (WindowSize & { left: number; top: number }) | undefined {
  if (!finite(screen.width) || !finite(screen.height)) return undefined;
  if (!finite(current.width) || current.width >= DIRECT_SMALL_WIDTH) return undefined;
  const width = Math.min(
    screen.width,
    Math.max(MIN_WIDTH, Math.min(DIRECT_PREFERRED_WIDTH, Math.round(screen.width * 0.9))),
  );
  const height = Math.min(
    screen.height,
    Math.max(MIN_HEIGHT, Math.min(DIRECT_PREFERRED_HEIGHT, Math.round(screen.height * 0.9))),
  );
  const left = Math.round(screen.left + (screen.width - width) / 2);
  const top = Math.round(screen.top + (screen.height - height) / 2);
  return { width, height, left, top };
}
