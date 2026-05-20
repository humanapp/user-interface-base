namespace ui {
    /**
     * Registration handle returned by observer APIs.
     */
    export interface UiObserverHandle {
        /**
         * Unregisters the observer. Calling this more than once has no effect.
         */
        dispose(): void
    }

    /**
     * Observer called after a retained layout owner completes a layout pass.
     */
    export interface UiLayoutObserver {
        /**
         * Receives the completed layout notification.
         */
        (): void
    }

    /**
     * Scroll state category delivered after retained scroll state changes.
     */
    export type UiScrollEvent =
        | { kind: "configuration" }
        | { kind: "geometry" }
        | { kind: "offset" }

    /**
     * Observer called after retained scroll viewport state changes.
     */
    export interface UiScrollObserver {
        /**
         * Receives the completed scroll-state category.
         */
        (event: UiScrollEvent): void
    }
}
