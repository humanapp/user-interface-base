namespace ui {
    /**
     * View lifecycle shared by screen-managed controls.
     */
    export interface UiView<TResult> extends UiLayoutNode {
        /**
         * Renders the view through the supplied draw surface.
         */
        render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void

        /**
         * Converts focus input into the view's typed result.
         */
        handleFocusInput(result: UiFocusInputResult): TResult
    }

    /**
     * View lifecycle for controls that own a normal focus scope.
     */
    export interface UiFocusableView<TResult> extends UiView<TResult> {
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
