namespace ui {
    /**
     * Options for a modal picker or control grid.
     */
    export interface UiPickerOptions<T> {
        /**
         * Modal focus scope owned by this grid while open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Caller-owned modal control records.
         */
        controls: UiControl<T>[]

        /**
         * Visible modal title. Takes precedence over `titleId`.
         */
        title?: string

        /**
         * Resolver-backed modal title id.
         */
        titleId?: string

        /**
         * Static bitmap or resolver-backed bitmap id drawn in the title bar.
         */
        titleBitmap?: Bitmap | string

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Caller-owned controls rendered at the right edge of the title bar.
         */
        titleControls?: UiControl<T>[]

        /**
         * Whether activation emits `activated` with `close: true`. Defaults to `true`.
         */
        closeOnActivate?: boolean

        /**
         * Number of columns for rectangular modal grids.
         */
        columnCount?: number

        /**
         * Width assigned to each control.
         */
        controlWidth?: number

        /**
         * Height assigned to each control.
         */
        controlHeight?: number

        /**
         * Space between adjacent content rows.
         */
        rowGap?: number

        /**
         * Space between adjacent content columns.
         */
        columnGap?: number

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Width assigned to each title-bar control.
         */
        titleControlWidth?: number

        /**
         * Height assigned to each title-bar control.
         */
        titleControlHeight?: number

        /**
         * Space between adjacent title-bar controls.
         */
        titleControlGap?: number

        /**
         * Control style used by title-bar controls without a custom draw callback.
         */
        titleControlStyle?: UiButtonStyle

        /**
         * Panel, title, and spacing style for this modal.
         */
        modalStyle?: UiModalStyle

        /**
         * Called when an enabled modal control is activated.
         */
        onActivate?: UiControlActivateHandler<T>

        /**
         * Called when the modal reports cancellation.
         */
        onCancel?: UiPickerCancelHandler
    }

    /**
     * Handles modal cancellation.
     */
    export interface UiPickerCancelHandler {
        /**
         * Receives the cancelled modal focus scope id.
         */
        (modalScopeId: UiFocusScopeId): void
    }

    /**
     * Result emitted by a modal grid.
     */
    export type UiPickerResult<T> =
        | {
              kind: "activated"
              controlId: string
              value: T
              control: UiControl<T>
              close: true
          }
        | {
              kind: "keepOpen"
              controlId: string
              value: T
              control: UiControl<T>
              updatedValue?: T
          }
        | { kind: "cancelled"; modalScopeId: UiFocusScopeId }

    /**
     * Draws a modal panel using the supplied style.
     */
    export function drawModalPanel(
        surface: DrawSurface,
        rect: Rect,
        style?: UiModalStyle,
    ): void {
        const fill =
            style && style.panelColor !== undefined ? style.panelColor : 1
        surface.drawRoundedRect(rect, 15, fill)
    }

    /**
     * Modal picker or control grid backed by a `ui-core` modal focus scope.
     */
    export class UiPicker<T> implements UiModal<UiPickerResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private modalScopeId_: UiFocusScopeId
        private title_: string
        private titleId_: string
        private titleBitmap_: Bitmap | string
        private closeOnActivate_: boolean
        private style_: UiModalStyle
        private controls_: UiControl<T>[]
        private titleControls_: UiControl<T>[]
        private defaultControlId_: string
        private columnCount_: number
        private controlWidth_: number
        private controlHeight_: number
        private rowGap_: number
        private columnGap_: number
        private controlStyle_: UiButtonStyle
        private titleControlWidth_: number
        private titleControlHeight_: number
        private titleControlGap_: number
        private titleControlStyle_: UiButtonStyle
        private controlRects_: Rect[]
        private titleControlRects_: Rect[]
        private controlView_: UiButtonView
        private titleControlView_: UiButtonView
        private onActivate_: UiControlActivateHandler<T>
        private onCancel_: UiPickerCancelHandler

        constructor(options: UiPickerOptions<T>) {
            this.modalScopeId_ = options.modalScopeId
            this.title_ = options.title
            this.titleId_ = options.titleId
            this.titleBitmap_ = options.titleBitmap
            this.closeOnActivate_ = options.closeOnActivate !== false
            this.style_ = options.modalStyle || UiModalStyles.Default
            this.controls_ = options.controls
            this.titleControls_ = options.titleControls
            this.defaultControlId_ = options.defaultControlId
            this.columnCount_ = _uiControls.sanitizeDimension(
                options.columnCount,
                Math.max(1, options.controls.length),
            )
            this.controlWidth_ = _uiControls.controlWidth(options.controlWidth)
            this.controlHeight_ = _uiControls.controlHeight(
                options.controlHeight,
            )
            this.rowGap_ = _uiControls.gap(options.rowGap)
            this.columnGap_ = _uiControls.gap(options.columnGap)
            this.controlStyle_ = options.controlStyle
            this.titleControlWidth_ = _uiControls.controlWidth(
                options.titleControlWidth || options.controlWidth,
            )
            this.titleControlHeight_ = _uiControls.controlHeight(
                options.titleControlHeight || options.controlHeight,
            )
            this.titleControlGap_ = _uiControls.gap(options.titleControlGap)
            this.titleControlStyle_ =
                options.titleControlStyle || options.controlStyle
            this.controlRects_ = []
            this.titleControlRects_ = []
            this.controlView_ = new UiButtonView({
                style: options.controlStyle,
            })
            this.titleControlView_ = new UiButtonView({
                style: this.titleControlStyle_,
            })
            this.onActivate_ = options.onActivate
            this.onCancel_ = options.onCancel
            this.layoutSpec = _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
        }

        /**
         * Modal focus scope id used by this grid.
         */
        public get modalScopeId(): UiFocusScopeId {
            return this.modalScopeId_
        }

        /**
         * Current caller-owned control array.
         */
        public get controls(): UiControl<T>[] {
            return this.controls_
        }

        /**
         * Measures the modal grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const contentWidth = this.contentWidth()
            const contentHeight = this.contentHeight()
            const titleHeight = this.titleHeight()
            const contentMargin = this.contentMargin()
            const minWidth = Math.max(
                contentWidth,
                Math.max(
                    this.titleBandContentWidth(),
                    this.titleControlContentWidth(),
                ),
            )
            const preferredWidth = Math.max(
                contentWidth,
                Math.max(
                    this.titleBandContentWidth(),
                    this.titleControlContentWidth(),
                ),
            )
            output.set(
                minWidth + contentMargin * 2,
                contentHeight + titleHeight + contentMargin,
                preferredWidth + contentMargin * 2,
                contentHeight + titleHeight + contentMargin,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the modal panel and control grid.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            const titleHeight = this.titleHeight()
            const contentMargin = this.contentMargin()
            this.arrangeTitleControls(rect, contentMargin)
            this.arrangeControls(rect.x + contentMargin, rect.y + titleHeight)
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the modal grid as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this modal grid's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Registers the modal scope, control targets, and optional navigation.
         */
        public open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult {
            const scopeOptions: UiFocusScopeOptions = {
                id: this.modalScopeId_,
                parentScopeId: focus.getActiveScopeId(),
                preferredTargetId: this.resolvePreferredTargetId(),
                handlesCancel: true,
                modal: true,
            }
            focus.setScope(scopeOptions)
            this.registerTargets(focus, this.controls_, this.controlRects_)
            this.registerTargets(
                focus,
                this.titleControls_,
                this.titleControlRects_,
            )
            if (controller) this.registerNavigation(controller)
            return focus.setActiveScope(this.modalScopeId_)
        }

        /**
         * Restores focus to the parent modal scope through `ui-core`.
         */
        public close(focus: UiFocusState): UiFocusSetResult {
            return focus.closeModalScope(this.modalScopeId_)
        }

        /**
         * Returns the resolved title text.
         */
        public resolveTitleText(assets: UiAssetResolver): string {
            if (this.title_ !== undefined) return this.title_
            if (this.titleId_ !== undefined)
                return assets.getText(this.titleId_)
            return ""
        }

        /**
         * Converts focus activation into a modal activation or keep-open result.
         */
        public createResultForActivation(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiPickerResult<T> {
            const control = this.activatedControl(scopeId, targetId)
            if (!control) return undefined
            if (this.closeOnActivate_) {
                return {
                    kind: "activated",
                    controlId: control.id,
                    value: control.value,
                    control,
                    close: true,
                }
            }
            return {
                kind: "keepOpen",
                controlId: control.id,
                value: control.value,
                control,
            }
        }

        /**
         * Converts focus input into a modal result when one occurred.
         */
        public handleFocusInput(result: UiFocusInputResult): UiPickerResult<T> {
            if (result.kind == "activated") {
                const activation = this.createResultForActivation(
                    result.scopeId,
                    result.targetId,
                )
                this.emitActivate(activation)
                return activation
            }
            if (result.kind == "cancelled") {
                const cancelled: UiPickerResult<T> = {
                    kind: "cancelled",
                    modalScopeId: this.modalScopeId_,
                }
                this.emitCancel(cancelled)
                return cancelled
            }
            return undefined
        }

        /**
         * Renders the modal panel, title, and visible controls.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            drawModalPanel(surface, this.finalRect, this.style_)
            const title = this.resolveTitleText(assets)
            const titleBitmap = this.resolveTitleBitmap(assets)
            let titleX = this.finalRect.x + 4
            if (titleBitmap) {
                surface.drawBitmap(titleBitmap, titleX, this.finalRect.y + 4)
                titleX += titleBitmap.width + 2
            }
            if (title.length > 0)
                surface.drawText(title, titleX, this.finalRect.y + 4, {
                    color: this.titleColor(),
                })
            this.renderControls(
                surface,
                assets,
                this.controls_,
                this.controlRects_,
                this.controlView_,
                this.controlStyle_,
            )
            this.renderControls(
                surface,
                assets,
                this.titleControls_,
                this.titleControlRects_,
                this.titleControlView_,
                this.titleControlStyle_,
            )
            this.renderFocus(
                surface,
                assets,
                focus,
                this.controls_,
                this.controlRects_,
                this.controlView_,
                this.controlStyle_,
            )
            this.renderFocus(
                surface,
                assets,
                focus,
                this.titleControls_,
                this.titleControlRects_,
                this.titleControlView_,
                this.titleControlStyle_,
            )
        }

        private emitActivate(result: UiPickerResult<T>): void {
            if (
                !result ||
                (result.kind != "activated" && result.kind != "keepOpen")
            )
                return
            _uiControls.emitControlActivate(
                result.value,
                result.control,
                result.controlId,
                this.onActivate_,
            )
        }

        private emitCancel(result: UiPickerResult<T>): void {
            if (!this.onCancel_ || !result || result.kind != "cancelled") return
            this.onCancel_(result.modalScopeId)
        }

        private titleHeight(): number {
            if (this.hasTitleControls())
                return (
                    this.contentMargin() +
                    this.titleControlHeight_ +
                    this.titleGap()
                )
            if (
                !this.showTitleBar() &&
                this.title_ === undefined &&
                this.titleId_ === undefined &&
                this.titleBitmap_ === undefined
            )
                return this.contentMargin()
            return 16 + this.titleGap()
        }

        private contentMargin(): number {
            return _uiControls.sanitizeDimension(
                this.style_ ? this.style_.contentMargin : undefined,
                4,
            )
        }

        private titleGap(): number {
            return _uiControls.sanitizeDimension(
                this.style_ ? this.style_.titleGap : undefined,
                0,
            )
        }

        private titleColor(): number {
            return this.style_ && this.style_.titleColor !== undefined
                ? this.style_.titleColor
                : 15
        }

        private resolveTitleBitmap(
            assets: UiAssetResolver,
        ): Bitmap | undefined {
            if (this.titleBitmap_ === undefined) return undefined
            if (typeof this.titleBitmap_ == "string")
                return assets.getBitmap(this.titleBitmap_)
            return this.titleBitmap_
        }

        private showTitleBar(): boolean {
            return !this.style_ || this.style_.showTitleBar !== false
        }

        private hasTitleControls(): boolean {
            return !!this.titleControls_ && !!this.titleControls_.length
        }

        private arrangeTitleControls(rect: Rect, contentMargin: number): void {
            if (!this.hasTitleControls()) return
            this.ensureRects(this.titleControls_, this.titleControlRects_)
            let x =
                rect.x +
                rect.width -
                contentMargin -
                this.titleControlContentWidth()
            for (let i = 0; i < this.titleControls_.length; i++) {
                this.titleControlRects_[i].set(
                    x,
                    rect.y + contentMargin,
                    this.titleControlWidth_,
                    this.titleControlHeight_,
                )
                x += this.titleControlWidth_ + this.titleControlGap_
            }
        }

        private arrangeControls(x: number, y: number): void {
            this.ensureRects(this.controls_, this.controlRects_)
            for (let i = 0; i < this.controls_.length; i++) {
                const row = Math.idiv(i, this.columnCount_)
                const column = i % this.columnCount_
                this.controlRects_[i].set(
                    x + column * (this.controlWidth_ + this.columnGap_),
                    y + row * (this.controlHeight_ + this.rowGap_),
                    this.controlWidth_,
                    this.controlHeight_,
                )
            }
        }

        private resolvePreferredTargetId(): UiFocusId | undefined {
            return (
                _uiControls.preferredControlId(
                    this.modalScopeId_,
                    this.controls_,
                    this.defaultControlId_,
                ) ||
                _uiControls.preferredControlId(
                    this.modalScopeId_,
                    this.titleControls_,
                    undefined,
                )
            )
        }

        private registerNavigation(controller: UiFocusInputController): void {
            controller.setNavigation(this.modalScopeId_, {
                kind: "raggedGrid",
                rows: this.navigationRows(),
                horizontalWrap: true,
                verticalStrategy: "nearest",
            })
        }

        private activatedControl(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiControl<T> {
            if (scopeId != this.modalScopeId_) return undefined
            return (
                _uiControls.findControlByTargetId(
                    this.modalScopeId_,
                    this.titleControls_,
                    targetId,
                ) ||
                _uiControls.findControlByTargetId(
                    this.modalScopeId_,
                    this.controls_,
                    targetId,
                )
            )
        }

        private navigationRows(): UiFocusNavigationTarget[][] {
            const rows: UiFocusNavigationTarget[][] = []
            this.addNavigationRow(
                rows,
                this.titleControls_,
                this.titleControlRects_,
            )
            const rowCount = Math.idiv(
                this.controls_.length + this.columnCount_ - 1,
                this.columnCount_,
            )
            let index = 0
            for (let row = 0; row < rowCount; row++) {
                const rowTargets: UiFocusNavigationTarget[] = []
                for (
                    let column = 0;
                    column < this.columnCount_ && index < this.controls_.length;
                    column++
                ) {
                    this.addNavigationTarget(
                        rowTargets,
                        this.controls_[index],
                        this.controlRects_[index],
                    )
                    index++
                }
                if (rowTargets.length) rows.push(rowTargets)
            }
            return rows
        }

        private addNavigationRow(
            rows: UiFocusNavigationTarget[][],
            controls: UiControl<T>[],
            rects: Rect[],
        ): void {
            if (!controls || !controls.length) return
            const row: UiFocusNavigationTarget[] = []
            for (let i = 0; i < controls.length; i++)
                this.addNavigationTarget(row, controls[i], rects[i])
            if (row.length) rows.push(row)
        }

        private addNavigationTarget(
            row: UiFocusNavigationTarget[],
            control: UiControl<T>,
            rect: Rect,
        ): void {
            if (!control || !this.isNavigationControl(control)) return
            row.push({
                id: _uiControls.targetId(this.modalScopeId_, control.id),
                rect,
                hidden: !_uiControls.isVisible(control),
            })
        }

        private registerTargets(
            focus: UiFocusState,
            controls: UiControl<T>[],
            rects: Rect[],
        ): void {
            if (!controls) return
            this.ensureRects(controls, rects)
            for (let i = 0; i < controls.length; i++) {
                const control = controls[i]
                if (!this.isNavigationControl(control)) continue
                focus.setTarget({
                    id: _uiControls.targetId(this.modalScopeId_, control.id),
                    scopeId: this.modalScopeId_,
                    rect: rects[i],
                    hidden: !_uiControls.isVisible(control),
                    activatable: true,
                })
            }
        }

        private renderControls(
            surface: DrawSurface,
            assets: UiAssetResolver,
            controls: UiControl<T>[],
            rects: Rect[],
            buttonView: UiButtonView,
            style: UiButtonStyle,
        ): void {
            if (!controls) return
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                undefined,
            )
            for (let i = 0; i < controls.length; i++) {
                const control = controls[i]
                if (!_uiControls.isVisible(control)) continue
                _uiControls.renderControl(
                    surface,
                    assets,
                    control,
                    rects[i],
                    buttonView,
                    style,
                    labelBounds,
                )
            }
        }

        private renderFocus(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus: UiFocusState,
            controls: UiControl<T>[],
            rects: Rect[],
            buttonView: UiButtonView,
            style: UiButtonStyle,
        ): void {
            if (!controls) return
            const activeTargetId = _uiControls.activeTargetIdForScope(
                focus,
                this.modalScopeId_,
            )
            const index = _uiControls.focusedControlOverlayIndex(
                this.modalScopeId_,
                controls,
                activeTargetId,
            )
            if (index < 0) return
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                undefined,
            )
            _uiControls.renderControl(
                surface,
                assets,
                controls[index],
                rects[index],
                buttonView,
                style,
                labelBounds,
                true,
            )
        }

        private ensureRects(controls: UiControl<T>[], rects: Rect[]): void {
            if (!controls) return
            while (rects.length < controls.length) rects.push(new Rect())
            while (rects.length > controls.length) rects.pop()
        }

        private isNavigationControl(control: UiControl<T>): boolean {
            return (
                _uiControls.isVisible(control) &&
                _uiControls.isFocusable(control)
            )
        }

        private contentWidth(): number {
            if (!this.controls_.length) return 0
            return (
                this.maxColumnCount() * this.controlWidth_ +
                (this.maxColumnCount() - 1) * this.columnGap_
            )
        }

        private contentHeight(): number {
            const rowCount = Math.idiv(
                this.controls_.length + this.columnCount_ - 1,
                this.columnCount_,
            )
            if (rowCount <= 0) return 0
            return (
                rowCount * this.controlHeight_ + (rowCount - 1) * this.rowGap_
            )
        }

        private maxColumnCount(): number {
            return Math.min(this.columnCount_, this.controls_.length)
        }

        private titleControlContentWidth(): number {
            if (!this.hasTitleControls()) return 0
            return (
                this.titleControls_.length * this.titleControlWidth_ +
                (this.titleControls_.length - 1) * this.titleControlGap_
            )
        }

        private titleBandContentWidth(): number {
            let width = this.titleTextWidth()
            if (this.titleBitmap_ && typeof this.titleBitmap_ != "string") {
                if (width > 0) width += 2
                width += this.titleBitmap_.width
            }
            if (width > 0 && this.hasTitleControls()) width += 2
            return width + this.titleControlContentWidth()
        }

        private titleTextWidth(): number {
            if (this.title_ === undefined) return 0
            return this.title_.length * bitmaps.font8.charWidth
        }
    }
}
