namespace ui {
    /**
     * Directional navigation registered for one focus scope.
     */
    export type UiFocusNavigation =
        | UiRowFocusNavigation
        | UiColumnFocusNavigation
        | UiGridFocusNavigation
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
     * Column navigation for a focus scope.
     */
    export interface UiColumnFocusNavigation {
        /**
         * Navigation kind.
         */
        kind: "column"

        /**
         * Targets in movement order.
         */
        targets: UiFocusNavigationTarget[]

        /**
         * Whether movement wraps inside the column.
         */
        wrap?: boolean
    }

    /**
     * Grid navigation for a focus scope.
     */
    export interface UiGridFocusNavigation {
        /**
         * Navigation kind.
         */
        kind: "grid"

        /**
         * Target cells in caller-defined coordinate order.
         */
        cells: UiFocusGridNavigationCell[]

        /**
         * Whether movement wraps inside the current row or column.
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
         * Whether movement wraps inside the ragged grid.
         */
        wrap?: boolean

        /**
         * Preferred column for vertical movement.
         */
        columnIntent?: number
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
     * Handles simulator wheel input outside active focus targeting.
     */
    export interface UiFocusWheelHandler {
        (event: UiInputEvent): boolean
    }

    /**
     * Dependencies used by `UiFocusInputController`.
     */
    export interface UiFocusInputControllerOptions {
        /**
         * Focus state to read and update.
         */
        focus: UiFocusState

        /**
         * Optional scroll request sink.
         */
        scroll?: UiFocusScrollHandler

        /**
         * Optional simulator wheel sink.
         */
        wheel?: UiFocusWheelHandler
    }

    /**
     * High-level result kind returned by focus input handling.
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
        | "hit"
        | "miss"
        | "wheel"

    /**
     * Machine-readable reason for an ignored, rejected, or unhandled focus input.
     */
    export type UiFocusInputReason =
        | "unsupportedAction"
        | "missingActiveScope"
        | "missingNavigation"
        | "missingPointerCoordinates"
        | "movementExited"
        | "focusRejected"
        | "unsupportedPhase"
        | "wheelUnhandled"

    /**
     * Optional operation details returned by focus input handling.
     */
    export interface UiFocusInputDetail {
        /**
         * Directional movement result when movement handling ran.
         */
        moveResult?: UiFocusMoveResult

        /**
         * Focus transition result when the controller requested focus changes.
         */
        focusResult?: UiFocusSetResult

        /**
         * Activation result when focus activation was requested.
         */
        activationResult?: UiFocusActivationResult

        /**
         * Cancellation result when focus cancellation was requested.
         */
        cancelResult?: UiFocusCancelResult

        /**
         * Hit-test result when pointer input was processed.
         */
        hitTestResult?: UiFocusHitTestResult
    }

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
         * Optional lower-level result details.
         */
        detail?: UiFocusInputDetail

        /**
         * Scroll request emitted by focus movement or a focus transition.
         */
        scrollRequest?: UiFocusScrollRequest
    }

    class UiFocusNavigationRecord {
        public scopeId: UiFocusScopeId
        public navigation: UiFocusNavigation

        constructor(scopeId: UiFocusScopeId, navigation: UiFocusNavigation) {
            this.scopeId = scopeId
            this.navigation = navigation
        }
    }

    /**
     * Composes semantic input actions with focus state and registered navigation.
     */
    export class UiFocusInputController {
        private focus_: UiFocusState
        private navigation_: UiFocusNavigationRecord[]
        private scroll_: UiFocusScrollHandler
        private wheel_: UiFocusWheelHandler

        constructor(options: UiFocusInputControllerOptions) {
            this.focus_ = options.focus
            this.navigation_ = []
            this.scroll_ = options.scroll
            this.wheel_ = options.wheel
        }

        /**
         * Registers or replaces directional navigation for one focus scope.
         */
        public setNavigation(
            scopeId: UiFocusScopeId,
            navigation: UiFocusNavigation,
        ): void {
            const record = this.navigationForScope(scopeId)
            if (record) {
                record.navigation = navigation
            } else {
                this.navigation_.push(
                    new UiFocusNavigationRecord(scopeId, navigation),
                )
            }
        }

        /**
         * Removes directional navigation for one focus scope.
         */
        public clearNavigation(scopeId: UiFocusScopeId): void {
            for (let i = 0; i < this.navigation_.length; i++) {
                if (this.navigation_[i].scopeId == scopeId) {
                    this.navigation_.removeAt(i)
                    return
                }
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
                case "pointerMove":
                    return this.handlePointerMoveInput(event)
                case "pointerClick":
                    return this.handlePointerClickInput(event)
                case "wheel":
                    return this.handleWheelInput(event)
            }

            return {
                action: event.action,
                handled: false,
                kind: "ignored",
                reason: "unsupportedAction",
            }
        }

        /**
         * Registers focus-owned handlers on an input scope.
         */
        public register(input: UiInputScope): void {
            this.registerAction(input, "up")
            this.registerAction(input, "down")
            this.registerAction(input, "left")
            this.registerAction(input, "right")
            this.registerAction(input, "activate")
            this.registerAction(input, "cancel")
            this.registerAction(input, "pointerMove")
            this.registerAction(input, "pointerClick")
            this.registerAction(input, "wheel")
        }

        private registerAction(
            input: UiInputScope,
            action: UiInputAction,
        ): void {
            input.onAction(
                action,
                (event: UiInputEvent) => this.handleInput(event).handled,
            )
        }

        private handleDirectionalInput(
            event: UiInputEvent,
            direction: UiFocusDirection,
        ): UiFocusInputResult {
            if (!this.isPressedOrRepeated(event)) {
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

            const record = this.navigationForScope(activeScopeId)
            if (!record) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingNavigation",
                }
            }

            const currentTargetId = this.focus_.getActiveTargetId(activeScopeId)
            const moveResult = this.moveFocus(record.navigation, {
                scopeId: activeScopeId,
                direction,
                currentTargetId,
            })
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
                if (!this.isAcceptedFocusResult(focusResult)) {
                    return {
                        action: event.action,
                        handled: false,
                        kind: "ignored",
                        reason: "focusRejected",
                        detail: { moveResult, focusResult },
                    }
                }

                const scrollRequest =
                    this.focusScrollRequest(focusResult) ||
                    moveResult.scrollRequest
                if (scrollRequest) this.deliverScrollRequest(scrollRequest)
                return {
                    action: event.action,
                    handled: true,
                    kind: "moved",
                    detail: { moveResult, focusResult },
                    scrollRequest,
                }
            }

            if (moveResult.kind == "exited") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "exited",
                    reason: "movementExited",
                    detail: { moveResult },
                }
            }

            return {
                action: event.action,
                handled: true,
                kind: "stayed",
                detail: { moveResult },
            }
        }

        private handleActivateInput(event: UiInputEvent): UiFocusInputResult {
            if (this.phase(event) != "pressed") {
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
                detail: { activationResult },
            }
        }

        private handleCancelInput(event: UiInputEvent): UiFocusInputResult {
            if (this.phase(event) != "pressed") {
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
                detail: { cancelResult },
            }
        }

        private handlePointerMoveInput(
            event: UiInputEvent,
        ): UiFocusInputResult {
            if (!this.hasPointerCoordinates(event)) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingPointerCoordinates",
                }
            }

            const hitTestResult = this.focus_.hitTest(event.x, event.y)
            return {
                action: event.action,
                handled: false,
                kind: hitTestResult.kind == "hit" ? "hit" : "miss",
                detail: { hitTestResult },
            }
        }

        private handlePointerClickInput(
            event: UiInputEvent,
        ): UiFocusInputResult {
            if (!this.hasPointerCoordinates(event)) {
                return {
                    action: event.action,
                    handled: false,
                    kind: "ignored",
                    reason: "missingPointerCoordinates",
                }
            }

            const hitTestResult = this.focus_.hitTest(event.x, event.y)
            if (hitTestResult.kind == "miss") {
                return {
                    action: event.action,
                    handled: false,
                    kind: "miss",
                    detail: { hitTestResult },
                }
            }

            if (hitTestResult.disabled) {
                return {
                    action: event.action,
                    handled: true,
                    kind: "hit",
                    detail: { hitTestResult },
                }
            }

            let focusResult: UiFocusSetResult = undefined
            const activeScopeId = this.focus_.getActiveScopeId()
            const activeTargetId = this.focus_.getActiveTargetId(
                hitTestResult.scopeId,
            )
            if (
                activeScopeId != hitTestResult.scopeId ||
                activeTargetId != hitTestResult.targetId
            ) {
                focusResult = this.focus_.setActiveTarget(
                    hitTestResult.scopeId,
                    hitTestResult.targetId,
                )
                if (!this.isAcceptedFocusResult(focusResult)) {
                    return {
                        action: event.action,
                        handled: false,
                        kind: "ignored",
                        reason: "focusRejected",
                        detail: { focusResult, hitTestResult },
                    }
                }
            }

            const scrollRequest = focusResult
                ? this.focusScrollRequest(focusResult)
                : undefined
            if (scrollRequest) this.deliverScrollRequest(scrollRequest)
            const activationResult = this.focus_.activate()
            const detail: UiFocusInputDetail = focusResult
                ? { focusResult, activationResult, hitTestResult }
                : { activationResult, hitTestResult }
            return {
                action: event.action,
                handled: true,
                kind:
                    activationResult.kind == "activated"
                        ? "activated"
                        : "notActivated",
                detail,
                scrollRequest,
            }
        }

        private handleWheelInput(event: UiInputEvent): UiFocusInputResult {
            if (this.wheel_) {
                const handled = this.wheel_(event)
                return {
                    action: event.action,
                    handled,
                    kind: "wheel",
                    reason: handled ? undefined : "wheelUnhandled",
                }
            }

            return {
                action: event.action,
                handled: false,
                kind: "wheel",
                reason: "wheelUnhandled",
            }
        }

        private moveFocus(
            navigation: UiFocusNavigation,
            request: UiFocusNavigationRequest,
        ): UiFocusMoveResult | undefined {
            const kind = (<any>navigation).kind
            if (kind === undefined)
                return (<UiFocusNavigationProvider>navigation).move(request)

            switch (kind) {
                case "row": {
                    const row = <UiRowFocusNavigation>navigation
                    return moveFocusInRow({
                        scopeId: request.scopeId,
                        currentTargetId: request.currentTargetId,
                        direction: request.direction,
                        targets: row.targets,
                        wrap: row.wrap,
                    })
                }
                case "column": {
                    const column = <UiColumnFocusNavigation>navigation
                    return moveFocusInColumn({
                        scopeId: request.scopeId,
                        currentTargetId: request.currentTargetId,
                        direction: request.direction,
                        targets: column.targets,
                        wrap: column.wrap,
                    })
                }
                case "grid": {
                    const grid = <UiGridFocusNavigation>navigation
                    return moveFocusInGrid({
                        scopeId: request.scopeId,
                        currentTargetId: request.currentTargetId,
                        direction: request.direction,
                        cells: grid.cells,
                        wrap: grid.wrap,
                    })
                }
            }

            const raggedGrid = <UiRaggedGridFocusNavigation>navigation
            return moveFocusInRaggedGrid({
                scopeId: request.scopeId,
                currentTargetId: request.currentTargetId,
                direction: request.direction,
                rows: raggedGrid.rows,
                wrap: raggedGrid.wrap,
                columnIntent: raggedGrid.columnIntent,
            })
        }

        private navigationForScope(
            scopeId: UiFocusScopeId,
        ): UiFocusNavigationRecord {
            for (let i = 0; i < this.navigation_.length; i++) {
                const record = this.navigation_[i]
                if (record.scopeId == scopeId) return record
            }
            return undefined
        }

        private phase(event: UiInputEvent): UiInputPhase {
            return event.phase || "pressed"
        }

        private isPressedOrRepeated(event: UiInputEvent): boolean {
            const phase = this.phase(event)
            return phase == "pressed" || phase == "repeated"
        }

        private hasPointerCoordinates(event: UiInputEvent): boolean {
            return event.x !== undefined && event.y !== undefined
        }

        private isAcceptedFocusResult(result: UiFocusSetResult): boolean {
            return result.kind == "focused" || result.kind == "unchanged"
        }

        private focusScrollRequest(
            result: UiFocusSetResult,
        ): UiFocusScrollRequest {
            if (result.kind == "focused") return result.scrollRequest
            return undefined
        }

        private deliverScrollRequest(request: UiFocusScrollRequest): void {
            if (this.scroll_) this.scroll_(request)
        }
    }
}
