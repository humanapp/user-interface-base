namespace ui {
  /**
   * Construction options for row and column layout containers.
   */
  export interface UiLinearLayoutOptions {
    /**
     * Sizing request for the container.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Initial children in insertion order.
     */
    children?: UiLayoutNode[]

    /**
     * Space between adjacent children in logical viewport pixels.
     */
    gap?: number

    /**
     * Placement on the axis perpendicular to child flow. Defaults to `start`.
     */
    crossAxisAlignment?: UiLayoutAlignment
  }

  /**
   * Construction options for a padding container.
   */
  export interface UiPaddingLayoutOptions {
    /**
     * Sizing request for the container.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Optional child arranged inside the padded content rectangle.
     */
    child?: UiLayoutNode

    /**
     * Insets in logical viewport pixels. A number applies to all edges.
     */
    padding?: number | UiLayoutEdgeInsets
  }

  /**
   * Construction options for an alignment container.
   */
  export interface UiAlignLayoutOptions {
    /**
     * Sizing request for the container.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Optional child arranged inside the container rectangle.
     */
    child?: UiLayoutNode

    /**
     * Horizontal child placement. Defaults to `start`.
     */
    horizontalAlignment?: UiLayoutAlignment

    /**
     * Vertical child placement. Defaults to `start`.
     */
    verticalAlignment?: UiLayoutAlignment
  }

  /**
   * Child and local rectangle pair for absolute layout.
   */
  export interface UiAbsoluteLayoutChild {
    /**
     * Child node to arrange.
     */
    node: UiLayoutNode

    /**
     * Local upper-left rectangle relative to the absolute layout origin.
     */
    rect: Rect
  }

  /**
   * Construction options for absolute layout.
   */
  export interface UiAbsoluteLayoutOptions {
    /**
     * Sizing request for the container.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Initial child and rectangle pairs in insertion order.
     */
    children?: UiAbsoluteLayoutChild[]
  }

  /**
   * Arranges children from left to right.
   */
  export class UiRowLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private children_: UiLayoutNode[]
    private gap_: number
    private crossAxisAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect

    constructor(options: UiLinearLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.children_ = []
      this.gap_ = _uiLayout.sanitizeDimension(options.gap)
      this.crossAxisAlignment_ = options.crossAxisAlignment || "start"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      this.appendInitialChildren(options.children)
    }

    /**
     * Number of children in insertion order.
     */
    public get childCount(): number {
      return this.children_.length
    }

    /**
     * Space between adjacent children in logical viewport pixels.
     */
    public get gap(): number {
      return this.gap_
    }

    /**
     * Cross-axis placement used during arrangement.
     */
    public get crossAxisAlignment(): UiLayoutAlignment {
      return this.crossAxisAlignment_
    }

    /**
     * Returns the child at `index`, or `undefined` when out of range.
     */
    public childAt(index: number): UiLayoutNode | undefined {
      if (index < 0 || index >= this.children_.length) return undefined
      return this.children_[index]
    }

    /**
     * Appends a child after existing children.
     */
    public appendChild(child: UiLayoutNode): void {
      this.children_.push(child)
      this.invalidateLayout()
    }

    /**
     * Removes all children.
     */
    public clearChildren(): void {
      while (this.children_.length) this.children_.pop()
      this.invalidateLayout()
    }

    /**
     * Updates the gap between adjacent children.
     */
    public setGap(gap: number): void {
      this.gap_ = _uiLayout.sanitizeDimension(gap)
      this.invalidateLayout()
    }

    /**
     * Updates cross-axis child placement.
     */
    public setCrossAxisAlignment(alignment: UiLayoutAlignment): void {
      this.crossAxisAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const gap = this.totalGap()
      this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth - gap)
      this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight)
      let minWidth = gap
      let preferredWidth = gap
      let minHeight = 0
      let preferredHeight = 0

      if (!this.children_.length) {
        minWidth = 0
        preferredWidth = 0
      }

      for (let i = 0; i < this.children_.length; i++) {
        this.children_[i].measure(this.constraintsScratch_, this.measureScratch_)
        minWidth += this.measureScratch_.minWidth
        preferredWidth += this.measureScratch_.preferredWidth
        minHeight = Math.max(minHeight, this.measureScratch_.minHeight)
        preferredHeight = Math.max(preferredHeight, this.measureScratch_.preferredHeight)
      }

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.arrangeChildren(true)
      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    private appendInitialChildren(children: UiLayoutNode[] | undefined): void {
      if (!children) return
      for (let i = 0; i < children.length; i++) this.children_.push(children[i])
    }

    private totalGap(): number {
      return this.gap_ * Math.max(0, this.children_.length - 1)
    }

    private arrangeChildren(row: boolean): void {
      arrangeLinearChildren(
        this.children_,
        this.layoutSpec,
        this.finalRect,
        this.gap_,
        this.crossAxisAlignment_,
        row,
        this.constraintsScratch_,
        this.measureScratch_,
        this.rectScratch_
      )
    }
  }

  /**
   * Arranges children from top to bottom.
   */
  export class UiColumnLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private children_: UiLayoutNode[]
    private gap_: number
    private crossAxisAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect

    constructor(options: UiLinearLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.children_ = []
      this.gap_ = _uiLayout.sanitizeDimension(options.gap)
      this.crossAxisAlignment_ = options.crossAxisAlignment || "start"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      this.appendInitialChildren(options.children)
    }

    /**
     * Number of children in insertion order.
     */
    public get childCount(): number {
      return this.children_.length
    }

    /**
     * Space between adjacent children in logical viewport pixels.
     */
    public get gap(): number {
      return this.gap_
    }

    /**
     * Cross-axis placement used during arrangement.
     */
    public get crossAxisAlignment(): UiLayoutAlignment {
      return this.crossAxisAlignment_
    }

    /**
     * Returns the child at `index`, or `undefined` when out of range.
     */
    public childAt(index: number): UiLayoutNode | undefined {
      if (index < 0 || index >= this.children_.length) return undefined
      return this.children_[index]
    }

    /**
     * Appends a child after existing children.
     */
    public appendChild(child: UiLayoutNode): void {
      this.children_.push(child)
      this.invalidateLayout()
    }

    /**
     * Removes all children.
     */
    public clearChildren(): void {
      while (this.children_.length) this.children_.pop()
      this.invalidateLayout()
    }

    /**
     * Updates the gap between adjacent children.
     */
    public setGap(gap: number): void {
      this.gap_ = _uiLayout.sanitizeDimension(gap)
      this.invalidateLayout()
    }

    /**
     * Updates cross-axis child placement.
     */
    public setCrossAxisAlignment(alignment: UiLayoutAlignment): void {
      this.crossAxisAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const gap = this.totalGap()
      this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth)
      this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight - gap)
      let minWidth = 0
      let preferredWidth = 0
      let minHeight = gap
      let preferredHeight = gap

      if (!this.children_.length) {
        minHeight = 0
        preferredHeight = 0
      }

      for (let i = 0; i < this.children_.length; i++) {
        this.children_[i].measure(this.constraintsScratch_, this.measureScratch_)
        minWidth = Math.max(minWidth, this.measureScratch_.minWidth)
        preferredWidth = Math.max(preferredWidth, this.measureScratch_.preferredWidth)
        minHeight += this.measureScratch_.minHeight
        preferredHeight += this.measureScratch_.preferredHeight
      }

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.arrangeChildren(false)
      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    private appendInitialChildren(children: UiLayoutNode[] | undefined): void {
      if (!children) return
      for (let i = 0; i < children.length; i++) this.children_.push(children[i])
    }

    private totalGap(): number {
      return this.gap_ * Math.max(0, this.children_.length - 1)
    }

    private arrangeChildren(row: boolean): void {
      arrangeLinearChildren(
        this.children_,
        this.layoutSpec,
        this.finalRect,
        this.gap_,
        this.crossAxisAlignment_,
        row,
        this.constraintsScratch_,
        this.measureScratch_,
        this.rectScratch_
      )
    }
  }

  /**
   * Adds inset space around one optional child.
   */
  export class UiPaddingLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private child_: UiLayoutNode | undefined
    private padding_: UiLayoutEdgeInsets
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect

    constructor(options: UiPaddingLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.child_ = options.child
      this.padding_ = { top: 0, right: 0, bottom: 0, left: 0 }
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      _uiLayout.copyEdgeInsets(this.padding_, options.padding)
    }

    /**
     * Current child, or `undefined` when empty.
     */
    public get child(): UiLayoutNode | undefined {
      return this.child_
    }

    /**
     * Copies the current padding into `output`.
     */
    public getPadding(output: UiLayoutEdgeInsets): void {
      output.top = this.padding_.top
      output.right = this.padding_.right
      output.bottom = this.padding_.bottom
      output.left = this.padding_.left
    }

    /**
     * Replaces the current child.
     */
    public setChild(child: UiLayoutNode): void {
      this.child_ = child
      this.invalidateLayout()
    }

    /**
     * Removes the current child.
     */
    public clearChild(): void {
      this.child_ = undefined
      this.invalidateLayout()
    }

    /**
     * Updates the edge insets.
     */
    public setPadding(padding: number | UiLayoutEdgeInsets): void {
      _uiLayout.copyEdgeInsets(this.padding_, padding)
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const horizontalPadding = this.padding_.left + this.padding_.right
      const verticalPadding = this.padding_.top + this.padding_.bottom
      let minWidth = horizontalPadding
      let minHeight = verticalPadding
      let preferredWidth = horizontalPadding
      let preferredHeight = verticalPadding

      if (this.child_) {
        this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth - horizontalPadding)
        this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight - verticalPadding)
        this.child_.measure(this.constraintsScratch_, this.measureScratch_)
        minWidth += this.measureScratch_.minWidth
        minHeight += this.measureScratch_.minHeight
        preferredWidth += this.measureScratch_.preferredWidth
        preferredHeight += this.measureScratch_.preferredHeight
      }

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)

      if (this.child_) {
        this.rectScratch_.set(
          this.finalRect.x + this.padding_.left,
          this.finalRect.y + this.padding_.top,
          _uiLayout.sanitizeDimension(this.finalRect.width - this.padding_.left - this.padding_.right),
          _uiLayout.sanitizeDimension(this.finalRect.height - this.padding_.top - this.padding_.bottom)
        )
        this.child_.arrange(this.rectScratch_)
      }

      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

  }

  /**
   * Places one optional child within the arranged rectangle.
   */
  export class UiAlignLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private child_: UiLayoutNode | undefined
    private horizontalAlignment_: UiLayoutAlignment
    private verticalAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect

    constructor(options: UiAlignLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.child_ = options.child
      this.horizontalAlignment_ = options.horizontalAlignment || "start"
      this.verticalAlignment_ = options.verticalAlignment || "start"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
    }

    /**
     * Current child, or `undefined` when empty.
     */
    public get child(): UiLayoutNode | undefined {
      return this.child_
    }

    /**
     * Horizontal child placement.
     */
    public get horizontalAlignment(): UiLayoutAlignment {
      return this.horizontalAlignment_
    }

    /**
     * Vertical child placement.
     */
    public get verticalAlignment(): UiLayoutAlignment {
      return this.verticalAlignment_
    }

    /**
     * Replaces the current child.
     */
    public setChild(child: UiLayoutNode): void {
      this.child_ = child
      this.invalidateLayout()
    }

    /**
     * Removes the current child.
     */
    public clearChild(): void {
      this.child_ = undefined
      this.invalidateLayout()
    }

    /**
     * Updates horizontal child placement.
     */
    public setHorizontalAlignment(alignment: UiLayoutAlignment): void {
      this.horizontalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    /**
     * Updates vertical child placement.
     */
    public setVerticalAlignment(alignment: UiLayoutAlignment): void {
      this.verticalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      let minWidth = 0
      let minHeight = 0
      let preferredWidth = 0
      let preferredHeight = 0

      if (this.child_) {
        this.child_.measure(constraints, this.measureScratch_)
        minWidth = this.measureScratch_.minWidth
        minHeight = this.measureScratch_.minHeight
        preferredWidth = this.measureScratch_.preferredWidth
        preferredHeight = this.measureScratch_.preferredHeight
      }

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)

      if (this.child_) {
        this.constraintsScratch_.maxWidth = this.finalRect.width
        this.constraintsScratch_.maxHeight = this.finalRect.height
        this.child_.measure(this.constraintsScratch_, this.measureScratch_)
        const childWidth = _uiLayout.alignedSize(
          this.finalRect.width,
          this.measureScratch_.preferredWidth,
          this.horizontalAlignment_
        )
        const childHeight = _uiLayout.alignedSize(
          this.finalRect.height,
          this.measureScratch_.preferredHeight,
          this.verticalAlignment_
        )
        this.rectScratch_.set(
          _uiLayout.alignedOffset(this.finalRect.x, this.finalRect.width, childWidth, this.horizontalAlignment_),
          _uiLayout.alignedOffset(this.finalRect.y, this.finalRect.height, childHeight, this.verticalAlignment_),
          childWidth,
          childHeight
        )
        this.child_.arrange(this.rectScratch_)
      }

      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }
  }

  class UiAbsoluteLayoutRecord {
    public node: UiLayoutNode
    public rect: Rect

    constructor(node: UiLayoutNode, rect: Rect) {
      this.node = node
      this.rect = new Rect()
      copyArrangedLayoutRect(this.rect, rect)
    }
  }

  /**
   * Arranges children at explicit local upper-left rectangles.
   */
  export class UiAbsoluteLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private children_: UiAbsoluteLayoutRecord[]
    private rectScratch_: Rect

    constructor(options: UiAbsoluteLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.children_ = []
      this.rectScratch_ = new Rect()
      this.appendInitialChildren(options.children)
    }

    /**
     * Number of children in insertion order.
     */
    public get childCount(): number {
      return this.children_.length
    }

    /**
     * Returns the child at `index`, or `undefined` when out of range.
     */
    public childAt(index: number): UiLayoutNode | undefined {
      if (index < 0 || index >= this.children_.length) return undefined
      return this.children_[index].node
    }

    /**
     * Copies the stored local rectangle for `index` into `output`.
     */
    public childRectAt(index: number, output: Rect): boolean {
      if (index < 0 || index >= this.children_.length) return false
      output.copyFrom(this.children_[index].rect)
      return true
    }

    /**
     * Replaces the stored local rectangle for an existing child.
     */
    public setChildRectAt(index: number, rect: Rect): boolean {
      if (index < 0 || index >= this.children_.length) return false
      copyArrangedLayoutRect(this.children_[index].rect, rect)
      this.invalidateLayout()
      return true
    }

    /**
     * Appends a child and copies its local rectangle.
     */
    public appendChild(node: UiLayoutNode, rect: Rect): void {
      this.children_.push(new UiAbsoluteLayoutRecord(node, rect))
      this.invalidateLayout()
    }

    /**
     * Removes all children.
     */
    public clearChildren(): void {
      while (this.children_.length) this.children_.pop()
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      let width = 0
      let height = 0

      for (let i = 0; i < this.children_.length; i++) {
        const rect = this.children_[i].rect
        width = Math.max(width, _uiLayout.sanitizeDimension(rect.x + rect.width))
        height = Math.max(height, _uiLayout.sanitizeDimension(rect.y + rect.height))
      }

      measureLayoutSpec(this.layoutSpec, constraints, width, height, width, height, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)

      for (let i = 0; i < this.children_.length; i++) {
        const child = this.children_[i]
        this.rectScratch_.set(
          this.finalRect.x + child.rect.x,
          this.finalRect.y + child.rect.y,
          child.rect.width,
          child.rect.height
        )
        child.node.arrange(this.rectScratch_)
      }

      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    private appendInitialChildren(children: UiAbsoluteLayoutChild[] | undefined): void {
      if (!children) return
      for (let i = 0; i < children.length; i++) {
        this.children_.push(new UiAbsoluteLayoutRecord(children[i].node, children[i].rect))
      }
    }
  }

  function arrangeLinearChildren(
    children: UiLayoutNode[],
    layoutSpec: UiLayoutSpec,
    finalRect: Rect,
    gap: number,
    crossAxisAlignment: UiLayoutAlignment,
    row: boolean,
    childConstraints: UiLayoutConstraints,
    measureScratch: UiMeasuredSize,
    rectScratch: Rect
  ): void {
    const totalGap = gap * Math.max(0, children.length - 1)
    const mainSize = row ? finalRect.width : finalRect.height
    const crossSize = row ? finalRect.height : finalRect.width
    childConstraints.maxWidth = row ? _uiLayout.sanitizeDimension(finalRect.width - totalGap) : finalRect.width
    childConstraints.maxHeight = row ? finalRect.height : _uiLayout.sanitizeDimension(finalRect.height - totalGap)
    let nonFillPreferred = 0
    let fillMinimum = 0
    let fillCount = 0

    for (let i = 0; i < children.length; i++) {
      children[i].measure(childConstraints, measureScratch)
      if (isFillOnMainAxis(children[i].layoutSpec, row)) {
        fillMinimum += row ? measureScratch.minWidth : measureScratch.minHeight
        fillCount++
      } else {
        nonFillPreferred += row ? measureScratch.preferredWidth : measureScratch.preferredHeight
      }
    }

    const remaining = mainSize - totalGap - nonFillPreferred - fillMinimum
    const fillShare = remaining > 0 && fillCount > 0 ? Math.idiv(remaining, fillCount) : 0
    let fillRemainder = remaining > 0 && fillCount > 0 ? remaining % fillCount : 0
    let mainOffset = row ? finalRect.x : finalRect.y

    for (let i = 0; i < children.length; i++) {
      children[i].measure(childConstraints, measureScratch)
      const fill = isFillOnMainAxis(children[i].layoutSpec, row)
      let childMain = row ? measureScratch.preferredWidth : measureScratch.preferredHeight

      if (fill) {
        childMain = row ? measureScratch.minWidth : measureScratch.minHeight
        childMain += fillShare
        if (fillRemainder > 0) {
          childMain++
          fillRemainder--
        }
      }

      const preferredCross = row ? measureScratch.preferredHeight : measureScratch.preferredWidth
      const childCross = _uiLayout.alignedSize(crossSize, preferredCross, crossAxisAlignment)
      const crossOffset = _uiLayout.alignedOffset(
        row ? finalRect.y : finalRect.x,
        crossSize,
        childCross,
        crossAxisAlignment
      )

      if (row) {
        rectScratch.set(mainOffset, crossOffset, childMain, childCross)
      } else {
        rectScratch.set(crossOffset, mainOffset, childCross, childMain)
      }

      children[i].arrange(rectScratch)
      mainOffset += childMain + gap
    }
  }

  function isFillOnMainAxis(spec: UiLayoutSpec, row: boolean): boolean {
    return row ? spec.width.mode == "fill" : spec.height.mode == "fill"
  }

}
