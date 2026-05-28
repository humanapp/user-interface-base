namespace ui {
    /**
     * Options for a rectangular or ragged control grid.
     */
    export interface UiGridOptions<T>
        extends UiControlCollectionOptions<T>, UiControlGridLayoutOptions {
        /**
         * Focus scope id for this grid.
         */
        scopeId: UiFocusScopeId

        /**
         * Scroll owner used when this grid is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Row lengths for ragged grids. Omitted values use `columnCount`.
         */
        rows?: number[]

        /**
         * Bounds used to keep control focus labels visible. Omitted values use the
         * active display surface's pixel bounds when available.
         */
        labelBounds?: Rect
    }

    /**
     * Result emitted by a non-modal control grid.
     */
    export type UiGridResult<T> =
        | {
              kind: "activated"
              controlId: string
              value: T
              control: UiControl<T>
          }
        | {
              kind: "exited"
              direction: UiFocusDirection
              scopeId: UiFocusScopeId
              controlId?: string
          }

    /**
     * Renders and navigates a rectangular or ragged control grid.
     */
    export class UiGrid<T> implements UiFocusableView<UiGridResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private controls_: UiControl<T>[]
        private defaultControlId_: string
        private scrollOwnerId_: UiFocusScrollOwnerId
        private columnCount_: number
        private rows_: number[]
        private controlWidth_: number
        private controlHeight_: number
        private rowGap_: number
        private columnGap_: number
        private controlRects_: Rect[]
        private controlView_: UiButtonView
        private controlStyle_: UiButtonStyle
        private labelBounds_: Rect
        private onActivate_: UiControlActivateHandler<T>

        constructor(options: UiGridOptions<T>) {
            this.scopeId_ = options.scopeId
            this.controls_ = options.controls
            this.defaultControlId_ = options.defaultControlId
            this.scrollOwnerId_ = options.scrollOwnerId
            this.columnCount_ = _uiControls.sanitizeDimension(
                options.columnCount,
                Math.max(1, options.controls.length),
            )
            this.rows_ = options.rows
            this.controlWidth_ = _uiControls.controlWidth(options.controlSize)
            this.controlHeight_ = _uiControls.controlHeight(options.controlSize)
            this.rowGap_ = _uiControls.gap(options.rowGap)
            this.columnGap_ = _uiControls.gap(options.columnGap)
            this.layoutSpec = _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.controlRects_ = []
            this.controlStyle_ = options.controlStyle
            this.labelBounds_ = options.labelBounds
            this.controlView_ = new UiButtonView(options.controlStyle)
            this.onActivate_ = options.onActivate
        }

        /**
         * Focus scope id used by this grid.
         */
        public get scopeId(): UiFocusScopeId {
            return this.scopeId_
        }

        /**
         * Current caller-owned control array.
         */
        public get controls(): UiControl<T>[] {
            return this.controls_
        }

        /**
         * Measures this grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const width = this.contentWidth()
            const height = this.contentHeight()
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
         * Arranges grid control rectangles in the assigned bounds.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.ensureControlRects()
            for (let i = 0; i < this.controls_.length; i++) {
                const row = this.rowForIndex(i)
                const column = this.columnForIndex(i)
                this.controlRects_[i].set(
                    this.finalRect.x +
                        column * (this.controlWidth_ + this.columnGap_),
                    this.finalRect.y +
                        row * (this.controlHeight_ + this.rowGap_),
                    this.controlWidth_,
                    this.controlHeight_,
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
         * Resolves resolver-backed content ids for grid controls.
         */
        public _resolveContentAssets(assets: UiAssetResolver): void {
            _uiControls.resolveControlCollectionContent(this.controls_, assets)
        }

        /**
         * Copies one arranged control rectangle into `output`.
         */
        public getControlRect(controlId: string, output: Rect): boolean {
            for (let i = 0; i < this.controls_.length; i++) {
                if (
                    this.controls_[i].id == controlId &&
                    this.controlRects_[i]
                ) {
                    output.copyFrom(this.controlRects_[i])
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
            const preferred = _uiControls.preferredControlId(
                this.scopeId_,
                this.controls_,
                this.defaultControlId_,
            )
            focus.setScope(
                scopeOptions || {
                    id: this.scopeId_,
                    preferredTargetId: preferred,
                },
            )
            this.registerTargets(focus)
        }

        /**
         * Registers grid or ragged-grid navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            controller.setNavigation(this.scopeId_, {
                kind: "raggedGrid",
                rows: this.navigationRows(),
                horizontalWrap: true,
            })
        }

        /**
         * Focuses the grid's retained, default, or first enabled control.
         */
        public focusDefault(focus: UiFocusState): UiFocusSetResult {
            return focus.setActiveScope(this.scopeId_)
        }

        /**
         * Returns the target id chosen by default-control rules.
         */
        public resolvePreferredTargetId(): UiFocusId | undefined {
            return _uiControls.preferredControlId(
                this.scopeId_,
                this.controls_,
                this.defaultControlId_,
            )
        }

        /**
         * Returns focus navigation rows using this grid's current arranged rectangles.
         */
        public navigationRows(): UiFocusNavigationTarget[][] {
            this.ensureControlRects()
            const rows: UiFocusNavigationTarget[][] = []
            let index = 0
            for (let row = 0; row < this.rowCount(); row++) {
                const rowTargets: UiFocusNavigationTarget[] = []
                const count = this.rowLength(row)
                for (
                    let column = 0;
                    column < count && index < this.controls_.length;
                    column++
                ) {
                    const control = this.controls_[index]
                    const rect = this.controlRects_[index]
                    index++
                    if (!this.isNavigationControl(control)) continue
                    rowTargets.push(this.navigationTarget(control, rect))
                }
                rows.push(rowTargets)
            }
            return rows
        }

        /**
         * Converts a focus input result into a grid result when one occurred.
         */
        public handleFocusInput(result: UiFocusInputResult): UiGridResult<T> {
            if (result.kind == "activated") {
                const activation = this.createResultForActivation(
                    result.scopeId,
                    result.targetId,
                )
                this.emitActivate(activation)
                return activation
            }
            if (result.kind == "exited") {
                return this.createResultForMove(
                    result.scopeId,
                    result.targetId,
                    result.direction,
                )
            }
            return undefined
        }

        /**
         * Converts a focus activation result into a typed grid activation.
         */
        public createResultForActivation(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiGridResult<T> {
            if (scopeId != this.scopeId_) return undefined
            const control = _uiControls.findControlByTargetId(
                this.scopeId_,
                this.controls_,
                targetId,
            )
            if (!control) return undefined
            return {
                kind: "activated",
                controlId: control.id,
                value: control.value,
                control,
            }
        }

        /**
         * Converts a focus movement result into a generic grid boundary exit.
         */
        public createResultForMove(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
            direction: UiFocusDirection,
        ): UiGridResult<T> {
            if (scopeId != this.scopeId_) return undefined
            return {
                kind: "exited",
                direction,
                scopeId,
                controlId: _uiControls.controlIdFromTargetId(
                    this.scopeId_,
                    targetId,
                ),
            }
        }

        /**
         * Renders visible grid controls through the supplied draw surface.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            this.renderControls(surface, assets, focus)
            this.renderFocus(surface, assets, focus)
        }

        /**
         * Renders visible grid controls without the built-in focused overlay.
         */
        public renderControls(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            this.ensureControlRects()
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                this.labelBounds_,
            )
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!_uiControls.isVisible(control)) continue
                _uiControls.renderControl(
                    surface,
                    control,
                    this.controlRects_[i],
                    this.controlView_,
                    this.controlStyle_,
                    labelBounds,
                    undefined,
                    assets,
                )
            }
        }

        /**
         * Renders only the focused grid control's built-in focus treatment.
         */
        public renderFocus(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            this.ensureControlRects()
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                this.labelBounds_,
            )
            const activeTargetId =
                focus && focus.getActiveScopeId() == this.scopeId_
                    ? focus.getActiveTargetId(this.scopeId_)
                    : undefined
            const index = _uiControls.focusedControlOverlayIndex(
                this.scopeId_,
                this.controls_,
                activeTargetId,
            )
            if (index < 0) return
            _uiControls.renderControl(
                surface,
                this.controls_[index],
                this.controlRects_[index],
                this.controlView_,
                this.controlStyle_,
                labelBounds,
                true,
                assets,
            )
        }

        private registerTargets(focus: UiFocusState): void {
            this.ensureControlRects()
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                const rect = this.controlRects_[i] || new Rect()
                focus.setTarget({
                    id: _uiControls.targetId(this.scopeId_, control.id),
                    scopeId: this.scopeId_,
                    rect,
                    scrollOwnerId: this.scrollOwnerId_,
                    scrollRect: this.scrollOwnerId_ ? rect : undefined,
                    hidden: !_uiControls.isVisible(control),
                    activatable: true,
                })
            }
        }

        private ensureControlRects(): void {
            while (this.controlRects_.length < this.controls_.length)
                this.controlRects_.push(new Rect())
            while (this.controlRects_.length > this.controls_.length)
                this.controlRects_.pop()
        }

        private navigationTarget(
            control: UiControl<T>,
            rect: Rect,
        ): UiFocusNavigationTarget {
            return {
                id: _uiControls.targetId(this.scopeId_, control.id),
                rect,
                scrollOwnerId: this.scrollOwnerId_,
                scrollRect: this.scrollOwnerId_ ? rect : undefined,
                hidden: !_uiControls.isVisible(control),
            }
        }

        private isNavigationControl(control: UiControl<T>): boolean {
            return (
                _uiControls.isVisible(control) &&
                _uiControls.isFocusable(control)
            )
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
                this.controls_.length + this.columnCount_ - 1,
                this.columnCount_,
            )
        }

        private rowLength(row: number): number {
            if (!this.rows_) return this.columnCount_
            if (row < 0 || row >= this.rows_.length) return 0
            return _uiControls.sanitizeDimension(this.rows_[row], 0)
        }

        private contentWidth(): number {
            const columnCount = this.maxColumnCount()
            if (columnCount <= 0) return 0
            return (
                columnCount * this.controlWidth_ +
                (columnCount - 1) * this.columnGap_
            )
        }

        private contentHeight(): number {
            const rowCount = this.rowCount()
            if (rowCount <= 0) return 0
            return (
                rowCount * this.controlHeight_ + (rowCount - 1) * this.rowGap_
            )
        }

        private maxColumnCount(): number {
            if (!this.rows_) return this.columnCount_
            let max = 0
            for (let i = 0; i < this.rows_.length; i++) {
                max = Math.max(max, this.rowLength(i))
            }
            return max
        }

        private emitActivate(result: UiGridResult<T>): void {
            if (!result || result.kind != "activated") return
            _uiControls.emitControlActivate(
                result.value,
                result.control,
                result.controlId,
                this.onActivate_,
            )
        }
    }
}
