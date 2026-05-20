namespace ui {
    /**
     * Draw surface backed by a bitmap using 160x120 UI coordinates.
     */
    export class PhysicalBitmapDrawSurface implements PhysicalDrawSurface {
        private bitmap_: Bitmap

        constructor(bitmap: Bitmap) {
            this.bitmap_ = bitmap
        }

        /**
         * Physical bitmap that receives drawing operations.
         */
        public get bitmap(): Bitmap {
            return this.bitmap_
        }

        /**
         * Maps a physical bitmap point to UI coordinates.
         */
        public uiPointFromPhysical(
            physicalX: number,
            physicalY: number,
            output: Point,
        ): boolean {
            if (
                physicalX < 0 ||
                physicalX >= STANDARD_DISPLAY_WIDTH ||
                physicalY < 0 ||
                physicalY >= STANDARD_DISPLAY_HEIGHT
            )
                return false

            output.set(physicalX, physicalY)
            return true
        }

        /**
         * Fills the bitmap with a palette color.
         */
        public clear(color: number): void {
            this.bitmap_.fill(color)
        }

        /**
         * Fills a rectangle after clipping it to the UI viewport.
         */
        public fillRect(rect: Rect, color: number): void {
            this.fillClippedRect(rect.x, rect.y, rect.width, rect.height, color)
        }

        /**
         * Draws a rectangle outline.
         */
        public drawRect(rect: Rect, color: number): void {
            const x = this.roundPixel(rect.x)
            const y = this.roundPixel(rect.y)
            const width = this.roundPixel(rect.width)
            const height = this.roundPixel(rect.height)
            if (width <= 0 || height <= 0) return

            this.bitmap_.drawRect(x, y, width, height, color)
        }

        /**
         * Draws a one-pixel rounded rectangle.
         */
        public drawRoundedRect(
            rect: Rect,
            color?: number,
            fillColor?: number,
        ): void {
            if (fillColor !== undefined) {
                if (rect.width > 2 && rect.height > 2) {
                    this.fillClippedRect(
                        rect.x + 1,
                        rect.y,
                        rect.width - 2,
                        1,
                        fillColor,
                    )
                    this.fillClippedRect(
                        rect.x,
                        rect.y + 1,
                        rect.width,
                        rect.height - 2,
                        fillColor,
                    )
                    this.fillClippedRect(
                        rect.x + 1,
                        rect.y + rect.height - 1,
                        rect.width - 2,
                        1,
                        fillColor,
                    )
                } else {
                    this.fillRect(rect, fillColor)
                }
            }
            if (color === undefined || rect.width <= 1 || rect.height <= 1)
                return

            this.drawLine(
                rect.x + 1,
                rect.y,
                rect.x + rect.width - 2,
                rect.y,
                color,
            )
            this.drawLine(
                rect.x + 1,
                rect.y + rect.height - 1,
                rect.x + rect.width - 2,
                rect.y + rect.height - 1,
                color,
            )
            this.drawLine(
                rect.x,
                rect.y + 1,
                rect.x,
                rect.y + rect.height - 2,
                color,
            )
            this.drawLine(
                rect.x + rect.width - 1,
                rect.y + 1,
                rect.x + rect.width - 1,
                rect.y + rect.height - 2,
                color,
            )
        }

        /**
         * Draws a line.
         */
        public drawLine(
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            color: number,
        ): void {
            this.bitmap_.drawLine(
                this.roundPixel(x0),
                this.roundPixel(y0),
                this.roundPixel(x1),
                this.roundPixel(y1),
                color,
            )
        }

        /**
         * Draws a circle outline.
         */
        public drawCircle(
            cx: number,
            cy: number,
            radius: number,
            color: number,
        ): void {
            const r = this.roundPixel(radius)
            if (r <= 0) return
            this.bitmap_.drawCircle(
                this.roundPixel(cx),
                this.roundPixel(cy),
                r,
                color,
            )
        }

        /**
         * Fills a circle.
         */
        public fillCircle(
            cx: number,
            cy: number,
            radius: number,
            color: number,
        ): void {
            const r = this.roundPixel(radius)
            if (r <= 0) return
            this.bitmap_.fillCircle(
                this.roundPixel(cx),
                this.roundPixel(cy),
                r,
                color,
            )
        }

        /**
         * Draws a bitmap at upper-left coordinates in UI units.
         */
        public drawBitmap(
            bitmap: Bitmap,
            x: number,
            y: number,
            options?: DrawBitmapOptions,
        ): void {
            const destX = this.roundPixel(x)
            const destY = this.roundPixel(y)
            const transparent = !options || options.transparent !== false
            const scale = this.bitmapScale(options)
            if (scale == 1) {
                if (transparent)
                    this.bitmap_.drawTransparentBitmap(bitmap, destX, destY)
                else this.bitmap_.drawBitmap(bitmap, destX, destY)
                return
            }

            this.bitmap_.blit(
                destX,
                destY,
                bitmap.width * scale,
                bitmap.height * scale,
                bitmap,
                0,
                0,
                bitmap.width,
                bitmap.height,
                transparent,
                false,
            )
        }

        /**
         * Draws text at upper-left coordinates in UI units.
         */
        public drawText(
            text: string,
            x: number,
            y: number,
            options?: DrawTextOptions,
        ): void {
            const font = this.textFont(text, options ? options.font : undefined)
            const color =
                options && options.color !== undefined ? options.color : 15
            this.bitmap_.print(
                text,
                this.roundPixel(x),
                this.roundPixel(y),
                color,
                <any>font,
            )
        }

        /**
         * Measures text in UI units for the selected font.
         */
        public measureText(
            text: string,
            font?: TextFont,
            options?: DrawTextOptions,
        ): Size {
            const selectedFont = this.textFont(
                text,
                font || (options ? options.font : undefined),
            )
            let currentWidth = 0
            let maxWidth = 0
            let lineCount = 1

            for (let i = 0; i < text.length; i++) {
                if (text.charCodeAt(i) == 10) {
                    maxWidth = Math.max(maxWidth, currentWidth)
                    currentWidth = 0
                    lineCount++
                } else {
                    currentWidth += selectedFont.charWidth
                }
            }

            maxWidth = Math.max(maxWidth, currentWidth)
            return new Size(
                maxWidth,
                lineCount * selectedFont.charHeight + (lineCount - 1) * 2,
            )
        }

        private fillClippedRect(
            x: number,
            y: number,
            width: number,
            height: number,
            color: number,
        ): void {
            const x0 = Math.max(0, this.roundPixel(x))
            const y0 = Math.max(0, this.roundPixel(y))
            const x1 = Math.min(
                STANDARD_DISPLAY_WIDTH,
                this.roundPixel(x + width),
            )
            const y1 = Math.min(
                STANDARD_DISPLAY_HEIGHT,
                this.roundPixel(y + height),
            )
            if (x0 >= x1 || y0 >= y1) return

            this.bitmap_.fillRect(x0, y0, x1 - x0, y1 - y0, color)
        }

        private bitmapScale(options?: DrawBitmapOptions): number {
            if (!options || options.scale === undefined) return 1
            const scale = options.scale | 0
            if (scale <= 0 || scale != options.scale) return 1
            return scale
        }

        private textFont(text: string, font?: TextFont): TextFont {
            if (font) return font
            return bitmaps.getFontForText(text)
        }

        private roundPixel(value: number): number {
            return Math.round(value)
        }
    }
}
