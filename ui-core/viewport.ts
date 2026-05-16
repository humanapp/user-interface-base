namespace ui {
  /**
   * Policy for fitting the fixed logical viewport into a physical target.
   */
  export type ViewportScaleMode = "cover" | "fit"

  /**
   * Width of the logical coordinate space used for layout and rendering.
   */
  export const LOGICAL_VIEWPORT_WIDTH = 160

  /**
   * Height of the logical coordinate space used for layout and rendering.
   */
  export const LOGICAL_VIEWPORT_HEIGHT = 120

  /**
   * Aspect ratio of the logical coordinate space.
   */
  export const LOGICAL_VIEWPORT_ASPECT_RATIO = LOGICAL_VIEWPORT_WIDTH / LOGICAL_VIEWPORT_HEIGHT

  /**
   * Creates a size value for the full logical viewport.
   */
  export function logicalViewportSize(): Size {
    return new Size(LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT)
  }

  /**
   * Creates a rectangle covering the full logical viewport.
   */
  export function logicalViewportRect(): Rect {
    return new Rect(0, 0, LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT)
  }

  /**
   * Computes the logical-to-physical scale for a target bitmap size.
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
   * Computes the physical x offset of the scaled logical viewport.
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
   * Computes the physical y offset of the scaled logical viewport.
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
