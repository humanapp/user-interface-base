namespace ui {
  /**
   * Options for mapping the logical viewport into a physical bitmap.
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
  }

  /**
   * Bitmap font metrics and glyph data for text measurement and rendering.
   */
  export interface TextFont {
    /**
     * Advance width for one character in logical pixels.
     */
    charWidth: number

    /**
     * Glyph height in logical pixels.
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
   * Options for drawing a bitmap into logical viewport coordinates.
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
   * Options for drawing text into logical viewport coordinates.
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
   * Immediate-mode drawing target that accepts logical viewport coordinates.
   */
  export interface DrawSurface {
    /**
     * Fills the logical target with a palette color.
     */
    clear(color: number): void

    /**
     * Fills a logical rectangle with a palette color.
     */
    fillRect(rect: Rect, color: number): void

    /**
     * Draws a logical rectangle outline with a palette color.
     */
    drawRect(rect: Rect, color: number): void

    /**
     * Draws a clipped logical line with a palette color.
     */
    drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void

    /**
     * Draws a clipped logical circle outline with a palette color.
     */
    drawCircle(cx: number, cy: number, radius: number, color: number): void

    /**
     * Fills a clipped logical circle with a palette color.
     */
    fillCircle(cx: number, cy: number, radius: number, color: number): void

    /**
     * Draws a bitmap at upper-left logical coordinates.
     */
    drawBitmap(bitmap: Bitmap, x: number, y: number, options?: DrawBitmapOptions): void

    /**
     * Draws text at upper-left logical coordinates.
     */
    drawText(text: string, x: number, y: number, options?: DrawTextOptions): void

    /**
     * Measures text in logical pixels without mutating the surface.
     */
    measureText(text: string, font?: TextFont, options?: DrawTextOptions): Size
  }
}
