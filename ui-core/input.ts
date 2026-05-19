namespace ui {
    /**
     * Discrete input actions that screens can handle.
     */
    export type UiInputAction =
        | "up"
        | "down"
        | "left"
        | "right"
        | "activate"
        | "cancel"
        | "menu"
        | "pointerMove"
        | "pointerClick"
        | "wheel"

    /**
     * Physical or synthetic source that produced a semantic input action.
     */
    export type UiInputSource =
        | "displayShieldController"
        | "microbitButton"
        | "keyboard"
        | "pointer"
        | "wheel"
        | "synthetic"

    /**
     * Phase for pressable input actions. Missing phase is treated as `pressed`.
     */
    export type UiInputPhase = "pressed" | "released" | "repeated"

    /**
     * Queued input payload delivered during `runFrame()`.
     */
    export interface UiInputEvent {
        /**
         * Kind of input that occurred.
         */
        action: UiInputAction

        /**
         * Physical or synthetic source for the semantic action.
         */
        source?: UiInputSource

        /**
         * Press lifecycle phase for button-like input.
         */
        phase?: UiInputPhase

        /**
         * Pointer x coordinate in UI units.
         */
        x?: number

        /**
         * Pointer y coordinate in UI units.
         */
        y?: number

        /**
         * Wheel x delta in UI units.
         */
        dx?: number

        /**
         * Wheel y delta in UI units.
         */
        dy?: number
    }
}
