namespace ui {
    /**
     * Widget lifecycle shared by controller-managed controls.
     */
    export interface UiWidget<TResult> extends UiLayoutNode {
        /**
         * Renders the widget through the supplied draw surface.
         */
        render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void

        /**
         * Converts focus input into the widget's typed result.
         */
        handleFocusInput(result: UiFocusInputResult): TResult
    }

    /**
     * Widget lifecycle for controls that own a normal focus scope.
     */
    export interface UiFocusableWidget<TResult> extends UiWidget<TResult> {
        /**
         * Registers focus targets after layout has arranged this widget.
         */
        registerFocusTargets(focus: UiFocusState): void

        /**
         * Registers directional navigation after layout has arranged this widget.
         */
        registerNavigation(controller: UiFocusInputController): void

        /**
         * Focuses the widget's default target.
         */
        focusDefault(focus: UiFocusState): UiFocusSetResult
    }

    /**
     * Handles screen input before root widgets receive it.
     */
    export interface UiScreenInputHandler {
        /**
         * Returns `true` or `false` to stop default widget routing, or
         * `undefined` to let root widgets handle the event.
         */
        (event: UiInputEvent): boolean | undefined
    }

    /**
     * Options for a screen-level widget controller.
     */
    export interface UiScreenControllerOptions {
        /**
         * Optional scroll request sink used by focus movement.
         */
        scroll?: UiFocusScrollHandler

        /**
         * Optional wheel handler used by focus input.
         */
        wheel?: UiFocusWheelHandler

        /**
         * Default measurement limits used when opening modals without options.
         */
        modalConstraints?: UiLayoutConstraints
    }

    /**
     * Fixed screen placement for a root widget.
     */
    export interface UiPlacement {
        /**
         * Left edge of the placement rectangle. Defaults to `0`.
         */
        x?: number

        /**
         * Top edge of the placement rectangle. Defaults to `0`.
         */
        y?: number

        /**
         * Horizontal center of the placement rectangle. Used when `x` is omitted.
         */
        centerX?: number

        /**
         * Vertical center of the placement rectangle. Used when `y` is omitted.
         */
        centerY?: number

        /**
         * Width of the placement rectangle.
         */
        width: number

        /**
         * Height of the placement rectangle.
         */
        height: number

        /**
         * Horizontal child placement inside the rectangle. Defaults to `start`.
         */
        horizontalAlignment?: UiLayoutAlignment

        /**
         * Vertical child placement inside the rectangle. Defaults to `start`.
         */
        verticalAlignment?: UiLayoutAlignment
    }

    /**
     * Layout options applied before a controller opens a modal.
     */
    export interface UiModalOpenOptions {
        /**
         * Measurement limits used when the controller arranges the modal.
         */
        constraints?: UiLayoutConstraints

        /**
         * Concrete rectangle assigned to the modal before opening.
         */
        rect?: Rect
    }

    /**
     * Modal widget lifecycle used by screen controllers.
     */
    export interface UiModal<TResult> extends UiWidget<TResult> {
        /**
         * Modal focus scope owned while the modal is open.
         */
        readonly modalScopeId: UiFocusScopeId

        /**
         * Registers modal focus and makes the modal scope active.
         */
        open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult

        /**
         * Restores focus to the parent modal scope.
         */
        close(focus: UiFocusState): UiFocusSetResult
    }

    /**
     * Owns focus, input, root widgets, and modal routing for one screen.
     */
    export class UiScreenController {
        private options_: UiScreenControllerOptions
        private focus_: UiFocusState
        private focusInput_: UiFocusInputController
        private roots_: UiScreenRoot<any>[]
        private assets_: UiAssetResolver
        private activeModal_: UiModal<any>
        private modalConstraints_: UiLayoutConstraints
        private defaultModalOptions_: UiModalOpenOptions
        private modalRect_: Rect
        private modalSize_: UiMeasuredSize
        private inputHandler_: UiScreenInputHandler
        private entered_: boolean

        constructor(options?: UiScreenControllerOptions) {
            this.options_ = options || {}
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
            this.roots_ = []
            this.assets_ = undefined
            this.activeModal_ = undefined
            this.modalConstraints_ = {
                maxWidth: 0,
                maxHeight: 0,
            }
            this.defaultModalOptions_ = {
                constraints: this.modalConstraints_,
            }
            this.modalRect_ = new Rect()
            this.modalSize_ = new UiMeasuredSize()
            this.inputHandler_ = undefined
            this.entered_ = false
        }

        /**
         * Asset resolver from the active runtime.
         */
        public get assets(): UiAssetResolver {
            return this.assets_
        }

        /**
         * Focus state owned by this screen controller.
         */
        public get focus(): UiFocusState {
            return this.focus_
        }

        /**
         * Whether this screen currently owns an open modal.
         */
        public get hasModal(): boolean {
            return !!this.activeModal_
        }

        /**
         * Adds a root widget rendered and routed by this screen.
         */
        public add<TResult>(
            widget: UiFocusableWidget<TResult>,
            placement?: UiPlacement,
        ): UiFocusableWidget<TResult> {
            const root = new UiScreenRoot<TResult>(widget, placement)
            this.roots_.push(root)
            if (placement) this.arrangeRoot(root)
            if (this.entered_) {
                this.registerRoot(root)
                if (this.roots_.length == 1) widget.focusDefault(this.focus_)
            }
            return widget
        }

        /**
         * Registers input, runtime assets, root focus targets, and root navigation.
         */
        public enter(
            runtime: UiRuntime,
            input: UiInputScope,
            handler?: UiScreenInputHandler,
        ): void {
            this.closeModal()
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
            this.assets_ = runtime.assets
            this.inputHandler_ = handler
            this.entered_ = true
            this.resolveModalConstraints(runtime)
            this.registerInput(input)
            for (let i = 0; i < this.roots_.length; i++) {
                const root = this.roots_[i]
                if (root.placement) this.arrangeRoot(root)
                this.registerRoot(root)
            }
            if (this.roots_.length > 0)
                this.roots_[0].widget.focusDefault(this.focus_)
        }

        /**
         * Clears runtime-owned state after the screen exits.
         */
        public exit(): void {
            this.closeModal()
            this.assets_ = undefined
            this.inputHandler_ = undefined
            this.entered_ = false
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
        }

        /**
         * Renders all root widgets, then the active modal when one is open.
         */
        public render(surface: DrawSurface): void {
            if (!this.assets_) return
            for (let i = 0; i < this.roots_.length; i++) {
                this.roots_[i].widget.render(surface, this.assets_, this.focus_)
            }
            if (this.activeModal_)
                this.activeModal_.render(surface, this.assets_, this.focus_)
        }

        /**
         * Opens a modal using screen-sized constraints by default.
         */
        public openModal<TResult>(
            modal: UiModal<TResult>,
            options?: UiModalOpenOptions,
        ): UiFocusSetResult {
            if (this.activeModal_) this.closeModal()
            this.arrangeModal(modal, options || this.defaultModalOptions_)
            this.activeModal_ = modal
            return modal.open(this.focus_, this.focusInput_)
        }

        /**
         * Closes the active modal.
         */
        public closeModal<TResult>(
            modal?: UiModal<TResult>,
        ): UiFocusSetResult | undefined {
            const target = modal || this.activeModal_
            if (!target) return undefined
            const modalScopeId = target.modalScopeId
            const result = target.close(this.focus_)
            this.focusInput_.clearNavigation(modalScopeId)
            this.focus_.removeScope(modalScopeId)
            if (
                this.activeModal_ &&
                this.activeModal_.modalScopeId == modalScopeId
            )
                this.activeModal_ = undefined
            return result
        }

        /**
         * Routes input to the active modal, screen handler, or root widgets.
         */
        public handleInput(event: UiInputEvent): boolean {
            if (this.activeModal_) return this.handleModalInput(event)
            if (this.inputHandler_) {
                const handled = this.inputHandler_(event)
                if (handled !== undefined) return handled
            }
            const result = this.focusInput_.handleInput(event)
            const handled = this.handleRootFocusInput(result)
            return handled !== undefined ? handled : result.handled
        }

        private registerInput(input: UiInputScope): void {
            this.registerAction(input, "left")
            this.registerAction(input, "right")
            this.registerAction(input, "up")
            this.registerAction(input, "down")
            this.registerAction(input, "activate")
            this.registerAction(input, "cancel")
            this.registerAction(input, "pointerMove")
            this.registerAction(input, "pointerClick")
            this.registerAction(input, "wheel")
        }

        private registerAction(
            input: UiInputScope,
            action: UiInputAction,
        ): void {
            input.onAction(action, event => this.handleInput(event))
        }

        private registerRoot<TResult>(root: UiScreenRoot<TResult>): void {
            root.widget.registerFocusTargets(this.focus_)
            root.widget.registerNavigation(this.focusInput_)
        }

        private arrangeRoot<TResult>(root: UiScreenRoot<TResult>): void {
            const placement = root.placement
            const width = _uiLayout.sanitizeDimension(placement.width)
            const height = _uiLayout.sanitizeDimension(placement.height)
            root.rect.set(
                this.placementX(placement, width),
                this.placementY(placement, height),
                width,
                height,
            )
            root.constraints.maxWidth = width
            root.constraints.maxHeight = height
            root.widget.measure(root.constraints, root.measured)
            const horizontal = placement.horizontalAlignment || "start"
            const vertical = placement.verticalAlignment || "start"
            const childWidth = _uiLayout.alignedSize(
                width,
                root.measured.preferredWidth,
                horizontal,
            )
            const childHeight = _uiLayout.alignedSize(
                height,
                root.measured.preferredHeight,
                vertical,
            )
            root.childRect.set(
                _uiLayout.alignedOffset(root.rect.x, width, childWidth, horizontal),
                _uiLayout.alignedOffset(root.rect.y, height, childHeight, vertical),
                childWidth,
                childHeight,
            )
            root.widget.arrange(root.childRect)
        }

        private placementX(placement: UiPlacement, width: number): number {
            if (placement.x !== undefined)
                return _uiLayout.sanitizeCoordinate(placement.x)
            if (placement.centerX !== undefined)
                return (
                    _uiLayout.sanitizeCoordinate(placement.centerX) -
                    Math.idiv(width, 2)
                )
            return 0
        }

        private placementY(placement: UiPlacement, height: number): number {
            if (placement.y !== undefined)
                return _uiLayout.sanitizeCoordinate(placement.y)
            if (placement.centerY !== undefined)
                return (
                    _uiLayout.sanitizeCoordinate(placement.centerY) -
                    Math.idiv(height, 2)
                )
            return 0
        }

        private arrangeModal<TResult>(
            modal: UiModal<TResult>,
            options: UiModalOpenOptions,
        ): void {
            if (options.rect) {
                modal.arrange(options.rect)
                return
            }
            if (!options.constraints) return

            modal.measure(options.constraints, this.modalSize_)
            this.modalRect_.set(
                Math.idiv(
                    options.constraints.maxWidth -
                        this.modalSize_.preferredWidth,
                    2,
                ),
                Math.idiv(
                    options.constraints.maxHeight -
                        this.modalSize_.preferredHeight,
                    2,
                ),
                this.modalSize_.preferredWidth,
                this.modalSize_.preferredHeight,
            )
            modal.arrange(this.modalRect_)
        }

        private handleModalInput(event: UiInputEvent): boolean {
            const result = this.focusInput_.handleInput(event)
            const modalResult = this.activeModal_.handleFocusInput(result)
            if (modalResult) {
                const handled = this.defaultHandled(modalResult)
                return handled !== undefined ? handled : result.handled
            }
            if (event.action == "pointerClick" && result.kind == "miss")
                return true
            return result.handled
        }

        private handleRootFocusInput(
            result: UiFocusInputResult,
        ): boolean | undefined {
            for (let i = 0; i < this.roots_.length; i++) {
                const widgetResult = this.roots_[i].widget.handleFocusInput(result)
                if (widgetResult) return this.defaultHandled(widgetResult)
            }
            return undefined
        }

        private defaultHandled<TResult>(result: TResult): boolean | undefined {
            const kind = (<any>result).kind
            switch (kind) {
                case "activated":
                case "keepOpen":
                case "cancelled":
                case "closed":
                case "deleted":
                case "completed":
                    return true
            }
            return undefined
        }

        private createFocusInputController(): UiFocusInputController {
            return new UiFocusInputController({
                focus: this.focus_,
                scroll: this.options_.scroll,
                wheel: this.options_.wheel,
            })
        }

        private resolveModalConstraints(runtime: UiRuntime): void {
            if (this.options_.modalConstraints) {
                this.modalConstraints_.maxWidth =
                    this.options_.modalConstraints.maxWidth
                this.modalConstraints_.maxHeight =
                    this.options_.modalConstraints.maxHeight
                return
            }

            const profile = runtime.displayProfile
            this.modalConstraints_.maxWidth = Math.round(
                profile.logicalWidth / profile.designToLogicalScaleX,
            )
            this.modalConstraints_.maxHeight = Math.round(
                profile.logicalHeight / profile.designToLogicalScaleY,
            )
        }
    }

    class UiScreenRoot<TResult> {
        public widget: UiFocusableWidget<TResult>
        public placement: UiPlacement
        public rect: Rect
        public childRect: Rect
        public constraints: UiLayoutConstraints
        public measured: UiMeasuredSize

        constructor(widget: UiFocusableWidget<TResult>, placement?: UiPlacement) {
            this.widget = widget
            this.placement = placement
            this.rect = new Rect()
            this.childRect = new Rect()
            this.constraints = { maxWidth: 0, maxHeight: 0 }
            this.measured = new UiMeasuredSize()
        }
    }
}
