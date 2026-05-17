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
         * Registers focus targets after layout has arranged this view.
         */
        registerFocusTargets(focus: UiFocusState): void

        /**
         * Registers directional navigation after layout has arranged this view.
         */
        registerNavigation(controller: UiFocusInputController): void

        /**
         * Focuses the view's default target.
         */
        focusDefault(focus: UiFocusState): UiFocusSetResult
    }

    /**
     * Screen placement for a root view.
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
         * Width of the placement rectangle. Omitted values use the view's
         * measured preferred width.
         */
        width?: number

        /**
         * Height of the placement rectangle. Omitted values use the view's
         * measured preferred height.
         */
        height?: number

        /**
         * Horizontal child placement inside the rectangle. Defaults to `start`.
         */
        horizontalAlignment?: UiLayoutAlignment

        /**
         * Vertical child placement inside the rectangle. Defaults to `start`.
         */
        verticalAlignment?: UiLayoutAlignment
    }
}
