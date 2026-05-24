namespace ui {
    /**
     * Width and height in pixels.
     */
    export class Size {
        /**
         * Horizontal extent in pixels.
         */
        public width: number

        /**
         * Vertical extent in pixels.
         */
        public height: number

        constructor(width = 0, height = 0) {
            this.width = width
            this.height = height
        }

        /**
         * Updates this size and returns it for reuse.
         */
        public set(width: number, height: number): Size {
            this.width = width
            this.height = height
            return this
        }

        /**
         * Copies another size into this size.
         */
        public copyFrom(size: Size): Size {
            this.width = size.width
            this.height = size.height
            return this
        }

        /**
         * Creates a size with the same width and height.
         */
        public clone(): Size {
            return new Size(this.width, this.height)
        }
    }

    /**
     * Rectangle in pixel coordinates.
     *
     * Hit testing uses the half-open interval
     * `x <= px < right` and `y <= py < bottom`.
     */
    export class Rect {
        /**
         * Left coordinate in pixels.
         */
        public x: number

        /**
         * Top coordinate in pixels.
         */
        public y: number

        /**
         * Horizontal extent in pixels.
         */
        public width: number

        /**
         * Vertical extent in pixels.
         */
        public height: number

        constructor(x = 0, y = 0, width = 0, height = 0) {
            this.x = x
            this.y = y
            this.width = width
            this.height = height
        }

        /**
         * Right edge, calculated as `x + width`.
         */
        public get right(): number {
            return this.x + this.width
        }

        /**
         * Bottom edge, calculated as `y + height`.
         */
        public get bottom(): number {
            return this.y + this.height
        }

        /**
         * Updates this rectangle and returns it for reuse.
         */
        public set(x: number, y: number, width: number, height: number): Rect {
            this.x = x
            this.y = y
            this.width = width
            this.height = height
            return this
        }

        /**
         * Copies another rectangle into this rectangle.
         */
        public copyFrom(rect: Rect): Rect {
            this.x = rect.x
            this.y = rect.y
            this.width = rect.width
            this.height = rect.height
            return this
        }

        /**
         * Expands each edge by `amount` pixels and returns this rectangle.
         */
        public inflate(amount: number): Rect {
            this.x -= amount
            this.y -= amount
            this.width += amount * 2
            this.height += amount * 2
            return this
        }

        /**
         * Expands this rectangle to include `rect` and returns this rectangle.
         */
        public union(rect: Rect): Rect {
            const left = Math.min(this.x, rect.x)
            const top = Math.min(this.y, rect.y)
            const right = Math.max(this.right, rect.right)
            const bottom = Math.max(this.bottom, rect.bottom)
            return this.set(left, top, right - left, bottom - top)
        }

        /**
         * Creates a rectangle with the same bounds.
         */
        public clone(): Rect {
            return new Rect(this.x, this.y, this.width, this.height)
        }

        /**
         * Tests whether coordinates are inside this half-open rectangle.
         */
        public contains(x: number, y: number): boolean {
            return (
                x >= this.x && x < this.right && y >= this.y && y < this.bottom
            )
        }
    }
}
