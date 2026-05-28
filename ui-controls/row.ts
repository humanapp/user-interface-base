namespace ui {
    /**
     * Control record with row-local spacing options.
     */
    export interface UiRowControl<T> extends UiControl<T> {
        /**
         * Extra space inserted before this control. Added to the row gap for
         * non-first controls.
         */
        gapBefore?: number

        /**
         * Extra space inserted after this control.
         */
        gapAfter?: number
    }

    /**
     * Options for a one-dimensional control collection.
     */
    export interface UiRowOptions<T> extends UiControlCollectionOptions<T> {
        /**
         * Caller-owned row control records in render order.
         */
        controls: UiRowControl<T>[]

        /**
         * Focus scope id for this row.
         */
        scopeId: UiFocusScopeId

        /**
         * Scroll owner used when this row is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Space between adjacent controls.
         */
        gap?: number

        /**
         * Bounds used to keep control focus labels visible.
         */
        labelBounds?: Rect
    }

    /**
     * Result emitted by a control row.
     */
    export type UiRowResult<T> =
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
     * Renders and navigates one horizontal control row.
     */
    export class UiRow<T> implements UiFocusableView<UiRowResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private controls_: UiRowControl<T>[]
        private defaultControlId_: string
        private scrollOwnerId_: UiFocusScrollOwnerId
        private controlWidth_: number
        private controlHeight_: number
        private gap_: number
        private controlRects_: Rect[]
        private controlView_: UiButtonView
        private controlStyle_: UiButtonStyle
        private labelBounds_: Rect
        private onActivate_: UiControlActivateHandler<T>

        constructor(options: UiRowOptions<T>) {
            this.scopeId_ = options.scopeId
            this.controls_ = options.controls
            this.defaultControlId_ = options.defaultControlId
            this.scrollOwnerId_ = options.scrollOwnerId
            this.controlWidth_ = _uiControls.controlWidth(options.controlSize)
            this.controlHeight_ = _uiControls.controlHeight(options.controlSize)
            this.gap_ = _uiControls.gap(options.gap)
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
         * Focus scope id used by this row.
         */
        public get scopeId(): UiFocusScopeId {
            return this.scopeId_
        }

        /**
         * Current caller-owned control array.
         */
        public get controls(): UiRowControl<T>[] {
            return this.controls_
        }

        /**
         * Measures this row under parent constraints.
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
         * Arranges row control rectangles in the assigned bounds.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.ensureControlRects()
            const height = this.contentHeight()
            let x = this.finalRect.x
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                x += this.controlGapBefore(control, i)
                const width = this.controlWidth(control)
                const controlHeight = this.controlHeight(control)
                this.controlRects_[i].set(
                    x,
                    this.finalRect.y + Math.idiv(height - controlHeight, 2),
                    width,
                    Math.min(controlHeight, this.finalRect.height),
                )
                x += width + this.controlGapAfter(control, i)
            }
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the row as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this row's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Resolves resolver-backed content ids for row controls.
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
         * Copies navigation targets for focusable row controls into `output`.
         */
        public copyNavigationTargets(output: UiFocusNavigationTarget[]): void {
            this.ensureControlRects()
            while (output.length) output.pop()
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                output.push(
                    this.navigationTarget(control, this.controlRects_[i]),
                )
            }
        }

        /**
         * Registers this row's focus scope and targets.
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

        /**
         * Registers row navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            controller.setNavigation(this.scopeId_, {
                kind: "row",
                targets: this.navigationTargets(),
            })
        }

        /**
         * Focuses the row's retained, default, or first enabled control.
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
         * Converts a focus input result into a row result when one occurred.
         */
        public handleFocusInput(result: UiFocusInputResult): UiRowResult<T> {
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
         * Converts a focus activation result into a typed row activation.
         */
        public createResultForActivation(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiRowResult<T> {
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
         * Converts a focus movement result into a generic row boundary exit.
         */
        public createResultForMove(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
            direction: UiFocusDirection,
        ): UiRowResult<T> {
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
         * Renders visible row controls through the supplied draw surface.
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
         * Renders visible row controls without the built-in focused overlay.
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
         * Renders only the focused row control's built-in focus treatment.
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
            const activeTargetId = _uiControls.activeTargetIdForScope(
                focus,
                this.scopeId_,
            )
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

        private ensureControlRects(): void {
            while (this.controlRects_.length < this.controls_.length)
                this.controlRects_.push(new Rect())
            while (this.controlRects_.length > this.controls_.length)
                this.controlRects_.pop()
        }

        private navigationTargets(): UiFocusNavigationTarget[] {
            this.ensureControlRects()
            const targets: UiFocusNavigationTarget[] = []
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                targets.push(
                    this.navigationTarget(control, this.controlRects_[i]),
                )
            }
            return targets
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

        private contentWidth(): number {
            let width = 0
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                width += this.controlGapBefore(control, i)
                width += this.controlWidth(control)
                width += this.controlGapAfter(control, i)
            }
            return width
        }

        private contentHeight(): number {
            let height = 0
            for (let i = 0; i < this.controls_.length; i++)
                height = Math.max(height, this.controlHeight(this.controls_[i]))
            return height
        }

        private controlWidth(control: UiRowControl<T>): number {
            return _uiControls.sizeWidth(
                (<any>control).size,
                this.controlWidth_,
            )
        }

        private controlHeight(control: UiRowControl<T>): number {
            return _uiControls.sizeHeight(
                (<any>control).size,
                this.controlHeight_,
            )
        }

        private controlGapBefore(
            control: UiRowControl<T>,
            index: number,
        ): number {
            const rowGap = index ? this.gap_ : 0
            return rowGap + _uiControls.sanitizeDimension(control.gapBefore, 0)
        }

        private controlGapAfter(
            control: UiRowControl<T>,
            index: number,
        ): number {
            return _uiControls.sanitizeDimension(control.gapAfter, 0)
        }

        private emitActivate(result: UiRowResult<T>): void {
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
