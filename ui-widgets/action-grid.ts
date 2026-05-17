namespace ui {
    /**
     * Options for a rectangular or ragged action grid.
     */
    export interface UiActionGridOptions<T> {
        /**
         * Focus scope id for this grid.
         */
        scopeId: UiFocusScopeId

        /**
         * Caller-owned item records in grid order.
         */
        items: UiActionItem<T>[]

        /**
         * Item id to focus first when available.
         */
        defaultItemId?: string

        /**
         * Scroll owner used when this grid is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Whether movement may wrap inside the grid.
         */
        wrap?: boolean

        /**
         * Number of columns for rectangular grids. Defaults to the item count.
         */
        columnCount?: number

        /**
         * Row lengths for ragged grids. Omitted values use `columnCount`.
         */
        rows?: number[]

        /**
         * Sizing request for the grid as a layout node.
         */
        layoutSpec?: UiLayoutSpec

        /**
         * Width assigned to each item.
         */
        itemWidth?: number

        /**
         * Height assigned to each item.
         */
        itemHeight?: number

        /**
         * Space between adjacent rows.
         */
        rowGap?: number

        /**
         * Space between adjacent columns.
         */
        columnGap?: number

        /**
         * Button style used by items without a custom draw callback.
         */
        buttonStyle?: UiButtonStyle

        /**
         * Called when an enabled grid item is activated.
         */
        onActivate?: UiActionActivateHandler<T>
    }

    /**
     * Result emitted by a non-modal action grid.
     */
    export type UiActionGridResult<T> =
        | { kind: "activated"; itemId: string; value: T; item: UiActionItem<T> }
        | {
              kind: "exited"
              direction: UiFocusDirection
              scopeId: UiFocusScopeId
              itemId?: string
          }

    /**
     * Renders and navigates a rectangular or ragged action grid.
     */
    export class UiActionGrid<T> implements UiLayoutNode {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private items_: UiActionItem<T>[]
        private defaultItemId_: string
        private scrollOwnerId_: UiFocusScrollOwnerId
        private wrap_: boolean
        private columnCount_: number
        private rows_: number[]
        private itemWidth_: number
        private itemHeight_: number
        private rowGap_: number
        private columnGap_: number
        private itemRects_: Rect[]
        private registeredTargetIds_: string[]
        private itemButtonView_: UiButtonView
        private buttonStyle_: UiButtonStyle
        private onActivate_: UiActionActivateHandler<T>

        constructor(options: UiActionGridOptions<T>) {
            this.scopeId_ = options.scopeId
            this.items_ = options.items
            this.defaultItemId_ = options.defaultItemId
            this.scrollOwnerId_ = options.scrollOwnerId
            this.wrap_ = options.wrap || false
            this.columnCount_ = _uiWidgets.sanitizeDimension(
                options.columnCount,
                Math.max(1, options.items.length),
            )
            this.rows_ = options.rows
            this.itemWidth_ = _uiWidgets.itemWidth(options.itemWidth)
            this.itemHeight_ = _uiWidgets.itemHeight(options.itemHeight)
            this.rowGap_ = _uiWidgets.gap(options.rowGap)
            this.columnGap_ = _uiWidgets.gap(options.columnGap)
            this.layoutSpec =
                options.layoutSpec || _uiWidgets.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.itemRects_ = []
            this.registeredTargetIds_ = []
            this.buttonStyle_ = options.buttonStyle
            this.itemButtonView_ = new UiButtonView({
                style: options.buttonStyle,
            })
            this.onActivate_ = options.onActivate
        }

        /**
         * Focus scope id used by this grid.
         */
        public get scopeId(): UiFocusScopeId {
            return this.scopeId_
        }

        /**
         * Current caller-owned item array.
         */
        public get items(): UiActionItem<T>[] {
            return this.items_
        }

        /**
         * Replaces the caller-owned item array used on later layout and render passes.
         */
        public setItems(items: UiActionItem<T>[]): void {
            this.items_ = items
            this.invalidateLayout()
        }

        /**
         * Measures this grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const rowCount = this.rowCount()
            const columnCount = this.maxColumnCount()
            const width =
                columnCount > 0
                    ? columnCount * this.itemWidth_ +
                      (columnCount - 1) * this.columnGap_
                    : 0
            const height =
                rowCount > 0
                    ? rowCount * this.itemHeight_ +
                      (rowCount - 1) * this.rowGap_
                    : 0
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                width,
                height,
                width,
                height,
                output,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges grid item rectangles in the assigned bounds.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.ensureItemRects()
            for (let i = 0; i < this.items_.length; i++) {
                const row = this.rowForIndex(i)
                const column = this.columnForIndex(i)
                this.itemRects_[i].set(
                    this.finalRect.x +
                        column * (this.itemWidth_ + this.columnGap_),
                    this.finalRect.y + row * (this.itemHeight_ + this.rowGap_),
                    this.itemWidth_,
                    this.itemHeight_,
                )
            }
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the grid as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this grid's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Copies one arranged item rectangle into `output`.
         */
        public getItemRect(itemId: string, output: Rect): boolean {
            for (let i = 0; i < this.items_.length; i++) {
                if (this.items_[i].id == itemId && this.itemRects_[i]) {
                    output.copyFrom(this.itemRects_[i])
                    return true
                }
            }
            return false
        }

        /**
         * Registers this grid's focus scope and targets.
         */
        public registerFocusTargets(
            focus: UiFocusState,
            scopeOptions?: UiFocusScopeOptions,
        ): void {
            const preferred = _uiWidgets.preferredItemId(
                this.scopeId_,
                this.items_,
                this.defaultItemId_,
            )
            focus.setScope(
                scopeOptions || {
                    id: this.scopeId_,
                    preferredTargetId: preferred,
                    wrap: this.wrap_,
                },
            )
            this.registerTargets(focus)
        }

        /**
         * Registers grid or ragged-grid navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            if (this.rows_) {
                controller.setNavigation(this.scopeId_, {
                    kind: "raggedGrid",
                    rows: this.raggedNavigationRows(),
                    wrap: this.wrap_,
                })
            } else {
                controller.setNavigation(this.scopeId_, {
                    kind: "grid",
                    cells: this.gridNavigationCells(),
                    wrap: this.wrap_,
                })
            }
        }

        /**
         * Focuses the grid's retained, default, selected, or first enabled item.
         */
        public focusDefault(focus: UiFocusState): UiFocusSetResult {
            return focus.setActiveScope(this.scopeId_)
        }

        /**
         * Returns the target id chosen by default-item and selected-item rules.
         */
        public resolvePreferredTargetId(): UiFocusId | undefined {
            return _uiWidgets.preferredItemId(
                this.scopeId_,
                this.items_,
                this.defaultItemId_,
            )
        }

        /**
         * Converts a focus input result into a grid result when one occurred.
         */
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiActionGridResult<T> {
            if (
                result.kind == "activated" &&
                result.detail &&
                result.detail.activationResult
            ) {
                const activation = this.createResultForActivation(
                    result.detail.activationResult,
                )
                this.emitActivate(activation)
                return activation
            }
            if (
                result.kind == "exited" &&
                result.detail &&
                result.detail.moveResult
            ) {
                return this.createResultForMove(result.detail.moveResult)
            }
            return undefined
        }

        /**
         * Converts a focus activation result into a typed grid activation.
         */
        public createResultForActivation(
            result: UiFocusActivationResult,
        ): UiActionGridResult<T> {
            if (result.kind != "activated" || result.scopeId != this.scopeId_)
                return undefined
            const item = _uiWidgets.findItemByTargetId(
                this.scopeId_,
                this.items_,
                result.targetId,
            )
            if (!item) return undefined
            return {
                kind: "activated",
                itemId: item.id,
                value: item.value,
                item,
            }
        }

        /**
         * Converts a focus movement result into a generic grid boundary exit.
         */
        public createResultForMove(
            result: UiFocusMoveResult,
        ): UiActionGridResult<T> {
            if (result.kind != "exited" || result.scopeId != this.scopeId_)
                return undefined
            return {
                kind: "exited",
                direction: result.direction,
                scopeId: result.scopeId,
                itemId: _uiWidgets.itemIdFromTargetId(
                    this.scopeId_,
                    result.targetId,
                ),
            }
        }

        /**
         * Renders visible grid items through the supplied draw surface.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            this.ensureItemRects()
            const activeTargetId = focus
                ? focus.getActiveTargetId(this.scopeId_)
                : undefined
            let focusedIndex = -1
            for (let i = 0; i < this.items_.length; i++) {
                const item = this.items_[i]
                if (!_uiWidgets.isVisible(item)) continue
                const focused =
                    activeTargetId ==
                    _uiWidgets.targetId(this.scopeId_, item.id)
                if (focused && !item.draw) focusedIndex = i
                _uiWidgets.renderActionItem(
                    surface,
                    assets,
                    item,
                    this.itemRects_[i],
                    focused && !!item.draw,
                    this.itemButtonView_,
                    this.buttonStyle_,
                )
            }
            if (focusedIndex >= 0) {
                _uiWidgets.renderActionItemFocus(
                    surface,
                    assets,
                    this.items_[focusedIndex],
                    this.itemRects_[focusedIndex],
                    this.itemButtonView_,
                    this.buttonStyle_,
                )
            }
        }

        private registerTargets(focus: UiFocusState): void {
            this.ensureItemRects()
            const currentTargetIds: string[] = []
            for (let i = 0; i < this.items_.length; i++) {
                currentTargetIds.push(
                    _uiWidgets.targetId(this.scopeId_, this.items_[i].id),
                )
            }
            for (let i = 0; i < this.registeredTargetIds_.length; i++) {
                const targetId = this.registeredTargetIds_[i]
                if (!_uiWidgets.containsString(currentTargetIds, targetId))
                    focus.removeTarget(targetId)
            }
            for (let i = 0; i < this.items_.length; i++) {
                const item = this.items_[i]
                const rect = this.itemRects_[i] || new Rect()
                focus.setTarget({
                    id: _uiWidgets.targetId(this.scopeId_, item.id),
                    scopeId: this.scopeId_,
                    rect,
                    scrollOwnerId: this.scrollOwnerId_,
                    scrollRect: this.scrollOwnerId_ ? rect : undefined,
                    disabled: _uiWidgets.isDisabled(item),
                    hidden: !_uiWidgets.isVisible(item),
                    activatable: true,
                })
            }
            this.registeredTargetIds_ = currentTargetIds
        }

        private ensureItemRects(): void {
            while (this.itemRects_.length < this.items_.length)
                this.itemRects_.push(new Rect())
            while (this.itemRects_.length > this.items_.length)
                this.itemRects_.pop()
        }

        private gridNavigationCells(): UiFocusGridNavigationCell[] {
            this.ensureItemRects()
            const cells: UiFocusGridNavigationCell[] = []
            for (let i = 0; i < this.items_.length; i++) {
                const item = this.items_[i]
                const rect = this.itemRects_[i]
                cells.push({
                    row: this.rowForIndex(i),
                    column: this.columnForIndex(i),
                    target: this.navigationTarget(item, rect),
                })
            }
            return cells
        }

        private raggedNavigationRows(): UiFocusNavigationTarget[][] {
            this.ensureItemRects()
            const rows: UiFocusNavigationTarget[][] = []
            let index = 0
            for (let row = 0; row < this.rowCount(); row++) {
                const rowTargets: UiFocusNavigationTarget[] = []
                const count = this.rowLength(row)
                for (
                    let column = 0;
                    column < count && index < this.items_.length;
                    column++
                ) {
                    rowTargets.push(
                        this.navigationTarget(
                            this.items_[index],
                            this.itemRects_[index],
                        ),
                    )
                    index++
                }
                rows.push(rowTargets)
            }
            return rows
        }

        private navigationTarget(
            item: UiActionItem<T>,
            rect: Rect,
        ): UiFocusNavigationTarget {
            return {
                id: _uiWidgets.targetId(this.scopeId_, item.id),
                rect,
                scrollOwnerId: this.scrollOwnerId_,
                scrollRect: this.scrollOwnerId_ ? rect : undefined,
                disabled: _uiWidgets.isDisabled(item),
                hidden: !_uiWidgets.isVisible(item),
            }
        }

        private rowForIndex(index: number): number {
            if (!this.rows_) return Math.idiv(index, this.columnCount_)
            let remaining = index
            for (let row = 0; row < this.rows_.length; row++) {
                const count = this.rowLength(row)
                if (remaining < count) return row
                remaining -= count
            }
            return this.rows_.length
        }

        private columnForIndex(index: number): number {
            if (!this.rows_) return index % this.columnCount_
            let remaining = index
            for (let row = 0; row < this.rows_.length; row++) {
                const count = this.rowLength(row)
                if (remaining < count) return remaining
                remaining -= count
            }
            return remaining
        }

        private rowCount(): number {
            if (this.rows_) return this.rows_.length
            return Math.idiv(
                this.items_.length + this.columnCount_ - 1,
                this.columnCount_,
            )
        }

        private rowLength(row: number): number {
            if (!this.rows_) return this.columnCount_
            if (row < 0 || row >= this.rows_.length) return 0
            return _uiWidgets.sanitizeDimension(this.rows_[row], 0)
        }

        private maxColumnCount(): number {
            if (!this.rows_) return this.columnCount_
            let max = 0
            for (let i = 0; i < this.rows_.length; i++) {
                max = Math.max(max, this.rowLength(i))
            }
            return max
        }

        private emitActivate(result: UiActionGridResult<T>): void {
            if (!this.onActivate_ || !result || result.kind != "activated")
                return
            this.onActivate_(result.value, result.item, result.itemId)
        }
    }
}
