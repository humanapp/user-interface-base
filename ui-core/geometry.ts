namespace ui {
  /**
   * Logical point in the fixed UI viewport.
   */
  export class Point {
    /**
     * Horizontal logical coordinate in pixels.
     */
    public x: number

    /**
     * Vertical logical coordinate in pixels.
     */
    public y: number

    constructor(x = 0, y = 0) {
      this.x = x
      this.y = y
    }

    /**
     * Updates this point and returns it for reuse.
     */
    public set(x: number, y: number): Point {
      this.x = x
      this.y = y
      return this
    }

    /**
     * Copies another point into this point.
     */
    public copyFrom(point: Point): Point {
      this.x = point.x
      this.y = point.y
      return this
    }

    /**
     * Creates a point with the same coordinate values.
     */
    public clone(): Point {
      return new Point(this.x, this.y)
    }
  }

  /**
   * Logical width and height in pixels.
   */
  export class Size {
    /**
     * Horizontal extent in logical pixels.
     */
    public width: number

    /**
     * Vertical extent in logical pixels.
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
   * Upper-left logical rectangle.
   *
   * Hit testing uses the half-open interval
   * `x <= px < right` and `y <= py < bottom`.
   */
  export class Rect {
    /**
     * Left logical coordinate in pixels.
     */
    public x: number

    /**
     * Top logical coordinate in pixels.
     */
    public y: number

    /**
     * Horizontal extent in logical pixels.
     */
    public width: number

    /**
     * Vertical extent in logical pixels.
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
     * Creates a rectangle with the same bounds.
     */
    public clone(): Rect {
      return new Rect(this.x, this.y, this.width, this.height)
    }

    /**
     * Tests whether a logical coordinate is inside this half-open rectangle.
     */
    public contains(x: number, y: number): boolean {
      return x >= this.x && x < this.right && y >= this.y && y < this.bottom
    }

    /**
     * Tests whether a logical point is inside this half-open rectangle.
     */
    public containsPoint(point: Point): boolean {
      return this.contains(point.x, point.y)
    }
  }
}
