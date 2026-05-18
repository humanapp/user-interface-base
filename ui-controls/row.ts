namespace ui {
    /**
     * Options for a one-dimensional control collection.
     */
    export interface UiRowOptions<T> {
        /**
         * Focus scope id for this row.
         */
        scopeId: UiFocusScopeId

        /**
         * Caller-owned control records in row order.
         */
        controls: UiControl<T>[]

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Scroll owner used when this row is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Whether left/right movement may wrap inside the row.
         */
        wrap?: boolean

        /**
         * Sizing request for the row as a layout node.
         */
        layoutSpec?: UiLayoutSpec

        /**
         * Width assigned to each control.
         */
        controlWidth?: number

        /**
         * Height assigned to each control.
         */
        controlHeight?: number

        /**
         * Space between adjacent controls.
         */
        gap?: number

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Bounds used to keep control focus labels visible.
         */
        labelBounds?: Rect

        /**
         * Called when an enabled row control is activated.
         */
        onActivate?: UiControlActivateHandler<T>
    }

    /**
     * Result emitted by a control row.
     */
    export type UiRowResult<T> =
        | { kind: "activated"; controlId: string; value: T; control: UiControl<T> }
        | {
              kind: "exited"
              direction: UiFocusDirection
              scopeId: UiFocusScopeId
              controlId?: string
          }

    /**
     * Renders and navigates one horizontal control row.
     */
    export class UiRow<T>
        implements UiFocusableView<UiRowResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private controls_: UiControl<T>[]
        private defaultControlId_: string
        private scrollOwnerId_: UiFocusScrollOwnerId
        private wrap_: boolean
        private controlWidth_: number
        private controlHeight_: number
        private gap_: number
        private controlRects_: Rect[]
        private registeredTargetIds_: string[]
        private measured_: UiMeasuredSize
        private controlView_: UiButtonView
        private controlStyle_: UiButtonStyle
        private labelBounds_: Rect
        private onActivate_: UiControlActivateHandler<T>

        constructor(options: UiRowOptions<T>) {
            this.scopeId_ = options.scopeId
            this.controls_ = options.controls
            this.defaultControlId_ = options.defaultControlId
            this.scrollOwnerId_ = options.scrollOwnerId
            this.wrap_ = options.wrap || false
            this.controlWidth_ = _uiControls.controlWidth(options.controlWidth)
            this.controlHeight_ = _uiControls.controlHeight(options.controlHeight)
            this.gap_ = _uiControls.gap(options.gap)
            this.layoutSpec =
                options.layoutSpec || _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.controlRects_ = []
            this.registeredTargetIds_ = []
            this.measured_ = new UiMeasuredSize()
            this.controlStyle_ = options.controlStyle
            this.labelBounds_ = options.labelBounds
            this.controlView_ = new UiButtonView({
                style: options.controlStyle,
            })
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
        public get controls(): UiControl<T>[] {
            return this.controls_
        }

        /**
         * Replaces the caller-owned control array used on later layout and render passes.
         */
        public setControls(controls: UiControl<T>[]): void {
            this.controls_ = controls
            this.invalidateLayout()
        }

        /**
         * Measures this row under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const count = this.controls_.length
            const width =
                count > 0
                    ? count * this.controlWidth_ + (count - 1) * this.gap_
                    : 0
            const height = count > 0 ? this.controlHeight_ : 0
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                width,
                height,
                width,
                height,
                output,
            )
            this.measured_.set(
                output.minWidth,
                output.minHeight,
                output.preferredWidth,
                output.preferredHeight,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges row control rectangles in the assigned bounds.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.ensureControlRects()
            let x = this.finalRect.x
            for (let i = 0; i < this.controls_.length; i++) {
                this.controlRects_[i].set(
                    x,
                    this.finalRect.y,
                    this.controlWidth_,
                    Math.min(this.controlHeight_, this.finalRect.height),
                )
                x += this.controlWidth_ + this.gap_
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
         * Copies one arranged control rectangle into `output`.
         */
        public getControlRect(controlId: string, output: Rect): boolean {
            for (let i = 0; i < this.controls_.length; i++) {
                if (this.controls_[i].id == controlId && this.controlRects_[i]) {
                    output.copyFrom(this.controlRects_[i])
                    return true
                }
            }
            return false
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
                    wrap: this.wrap_,
                },
            )
            this.ensureControlRects()
            const currentTargetIds: string[] = []
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                currentTargetIds.push(
                    _uiControls.targetId(this.scopeId_, control.id),
                )
            }
            for (let i = 0; i < this.registeredTargetIds_.length; i++) {
                const targetId = this.registeredTargetIds_[i]
                if (!_uiControls.containsString(currentTargetIds, targetId))
                    focus.removeTarget(targetId)
            }
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
                    disabled: _uiControls.isDisabled(control),
                    hidden: !_uiControls.isVisible(control),
                    activatable: true,
                })
            }
            this.registeredTargetIds_ = currentTargetIds
        }

        /**
         * Registers row navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            controller.setNavigation(this.scopeId_, {
                kind: "row",
                targets: this.navigationTargets(),
                wrap: this.wrap_,
            })
        }

        /**
         * Focuses the row's retained, default, selected, or first enabled control.
         */
        public focusDefault(focus: UiFocusState): UiFocusSetResult {
            return focus.setActiveScope(this.scopeId_)
        }

        /**
         * Returns the target id chosen by default-control and selected-control rules.
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
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiRowResult<T> {
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
         * Converts a focus activation result into a typed row activation.
         */
        public createResultForActivation(
            result: UiFocusActivationResult,
        ): UiRowResult<T> {
            if (result.kind != "activated" || result.scopeId != this.scopeId_)
                return undefined
            const control = _uiControls.findControlByTargetId(
                this.scopeId_,
                this.controls_,
                result.targetId,
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
            result: UiFocusMoveResult,
        ): UiRowResult<T> {
            if (result.kind != "exited" || result.scopeId != this.scopeId_)
                return undefined
            return {
                kind: "exited",
                direction: result.direction,
                scopeId: result.scopeId,
                controlId: _uiControls.controlIdFromTargetId(
                    this.scopeId_,
                    result.targetId,
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
            this.ensureControlRects()
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                this.labelBounds_,
            )
            const activeTargetId =
                focus && focus.getActiveScopeId() == this.scopeId_
                ? focus.getActiveTargetId(this.scopeId_)
                : undefined
            let focusedIndex = -1
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!_uiControls.isVisible(control)) continue
                const focused =
                    activeTargetId ==
                    _uiControls.targetId(this.scopeId_, control.id)
                if (focused && !control.draw && _uiControls.isFocusable(control))
                    focusedIndex = i
                _uiControls.renderControl(
                    surface,
                    assets,
                    control,
                    this.controlRects_[i],
                    focused && !!control.draw,
                    this.controlView_,
                    this.controlStyle_,
                    labelBounds,
                )
            }
            if (focusedIndex >= 0) {
                _uiControls.renderControlFocus(
                    surface,
                    assets,
                    this.controls_[focusedIndex],
                    this.controlRects_[focusedIndex],
                    this.controlView_,
                    this.controlStyle_,
                    labelBounds,
                )
            }
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
                const rect = this.controlRects_[i]
                targets.push({
                    id: _uiControls.targetId(this.scopeId_, control.id),
                    rect,
                    scrollOwnerId: this.scrollOwnerId_,
                    scrollRect: this.scrollOwnerId_ ? rect : undefined,
                    disabled: _uiControls.isDisabled(control),
                    hidden: !_uiControls.isVisible(control),
                })
            }
            return targets
        }

        private isNavigationControl(control: UiControl<T>): boolean {
            return (
                _uiControls.isVisible(control) &&
                _uiControls.isFocusable(control)
            )
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

    /**
     * Options for a horizontal run of variable-size controls.
     */
    export interface UiControlStripOptions<T> {
        /**
         * Focus scope id for this strip.
         */
        scopeId: UiFocusScopeId

        /**
         * Caller-owned control records in visual and navigation order.
         */
        controls: UiControl<T>[]

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Scroll owner used when this strip is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Whether left/right movement may wrap inside the strip.
         */
        wrap?: boolean

        /**
         * Sizing request for the strip as a layout node.
         */
        layoutSpec?: UiLayoutSpec

        /**
         * Width assigned to controls without a control-specific `width`.
         */
        controlWidth?: number

        /**
         * Height assigned to controls without a control-specific `height`.
         */
        controlHeight?: number

        /**
         * Space between adjacent controls before control-specific gaps.
         */
        gap?: number

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Bounds used to keep control focus labels visible.
         */
        labelBounds?: Rect

        /**
         * Called when an enabled strip control is activated.
         */
        onActivate?: UiControlActivateHandler<T>
    }

    /**
     * Renders and navigates a horizontal run of variable-size controls.
     */
    export class UiControlStrip<T>
        implements UiFocusableView<UiRowResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private controls_: UiControl<T>[]
        private defaultControlId_: string
        private scrollOwnerId_: UiFocusScrollOwnerId
        private wrap_: boolean
        private controlWidth_: number
        private controlHeight_: number
        private gap_: number
        private controlRects_: Rect[]
        private registeredTargetIds_: string[]
        private controlView_: UiButtonView
        private controlStyle_: UiButtonStyle
        private labelBounds_: Rect
        private onActivate_: UiControlActivateHandler<T>

        constructor(options: UiControlStripOptions<T>) {
            this.scopeId_ = options.scopeId
            this.controls_ = options.controls
            this.defaultControlId_ = options.defaultControlId
            this.scrollOwnerId_ = options.scrollOwnerId
            this.wrap_ = options.wrap || false
            this.controlWidth_ = _uiControls.controlWidth(options.controlWidth)
            this.controlHeight_ = _uiControls.controlHeight(options.controlHeight)
            this.gap_ = _uiControls.gap(options.gap)
            this.layoutSpec =
                options.layoutSpec || _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.controlRects_ = []
            this.registeredTargetIds_ = []
            this.controlStyle_ = options.controlStyle
            this.labelBounds_ = options.labelBounds
            this.controlView_ = new UiButtonView({
                style: options.controlStyle,
            })
            this.onActivate_ = options.onActivate
        }

        /**
         * Focus scope id used by this strip.
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
         * Replaces the caller-owned control array used on later layout and render passes.
         */
        public setControls(controls: UiControl<T>[]): void {
            this.controls_ = controls
            this.invalidateLayout()
        }

        /**
         * Measures this strip under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                this.contentWidth(),
                this.contentHeight(),
                this.contentWidth(),
                this.contentHeight(),
                output,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges strip controls from left to right.
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
                    controlHeight,
                )
                x += width + this.controlGapAfter(control, i)
            }
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the strip as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this strip's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Copies one arranged control rectangle into `output`.
         */
        public getControlRect(controlId: string, output: Rect): boolean {
            for (let i = 0; i < this.controls_.length; i++) {
                if (this.controls_[i].id == controlId && this.controlRects_[i]) {
                    output.copyFrom(this.controlRects_[i])
                    return true
                }
            }
            return false
        }

        /**
         * Copies navigation targets for focusable strip controls into `output`.
         */
        public copyNavigationTargets(output: UiFocusNavigationTarget[]): void {
            this.ensureControlRects()
            while (output.length) output.pop()
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                output.push(this.navigationTarget(control, this.controlRects_[i]))
            }
        }

        /**
         * Registers this strip's focus scope and targets.
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
                    wrap: this.wrap_,
                },
            )
            this.registerTargets(focus)
        }

        /**
         * Registers strip navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            const targets: UiFocusNavigationTarget[] = []
            this.copyNavigationTargets(targets)
            controller.setNavigation(this.scopeId_, {
                kind: "row",
                targets,
                wrap: this.wrap_,
            })
        }

        /**
         * Focuses the strip's retained, default, selected, or first enabled control.
         */
        public focusDefault(focus: UiFocusState): UiFocusSetResult {
            return focus.setActiveScope(this.scopeId_)
        }

        /**
         * Converts focus input into a strip result when one occurred.
         */
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiRowResult<T> {
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
         * Converts a focus activation result into a typed strip activation.
         */
        public createResultForActivation(
            result: UiFocusActivationResult,
        ): UiRowResult<T> {
            if (result.kind != "activated" || result.scopeId != this.scopeId_)
                return undefined
            const control = _uiControls.findControlByTargetId(
                this.scopeId_,
                this.controls_,
                result.targetId,
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
         * Converts a focus movement result into a generic strip boundary exit.
         */
        public createResultForMove(
            result: UiFocusMoveResult,
        ): UiRowResult<T> {
            if (result.kind != "exited" || result.scopeId != this.scopeId_)
                return undefined
            return {
                kind: "exited",
                direction: result.direction,
                scopeId: result.scopeId,
                controlId: _uiControls.controlIdFromTargetId(
                    this.scopeId_,
                    result.targetId,
                ),
            }
        }

        /**
         * Renders visible strip controls through the supplied draw surface.
         */
        public render(
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
            let focusedIndex = -1
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!_uiControls.isVisible(control)) continue
                const focused =
                    activeTargetId ==
                    _uiControls.targetId(this.scopeId_, control.id)
                if (focused && !control.draw && _uiControls.isFocusable(control))
                    focusedIndex = i
                _uiControls.renderControl(
                    surface,
                    assets,
                    control,
                    this.controlRects_[i],
                    focused && !!control.draw,
                    this.controlView_,
                    this.controlStyle_,
                    labelBounds,
                )
            }
            if (focusedIndex >= 0) {
                _uiControls.renderControlFocus(
                    surface,
                    assets,
                    this.controls_[focusedIndex],
                    this.controlRects_[focusedIndex],
                    this.controlView_,
                    this.controlStyle_,
                    labelBounds,
                )
            }
        }

        private registerTargets(focus: UiFocusState): void {
            this.ensureControlRects()
            const currentTargetIds: string[] = []
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                currentTargetIds.push(
                    _uiControls.targetId(this.scopeId_, control.id),
                )
            }
            for (let i = 0; i < this.registeredTargetIds_.length; i++) {
                const targetId = this.registeredTargetIds_[i]
                if (!_uiControls.containsString(currentTargetIds, targetId))
                    focus.removeTarget(targetId)
            }
            for (let i = 0; i < this.controls_.length; i++) {
                const control = this.controls_[i]
                if (!this.isNavigationControl(control)) continue
                focus.setTarget({
                    id: _uiControls.targetId(this.scopeId_, control.id),
                    scopeId: this.scopeId_,
                    rect: this.controlRects_[i] || new Rect(),
                    scrollOwnerId: this.scrollOwnerId_,
                    scrollRect: this.scrollOwnerId_
                        ? this.controlRects_[i]
                        : undefined,
                    disabled: _uiControls.isDisabled(control),
                    hidden: !_uiControls.isVisible(control),
                    activatable: true,
                })
            }
            this.registeredTargetIds_ = currentTargetIds
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
                disabled: _uiControls.isDisabled(control),
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

        private controlWidth(control: UiControl<T>): number {
            return _uiControls.sanitizeDimension(
                control.width,
                this.controlWidth_,
            )
        }

        private controlHeight(control: UiControl<T>): number {
            return _uiControls.sanitizeDimension(
                control.height,
                this.controlHeight_,
            )
        }

        private controlGapBefore(control: UiControl<T>, index: number): number {
            return _uiControls.sanitizeDimension(
                control.gapBefore,
                index ? this.gap_ : 0,
            )
        }

        private controlGapAfter(control: UiControl<T>, index: number): number {
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
