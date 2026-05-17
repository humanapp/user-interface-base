namespace ui {
    /**
     * Handles a focus input result before the controller returns whether the
     * original event was consumed.
     */
    export interface UiWidgetInputResultHandler {
        /**
         * Returns a handled value to override default focus handling.
         */
        (result: UiFocusInputResult, event: UiInputEvent): boolean | undefined
    }

    /**
     * Handles an action row result after focus input runs.
     */
    export interface UiActionRowInputResultHandler<T> {
        /**
         * Returns a handled value to override default row handling.
         */
        (
            result: UiActionRowResult<T>,
            event: UiInputEvent,
        ): boolean | undefined
    }

    /**
     * Handles an action grid result after focus input runs.
     */
    export interface UiActionGridInputResultHandler<T> {
        /**
         * Returns a handled value to override default grid handling.
         */
        (
            result: UiActionGridResult<T>,
            event: UiInputEvent,
        ): boolean | undefined
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
    export interface UiModal<TResult> extends UiLayoutNode {
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

        /**
         * Converts focus input into the modal's typed result.
         */
        handleFocusInput(result: UiFocusInputResult): TResult
    }

    /**
     * Handles a modal result after focus input runs.
     */
    export interface UiModalInputResultHandler<TResult> {
        /**
         * Returns a handled value to override default modal handling.
         */
        (result: TResult, event: UiInputEvent): boolean | undefined
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
         * Registers an arranged action row and focuses its default target.
         */
        public registerActionRow<T>(
            row: UiActionRow<T>,
        ): UiFocusSetResult {
            row.registerFocusTargets(this.focus_)
            row.registerNavigation(this.focusInput_)
            return row.focusDefault(this.focus_)
        }

        /**
         * Registers an arranged action grid and focuses its default target.
         */
        public registerActionGrid<T>(
            grid: UiActionGrid<T>,
        ): UiFocusSetResult {
            grid.registerFocusTargets(this.focus_)
            grid.registerNavigation(this.focusInput_)
            return grid.focusDefault(this.focus_)
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
        public handleInput(
            event: UiInputEvent,
            handler?: UiWidgetInputResultHandler,
        ): boolean {
            const result = this.focusInput_.handleInput(event)
            const handled = handler ? handler(result, event) : undefined
            return handled !== undefined ? handled : result.handled
        }

        /**
         * Handles one input event for an action row.
         */
        public handleActionRowInput<T>(
            event: UiInputEvent,
            row: UiActionRow<T>,
            handler?: UiActionRowInputResultHandler<T>,
        ): boolean {
            return this.handleInput(event, (
                result: UiFocusInputResult,
                deliveredEvent: UiInputEvent,
            ): boolean | undefined => {
                const rowResult = row.handleFocusInput(result)
                if (!rowResult) return undefined
                const handled = handler
                    ? handler(rowResult, deliveredEvent)
                    : undefined
                if (handled !== undefined) return handled
                return rowResult.kind == "activated" ? true : undefined
            })
        }

        /**
         * Handles one input event for an action grid.
         */
        public handleActionGridInput<T>(
            event: UiInputEvent,
            grid: UiActionGrid<T>,
            handler?: UiActionGridInputResultHandler<T>,
        ): boolean {
            return this.handleInput(event, (
                result: UiFocusInputResult,
                deliveredEvent: UiInputEvent,
            ): boolean | undefined => {
                const gridResult = grid.handleFocusInput(result)
                if (!gridResult) return undefined
                const handled = handler
                    ? handler(gridResult, deliveredEvent)
                    : undefined
                if (handled !== undefined) return handled
                return gridResult.kind == "activated" ? true : undefined
            })
        }

        /**
         * Handles one input event for a modal.
         */
        public handleModalInput<TResult>(
            event: UiInputEvent,
            modal: UiModal<TResult>,
            handler?: UiModalInputResultHandler<TResult>,
        ): boolean {
            return this.handleInput(event, (
                result: UiFocusInputResult,
                deliveredEvent: UiInputEvent,
            ): boolean | undefined => {
                const modalResult = modal.handleFocusInput(result)
                if (modalResult) {
                    const handled = handler
                        ? handler(modalResult, deliveredEvent)
                        : undefined
                    return handled !== undefined ? handled : true
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
    }
}
