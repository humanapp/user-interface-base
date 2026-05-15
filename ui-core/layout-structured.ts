namespace ui {
  /**
   * Construction options for a regular row-by-column grid.
   */
  export interface UiGridLayoutOptions {
    /**
     * Sizing request for the grid.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Number of columns used to place children in insertion order.
     */
    columnCount: number

    /**
     * Initial children in insertion order.
     */
    children?: UiLayoutNode[]

    /**
     * Space between adjacent rows in logical viewport pixels.
     */
    rowGap?: number

    /**
     * Space between adjacent columns in logical viewport pixels.
     */
    columnGap?: number

    /**
     * Horizontal placement inside each cell. Defaults to `start`.
     */
    horizontalAlignment?: UiLayoutAlignment

    /**
     * Vertical placement inside each cell. Defaults to `start`.
     */
    verticalAlignment?: UiLayoutAlignment
  }

  /**
   * Construction options for rows with independent child counts.
   */
  export interface UiRaggedGridLayoutOptions {
    /**
     * Sizing request for the ragged grid.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Initial rows in insertion order.
     */
    rows?: UiLayoutNode[][]

    /**
     * Space between adjacent rows in logical viewport pixels.
     */
    rowGap?: number

    /**
     * Space between adjacent columns in a row in logical viewport pixels.
     */
    columnGap?: number

    /**
     * Horizontal placement inside each cell. Defaults to `start`.
     */
    horizontalAlignment?: UiLayoutAlignment

    /**
     * Vertical placement inside each cell. Defaults to `start`.
     */
    verticalAlignment?: UiLayoutAlignment
  }

  /**
   * Construction options for layered children arranged in one rectangle.
   */
  export interface UiStackLayoutOptions {
    /**
     * Sizing request for the stack.
     */
    layoutSpec: UiLayoutSpec

    /**
     * Initial layers in order from lowest to highest.
     */
    children?: UiLayoutNode[]

    /**
     * Insets applied before arranging child layers. A number applies to all edges.
     */
    padding?: number | UiLayoutEdgeInsets

    /**
     * Horizontal placement for each layer. Defaults to `stretch`.
     */
    horizontalAlignment?: UiLayoutAlignment

    /**
     * Vertical placement for each layer. Defaults to `stretch`.
     */
    verticalAlignment?: UiLayoutAlignment
  }

  /**
   * Arranges children into regular row-by-column cells.
   */
  export class UiGridLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private children_: UiLayoutNode[]
    private columnCount_: number
    private rowGap_: number
    private columnGap_: number
    private horizontalAlignment_: UiLayoutAlignment
    private verticalAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect
    private columnMinWidths_: number[]
    private columnPreferredWidths_: number[]
    private rowMinHeights_: number[]
    private rowPreferredHeights_: number[]

    constructor(options: UiGridLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.children_ = []
      this.columnCount_ = _uiLayout.sanitizeDimension(options.columnCount)
      this.rowGap_ = _uiLayout.sanitizeDimension(options.rowGap)
      this.columnGap_ = _uiLayout.sanitizeDimension(options.columnGap)
      this.horizontalAlignment_ = options.horizontalAlignment || "start"
      this.verticalAlignment_ = options.verticalAlignment || "start"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      this.columnMinWidths_ = []
      this.columnPreferredWidths_ = []
      this.rowMinHeights_ = []
      this.rowPreferredHeights_ = []
      this.appendInitialChildren(options.children)
    }

    /**
     * Number of children in insertion order.
     */
    public get childCount(): number {
      return this.children_.length
    }

    /**
     * Number of columns used for child placement.
     */
    public get columnCount(): number {
      return this.columnCount_
    }

    /**
     * Number of rows derived from child count and column count.
     */
    public get rowCount(): number {
      return this.effectiveRowCount()
    }

    /**
     * Space between adjacent rows in logical viewport pixels.
     */
    public get rowGap(): number {
      return this.rowGap_
    }

    /**
     * Space between adjacent columns in logical viewport pixels.
     */
    public get columnGap(): number {
      return this.columnGap_
    }

    /**
     * Horizontal placement inside each cell.
     */
    public get horizontalAlignment(): UiLayoutAlignment {
      return this.horizontalAlignment_
    }

    /**
     * Vertical placement inside each cell.
     */
    public get verticalAlignment(): UiLayoutAlignment {
      return this.verticalAlignment_
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
     * Updates the number of columns.
     */
    public setColumnCount(columnCount: number): void {
      this.columnCount_ = _uiLayout.sanitizeDimension(columnCount)
      this.invalidateLayout()
    }

    /**
     * Updates the space between adjacent rows.
     */
    public setRowGap(rowGap: number): void {
      this.rowGap_ = _uiLayout.sanitizeDimension(rowGap)
      this.invalidateLayout()
    }

    /**
     * Updates the space between adjacent columns.
     */
    public setColumnGap(columnGap: number): void {
      this.columnGap_ = _uiLayout.sanitizeDimension(columnGap)
      this.invalidateLayout()
    }

    /**
     * Updates horizontal placement inside each cell.
     */
    public setHorizontalAlignment(alignment: UiLayoutAlignment): void {
      this.horizontalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    /**
     * Updates vertical placement inside each cell.
     */
    public setVerticalAlignment(alignment: UiLayoutAlignment): void {
      this.verticalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const rowCount = this.effectiveRowCount()
      this.measureTracks(constraints, rowCount)
      const columnGap = this.totalColumnGap(rowCount)
      const minWidth = sumLayoutTracks(this.columnMinWidths_, this.columnCount_) + columnGap
      const preferredWidth = sumLayoutTracks(this.columnPreferredWidths_, this.columnCount_) + columnGap
      const minHeight = sumLayoutTracks(this.rowMinHeights_, rowCount) + this.totalRowGap(rowCount)
      const preferredHeight = sumLayoutTracks(this.rowPreferredHeights_, rowCount) + this.totalRowGap(rowCount)

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      const rowCount = this.effectiveRowCount()
      this.constraintsScratch_.maxWidth = this.finalRect.width
      this.constraintsScratch_.maxHeight = this.finalRect.height
      this.measureTracks(this.constraintsScratch_, rowCount)

      if (this.columnCount_ > 0) {
        let y = this.finalRect.y
        for (let row = 0; row < rowCount; row++) {
          let x = this.finalRect.x
          for (let column = 0; column < this.columnCount_; column++) {
            const childIndex = row * this.columnCount_ + column
            if (childIndex >= this.children_.length) break
            const cellWidth = this.columnPreferredWidths_[column]
            const cellHeight = this.rowPreferredHeights_[row]
            const child = this.children_[childIndex]
            this.constraintsScratch_.maxWidth = cellWidth
            this.constraintsScratch_.maxHeight = cellHeight
            child.measure(this.constraintsScratch_, this.measureScratch_)
            this.arrangeChildInCell(child, x, y, cellWidth, cellHeight)
            x += cellWidth + this.columnGap_
          }
          y += this.rowPreferredHeights_[row] + this.rowGap_
        }
      }

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

    private effectiveRowCount(): number {
      if (this.columnCount_ <= 0 || this.children_.length <= 0) return 0
      return Math.idiv(this.children_.length + this.columnCount_ - 1, this.columnCount_)
    }

    private measureTracks(constraints: UiLayoutConstraints, rowCount: number): void {
      ensureLayoutTrackCount(this.columnMinWidths_, this.columnCount_)
      ensureLayoutTrackCount(this.columnPreferredWidths_, this.columnCount_)
      ensureLayoutTrackCount(this.rowMinHeights_, rowCount)
      ensureLayoutTrackCount(this.rowPreferredHeights_, rowCount)
      clearLayoutTrackValues(this.columnMinWidths_, this.columnCount_)
      clearLayoutTrackValues(this.columnPreferredWidths_, this.columnCount_)
      clearLayoutTrackValues(this.rowMinHeights_, rowCount)
      clearLayoutTrackValues(this.rowPreferredHeights_, rowCount)

      if (this.columnCount_ <= 0) return

      this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth - this.totalColumnGap(rowCount))
      this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight - this.totalRowGap(rowCount))

      for (let i = 0; i < this.children_.length; i++) {
        const row = Math.idiv(i, this.columnCount_)
        const column = i % this.columnCount_
        this.children_[i].measure(this.constraintsScratch_, this.measureScratch_)
        this.columnMinWidths_[column] = Math.max(this.columnMinWidths_[column], this.measureScratch_.minWidth)
        this.columnPreferredWidths_[column] = Math.max(
          this.columnPreferredWidths_[column],
          this.measureScratch_.preferredWidth
        )
        this.rowMinHeights_[row] = Math.max(this.rowMinHeights_[row], this.measureScratch_.minHeight)
        this.rowPreferredHeights_[row] = Math.max(this.rowPreferredHeights_[row], this.measureScratch_.preferredHeight)
      }
    }

    private totalColumnGap(rowCount: number): number {
      if (rowCount <= 0) return 0
      return this.columnGap_ * Math.max(0, this.columnCount_ - 1)
    }

    private totalRowGap(rowCount: number): number {
      return this.rowGap_ * Math.max(0, rowCount - 1)
    }

    private arrangeChildInCell(
      child: UiLayoutNode,
      x: number,
      y: number,
      cellWidth: number,
      cellHeight: number
    ): void {
      const childWidth = _uiLayout.alignedSize(cellWidth, this.measureScratch_.preferredWidth, this.horizontalAlignment_)
      const childHeight = _uiLayout.alignedSize(cellHeight, this.measureScratch_.preferredHeight, this.verticalAlignment_)
      this.rectScratch_.set(
        _uiLayout.alignedOffset(x, cellWidth, childWidth, this.horizontalAlignment_),
        _uiLayout.alignedOffset(y, cellHeight, childHeight, this.verticalAlignment_),
        childWidth,
        childHeight
      )
      child.arrange(this.rectScratch_)
    }
  }

  /**
   * Arranges explicit rows with independent column tracks.
   */
  export class UiRaggedGridLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private rows_: UiLayoutNode[][]
    private rowGap_: number
    private columnGap_: number
    private horizontalAlignment_: UiLayoutAlignment
    private verticalAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect
    private rowMinWidths_: number[]
    private rowPreferredWidths_: number[]
    private rowMinHeights_: number[]
    private rowPreferredHeights_: number[]

    constructor(options: UiRaggedGridLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.rows_ = []
      this.rowGap_ = _uiLayout.sanitizeDimension(options.rowGap)
      this.columnGap_ = _uiLayout.sanitizeDimension(options.columnGap)
      this.horizontalAlignment_ = options.horizontalAlignment || "start"
      this.verticalAlignment_ = options.verticalAlignment || "start"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      this.rowMinWidths_ = []
      this.rowPreferredWidths_ = []
      this.rowMinHeights_ = []
      this.rowPreferredHeights_ = []
      this.appendInitialRows(options.rows)
    }

    /**
     * Number of rows in insertion order.
     */
    public get rowCount(): number {
      return this.rows_.length
    }

    /**
     * Space between adjacent rows in logical viewport pixels.
     */
    public get rowGap(): number {
      return this.rowGap_
    }

    /**
     * Space between adjacent columns in a row in logical viewport pixels.
     */
    public get columnGap(): number {
      return this.columnGap_
    }

    /**
     * Horizontal placement inside each cell.
     */
    public get horizontalAlignment(): UiLayoutAlignment {
      return this.horizontalAlignment_
    }

    /**
     * Vertical placement inside each cell.
     */
    public get verticalAlignment(): UiLayoutAlignment {
      return this.verticalAlignment_
    }

    /**
     * Returns the number of children in one row.
     */
    public childCountInRow(row: number): number {
      if (row < 0 || row >= this.rows_.length) return 0
      return this.rows_[row].length
    }

    /**
     * Returns the child at `row` and `column`, or `undefined` when out of range.
     */
    public childAt(row: number, column: number): UiLayoutNode | undefined {
      if (row < 0 || row >= this.rows_.length) return undefined
      if (column < 0 || column >= this.rows_[row].length) return undefined
      return this.rows_[row][column]
    }

    /**
     * Appends a row and returns its index.
     */
    public appendRow(children?: UiLayoutNode[]): number {
      const row: UiLayoutNode[] = []
      if (children) {
        for (let i = 0; i < children.length; i++) row.push(children[i])
      }
      this.rows_.push(row)
      this.invalidateLayout()
      return this.rows_.length - 1
    }

    /**
     * Appends a child to an existing row.
     */
    public appendChildToRow(row: number, child: UiLayoutNode): boolean {
      if (row < 0 || row >= this.rows_.length) return false
      this.rows_[row].push(child)
      this.invalidateLayout()
      return true
    }

    /**
     * Removes all rows and children.
     */
    public clearChildren(): void {
      while (this.rows_.length) this.rows_.pop()
      this.invalidateLayout()
    }

    /**
     * Updates the space between adjacent rows.
     */
    public setRowGap(rowGap: number): void {
      this.rowGap_ = _uiLayout.sanitizeDimension(rowGap)
      this.invalidateLayout()
    }

    /**
     * Updates the space between adjacent columns.
     */
    public setColumnGap(columnGap: number): void {
      this.columnGap_ = _uiLayout.sanitizeDimension(columnGap)
      this.invalidateLayout()
    }

    /**
     * Updates horizontal placement inside each cell.
     */
    public setHorizontalAlignment(alignment: UiLayoutAlignment): void {
      this.horizontalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    /**
     * Updates vertical placement inside each cell.
     */
    public setVerticalAlignment(alignment: UiLayoutAlignment): void {
      this.verticalAlignment_ = alignment || "start"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      this.measureRows(constraints)
      const minWidth = maxLayoutTrack(this.rowMinWidths_, this.rows_.length)
      const preferredWidth = maxLayoutTrack(this.rowPreferredWidths_, this.rows_.length)
      const minHeight = sumLayoutTracks(this.rowMinHeights_, this.rows_.length) + this.totalRowGap()
      const preferredHeight = sumLayoutTracks(this.rowPreferredHeights_, this.rows_.length) + this.totalRowGap()

      measureLayoutSpec(this.layoutSpec, constraints, minWidth, minHeight, preferredWidth, preferredHeight, output)
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.constraintsScratch_.maxWidth = this.finalRect.width
      this.constraintsScratch_.maxHeight = this.finalRect.height
      this.measureRows(this.constraintsScratch_)

      let y = this.finalRect.y
      for (let row = 0; row < this.rows_.length; row++) {
        let x = this.finalRect.x
        for (let column = 0; column < this.rows_[row].length; column++) {
          const child = this.rows_[row][column]
          this.constraintsScratch_.maxWidth = this.finalRect.width
          this.constraintsScratch_.maxHeight = this.rowPreferredHeights_[row]
          child.measure(this.constraintsScratch_, this.measureScratch_)
          this.arrangeChildInCell(child, x, y, this.measureScratch_.preferredWidth, this.rowPreferredHeights_[row])
          x += this.measureScratch_.preferredWidth + this.columnGap_
        }
        y += this.rowPreferredHeights_[row] + this.rowGap_
      }

      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    private appendInitialRows(rows: UiLayoutNode[][] | undefined): void {
      if (!rows) return
      for (let i = 0; i < rows.length; i++) this.appendRowWithoutInvalidation(rows[i])
    }

    private appendRowWithoutInvalidation(children: UiLayoutNode[]): void {
      const row: UiLayoutNode[] = []
      for (let i = 0; i < children.length; i++) row.push(children[i])
      this.rows_.push(row)
    }

    private measureRows(constraints: UiLayoutConstraints): void {
      ensureLayoutTrackCount(this.rowMinWidths_, this.rows_.length)
      ensureLayoutTrackCount(this.rowPreferredWidths_, this.rows_.length)
      ensureLayoutTrackCount(this.rowMinHeights_, this.rows_.length)
      ensureLayoutTrackCount(this.rowPreferredHeights_, this.rows_.length)
      clearLayoutTrackValues(this.rowMinWidths_, this.rows_.length)
      clearLayoutTrackValues(this.rowPreferredWidths_, this.rows_.length)
      clearLayoutTrackValues(this.rowMinHeights_, this.rows_.length)
      clearLayoutTrackValues(this.rowPreferredHeights_, this.rows_.length)

      this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth)
      this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight - this.totalRowGap())

      for (let row = 0; row < this.rows_.length; row++) {
        const rowChildren = this.rows_[row]
        const rowGap = this.columnGap_ * Math.max(0, rowChildren.length - 1)
        let rowMinWidth = rowGap
        let rowPreferredWidth = rowGap
        let rowMinHeight = 0
        let rowPreferredHeight = 0

        if (!rowChildren.length) {
          rowMinWidth = 0
          rowPreferredWidth = 0
        }

        for (let column = 0; column < rowChildren.length; column++) {
          rowChildren[column].measure(this.constraintsScratch_, this.measureScratch_)
          rowMinWidth += this.measureScratch_.minWidth
          rowPreferredWidth += this.measureScratch_.preferredWidth
          rowMinHeight = Math.max(rowMinHeight, this.measureScratch_.minHeight)
          rowPreferredHeight = Math.max(rowPreferredHeight, this.measureScratch_.preferredHeight)
        }

        this.rowMinWidths_[row] = rowMinWidth
        this.rowPreferredWidths_[row] = rowPreferredWidth
        this.rowMinHeights_[row] = rowMinHeight
        this.rowPreferredHeights_[row] = rowPreferredHeight
      }
    }

    private totalRowGap(): number {
      return this.rowGap_ * Math.max(0, this.rows_.length - 1)
    }

    private arrangeChildInCell(
      child: UiLayoutNode,
      x: number,
      y: number,
      cellWidth: number,
      cellHeight: number
    ): void {
      const childWidth = _uiLayout.alignedSize(cellWidth, this.measureScratch_.preferredWidth, this.horizontalAlignment_)
      const childHeight = _uiLayout.alignedSize(cellHeight, this.measureScratch_.preferredHeight, this.verticalAlignment_)
      this.rectScratch_.set(
        _uiLayout.alignedOffset(x, cellWidth, childWidth, this.horizontalAlignment_),
        _uiLayout.alignedOffset(y, cellHeight, childHeight, this.verticalAlignment_),
        childWidth,
        childHeight
      )
      child.arrange(this.rectScratch_)
    }
  }

  /**
   * Arranges children as layers in the same parent rectangle.
   */
  export class UiStackLayout implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private children_: UiLayoutNode[]
    private padding_: UiLayoutEdgeInsets
    private horizontalAlignment_: UiLayoutAlignment
    private verticalAlignment_: UiLayoutAlignment
    private constraintsScratch_: UiLayoutConstraints
    private measureScratch_: UiMeasuredSize
    private rectScratch_: Rect

    constructor(options: UiStackLayoutOptions) {
      this.layoutSpec = options.layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.children_ = []
      this.padding_ = { top: 0, right: 0, bottom: 0, left: 0 }
      this.horizontalAlignment_ = options.horizontalAlignment || "stretch"
      this.verticalAlignment_ = options.verticalAlignment || "stretch"
      this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
      this.measureScratch_ = new UiMeasuredSize()
      this.rectScratch_ = new Rect()
      _uiLayout.copyEdgeInsets(this.padding_, options.padding)
      this.appendInitialChildren(options.children)
    }

    /**
     * Number of child layers.
     */
    public get childCount(): number {
      return this.children_.length
    }

    /**
     * Horizontal placement for each layer.
     */
    public get horizontalAlignment(): UiLayoutAlignment {
      return this.horizontalAlignment_
    }

    /**
     * Vertical placement for each layer.
     */
    public get verticalAlignment(): UiLayoutAlignment {
      return this.verticalAlignment_
    }

    /**
     * Returns the layer at `index`, or `undefined` when out of range.
     *
     * Lower indexes are lower layers.
     */
    public childAt(index: number): UiLayoutNode | undefined {
      if (index < 0 || index >= this.children_.length) return undefined
      return this.children_[index]
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
     * Appends a layer above existing children.
     */
    public appendChild(child: UiLayoutNode): void {
      this.children_.push(child)
      this.invalidateLayout()
    }

    /**
     * Removes all child layers.
     */
    public clearChildren(): void {
      while (this.children_.length) this.children_.pop()
      this.invalidateLayout()
    }

    /**
     * Updates the edge insets.
     */
    public setPadding(padding: number | UiLayoutEdgeInsets): void {
      _uiLayout.copyEdgeInsets(this.padding_, padding)
      this.invalidateLayout()
    }

    /**
     * Updates horizontal placement for each layer.
     */
    public setHorizontalAlignment(alignment: UiLayoutAlignment): void {
      this.horizontalAlignment_ = alignment || "stretch"
      this.invalidateLayout()
    }

    /**
     * Updates vertical placement for each layer.
     */
    public setVerticalAlignment(alignment: UiLayoutAlignment): void {
      this.verticalAlignment_ = alignment || "stretch"
      this.invalidateLayout()
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const horizontalPadding = this.padding_.left + this.padding_.right
      const verticalPadding = this.padding_.top + this.padding_.bottom
      let minWidth = 0
      let minHeight = 0
      let preferredWidth = 0
      let preferredHeight = 0

      this.constraintsScratch_.maxWidth = _uiLayout.sanitizeDimension(constraints.maxWidth - horizontalPadding)
      this.constraintsScratch_.maxHeight = _uiLayout.sanitizeDimension(constraints.maxHeight - verticalPadding)

      for (let i = 0; i < this.children_.length; i++) {
        this.children_[i].measure(this.constraintsScratch_, this.measureScratch_)
        minWidth = Math.max(minWidth, this.measureScratch_.minWidth)
        minHeight = Math.max(minHeight, this.measureScratch_.minHeight)
        preferredWidth = Math.max(preferredWidth, this.measureScratch_.preferredWidth)
        preferredHeight = Math.max(preferredHeight, this.measureScratch_.preferredHeight)
      }

      measureLayoutSpec(
        this.layoutSpec,
        constraints,
        minWidth + horizontalPadding,
        minHeight + verticalPadding,
        preferredWidth + horizontalPadding,
        preferredHeight + verticalPadding,
        output
      )
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      const contentX = this.finalRect.x + this.padding_.left
      const contentY = this.finalRect.y + this.padding_.top
      const contentWidth = _uiLayout.sanitizeDimension(this.finalRect.width - this.padding_.left - this.padding_.right)
      const contentHeight = _uiLayout.sanitizeDimension(this.finalRect.height - this.padding_.top - this.padding_.bottom)

      this.constraintsScratch_.maxWidth = contentWidth
      this.constraintsScratch_.maxHeight = contentHeight

      for (let i = 0; i < this.children_.length; i++) {
        const child = this.children_[i]
        child.measure(this.constraintsScratch_, this.measureScratch_)
        const childWidth = _uiLayout.alignedSize(contentWidth, this.measureScratch_.preferredWidth, this.horizontalAlignment_)
        const childHeight = _uiLayout.alignedSize(contentHeight, this.measureScratch_.preferredHeight, this.verticalAlignment_)
        this.rectScratch_.set(
          _uiLayout.alignedOffset(contentX, contentWidth, childWidth, this.horizontalAlignment_),
          _uiLayout.alignedOffset(contentY, contentHeight, childHeight, this.verticalAlignment_),
          childWidth,
          childHeight
        )
        child.arrange(this.rectScratch_)
      }

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

  }

  function ensureLayoutTrackCount(values: number[], count: number): void {
    while (values.length < count) values.push(0)
  }

  function clearLayoutTrackValues(values: number[], count: number): void {
    for (let i = 0; i < count; i++) values[i] = 0
  }

  function sumLayoutTracks(values: number[], count: number): number {
    let result = 0
    for (let i = 0; i < count; i++) result += values[i]
    return result
  }

  function maxLayoutTrack(values: number[], count: number): number {
    let result = 0
    for (let i = 0; i < count; i++) result = Math.max(result, values[i])
    return result
  }
}
