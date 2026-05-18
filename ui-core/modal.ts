namespace ui {
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
     * Modal view lifecycle used by screen controllers.
     */
    export interface UiModal<TResult> extends UiView<TResult> {
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
}
