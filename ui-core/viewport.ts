namespace ui {
  /**
   * Logical viewport scaling policy for physical draw adapters.
   */
  export type ViewportScaleMode = "cover" | "fit"

  /**
   * Fixed logical viewport width used by ui-core layout and rendering.
   */
  export const LOGICAL_VIEWPORT_WIDTH = 320

  /**
   * Fixed logical viewport height used by ui-core layout and rendering.
   */
  export const LOGICAL_VIEWPORT_HEIGHT = 240

  /**
   * Fixed logical viewport aspect ratio used by the Phase 1 frame adapter.
   */
  export const LOGICAL_VIEWPORT_ASPECT_RATIO = LOGICAL_VIEWPORT_WIDTH / LOGICAL_VIEWPORT_HEIGHT

  /**
   * Returns the fixed logical viewport size.
   */
  export function logicalViewportSize(): Size {
    return new Size(LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT)
  }

  /**
   * Returns the fixed logical viewport rectangle.
   */
  export function logicalViewportRect(): Rect {
    return new Rect(0, 0, LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT)
  }

  /**
   * Computes the scale from logical viewport pixels to physical pixels.
   */
  export function physicalViewportScale(
    physicalWidth: number,
    physicalHeight: number,
    scaleMode: ViewportScaleMode
  ): number {
    const scaleX = physicalWidth / LOGICAL_VIEWPORT_WIDTH
    const scaleY = physicalHeight / LOGICAL_VIEWPORT_HEIGHT
    return scaleMode == "fit" ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  }

  /**
   * Computes the physical x offset for the scaled logical viewport.
   */
  export function physicalViewportOffsetX(
    physicalWidth: number,
    physicalHeight: number,
    scaleMode: ViewportScaleMode
  ): number {
    return (
      physicalWidth -
      LOGICAL_VIEWPORT_WIDTH * physicalViewportScale(physicalWidth, physicalHeight, scaleMode)
    ) / 2
  }

  /**
   * Computes the physical y offset for the scaled logical viewport.
   */
  export function physicalViewportOffsetY(
    physicalWidth: number,
    physicalHeight: number,
    scaleMode: ViewportScaleMode
  ): number {
    return (
      physicalHeight -
      LOGICAL_VIEWPORT_HEIGHT * physicalViewportScale(physicalWidth, physicalHeight, scaleMode)
    ) / 2
  }
}
