namespace ui {
  /**
   * Options for mapping the active display profile into a physical bitmap.
   */
  export interface PhysicalDrawSurfaceOptions {
    /**
     * Viewport scaling policy. Defaults to `cover`.
     */
    scaleMode?: ViewportScaleMode

    /**
     * Palette color used outside the mapped viewport when `scaleMode` is `fit`.
     * Defaults to `0`.
     */
    backgroundColor?: number

    /**
     * Width of the rendered bitmap in display pixels. Use with
     * `displayedHeight` when presentation stretches bitmap pixels.
     */
    displayedWidth?: number

    /**
     * Height of the rendered bitmap in display pixels. Use with
     * `displayedWidth` when presentation stretches bitmap pixels.
     */
    displayedHeight?: number

    /**
     * Built-in display profile. Omitted values use `Standard`.
     */
    displayProfile?: UiDisplayProfileId

    /**
     * Width of the UI coordinate space. Defaults to `160`.
     */
    designWidth?: number

    /**
     * Height of the UI coordinate space. Defaults to `120`.
     */
    designHeight?: number
  }

  /**
   * Bitmap font metrics and glyph data for text measurement and rendering.
   */
  export interface TextFont {
    /**
     * Advance width for one character in UI units.
     */
    charWidth: number

    /**
     * Glyph height in UI units.
     */
    charHeight: number

    /**
     * Packed glyph data in the MakeCode bitmap font format.
     */
    data: Buffer

    /**
     * Integer glyph scale multiplier. Omitted values are treated as `1`.
     */
    multiplier?: number
  }

  /**
   * Options for drawing a bitmap.
   */
  export interface DrawBitmapOptions {
    /**
     * Whether source color `0` is skipped. Defaults to `true`.
     */
    transparent?: boolean

    /**
     * Positive integer source pixel scale. Invalid values are treated as `1`.
     */
    scale?: number

    /**
     * Allows source pixels to be sampled below one physical pixel. Defaults to
     * `false`.
     */
    allowDownscale?: boolean

    /**
     * Allows source pixels to scale above their requested size on larger
     * physical targets. Defaults to `true`.
     */
    allowUpscale?: boolean
  }

  /**
   * Options for drawing text.
   */
  export interface DrawTextOptions {
    /**
     * MakeCode palette color. Defaults to `15`.
     */
    color?: number

    /**
     * Bitmap font used for measurement and drawing.
     */
    font?: TextFont

    /**
     * Whether text drawing should avoid filling background pixels. Text drawing
     * emits glyph pixels only.
     */
    transparent?: boolean

    /**
     * Allows glyph pixels to be sampled below one physical pixel. Defaults to
     * `false`.
     */
    allowDownscale?: boolean

    /**
     * Allows glyph pixels to scale above their font size on larger physical
     * targets. Defaults to `true`.
     */
    allowUpscale?: boolean
  }

  /**
   * Immediate-mode drawing target that accepts UI coordinates.
   */
  export interface DrawSurface {
    /**
     * Fills the target with a palette color.
     */
    clear(color: number): void

    /**
     * Fills a rectangle with a palette color.
     */
    fillRect(rect: Rect, color: number): void

    /**
     * Draws a rectangle outline with a palette color.
     */
    drawRect(rect: Rect, color: number): void

    /**
     * Draws a clipped line with a palette color.
     */
    drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void

    /**
     * Draws a clipped circle outline with a palette color.
     */
    drawCircle(cx: number, cy: number, radius: number, color: number): void

    /**
     * Fills a clipped circle with a palette color.
     */
    fillCircle(cx: number, cy: number, radius: number, color: number): void

    /**
     * Draws a bitmap at upper-left coordinates in UI units.
     */
    drawBitmap(bitmap: Bitmap, x: number, y: number, options?: DrawBitmapOptions): void

    /**
     * Draws text at upper-left coordinates in UI units.
     */
    drawText(text: string, x: number, y: number, options?: DrawTextOptions): void

    /**
     * Measures text in UI units without mutating the surface.
     */
    measureText(text: string, font?: TextFont, options?: DrawTextOptions): Size
  }

  /**
   * Draw surface with the display metrics and input mapping used by a physical
   * display adapter.
   */
  export interface PhysicalDrawSurface extends DrawSurface {
    /**
     * Active immutable display profile for drawing and input mapping.
     */
    readonly displayProfile: UiDisplayProfile

    /**
     * Maps a physical display point to UI coordinates.
     */
    uiPointFromPhysical(x: number, y: number, output: Point): boolean
  }
}
