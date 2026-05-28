namespace ui {
    /**
     * Directional navigation registered for one focus scope.
     */
    export type UiFocusNavigation =
        | UiRowFocusNavigation
        | UiRaggedGridFocusNavigation
        | UiFocusNavigationProvider

    /**
     * Row navigation for a focus scope.
     */
    export interface UiRowFocusNavigation {
        /**
         * Navigation kind.
         */
        kind: "row"

        /**
         * Targets in movement order.
         */
        targets: UiFocusNavigationTarget[]

        /**
         * Whether movement wraps inside the row.
         */
        wrap?: boolean
    }

    /**
     * Ragged-grid navigation for a focus scope.
     */
    export interface UiRaggedGridFocusNavigation {
        /**
         * Navigation kind.
         */
        kind: "raggedGrid"

        /**
         * Rows in movement order.
         */
        rows: UiFocusNavigationTarget[][]

        /**
         * Whether left/right movement wraps inside the current row.
         */
        horizontalWrap?: boolean

        /**
         * Preferred column for vertical movement.
         */
        columnIntent?: number

        /**
         * Strategy for vertical movement. Defaults to `"column"`.
         */
        verticalStrategy?: UiFocusVerticalStrategy
    }

    /**
     * Current directional movement request for a navigation provider.
     */
    export interface UiFocusNavigationRequest {
        /**
         * Active focus scope.
         */
        scopeId: UiFocusScopeId

        /**
         * Requested movement direction.
         */
        direction: UiFocusDirection

        /**
         * Active target in the active scope.
         */
        currentTargetId?: UiFocusId
    }

    /**
     * Custom focus navigation for app-specific focus graphs.
     */
    export interface UiFocusNavigationProvider {
        /**
         * Returns the movement result for one directional request.
         */
        move(request: UiFocusNavigationRequest): UiFocusMoveResult | undefined
    }

    /**
     * Handles scroll requests produced by focus movement or focus transitions.
     */
    export interface UiFocusScrollHandler {
        (request: UiFocusScrollRequest): void
    }

    /**
     * Result kind returned by focus input handling.
     */
    export type UiFocusInputKind =
        | "ignored"
        | "moved"
        | "stayed"
        | "exited"
        | "activated"
        | "notActivated"
        | "cancelled"
        | "notCancelled"

    /**
     * Reason for an ignored, rejected, or unhandled focus input.
     */
    export type UiFocusInputReason =
        | "unsupportedAction"
        | "missingActiveScope"
        | "missingNavigation"
        | "movementExited"
        | "focusRejected"
        | "unsupportedPhase"

    /**
     * Result returned by focus input handling.
     */
    export interface UiFocusInputResult {
        /**
         * Input action that was handled or rejected.
         */
        action: UiInputAction

        /**
         * Whether focus input handling consumed the event.
         */
        handled: boolean

        /**
         * High-level result kind.
         */
        kind: UiFocusInputKind

        /**
         * Reason for ignored input or a rejected focus transition.
         */
        reason?: UiFocusInputReason

        /**
         * Scope associated with the handled focus input.
         */
        scopeId?: UiFocusScopeId

        /**
         * Target associated with the handled focus input.
         */
        targetId?: UiFocusId

        /**
         * Direction associated with a boundary exit.
         */
        direction?: UiFocusDirection

        /**
         * Scroll request emitted by focus movement or a focus transition.
         */
        scrollRequest?: UiFocusScrollRequest
    }

    /**
     * Composes semantic input actions with focus state and registered navigation.
     */
    export class UiFocusInputController {
        private focus_: UiFocusState
        private navigationScopeIds_: UiFocusScopeId[]
        private navigationValues_: UiFocusNavigation[]
        private scroll_: UiFocusScrollHandler

        constructor(focus: UiFocusState, scroll?: UiFocusScrollHandler) {
            this.focus_ = focus
            this.navigationScopeIds_ = []
            this.navigationValues_ = []
            this.scroll_ = scroll
        }

        /**
         * Registers or replaces directional navigation for one focus scope.
         */
        public setNavigation(
            scopeId: UiFocusScopeId,
            navigation: UiFocusNavigation,
        ): void {
            const index = this.navigationIndex(scopeId)
            if (index >= 0) {
                this.navigationValues_[index] = navigation
            } else {
                this.navigationScopeIds_.push(scopeId)
                this.navigationValues_.push(navigation)
            }
        }

        /**
         * Removes directional navigation for one focus scope.
         */
        public clearNavigation(scopeId: UiFocusScopeId): void {
            const index = this.navigationIndex(scopeId)
            if (index >= 0) {
                this.navigationScopeIds_.removeAt(index)
                this.navigationValues_.removeAt(index)
            }
        }

        /**
         * Handles one semantic input event.
         */
        public handleInput(event: UiInputEvent): UiFocusInputResult {
            switch (event.action) {
                case "up":
                case "down":
                case "left":
                case "right":
                    return this.handleDirectionalInput(event, event.action)
                case "activate":
                    return this.handleActivateInput(event)
                case "cancel":
                    return this.handleCancelInput(event)
            }

            return {
                action: event.action,
                handled: false,
                kind: "ignored",
                reason: "unsupportedAction",
            }
        }

        private handleDirectionalInput(
            event: UiInputEvent,
            direction: UiFocusDirection,
        ): UiFocusInputResult {
            const phase = event.phase || "pressed"
            if (phase != "pressed" && phase != "repeated") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "unsupportedPhase",
                }
            }

            const activeScopeId = this.focus_.getActiveScopeId()
            if (activeScopeId === undefined) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingActiveScope",
                }
            }

            const navigationIndex = this.navigationIndex(activeScopeId)
            if (navigationIndex < 0) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingNavigation",
                }
            }

            const currentTargetId = this.focus_.getActiveTargetId(activeScopeId)
            const request: UiFocusNavigationRequest = {
                scopeId: activeScopeId,
                direction,
                currentTargetId,
            }
            const moveResult = this.moveNavigation(
                this.navigationValues_[navigationIndex],
                request,
            )
            if (!moveResult) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingNavigation",
                }
            }

            if (moveResult.kind == "moved") {
                const focusResult = this.focus_.setActiveTarget(
                    moveResult.toScopeId,
                    moveResult.toTargetId,
                )
                if (
                    focusResult.kind != "focused" &&
                    focusResult.kind != "unchanged"
                ) {
                    return {
                        action: event.action,
                        handled: false,
                        kind: "ignored",
                        reason: "focusRejected",
                    }
                }

                const scrollRequest =
                    (focusResult.kind == "focused"
                        ? focusResult.scrollRequest
                        : undefined) || moveResult.scrollRequest
                if (scrollRequest && this.scroll_) this.scroll_(scrollRequest)
                return {
                    action: event.action,
                    handled: true,
                    kind: "moved",
                    scopeId: moveResult.toScopeId,
                    targetId: moveResult.toTargetId,
                    scrollRequest,
                }
            }

            if (moveResult.kind == "exited") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "exited",
                    reason: "movementExited",
                    scopeId: moveResult.scopeId,
                    targetId: moveResult.targetId,
                    direction: moveResult.direction,
                }
            }

            return {
                action: event.action,
                handled: true,
                kind: "stayed",
                scopeId: moveResult.scopeId,
                targetId: moveResult.targetId,
            }
        }

        private handleActivateInput(event: UiInputEvent): UiFocusInputResult {
            if ((event.phase || "pressed") != "pressed") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "unsupportedPhase",
                }
            }

            const activationResult = this.focus_.activate()
            return {
                action: event.action,
                handled: activationResult.kind == "activated",
                kind:
                    activationResult.kind == "activated"
                        ? "activated"
                        : "notActivated",
                scopeId: activationResult.scopeId,
                targetId: activationResult.targetId,
            }
        }

        private handleCancelInput(event: UiInputEvent): UiFocusInputResult {
            if ((event.phase || "pressed") != "pressed") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "unsupportedPhase",
                }
            }

            const cancelResult = this.focus_.cancel()
            return {
                action: event.action,
                handled: cancelResult.kind == "handled",
                kind:
                    cancelResult.kind == "handled"
                        ? "cancelled"
                        : "notCancelled",
                scopeId: cancelResult.scopeId,
            }
        }

        private moveNavigation(
            navigation: UiFocusNavigation,
            request: UiFocusNavigationRequest,
        ): UiFocusMoveResult | undefined {
            const kind = (<any>navigation).kind
            if (kind == "row") {
                return this.moveRow(<UiRowFocusNavigation>navigation, request)
            }
            if (kind == "raggedGrid") {
                const grid = <UiRaggedGridFocusNavigation>navigation
                return moveFocusInRaggedGrid({
                    scopeId: request.scopeId,
                    currentTargetId: request.currentTargetId,
                    direction: request.direction,
                    horizontalWrap: grid.horizontalWrap,
                    columnIntent: grid.columnIntent,
                    rows: grid.rows,
                    verticalStrategy: grid.verticalStrategy,
                })
            }
            return (<UiFocusNavigationProvider>navigation).move(request)
        }

        private moveRow(
            navigation: UiRowFocusNavigation,
            request: UiFocusNavigationRequest,
        ): UiFocusMoveResult {
            return moveFocusInRaggedGrid({
                scopeId: request.scopeId,
                currentTargetId: request.currentTargetId,
                direction: request.direction,
                horizontalWrap: navigation.wrap,
                rows: [navigation.targets],
            })
        }

        private navigationIndex(scopeId: UiFocusScopeId): number {
            for (let i = 0; i < this.navigationScopeIds_.length; i++) {
                if (this.navigationScopeIds_[i] == scopeId) return i
            }
            return -1
        }
    }
}
