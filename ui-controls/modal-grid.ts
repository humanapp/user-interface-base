namespace ui {
    /**
     * Options for a modal picker or control grid.
     */
    export interface UiPickerOptions<T> {
        /**
         * Parent focus scope restored after the modal closes. Defaults to the
         * active scope when the modal opens.
         */
        parentScopeId?: UiFocusScopeId

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
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Whether delete may emit a `deleted` result.
         */
        deleteEnabled?: boolean

        /**
         * Whether activation emits `activated` with `close: true`. Defaults to `true`.
         */
        closeOnActivate?: boolean

        /**
         * Number of columns for rectangular modal grids.
         */
        columnCount?: number

        /**
         * Row lengths for ragged modal grids.
         */
        rows?: number[]

        /**
         * Width assigned to each control.
         */
        controlWidth?: number

        /**
         * Height assigned to each control.
         */
        controlHeight?: number

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Inset between the modal outline and control grid. Defaults to `4`.
         */
        contentMargin?: number

        /**
         * Extra vertical space between the title band and control grid. Defaults to `0`.
         */
        titleGap?: number

        /**
         * Fill color for the modal panel. Defaults to `1`.
         */
        panelColor?: number

        /**
         * Outline color for the modal panel. Defaults to `15`.
         */
        outlineColor?: number

        /**
         * Text color for the modal title. Defaults to `15`.
         */
        titleColor?: number

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
        | { kind: "closed"; modalScopeId: UiFocusScopeId }
        | { kind: "deleted"; modalScopeId: UiFocusScopeId }

    /**
     * Modal picker or control grid backed by a `ui-core` modal focus scope.
     */
    export class UiPicker<T> implements UiModal<UiPickerResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private parentScopeId_: UiFocusScopeId
        private modalScopeId_: UiFocusScopeId
        private title_: string
        private titleId_: string
        private deleteEnabled_: boolean
        private closeOnActivate_: boolean
        private panelColor_: number
        private outlineColor_: number
        private titleColor_: number
        private contentMargin_: number
        private titleGap_: number
        private grid_: UiGrid<T>
        private onActivate_: UiControlActivateHandler<T>
        private onCancel_: UiPickerCancelHandler
        private scratch_: Rect

        constructor(options: UiPickerOptions<T>) {
            this.parentScopeId_ = options.parentScopeId
            this.modalScopeId_ = options.modalScopeId
            this.title_ = options.title
            this.titleId_ = options.titleId
            this.deleteEnabled_ = options.deleteEnabled || false
            this.closeOnActivate_ = options.closeOnActivate !== false
            this.panelColor_ =
                options.panelColor !== undefined ? options.panelColor : 1
            this.outlineColor_ =
                options.outlineColor !== undefined ? options.outlineColor : 15
            this.titleColor_ =
                options.titleColor !== undefined ? options.titleColor : 15
            this.contentMargin_ = _uiControls.sanitizeDimension(
                options.contentMargin,
                4,
            )
            this.titleGap_ = _uiControls.sanitizeDimension(options.titleGap, 0)
            this.onActivate_ = options.onActivate
            this.onCancel_ = options.onCancel
            this.scratch_ = new Rect()
            this.grid_ = new UiGrid<T>({
                scopeId: options.modalScopeId,
                controls: options.controls,
                defaultControlId: options.defaultControlId,
                columnCount: options.columnCount,
                rows: options.rows,
                controlWidth: options.controlWidth,
                controlHeight: options.controlHeight,
                controlStyle: options.controlStyle,
            })
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
            return this.grid_.controls
        }

        /**
         * Copies one arranged modal control rectangle into `output`.
         */
        public getControlRect(controlId: string, output: Rect): boolean {
            return this.grid_.getControlRect(controlId, output)
        }

        /**
         * Measures the modal grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            this.grid_.measure(constraints, output)
            const titleHeight = this.titleHeight()
            output.set(
                output.minWidth + this.contentMargin_ * 2,
                output.minHeight + titleHeight + this.contentMargin_,
                output.preferredWidth + this.contentMargin_ * 2,
                output.preferredHeight + titleHeight + this.contentMargin_,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the modal panel and control grid.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            const titleHeight = this.titleHeight()
            this.grid_.arrange(
                new Rect(
                    rect.x + this.contentMargin_,
                    rect.y + titleHeight,
                    Math.max(0, rect.width - this.contentMargin_ * 2),
                    Math.max(
                        0,
                        rect.height - titleHeight - this.contentMargin_,
                    ),
                ),
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the modal grid as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
            this.grid_.invalidateLayout()
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
            this.grid_.registerFocusTargets(focus, {
                id: this.modalScopeId_,
                parentScopeId: this.parentScopeId_ || focus.getActiveScopeId(),
                preferredTargetId: this.grid_.resolvePreferredTargetId(),
                handlesCancel: true,
                modal: true,
            })
            if (controller) this.grid_.registerNavigation(controller)
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
            result: UiFocusActivationResult,
        ): UiPickerResult<T> {
            const gridResult = this.grid_.createResultForActivation(result)
            if (!gridResult || gridResult.kind != "activated") return undefined
            if (this.closeOnActivate_) {
                return {
                    kind: "activated",
                    controlId: gridResult.controlId,
                    value: gridResult.value,
                    control: gridResult.control,
                    close: true,
                }
            }
            return {
                kind: "keepOpen",
                controlId: gridResult.controlId,
                value: gridResult.value,
                control: gridResult.control,
            }
        }

        /**
         * Converts focus input into a modal result when one occurred.
         */
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiPickerResult<T> {
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
            if (result.kind == "cancelled") {
                const cancelled = this.createCancelResult()
                this.emitCancel(cancelled)
                return cancelled
            }
            return undefined
        }

        /**
         * Creates a cancellation result without closing the focus scope.
         */
        public createCancelResult(): UiPickerResult<T> {
            return { kind: "cancelled", modalScopeId: this.modalScopeId_ }
        }

        /**
         * Creates a close result without closing the focus scope.
         */
        public createCloseResult(): UiPickerResult<T> {
            return { kind: "closed", modalScopeId: this.modalScopeId_ }
        }

        /**
         * Creates a delete result when delete is enabled.
         */
        public createDeleteResult(): UiPickerResult<T> {
            if (!this.deleteEnabled_) return undefined
            return { kind: "deleted", modalScopeId: this.modalScopeId_ }
        }

        /**
         * Renders the modal panel, title, and visible controls.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            // Fill panel in three strips, leaving the four corner pixels untouched.
            const r = this.finalRect
            surface.fillRect(this.scratch_.set(r.x + 1, r.y, r.width - 2, 1), this.panelColor_)
            surface.fillRect(this.scratch_.set(r.x, r.y + 1, r.width, r.height - 2), this.panelColor_)
            surface.fillRect(this.scratch_.set(r.x + 1, r.y + r.height - 1, r.width - 2, 1), this.panelColor_)
            /// Left edge
            surface.drawLine(
                this.finalRect.x,
                this.finalRect.y + 1,
                this.finalRect.x,
                this.finalRect.y + this.finalRect.height - 2,
                this.outlineColor_,
            )
            /// Right edge
            surface.drawLine(
                this.finalRect.x + this.finalRect.width - 1,
                this.finalRect.y + 1,
                this.finalRect.x + this.finalRect.width - 1,
                this.finalRect.y + this.finalRect.height - 2,
                this.outlineColor_,
            )
            // Top edge
            surface.drawLine(
                this.finalRect.x + 1,
                this.finalRect.y,
                this.finalRect.x + this.finalRect.width - 2,
                this.finalRect.y,
                this.outlineColor_,
            )
            // Bottom edge
            surface.drawLine(
                this.finalRect.x + 1,
                this.finalRect.y + this.finalRect.height - 1,
                this.finalRect.x + this.finalRect.width - 2,
                this.finalRect.y + this.finalRect.height - 1,
                this.outlineColor_,
            )
            const title = this.resolveTitleText(assets)
            if (title.length > 0)
                surface.drawText(
                    title,
                    this.finalRect.x + 4,
                    this.finalRect.y + 4,
                    { color: this.titleColor_ },
                )
            this.grid_.render(surface, assets, focus)
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
            if (!this.onCancel_ || !result || result.kind != "cancelled")
                return
            this.onCancel_(result.modalScopeId)
        }

        private titleHeight(): number {
            return 16 + this.titleGap_
        }
    }
}
