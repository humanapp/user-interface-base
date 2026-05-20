namespace ui {
    /**
     * Display target that exposes a draw surface and presents frames.
     */
    export interface UiDisplayAdapter {
        /**
         * Physical display surface for the next committed frame.
         */
        surface: PhysicalDrawSurface

        /**
         * Presents the current frame and returns the physical bitmap that was sent.
         */
        commit(): Bitmap
    }

    /**
     * Resolves optional bitmap and text assets by id.
     */
    export interface UiAssetResolver {
        /**
         * Looks up a bitmap by asset id.
         *
         * Missing ids return a resolver-owned fallback bitmap by default. When
         * `nullIfMissing` is `true`, missing ids may return `undefined`; callers
         * must handle both bitmap and `undefined` results.
         */
        getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined

        /**
         * Returns display text for an asset id. Missing text returns the empty
         * string.
         */
        getText(id: string): string
    }

    /**
     * Frame scheduling hook for integrations with an automatic frame pump.
     */
    export interface UiScheduler {
        /**
         * Requests that a frame handler run later.
         */
        requestFrame(handler: () => void): void
    }

    /**
     * Runtime dependency bundle.
     */
    export interface UiRuntimeServices {
        /**
         * Required display adapter for frame rendering and commit.
         */
        display: UiDisplayAdapter

        /**
         * Bitmap and text resolver. Missing service uses an empty fallback resolver.
         */
        assets?: UiAssetResolver

        /**
         * Frame scheduler. Missing service requires manual `runFrame()` calls.
         */
        scheduler?: UiScheduler

        /**
         * Palette color used when a screen has no background color. Defaults to `0`.
         */
        clearColor?: number
    }

    /**
     * Options for a screen with view-managed focus and modal routing.
     */
    export interface UiScreenOptions {
        /**
         * Optional scroll request sink used by focus movement.
         */
        scroll?: UiFocusScrollHandler

        /**
         * Default measurement limits used when opening modals without options.
         */
        modalConstraints?: UiLayoutConstraints
    }

    /**
     * Screen that can be pushed onto a runtime stack.
     */
    export class UiScreen {
        /**
         * Palette color used to clear before rendering. Omitted screens use the
         * runtime clear color.
         */
        public backgroundColor: number
        private options_: UiScreenOptions
        private focus_: UiFocusState
        private focusInput_: UiFocusInputController
        private roots_: UiScreenRoot<any>[]
        private assets_: UiAssetResolver
        private activeModal_: UiModal<any>
        private modalConstraints_: UiLayoutConstraints
        private rootConstraints_: UiLayoutConstraints
        private defaultModalOptions_: UiModalOpenOptions
        private modalRect_: Rect
        private modalSize_: UiMeasuredSize
        private entered_: boolean

        constructor(options?: UiScreenOptions) {
            this.options_ = options || {}
            this.backgroundColor = undefined
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
            this.roots_ = []
            this.assets_ = undefined
            this.activeModal_ = undefined
            this.modalConstraints_ = {
                maxWidth: 0,
                maxHeight: 0,
            }
            this.rootConstraints_ = {
                maxWidth: 0,
                maxHeight: 0,
            }
            this.defaultModalOptions_ = {
                constraints: this.modalConstraints_,
            }
            this.modalRect_ = new Rect()
            this.modalSize_ = new UiMeasuredSize()
            this.entered_ = false
        }

        /**
         * Asset resolver from the active runtime.
         */
        public get assets(): UiAssetResolver {
            return this.assets_
        }

        /**
         * Focus state owned by this screen.
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
         * Adds a root view rendered and routed by this screen.
         */
        public add<TResult>(
            view: UiFocusableView<TResult>,
            placement?: UiPlacement,
        ): UiFocusableView<TResult> {
            const root = createScreenRoot<TResult>(view, placement)
            this.roots_.push(root)
            if (placement && (this.entered_ || this.hasExplicitSize(placement)))
                this.arrangeRoot(root)
            if (this.entered_) {
                this.registerRoot(root)
                if (this.roots_.length == 1) view.focusDefault(this.focus_)
            }
            return view
        }

        /**
         * Adds a root view in a horizontally centered band.
         */
        public addCentered<TResult>(
            view: UiFocusableView<TResult>,
            centerY: number,
            width: number,
            height: number,
        ): UiFocusableView<TResult> {
            return this.add(view, {
                x: 0,
                centerY,
                width,
                height,
                horizontalAlignment: "center",
                verticalAlignment: "center",
            })
        }

        /**
         * Called after the screen has been pushed onto a runtime stack.
         */
        public enter(runtime: UiRuntime): void {
            this.closeModal()
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
            this.assets_ = runtime.assets
            this.entered_ = true
            this.resolveRootConstraints(runtime)
            this.resolveModalConstraints(runtime)
            for (let i = 0; i < this.roots_.length; i++) {
                const root = this.roots_[i]
                if (root.placement) this.arrangeRoot(root)
                this.registerRoot(root)
            }
            if (this.roots_.length > 0)
                this.roots_[0].view.focusDefault(this.focus_)
        }

        /**
         * Called after the screen is removed from the stack.
         */
        public exit(): void {
            this.closeModal()
            this.assets_ = undefined
            this.entered_ = false
            this.focus_ = new UiFocusState()
            this.focusInput_ = this.createFocusInputController()
        }

        /**
         * Called when the screen becomes the active top screen.
         */
        public activate(): void {}

        /**
         * Called before another screen becomes active over this screen.
         */
        public deactivate(): void {}

        /**
         * Handles one input event.
         */
        public handleInput(event: UiInputEvent): boolean {
            if (this.activeModal_) return this.handleModalInput(event)
            const screenHandled = this.handleScreenInput(event)
            if (screenHandled !== undefined) return screenHandled
            const result = this.focusInput_.handleInput(event)
            const handled = this.handleRootFocusInput(result)
            return handled !== undefined ? handled : result.handled
        }

        /**
         * Updates state after input delivery and before rendering.
         */
        public update(): void {}

        /**
         * Renders this screen's views and active modal.
         */
        public render(surface: DrawSurface): void {
            this.renderViews(surface)
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
         * Handles screen-level input before root views receive it.
         */
        public handleScreenInput(event: UiInputEvent): boolean | undefined {
            return undefined
        }

        private renderViews(surface: DrawSurface): void {
            if (!this.assets_) return
            for (let i = 0; i < this.roots_.length; i++) {
                this.roots_[i].view.render(surface, this.assets_, this.focus_)
            }
            if (this.activeModal_)
                this.activeModal_.render(surface, this.assets_, this.focus_)
        }

        private registerRoot<TResult>(root: UiScreenRoot<TResult>): void {
            root.view.registerFocusTargets(this.focus_)
            root.view.registerNavigation(this.focusInput_)
        }

        private arrangeRoot<TResult>(root: UiScreenRoot<TResult>): void {
            const placement = root.placement
            const hasWidth = placement.width !== undefined
            const hasHeight = placement.height !== undefined
            let width = hasWidth
                ? _uiLayout.sanitizeDimension(placement.width)
                : this.rootConstraints_.maxWidth
            let height = hasHeight
                ? _uiLayout.sanitizeDimension(placement.height)
                : this.rootConstraints_.maxHeight
            root.constraints.maxWidth = width
            root.constraints.maxHeight = height
            root.view.measure(root.constraints, root.measured)
            if (!hasWidth) width = root.measured.preferredWidth
            if (!hasHeight) height = root.measured.preferredHeight
            root.rect.set(
                this.placementX(placement, width),
                this.placementY(placement, height),
                width,
                height,
            )
            root.constraints.maxWidth = width
            root.constraints.maxHeight = height
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
                _uiLayout.alignedOffset(
                    root.rect.x,
                    width,
                    childWidth,
                    horizontal,
                ),
                _uiLayout.alignedOffset(
                    root.rect.y,
                    height,
                    childHeight,
                    vertical,
                ),
                childWidth,
                childHeight,
            )
            root.view.arrange(root.childRect)
        }

        private hasExplicitSize(placement: UiPlacement): boolean {
            return (
                placement.width !== undefined && placement.height !== undefined
            )
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
            const modal = this.activeModal_
            const modalResult = modal.handleFocusInput(result)
            if (modalResult) {
                if ((<any>modalResult).kind == "cancelled")
                    this.closeModal(modal)
                const handled = this.defaultHandled(modalResult)
                return handled !== undefined ? handled : result.handled
            }
            return result.handled
        }

        private handleRootFocusInput(
            result: UiFocusInputResult,
        ): boolean | undefined {
            for (let i = 0; i < this.roots_.length; i++) {
                const viewResult = this.roots_[i].view.handleFocusInput(result)
                if (viewResult) return this.defaultHandled(viewResult)
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
            })
        }

        private resolveRootConstraints(runtime: UiRuntime): void {
            const profile = runtime.displayProfile
            this.rootConstraints_.maxWidth = Math.round(
                profile.logicalWidth / profile.designToLogicalScaleX,
            )
            this.rootConstraints_.maxHeight = Math.round(
                profile.logicalHeight / profile.designToLogicalScaleY,
            )
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

    interface UiScreenRoot<TResult> {
        view: UiFocusableView<TResult>
        placement: UiPlacement
        rect: Rect
        childRect: Rect
        constraints: UiLayoutConstraints
        measured: UiMeasuredSize
    }

    function createScreenRoot<TResult>(
        view: UiFocusableView<TResult>,
        placement?: UiPlacement,
    ): UiScreenRoot<TResult> {
        return {
            view,
            placement,
            rect: new Rect(),
            childRect: new Rect(),
            constraints: { maxWidth: 0, maxHeight: 0 },
            measured: new UiMeasuredSize(),
        }
    }

    class UiNoopAssetResolver implements UiAssetResolver {
        private emptyBitmap_: Bitmap

        constructor() {
            this.emptyBitmap_ = bmp`.`
        }

        public getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined {
            if (nullIfMissing) return undefined
            return this.emptyBitmap_
        }

        public getText(id: string): string {
            return ""
        }
    }

    class UiManualScheduler implements UiScheduler {
        public requestFrame(handler: () => void): void {}
    }

    /**
     * Owns screen stack state, queued input, and frame execution.
     */
    export class UiRuntime {
        private display_: UiDisplayAdapter
        private assets_: UiAssetResolver
        private scheduler_: UiScheduler
        private clearColor_: number
        private stack_: UiSceneStack
        private inputQueue_: UiInputEvent[]

        constructor(options: UiRuntimeServices) {
            this.display_ = options.display
            this.assets_ = options.assets || new UiNoopAssetResolver()
            this.scheduler_ = options.scheduler || new UiManualScheduler()
            this.clearColor_ =
                options.clearColor !== undefined ? options.clearColor : 0
            this.inputQueue_ = []
            this.stack_ = new UiSceneStack(this)
        }

        /**
         * Display target used for rendering and frame commit.
         */
        public get display(): UiDisplayAdapter {
            return this.display_
        }

        /**
         * Asset resolver for screens and controls.
         */
        public get assets(): UiAssetResolver {
            return this.assets_
        }

        /**
         * Frame scheduling hook.
         */
        public get scheduler(): UiScheduler {
            return this.scheduler_
        }

        /**
         * Active immutable display profile provided by the display adapter.
         */
        public get displayProfile(): UiDisplayProfile {
            return this.display_.surface.displayProfile
        }

        /**
         * Stack that controls active screen lifecycle.
         */
        public get scenes(): UiSceneStack {
            return this.stack_
        }

        /**
         * Pushes a screen and makes it active.
         */
        public push(screen: UiScreen): void {
            this.stack_.push(screen)
        }

        /**
         * Removes the active screen and reactivates the screen below it. Returns
         * `undefined` when the stack is empty.
         */
        public pop(): UiScreen | undefined {
            return this.stack_.pop()
        }

        /**
         * Replaces the active screen without reactivating the screen below it.
         * Returns `undefined` when the stack is empty.
         */
        public replace(screen: UiScreen): UiScreen | undefined {
            return this.stack_.replace(screen)
        }

        /**
         * Returns the active screen, or `undefined` when the stack is empty.
         */
        public top(): UiScreen | undefined {
            return this.stack_.top()
        }

        /**
         * Returns the number of screens in the stack.
         */
        public depth(): number {
            return this.stack_.depth()
        }

        /**
         * Queues an input event for the next frame.
         */
        public dispatchInput(event: UiInputEvent): void {
            this.inputQueue_.push(event)
        }

        /**
         * Drops all queued input events.
         */
        public clearInputQueue(): void {
            while (this.inputQueue_.length) this.inputQueue_.pop()
        }

        /**
         * Delivers queued input, updates, renders, and commits the active screen.
         */
        public runFrame(): void {
            this.stack_.runFrame(
                this.inputQueue_,
                this.display_,
                this.clearColor_,
            )
        }
    }
}
