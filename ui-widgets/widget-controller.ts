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

        private registerAction(
            input: UiInputScope,
            action: UiInputAction,
            handler: UiInputHandler,
        ): void {
            input.onAction(action, handler)
        }
    }
}
