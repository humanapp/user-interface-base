namespace ui {
  /**
   * Layout sizing mode for one axis.
   */
  export type UiLayoutSizeMode = "content" | "fixed" | "fill"

  /**
   * Size request for one layout axis in logical viewport pixels.
   */
  export interface UiLayoutAxisSpec {
    /**
     * Sizing behavior for this axis.
     */
    mode: UiLayoutSizeMode

    /**
     * Requested size for `fixed` axes. Omitted and invalid values are `0`.
     */
    value?: number

    /**
     * Smallest accepted size for this axis. Omitted values are `0`.
     */
    min?: number

    /**
     * Largest accepted size for this axis. Omitted values have no axis-local
     * maximum.
     */
    max?: number
  }

  /**
   * Width and height sizing requests for a layout node.
   */
  export interface UiLayoutSpec {
    /**
     * Width sizing request in logical viewport pixels.
     */
    width: UiLayoutAxisSpec

    /**
     * Height sizing request in logical viewport pixels.
     */
    height: UiLayoutAxisSpec
  }

  /**
   * Parent-supplied measurement limits in logical viewport pixels.
   */
  export interface UiLayoutConstraints {
    /**
     * Largest width the parent can offer.
     */
    maxWidth: number

    /**
     * Largest height the parent can offer.
     */
    maxHeight: number
  }

  /**
   * Reusable output object for node measurement.
   */
  export class UiMeasuredSize {
    /**
     * Smallest measured width in logical viewport pixels.
     */
    public minWidth: number

    /**
     * Smallest measured height in logical viewport pixels.
     */
    public minHeight: number

    /**
     * Preferred measured width in logical viewport pixels.
     */
    public preferredWidth: number

    /**
     * Preferred measured height in logical viewport pixels.
     */
    public preferredHeight: number

    constructor(minWidth = 0, minHeight = 0, preferredWidth = 0, preferredHeight = 0) {
      this.minWidth = 0
      this.minHeight = 0
      this.preferredWidth = 0
      this.preferredHeight = 0
      this.set(minWidth, minHeight, preferredWidth, preferredHeight)
    }

    /**
     * Updates all measured values and returns this object for reuse.
     */
    public set(
      minWidth: number,
      minHeight: number,
      preferredWidth: number,
      preferredHeight: number
    ): UiMeasuredSize {
      this.minWidth = sanitizeLayoutDimension(minWidth)
      this.minHeight = sanitizeLayoutDimension(minHeight)
      this.preferredWidth = Math.max(this.minWidth, sanitizeLayoutDimension(preferredWidth))
      this.preferredHeight = Math.max(this.minHeight, sanitizeLayoutDimension(preferredHeight))
      return this
    }
  }

  /**
   * Measured layout node with a retained final rectangle.
   */
  export interface UiLayoutNode {
    /**
     * Sizing requests used when measuring this node.
     */
    readonly layoutSpec: UiLayoutSpec

    /**
     * Last arranged rectangle in logical viewport coordinates.
     */
    readonly finalRect: Rect

    /**
     * Whether this node needs measurement or arrangement work.
     */
    readonly layoutDirty: boolean

    /**
     * Measures this node under parent constraints and writes into `output`.
     */
    measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void

    /**
     * Accepts the parent-assigned logical rectangle for this layout pass.
     *
     * Implementations copy the rectangle into `finalRect` and arrange any
     * children inside that concrete space.
     */
    arrange(rect: Rect): void

    /**
     * Marks this node as needing layout work.
     */
    invalidateLayout(): void

    /**
     * Clears this node's local invalidation flag.
     */
    clearLayoutInvalidation(): void
  }

  /**
   * Applies the standard sizing contract for a node implementation.
   */
  export function measureLayoutSpec(
    spec: UiLayoutSpec,
    constraints: UiLayoutConstraints,
    contentMinWidth: number,
    contentMinHeight: number,
    contentPreferredWidth: number,
    contentPreferredHeight: number,
    output: UiMeasuredSize
  ): void {
    measureLayoutAxis(
      spec.width,
      contentMinWidth,
      contentPreferredWidth,
      constraints.maxWidth,
      layoutWidthScratch
    )
    measureLayoutAxis(
      spec.height,
      contentMinHeight,
      contentPreferredHeight,
      constraints.maxHeight,
      layoutHeightScratch
    )
    output.set(
      layoutWidthScratch.min,
      layoutHeightScratch.min,
      layoutWidthScratch.preferred,
      layoutHeightScratch.preferred
    )
  }

  /**
   * Copies an arranged rectangle into retained node storage.
   */
  export function copyArrangedLayoutRect(target: Rect, rect: Rect): Rect {
    return target.set(
      sanitizeLayoutCoordinate(rect.x),
      sanitizeLayoutCoordinate(rect.y),
      sanitizeLayoutDimension(rect.width),
      sanitizeLayoutDimension(rect.height)
    )
  }

  class UiMeasuredAxis {
    public min: number
    public preferred: number

    constructor() {
      this.min = 0
      this.preferred = 0
    }
  }

  const layoutWidthScratch = new UiMeasuredAxis()
  const layoutHeightScratch = new UiMeasuredAxis()

  function measureLayoutAxis(
    spec: UiLayoutAxisSpec,
    contentMin: number,
    contentPreferred: number,
    parentMax: number,
    output: UiMeasuredAxis
  ): void {
    const parentLimit = sanitizeLayoutDimension(parentMax)
    const axisMin = sanitizeLayoutDimension(spec.min)
    let axisMax = parentLimit

    if (spec.max !== undefined) {
      axisMax = sanitizeLayoutDimension(spec.max)
      if (axisMax < axisMin) axisMax = axisMin
      axisMax = Math.min(axisMax, parentLimit)
    }

    let measuredMin = sanitizeLayoutDimension(contentMin)
    let measuredPreferred = Math.max(measuredMin, sanitizeLayoutDimension(contentPreferred))

    if (spec.mode == "fixed") {
      measuredPreferred = sanitizeLayoutDimension(spec.value)
      measuredMin = measuredPreferred
    }

    measuredMin = clampLayoutSize(measuredMin, axisMin, axisMax)
    measuredPreferred = clampLayoutSize(measuredPreferred, axisMin, axisMax)
    if (measuredPreferred < measuredMin) measuredPreferred = measuredMin

    output.min = Math.min(measuredMin, parentLimit)
    output.preferred = Math.min(measuredPreferred, parentLimit)
    if (output.preferred < output.min) {
      output.preferred = output.min
    }
  }

  function clampLayoutSize(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
  }

  function sanitizeLayoutDimension(value: number | undefined): number {
    value = sanitizeLayoutCoordinate(value)
    return value < 0 ? 0 : value
  }

  function sanitizeLayoutCoordinate(value: number | undefined): number {
    if (value === undefined || value != value) return 0
    return Math.round(value)
  }
}
