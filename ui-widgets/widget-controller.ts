namespace ui {
    /**
     * Handles a focus input result before the controller returns whether the
     * original event was consumed.
     */
    export interface UiFocusInputResultHandler {
        /**
         * Returns a handled value to override default focus handling.
         */
        (result: UiFocusInputResult, event: UiInputEvent): boolean | undefined
    }

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
     * Handles a widget result after focus input runs.
     */
    export interface UiWidgetInputResultHandler<TResult> {
        /**
         * Returns a handled value to override default widget handling.
         */
        (result: TResult, event: UiInputEvent): boolean | undefined
    }

    /**
     * Options for a widget controller.
     */
    export interface UiWidgetControllerOptions {
        /**
         * Optional scroll request sink used by focus movement.
         */
        scroll?: UiFocusScrollHandler

        /**
         * Optional wheel handler used by focus input.
         */
        wheel?: UiFocusWheelHandler
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
     * Screen-local helper for the focus and input plumbing used by widgets.
     */
    export class UiWidgetController {
        private focus_: UiFocusState
        private focusInput_: UiFocusInputController

        constructor(options?: UiWidgetControllerOptions) {
            this.focus_ = new UiFocusState()
            this.focusInput_ = new UiFocusInputController({
                focus: this.focus_,
                scroll: options ? options.scroll : undefined,
                wheel: options ? options.wheel : undefined,
            })
        }

        /**
         * Focus state owned by this screen controller.
         */
        public get focus(): UiFocusState {
            return this.focus_
        }

        /**
         * Focus input controller owned by this screen controller.
         */
        public get focusInput(): UiFocusInputController {
            return this.focusInput_
        }

        /**
         * Registers the standard widget input actions on a screen input scope.
         */
        public registerInput(input: UiInputScope, handler: UiInputHandler): void {
            this.registerAction(input, "left", handler)
            this.registerAction(input, "right", handler)
            this.registerAction(input, "up", handler)
            this.registerAction(input, "down", handler)
            this.registerAction(input, "activate", handler)
            this.registerAction(input, "cancel", handler)
            this.registerAction(input, "pointerMove", handler)
            this.registerAction(input, "pointerClick", handler)
            this.registerAction(input, "wheel", handler)
        }

        /**
         * Registers an arranged widget and focuses its default target.
         */
        public registerWidget<TResult>(
            widget: UiFocusableWidget<TResult>,
        ): UiFocusSetResult {
            widget.registerFocusTargets(this.focus_)
            widget.registerNavigation(this.focusInput_)
            return widget.focusDefault(this.focus_)
        }

        /**
         * Renders a widget using this controller's focus state.
         */
        public render<TResult>(
            surface: DrawSurface,
            assets: UiAssetResolver,
            widget: UiWidget<TResult>,
        ): void {
            widget.render(surface, assets, this.focus_)
        }

        /**
         * Opens an arranged modal and makes it the active focus scope.
         */
        public openModal<TResult>(
            modal: UiModal<TResult>,
        ): UiFocusSetResult {
            return modal.open(this.focus_, this.focusInput_)
        }

        /**
         * Closes a modal and removes its registered focus and navigation.
         */
        public closeModal<TResult>(
            modal: UiModal<TResult>,
        ): UiFocusSetResult {
            const modalScopeId = modal.modalScopeId
            const result = modal.close(this.focus_)
            this.focusInput_.clearNavigation(modalScopeId)
            this.focus_.removeScope(modalScopeId)
            return result
        }

        /**
         * Runs focus input handling and lets the screen interpret widget results.
         */
        public handleFocusInput(
            event: UiInputEvent,
            handler?: UiFocusInputResultHandler,
        ): boolean {
            const result = this.focusInput_.handleInput(event)
            const handled = handler ? handler(result, event) : undefined
            return handled !== undefined ? handled : result.handled
        }

        /**
         * Handles one input event for a widget.
         */
        public handleInput<TResult>(
            event: UiInputEvent,
            widget: UiWidget<TResult>,
            handler?: UiWidgetInputResultHandler<TResult>,
        ): boolean {
            return this.handleFocusInput(event, (
                result: UiFocusInputResult,
                deliveredEvent: UiInputEvent,
            ): boolean | undefined => {
                const widgetResult = widget.handleFocusInput(result)
                if (!widgetResult) return undefined
                const handled = handler
                    ? handler(widgetResult, deliveredEvent)
                    : undefined
                if (handled !== undefined) return handled
                return this.defaultWidgetHandled(widgetResult)
            })
        }

        /**
         * Handles one input event for a modal.
         */
        public handleModalInput<TResult>(
            event: UiInputEvent,
            modal: UiModal<TResult>,
            handler?: UiWidgetInputResultHandler<TResult>,
        ): boolean {
            return this.handleFocusInput(event, (
                result: UiFocusInputResult,
                deliveredEvent: UiInputEvent,
            ): boolean | undefined => {
                const modalResult = modal.handleFocusInput(result)
                if (modalResult) {
                    const handled = handler
                        ? handler(modalResult, deliveredEvent)
                        : undefined
                    return handled !== undefined
                        ? handled
                        : this.defaultWidgetHandled(modalResult)
                }
                if (
                    deliveredEvent.action == "pointerClick" &&
                    result.kind == "miss"
                )
                    return true
                return undefined
            })
        }

        private registerAction(
            input: UiInputScope,
            action: UiInputAction,
            handler: UiInputHandler,
        ): void {
            input.onAction(action, handler)
        }

        private defaultWidgetHandled<TResult>(
            result: TResult,
        ): boolean | undefined {
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
    }
}
