namespace ui {
  /**
   * Built-in display profile selected by a display adapter.
   */
  export enum UiDisplayProfileId {
    /**
     * Uses a 160x120 logical display profile.
     */
    Standard,

    /**
     * Uses a 320x240 logical display profile.
     */
    HighDensity,
  }

  /**
   * Logical width of the `Standard` display profile.
   */
  export const STANDARD_DISPLAY_WIDTH = 160

  /**
   * Logical height of the `Standard` display profile.
   */
  export const STANDARD_DISPLAY_HEIGHT = 120

  /**
   * Logical width of the `HighDensity` display profile.
   */
  export const HIGH_DENSITY_DISPLAY_WIDTH = 320

  /**
   * Logical height of the `HighDensity` display profile.
   */
  export const HIGH_DENSITY_DISPLAY_HEIGHT = 240

  /**
   * Resolved display metrics for a display adapter's UI coordinate space.
   */
  export interface UiDisplayProfile {
    /**
     * Built-in profile id used to resolve these metrics.
     */
    id: UiDisplayProfileId

    /**
     * Width of the active logical display profile.
     */
    logicalWidth: number

    /**
     * Height of the active logical display profile.
     */
    logicalHeight: number

    /**
     * Active logical width divided by active logical height.
     */
    aspectRatio: number

    /**
     * Horizontal multiplier from UI coordinates to active logical pixels.
     */
    designToLogicalScaleX: number

    /**
     * Vertical multiplier from UI coordinates to active logical pixels.
     */
    designToLogicalScaleY: number
  }

  /**
   * Policy for fitting the active logical display into a physical target.
   */
  export type ViewportScaleMode = "cover" | "fit"
}

namespace _uiDisplay {
  export const DEFAULT_UI_WIDTH = 160
  export const DEFAULT_UI_HEIGHT = 120

  export function resolveDisplayProfile(
    profileId: ui.UiDisplayProfileId | undefined,
    uiWidth: number,
    uiHeight: number
  ): ui.UiDisplayProfile {
    const id = profileId === undefined ? ui.UiDisplayProfileId.Standard : profileId
    const logicalWidth = id == ui.UiDisplayProfileId.HighDensity ?
      ui.HIGH_DENSITY_DISPLAY_WIDTH :
      ui.STANDARD_DISPLAY_WIDTH
    const logicalHeight = id == ui.UiDisplayProfileId.HighDensity ?
      ui.HIGH_DENSITY_DISPLAY_HEIGHT :
      ui.STANDARD_DISPLAY_HEIGHT

    return {
      id,
      logicalWidth,
      logicalHeight,
      aspectRatio: logicalWidth / logicalHeight,
      designToLogicalScaleX: logicalWidth / uiWidth,
      designToLogicalScaleY: logicalHeight / uiHeight,
    }
  }

  export function validateUiDimension(value: number | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue
    if (value <= 0 || value != value || value == Infinity) throw "Invalid UI size"
    return value
  }

  export function physicalDisplayScale(
    physicalWidth: number,
    physicalHeight: number,
    profile: ui.UiDisplayProfile,
    scaleMode: ui.ViewportScaleMode
  ): number {
    const horizontalScale = physicalWidth / profile.logicalWidth
    const verticalScale = physicalHeight / profile.logicalHeight
    return scaleMode == "fit" ? Math.min(horizontalScale, verticalScale) : Math.max(horizontalScale, verticalScale)
  }

  export function cloneDisplayProfile(profile: ui.UiDisplayProfile): ui.UiDisplayProfile {
    return {
      id: profile.id,
      logicalWidth: profile.logicalWidth,
      logicalHeight: profile.logicalHeight,
      aspectRatio: profile.aspectRatio,
      designToLogicalScaleX: profile.designToLogicalScaleX,
      designToLogicalScaleY: profile.designToLogicalScaleY,
    }
  }
}
