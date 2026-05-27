namespace ui {
    /**
     * Bitmap font metrics and glyph data for text measurement and rendering.
     */
    export interface TextFont {
        /**
         * Advance width for one character in pixels.
         */
        charWidth: number

        /**
         * Glyph height in pixels.
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
    }

    /**
     * Immediate-mode drawing target that accepts pixel coordinates.
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
         * Draws a one-pixel rounded rectangle with corner pixels omitted.
         * When `fillColor` is set, fills the rounded body before drawing the
         * outline. When `color` is omitted, only the rounded body is filled.
         */
        drawRoundedRect(rect: Rect, color?: number, fillColor?: number): void

        /**
         * Draws a line with a palette color.
         */
        drawLine(
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            color: number,
        ): void

        /**
         * Draws a circle outline with a palette color.
         */
        drawCircle(cx: number, cy: number, radius: number, color: number): void

        /**
         * Fills a circle with a palette color.
         */
        fillCircle(cx: number, cy: number, radius: number, color: number): void

        /**
         * Draws a bitmap at upper-left pixel coordinates.
         */
        drawBitmap(
            bitmap: Bitmap,
            x: number,
            y: number,
            options?: DrawBitmapOptions,
        ): void

        /**
         * Draws text at upper-left pixel coordinates.
         */
        drawText(
            text: string,
            x: number,
            y: number,
            options?: DrawTextOptions,
        ): void

        /**
         * Measures text in pixels without mutating the surface.
         */
        measureText(text: string, font?: TextFont): Size
    }
}
