namespace ui {
  /**
   * Discrete input actions that screens can handle.
   */
  export type UiInputAction =
    "up" |
    "down" |
    "left" |
    "right" |
    "activate" |
    "cancel" |
    "pointerMove" |
    "pointerClick" |
    "wheel"

  /**
   * Queued input payload delivered during `runFrame()`.
   */
  export interface UiInputEvent {
    /**
     * Kind of input that occurred.
     */
    action: UiInputAction

    /**
     * Pointer x coordinate in logical viewport pixels.
     */
    x?: number

    /**
     * Pointer y coordinate in logical viewport pixels.
     */
    y?: number

    /**
     * Wheel x delta in logical input units.
     */
    dx?: number

    /**
     * Wheel y delta in logical input units.
     */
    dy?: number
  }

  /**
   * Handles an input event and returns `true` when delivery should stop.
   */
  export interface UiInputHandler {
    (event: UiInputEvent): boolean
  }

  /**
   * Input registrations for one screen while it is on the stack.
   */
  export interface UiInputScope {
    /**
     * Registers a handler for one action. Handlers run in registration order.
     */
    onAction(action: UiInputAction, handler: UiInputHandler): void

    /**
     * Prevents future handler registration and delivery for this screen.
     */
    dispose(): void
  }
}
