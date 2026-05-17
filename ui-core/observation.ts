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
     * Focus transition record delivered after active focus changes.
     */
    export interface UiFocusEvent {
        /**
         * Active scope before the transition, when one existed.
         */
        previousScopeId?: UiFocusScopeId

        /**
         * Active target before the transition, when one existed.
         */
        previousTargetId?: UiFocusId

        /**
         * Active scope after the transition, when one exists.
         */
        currentScopeId?: UiFocusScopeId

        /**
         * Active target after the transition, when one exists.
         */
        currentTargetId?: UiFocusId
    }

    /**
     * Observer called after active focus changes.
     */
    export interface UiFocusObserver {
        /**
         * Receives the completed focus transition.
         */
        (event: UiFocusEvent): void
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
