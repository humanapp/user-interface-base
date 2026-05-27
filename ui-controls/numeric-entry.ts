namespace ui {
    const NUMERIC_ENTRY_FONT = bitmaps.font8
    const UI_NUMERIC_ENTRY_FLAG_DELETE_ENABLED = 1
    const UI_NUMERIC_ENTRY_FLAG_CANCEL_ENABLED = 2

    /**
     * Numeric entry editing mode.
     */
    export type UiNumericEntryMode = "decimal" | "positiveInteger"

    /**
     * Edit action offered to a numeric entry validator.
     */
    export type UiNumericEntryEditAction =
        | "digit"
        | "decimalPoint"
        | "toggleSign"
        | "backspace"
        | "enter"
        | "back"

    /**
     * Validation result for a proposed numeric edit.
     */
    export type UiNumericEntryValidationResult =
        | "accepted"
        | "rejected"
        | "completed"

    /**
     * Reviews a proposed numeric edit before it is committed.
     */
    export type UiNumericEntryValidator = (
        mode: UiNumericEntryMode,
        candidateText: string,
        action: UiNumericEntryEditAction,
    ) => UiNumericEntryValidationResult

    /**
     * Completion result emitted by numeric entry.
     */
    export interface UiNumericEntryCompletedResult {
        kind: "completed"
        mode: UiNumericEntryMode
        text: string
        value: number
    }

    /**
     * Result emitted by numeric entry.
     */
    export type UiNumericEntryResult =
        | UiNumericEntryCompletedResult
        | { kind: "cancelled"; mode: UiNumericEntryMode; text: string }
        | { kind: "deleted"; mode: UiNumericEntryMode }

    /**
     * Decimal and positive-integer entry state with typed completion results.
     */
    export class UiNumericEntry {
        private mode_: UiNumericEntryMode
        private text_: string
        private maxLength_: number
        private flags_: number
        private validate_: UiNumericEntryValidator

        constructor(
            mode: UiNumericEntryMode,
            initialText?: string,
            maxLength?: number,
            deleteEnabled?: boolean,
            cancelEnabled?: boolean,
            validate?: UiNumericEntryValidator,
        ) {
            this.mode_ = mode
            this.text_ = initialText || ""
            this.flags_ = 0
            if (deleteEnabled)
                this.flags_ |= UI_NUMERIC_ENTRY_FLAG_DELETE_ENABLED
            if (cancelEnabled)
                this.flags_ |= UI_NUMERIC_ENTRY_FLAG_CANCEL_ENABLED
            this.maxLength_ = _uiControls.sanitizeDimension(maxLength, 8)
            this.validate_ = validate
            if (this.maxLength_ == 0) this.maxLength_ = 8
            this.text_ = this.text_.substr(0, this.maxLength_)
        }

        /**
         * Current numeric mode.
         */
        public get mode(): UiNumericEntryMode {
            return this.mode_
        }

        /**
         * Current editable text.
         */
        public get text(): string {
            return this.text_
        }

        /**
         * Maximum editable text length.
         */
        public get maxLength(): number {
            return this.maxLength_
        }

        /**
         * Attempts to append one digit.
         */
        public inputDigit(digit: number): UiNumericEntryResult {
            digit = Math.idiv(Math.max(0, Math.min(9, digit)), 1)
            let candidate = this.text_ + digit
            if (this.text_ == "0" && digit > 0) candidate = "" + digit
            else if (this.text_ == "-0" && digit > 0) candidate = "-" + digit
            else if (this.mode_ == "positiveInteger" && this.text_ == "0")
                candidate = "" + digit
            return this.applyText(candidate, "digit")
        }

        /**
         * Attempts to append a decimal point.
         */
        public inputDecimalPoint(): UiNumericEntryResult {
            if (this.mode_ != "decimal") return undefined
            if (this.text_.indexOf(".") >= 0) return undefined
            if (this.text_ == "" || this.text_ == "-") return undefined
            return this.applyText(this.text_ + ".", "decimalPoint")
        }

        /**
         * Toggles a leading minus sign in decimal mode.
         */
        public toggleSign(): UiNumericEntryResult {
            if (this.mode_ != "decimal") return undefined
            if (this.text_.charAt(0) == "-")
                return this.applyText(this.text_.substr(1), "toggleSign")
            return this.applyText("-" + this.text_, "toggleSign")
        }

        /**
         * Removes the last character when one exists.
         */
        public backspace(): UiNumericEntryResult {
            if (this.text_.length == 0) return undefined
            return this.applyText(
                this.text_.substr(0, this.text_.length - 1),
                "backspace",
            )
        }

        /**
         * Completes the current text.
         */
        public enter(): UiNumericEntryResult {
            return this.complete("enter")
        }

        /**
         * Completes the current text using the default back behavior.
         */
        public back(): UiNumericEntryResult {
            return this.complete("back")
        }

        /**
         * Emits a non-committing cancellation when enabled.
         */
        public cancel(): UiNumericEntryResult {
            if (!(this.flags_ & UI_NUMERIC_ENTRY_FLAG_CANCEL_ENABLED))
                return undefined
            return { kind: "cancelled", mode: this.mode_, text: this.text_ }
        }

        /**
         * Emits a delete result when enabled.
         */
        public createDeleteResult(): UiNumericEntryResult {
            if (!(this.flags_ & UI_NUMERIC_ENTRY_FLAG_DELETE_ENABLED))
                return undefined
            return { kind: "deleted", mode: this.mode_ }
        }

        /**
         * Renders the current entry text.
         */
        public render(surface: DrawSurface, rect: Rect): void {
            _uiEntryModal.renderEntryText(
                surface,
                rect,
                this.text_,
                NUMERIC_ENTRY_FONT,
            )
        }

        private applyText(
            candidate: string,
            action: UiNumericEntryEditAction,
        ): UiNumericEntryResult {
            if (candidate.length > this.maxLength_) return undefined
            if (!this.isCandidateAllowed(candidate)) return undefined
            const validation = this.validate_
                ? this.validate_(this.mode_, candidate, action)
                : "accepted"
            if (validation == "rejected") return undefined
            this.text_ = candidate
            if (validation == "completed") return this.complete(action)
            return undefined
        }

        private complete(
            action: UiNumericEntryEditAction,
        ): UiNumericEntryResult {
            let text = this.normalizedText()
            const validation = this.validate_
                ? this.validate_(this.mode_, text, action)
                : "accepted"
            if (validation == "rejected") return undefined
            this.text_ = text
            return {
                kind: "completed",
                mode: this.mode_,
                text,
                value: parseFloat(text),
            }
        }

        private normalizedText(): string {
            let text = this.text_
            if (text == "" || text == "-" || text == "." || text == "-.")
                text = "0"
            if (this.mode_ == "decimal") {
                text = "" + parseFloat(text)
                if (parseFloat(text) == 0) text = "0"
            } else {
                if (parseFloat(text) == 0) text = "1"
            }
            return text
        }

        private isCandidateAllowed(candidate: string): boolean {
            if (candidate == "") return true
            if (this.mode_ == "positiveInteger") {
                for (let i = 0; i < candidate.length; i++) {
                    const ch = candidate.charAt(i)
                    if (ch < "0" || ch > "9") return false
                }
                return true
            }

            let pointCount = 0
            for (let i = 0; i < candidate.length; i++) {
                const ch = candidate.charAt(i)
                if (ch == "-") {
                    if (i != 0) return false
                } else if (ch == ".") {
                    pointCount++
                    if (pointCount > 1) return false
                    if (i == 0 || (i == 1 && candidate.charAt(0) == "-"))
                        return false
                } else if (ch < "0" || ch > "9") {
                    return false
                }
            }
            if (
                candidate.length > 1 &&
                candidate.charAt(0) == "0" &&
                candidate.charAt(1) != "."
            )
                return false
            if (
                candidate.length > 2 &&
                candidate.charAt(0) == "-" &&
                candidate.charAt(1) == "0" &&
                candidate.charAt(2) != "."
            )
                return false
            return true
        }
    }

    type UiNumericEntryModalKeyValue = number

    const UI_NUMERIC_ENTRY_MODAL_DISPLAY_HEIGHT = 18
    const UI_NUMERIC_ENTRY_MODAL_DISPLAY_GAP = 5
    const UI_NUMERIC_ENTRY_MODAL_KEY_SIZE = 18
    const UI_NUMERIC_ENTRY_MODAL_KEY_GAP = 2
    const UI_NUMERIC_ENTRY_KEY_SPACER = -1
    const UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT = 10
    const UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN = 11
    const UI_NUMERIC_ENTRY_KEY_BACKSPACE = 12
    const UI_NUMERIC_ENTRY_KEY_DELETE = 13
    const UI_NUMERIC_ENTRY_KEY_ENTER = 14
    const UI_NUMERIC_ENTRY_MODAL_ENTER_STYLE: UiButtonStyle = {
        backgroundColor: 1,
        borderColor: 7,
        frame: "roundedRect",
    }
    const UI_NUMERIC_ENTRY_MODAL_DELETE_STYLE: UiButtonStyle = {
        backgroundColor: 1,
        borderColor: 2,
        frame: "roundedRect",
    }

    export namespace _uiEntryModal {
        export function renderEntryText(
            surface: DrawSurface,
            rect: Rect,
            text: string,
            font: TextFont,
        ): void {
            const background = 1
            const foreground = 15
            const padding = 4
            const textSize = surface.measureText(text, font)
            const textX = Math.max(
                rect.x + padding,
                rect.x + rect.width - padding - textSize.width,
            )
            const textY =
                rect.y +
                Math.max(0, Math.idiv(rect.height - textSize.height, 2))
            surface.drawRoundedRect(rect, 15, background)
            surface.drawText(text, textX, textY, {
                color: foreground,
                font,
            })
        }

        export function contentMargin(value: number): number {
            if (value !== undefined) return Math.max(0, value)
            return 4
        }

        export function targetIdForIndex(
            scopeId: UiFocusScopeId,
            index: number,
        ): UiFocusId {
            return scopeId + "/" + index
        }

        export function indexForTargetId(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
            count: number,
        ): number {
            if (targetId === undefined) return -1
            const prefix = scopeId + "/"
            if (
                targetId.length <= prefix.length ||
                targetId.substr(0, prefix.length) != prefix
            )
                return -1
            let index = 0
            for (let i = prefix.length; i < targetId.length; i++) {
                const digit = targetId.charCodeAt(i) - 48
                if (digit < 0 || digit > 9) return -1
                index = index * 10 + digit
            }
            return index < count ? index : -1
        }

        export function activeIndex(
            focus: UiFocusState,
            scopeId: UiFocusScopeId,
            count: number,
        ): number {
            const activeTargetId =
                focus && focus.getActiveScopeId() == scopeId
                    ? focus.getActiveTargetId(scopeId)
                    : undefined
            return indexForTargetId(scopeId, activeTargetId, count)
        }
    }

    /**
     * Options for a modal numeric keypad backed by `UiNumericEntry`.
     */
    export interface UiNumericEntryModalOptions extends UiModalPanelStyle {
        /**
         * Modal focus scope owned while the keypad is open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Numeric mode that controls available edit operations.
         */
        mode: UiNumericEntryMode

        /**
         * Initial display text. Defaults to the empty string.
         */
        initialText?: string

        /**
         * Maximum editable text length. Defaults to `8`.
         */
        maxLength?: number

        /**
         * Whether delete may emit a `deleted` result.
         */
        deleteEnabled?: boolean

        /**
         * Optional edit validator.
         */
        validate?: UiNumericEntryValidator

        /**
         * Style applied to keypad buttons.
         */
        keyStyle?: UiButtonStyle

        /**
         * Optional delete key content shown when `deleteEnabled` is true.
         */
        deleteContent?: UiControlContentOptions | string

        /**
         * Receives completed or cancelled numeric entry results.
         */
        onResult?: (result: UiNumericEntryResult) => void
    }

    /**
     * Receives the completed numeric value from the compact modal constructor.
     */
    export type UiNumericEntryCompletedHandler = (
        value: number,
        result: UiNumericEntryCompletedResult,
    ) => void

    /**
     * Modal numeric keypad for decimal and positive-integer entry.
     */
    export class UiNumericEntryModal
        implements UiModal<UiNumericEntryResult>, UiFocusNavigationProvider
    {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private modalScopeId_: UiFocusScopeId
        private entry_: UiNumericEntry
        private keyValues_: UiNumericEntryModalKeyValue[]
        private keyRect_: Rect
        private keyStyle_: UiButtonStyle
        private keyView_: UiButtonView
        private keyContent_: UiControlContent
        private displayRect_: Rect
        private gridRect_: Rect
        private backgroundColor_: number
        private contentMargin_: number
        private flags_: number
        private deleteContent_: UiControlContentOptions | string
        private onResult_: (result: UiNumericEntryResult) => void
        private onCompleted_: UiNumericEntryCompletedHandler

        /**
         * Creates a keypad from full options or from scope id, initial value,
         * and completed-value callback for positive-integer entry.
         */
        constructor(
            options: UiNumericEntryModalOptions | UiFocusScopeId,
            initialValue?: number | string,
            onCompleted?: UiNumericEntryCompletedHandler,
        ) {
            if (typeof options == "string") {
                options = {
                    modalScopeId: options,
                    mode: "positiveInteger",
                    initialText:
                        initialValue === undefined ? "" : "" + initialValue,
                }
                this.onCompleted_ = onCompleted
            } else {
                this.onCompleted_ = undefined
            }
            this.modalScopeId_ = options.modalScopeId
            this.entry_ = this.createEntry(options)
            this.backgroundColor_ =
                options.backgroundColor === undefined
                    ? 12
                    : options.backgroundColor
            this.contentMargin_ = _uiEntryModal.contentMargin(
                options.contentMargin,
            )
            this.flags_ = 0
            if (options.deleteEnabled)
                this.flags_ |= UI_NUMERIC_ENTRY_FLAG_DELETE_ENABLED
            this.deleteContent_ = options.deleteContent
            this.keyValues_ = this.createKeyValues(options.mode)
            this.keyRect_ = new Rect()
            this.keyStyle_ =
                options.keyStyle || UiButtonStyles.LightShadowedWhite
            this.keyView_ = new UiButtonView(this.keyStyle_)
            this.keyContent_ = {}
            this.layoutSpec = {
                width: { mode: "content" },
                height: { mode: "content" },
            }
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.displayRect_ = new Rect()
            this.gridRect_ = new Rect()
            this.onResult_ = options.onResult
        }

        /**
         * Modal focus scope id used by this keypad.
         */
        public get modalScopeId(): UiFocusScopeId {
            return this.modalScopeId_
        }

        /**
         * Measures the display and keypad under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const gridWidth =
                UI_NUMERIC_ENTRY_MODAL_KEY_SIZE * 4 +
                UI_NUMERIC_ENTRY_MODAL_KEY_GAP * 3
            const gridHeight =
                UI_NUMERIC_ENTRY_MODAL_KEY_SIZE * 4 +
                UI_NUMERIC_ENTRY_MODAL_KEY_GAP * 3
            const width = gridWidth + this.contentMargin_ * 2
            const height =
                this.contentMargin_ * 2 +
                UI_NUMERIC_ENTRY_MODAL_DISPLAY_HEIGHT +
                UI_NUMERIC_ENTRY_MODAL_DISPLAY_GAP +
                gridHeight
            output.set(width, height, width, height)
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the modal panel, display, and keypad grid.
         */
        public arrange(rect: Rect): void {
            this.finalRect.copyFrom(rect)
            this.displayRect_.set(
                rect.x + this.contentMargin_,
                rect.y + this.contentMargin_,
                Math.max(0, rect.width - this.contentMargin_ * 2),
                UI_NUMERIC_ENTRY_MODAL_DISPLAY_HEIGHT,
            )
            this.gridRect_.set(
                rect.x + this.contentMargin_,
                this.displayRect_.bottom + UI_NUMERIC_ENTRY_MODAL_DISPLAY_GAP,
                Math.max(0, rect.width - this.contentMargin_ * 2),
                Math.max(
                    0,
                    rect.height -
                        this.contentMargin_ * 2 -
                        UI_NUMERIC_ENTRY_MODAL_DISPLAY_HEIGHT -
                        UI_NUMERIC_ENTRY_MODAL_DISPLAY_GAP,
                ),
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the modal as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears pending layout invalidation.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Resolves resolver-backed content ids for optional modal keys.
         */
        public _resolveContentAssets(assets: UiAssetResolver): void {
            if (
                this.deleteContent_ !== undefined &&
                typeof this.deleteContent_ != "string"
            )
                _uiControls.resolveContentOptions(this.deleteContent_, assets)
        }

        /**
         * Registers modal focus targets and activates the modal scope.
         */
        public open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult {
            focus.setScope({
                id: this.modalScopeId_,
                parentScopeId: focus.getActiveScopeId(),
                preferredTargetId: _uiEntryModal.targetIdForIndex(
                    this.modalScopeId_,
                    8,
                ),
                handlesCancel: true,
                modal: true,
            })
            this.registerTargets(focus)
            if (controller) controller.setNavigation(this.modalScopeId_, this)
            return focus.setActiveScope(this.modalScopeId_)
        }

        /**
         * Restores focus to the parent modal scope.
         */
        public close(focus: UiFocusState): UiFocusSetResult {
            return focus.closeModalScope(this.modalScopeId_)
        }

        /**
         * Converts focus input into a numeric entry result.
         */
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiNumericEntryResult {
            let entryResult: UiNumericEntryResult = undefined
            if (result.kind == "activated") {
                const key = this.keyValueForTargetId(result.targetId)
                if (
                    key != UI_NUMERIC_ENTRY_KEY_SPACER &&
                    result.scopeId == this.modalScopeId_
                )
                    entryResult = this.applyKey(key)
            } else if (result.kind == "cancelled") {
                entryResult = this.entry_.cancel()
            }

            if (entryResult && this.onResult_) this.onResult_(entryResult)
            if (
                entryResult &&
                entryResult.kind == "completed" &&
                this.onCompleted_
            )
                this.onCompleted_(entryResult.value, entryResult)
            return entryResult
        }

        public move(request: UiFocusNavigationRequest): UiFocusMoveResult {
            const currentIndex = this.keyIndexForTargetId(
                request.currentTargetId,
            )
            if (currentIndex < 0)
                return {
                    kind: "stayed",
                    scopeId: this.modalScopeId_,
                    targetId: request.currentTargetId,
                    reason: "missingActive",
                }

            let currentRow = -1
            let currentColumn = -1
            let currentPhysicalColumn = -1
            let rowStart = 0
            for (let row = 0; row < 4; row++) {
                let navigationColumn = 0
                for (let i = 0; i < 4; i++) {
                    const index = rowStart + i
                    if (this.keyValues_[index] != UI_NUMERIC_ENTRY_KEY_SPACER) {
                        if (index == currentIndex) {
                            currentRow = row
                            currentColumn = navigationColumn
                            currentPhysicalColumn = i
                        }
                        navigationColumn++
                    }
                }
                rowStart += 4
            }
            let destinationIndex = -1

            if (request.direction == "left" || request.direction == "right") {
                const start = currentRow * 4
                let visibleLength = 0
                for (let i = 0; i < 4; i++) {
                    if (
                        this.keyValues_[start + i] !=
                        UI_NUMERIC_ENTRY_KEY_SPACER
                    )
                        visibleLength++
                }
                if (visibleLength > 1) {
                    let column =
                        currentColumn + (request.direction == "left" ? -1 : 1)
                    if (column < 0) column = visibleLength - 1
                    else if (column >= visibleLength) column = 0
                    let navigationColumn = 0
                    for (let i = 0; i < 4; i++) {
                        const index = start + i
                        if (
                            this.keyValues_[index] !=
                            UI_NUMERIC_ENTRY_KEY_SPACER
                        ) {
                            if (navigationColumn == column)
                                destinationIndex = index
                            navigationColumn++
                        }
                    }
                }
            } else {
                const step = request.direction == "up" ? -1 : 1
                let row = currentRow + step
                while (row >= 0 && row < 4 && destinationIndex < 0) {
                    destinationIndex = this.nearestVerticalKeyIndex(
                        row,
                        currentPhysicalColumn,
                    )
                    row += step
                }
            }

            if (destinationIndex >= 0)
                return {
                    kind: "moved",
                    fromScopeId: this.modalScopeId_,
                    fromTargetId: request.currentTargetId,
                    toScopeId: this.modalScopeId_,
                    toTargetId: _uiEntryModal.targetIdForIndex(
                        this.modalScopeId_,
                        destinationIndex,
                    ),
                }

            if (request.direction == "left" || request.direction == "right")
                return {
                    kind: "stayed",
                    scopeId: this.modalScopeId_,
                    targetId: request.currentTargetId,
                    reason: "boundary",
                }

            return {
                kind: "exited",
                scopeId: this.modalScopeId_,
                targetId: request.currentTargetId,
                direction: request.direction,
            }
        }

        private nearestVerticalKeyIndex(
            row: number,
            physicalColumn: number,
        ): number {
            const start = row * 4
            let bestIndex = -1
            let bestColumn = -1
            let bestDistance = 0
            for (let i = 0; i < 4; i++) {
                const index = start + i
                if (this.keyValues_[index] == UI_NUMERIC_ENTRY_KEY_SPACER)
                    continue
                const distance = Math.abs(i - physicalColumn)
                if (
                    bestIndex < 0 ||
                    distance < bestDistance ||
                    (distance == bestDistance &&
                        i >= physicalColumn &&
                        bestColumn < physicalColumn)
                ) {
                    bestIndex = index
                    bestColumn = i
                    bestDistance = distance
                }
            }
            return bestIndex
        }

        /**
         * Renders the modal panel, display, and keypad.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            surface.drawRoundedRect(this.finalRect, 15, this.backgroundColor_)
            this.entry_.render(surface, this.displayRect_)
            this.renderKeys(surface)
            this.renderFocus(surface, focus)
        }

        private registerTargets(focus: UiFocusState): void {
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (key == UI_NUMERIC_ENTRY_KEY_SPACER) continue
                this.setKeyRect(i)
                focus.setTarget({
                    id: _uiEntryModal.targetIdForIndex(this.modalScopeId_, i),
                    scopeId: this.modalScopeId_,
                    rect: this.keyRect_,
                    activatable: true,
                })
            }
        }

        private renderKeys(surface: DrawSurface): void {
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (key == UI_NUMERIC_ENTRY_KEY_SPACER) continue
                this.setKeyRect(i)
                this.prepareKeyContent(key)
                this.keyView_.render(
                    surface,
                    this.keyRect_,
                    this.keyContent_,
                    this.keyStyleForKey(key),
                )
            }
        }

        private renderFocus(surface: DrawSurface, focus: UiFocusState): void {
            const index = _uiEntryModal.activeIndex(
                focus,
                this.modalScopeId_,
                this.keyValues_.length,
            )
            if (index < 0) return
            const key = this.keyValues_[index]
            this.setKeyRect(index)
            this.prepareKeyContent(key)
            this.keyView_.renderFocus(
                surface,
                this.keyRect_,
                this.keyContent_,
                this.keyStyleForKey(key),
                undefined,
            )
        }

        private applyKey(
            value: UiNumericEntryModalKeyValue,
        ): UiNumericEntryResult {
            if (value >= 0 && value <= 9) return this.entry_.inputDigit(value)
            switch (value) {
                case UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT:
                    return this.entry_.inputDecimalPoint()
                case UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN:
                    return this.entry_.toggleSign()
                case UI_NUMERIC_ENTRY_KEY_BACKSPACE:
                    return this.entry_.backspace()
                case UI_NUMERIC_ENTRY_KEY_DELETE:
                    return this.entry_.createDeleteResult()
                case UI_NUMERIC_ENTRY_KEY_ENTER:
                    return this.entry_.enter()
                case UI_NUMERIC_ENTRY_KEY_SPACER:
                    return undefined
            }
            return undefined
        }

        private createKeyValues(
            mode: UiNumericEntryMode,
        ): UiNumericEntryModalKeyValue[] {
            return [
                7,
                8,
                9,
                UI_NUMERIC_ENTRY_KEY_BACKSPACE,
                4,
                5,
                6,
                UI_NUMERIC_ENTRY_KEY_SPACER,
                1,
                2,
                3,
                this.flags_ & UI_NUMERIC_ENTRY_FLAG_DELETE_ENABLED
                    ? UI_NUMERIC_ENTRY_KEY_DELETE
                    : UI_NUMERIC_ENTRY_KEY_SPACER,
                mode == "decimal"
                    ? UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN
                    : UI_NUMERIC_ENTRY_KEY_SPACER,
                0,
                mode == "decimal"
                    ? UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT
                    : UI_NUMERIC_ENTRY_KEY_SPACER,
                UI_NUMERIC_ENTRY_KEY_ENTER,
            ]
        }

        private createEntry(
            options: UiNumericEntryModalOptions,
        ): UiNumericEntry {
            return new UiNumericEntry(
                options.mode,
                options.initialText,
                options.maxLength,
                options.deleteEnabled,
                true,
                options.validate,
            )
        }

        private keyIndexForTargetId(targetId: UiFocusId): number {
            return _uiEntryModal.indexForTargetId(
                this.modalScopeId_,
                targetId,
                this.keyValues_.length,
            )
        }

        private keyValueForTargetId(
            targetId: UiFocusId,
        ): UiNumericEntryModalKeyValue {
            const index = this.keyIndexForTargetId(targetId)
            return index < 0
                ? UI_NUMERIC_ENTRY_KEY_SPACER
                : this.keyValues_[index]
        }

        private setKeyRect(index: number): void {
            const row = Math.idiv(index, 4)
            const column = index - row * 4
            this.keyRect_.set(
                this.gridRect_.x +
                    column *
                        (UI_NUMERIC_ENTRY_MODAL_KEY_SIZE +
                            UI_NUMERIC_ENTRY_MODAL_KEY_GAP),
                this.gridRect_.y +
                    row *
                        (UI_NUMERIC_ENTRY_MODAL_KEY_SIZE +
                            UI_NUMERIC_ENTRY_MODAL_KEY_GAP),
                UI_NUMERIC_ENTRY_MODAL_KEY_SIZE,
                UI_NUMERIC_ENTRY_MODAL_KEY_SIZE,
            )
        }

        private keyStyleForKey(
            key: UiNumericEntryModalKeyValue,
        ): UiButtonStyle {
            if (key == UI_NUMERIC_ENTRY_KEY_ENTER)
                return UI_NUMERIC_ENTRY_MODAL_ENTER_STYLE
            if (key == UI_NUMERIC_ENTRY_KEY_DELETE)
                return UI_NUMERIC_ENTRY_MODAL_DELETE_STYLE
            return this.keyStyle_
        }

        private prepareKeyContent(key: UiNumericEntryModalKeyValue): void {
            this.keyContent_.bitmap = undefined
            if (
                key == UI_NUMERIC_ENTRY_KEY_DELETE &&
                this.deleteContent_ !== undefined
            ) {
                const content = this.deleteContent_
                if (typeof content == "string") {
                    this.keyContent_.text = content
                } else {
                    _uiControls.resolveContent(
                        content,
                        undefined,
                        this.keyContent_,
                    )
                }
            } else {
                this.keyContent_.text = this.keyTextForKey(key)
            }
        }

        private keyTextForKey(key: UiNumericEntryModalKeyValue): string {
            if (key >= 0 && key <= 9) return "" + key
            if (key == UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT) return "."
            if (key == UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN) return "+/-"
            if (key == UI_NUMERIC_ENTRY_KEY_BACKSPACE) return "<-"
            if (key == UI_NUMERIC_ENTRY_KEY_DELETE) return "DEL"
            return "OK"
        }

    }
}
