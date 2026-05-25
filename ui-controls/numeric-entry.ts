namespace ui {
    const NUMERIC_ENTRY_FONT = bitmaps.font8

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
     * Optional validator for numeric entry text.
     */
    export interface UiNumericEntryValidator {
        /**
         * Reviews a proposed edit before it is committed.
         */
        (
            mode: UiNumericEntryMode,
            candidateText: string,
            action: UiNumericEntryEditAction,
        ): UiNumericEntryValidationResult
    }

    /**
     * Options for decimal and positive-integer entry.
     */
    export interface UiNumericEntryOptions {
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
         * Whether `cancel()` may emit a non-committing `cancelled` result.
         */
        cancelEnabled?: boolean

        /**
         * Optional edit validator.
         */
        validate?: UiNumericEntryValidator
    }

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
        private deleteEnabled_: boolean
        private cancelEnabled_: boolean
        private validate_: UiNumericEntryValidator

        constructor(options: UiNumericEntryOptions) {
            this.mode_ = options.mode
            this.text_ = options.initialText || ""
            this.maxLength_ = _uiControls.sanitizeDimension(
                options.maxLength,
                8,
            )
            this.deleteEnabled_ = options.deleteEnabled || false
            this.cancelEnabled_ = options.cancelEnabled || false
            this.validate_ = options.validate
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
            if (!this.cancelEnabled_) return undefined
            return { kind: "cancelled", mode: this.mode_, text: this.text_ }
        }

        /**
         * Emits a delete result when enabled.
         */
        public createDeleteResult(): UiNumericEntryResult {
            if (!this.deleteEnabled_) return undefined
            return { kind: "deleted", mode: this.mode_ }
        }

        /**
         * Renders the current entry text.
         */
        public render(surface: DrawSurface, rect: Rect): void {
            const background = 1
            const foreground = 15
            const padding = 4
            const font = NUMERIC_ENTRY_FONT
            const textSize = surface.measureText(this.text_, font)
            const textX = Math.max(
                rect.x + padding,
                rect.x + rect.width - padding - textSize.width,
            )
            const textY =
                rect.y +
                Math.max(0, Math.idiv(rect.height - textSize.height, 2))
            surface.drawRoundedRect(rect, 15, background)
            surface.drawText(this.text_, textX, textY, {
                color: foreground,
                font,
            })
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

    /**
     * Resolver-backed icon for a numeric entry key.
     */
    export type UiNumericEntryKeyIcon = string | number

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

    /**
     * Options for a modal numeric keypad backed by `UiNumericEntry`.
     */
    export interface UiNumericEntryModalOptions
        extends UiNumericEntryOptions, UiModalPanelStyle {
        /**
         * Modal focus scope owned while the keypad is open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Style applied to keypad buttons.
         */
        keyStyle?: UiButtonStyle

        /**
         * Optional icon for the delete key shown when `deleteEnabled` is true.
         */
        deleteIcon?: UiNumericEntryKeyIcon

        /**
         * Receives completed or cancelled numeric entry results.
         */
        onResult?: (result: UiNumericEntryResult) => void
    }

    /**
     * Receives the completed numeric value from the compact modal constructor.
     */
    export interface UiNumericEntryCompletedHandler {
        (value: number, result: UiNumericEntryCompletedResult): void
    }

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
        private controlRects_: Rect[]
        private keyStyle_: UiButtonStyle
        private keyView_: UiButtonView
        private keyContent_: UiButtonContent
        private displayRect_: Rect
        private gridRect_: Rect
        private backgroundColor_: number
        private contentMargin_: number
        private deleteEnabled_: boolean
        private deleteIcon_: UiNumericEntryKeyIcon
        private onResult_: (result: UiNumericEntryResult) => void

        /**
         * Creates a keypad from full options or from scope id, initial value,
         * and completed-value callback for positive-integer entry.
         */
        constructor(
            options: UiNumericEntryModalOptions | UiFocusScopeId,
            initialValue?: number | string,
            onCompleted?: UiNumericEntryCompletedHandler,
        ) {
            options = this.resolveOptions(options, initialValue, onCompleted)
            this.modalScopeId_ = options.modalScopeId
            this.entry_ = this.createEntry(options)
            this.backgroundColor_ =
                options.backgroundColor === undefined
                    ? 12
                    : options.backgroundColor
            this.contentMargin_ = this.contentMargin(options.contentMargin)
            this.deleteEnabled_ = options.deleteEnabled || false
            this.deleteIcon_ = options.deleteIcon
            this.keyValues_ = this.createKeyValues(options.mode)
            this.controlRects_ = []
            this.keyStyle_ =
                options.keyStyle || UiButtonStyles.LightShadowedWhite
            this.keyView_ = new UiButtonView({ style: this.keyStyle_ })
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
            this.arrangeKeys()
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
         * Registers modal focus targets and activates the modal scope.
         */
        public open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult {
            focus.setScope({
                id: this.modalScopeId_,
                parentScopeId: focus.getActiveScopeId(),
                preferredTargetId: this.targetIdForKey(1),
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
                const rowLength = this.rowLength(row)
                let navigationColumn = 0
                for (let i = 0; i < rowLength; i++) {
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
                rowStart += rowLength
            }
            let destinationIndex = -1

            if (request.direction == "left" || request.direction == "right") {
                const start = this.rowStart(currentRow)
                const length = this.rowLength(currentRow)
                let visibleLength = 0
                for (let i = 0; i < length; i++) {
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
                    for (let i = 0; i < length; i++) {
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
                    toTargetId: this.targetIdForKey(
                        this.keyValues_[destinationIndex],
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
            const start = this.rowStart(row)
            const length = this.rowLength(row)
            let bestIndex = -1
            let bestColumn = -1
            let bestDistance = 0
            for (let i = 0; i < length; i++) {
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
            this.renderKeys(surface, assets)
            this.renderFocus(surface, assets, focus)
        }

        private arrangeKeys(): void {
            this.ensureKeyRects()
            let index = 0
            for (let row = 0; row < 4; row++) {
                const rowLength = this.rowLength(row)
                for (
                    let column = 0;
                    column < rowLength && index < this.keyValues_.length;
                    column++
                ) {
                    this.controlRects_[index].set(
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
                    index++
                }
            }
        }

        private registerTargets(focus: UiFocusState): void {
            this.ensureKeyRects()
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (key == UI_NUMERIC_ENTRY_KEY_SPACER) continue
                focus.setTarget({
                    id: this.targetIdForKey(key),
                    scopeId: this.modalScopeId_,
                    rect: this.controlRects_[i],
                    activatable: true,
                })
            }
        }

        private renderKeys(
            surface: DrawSurface,
            assets: UiAssetResolver,
        ): void {
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (key == UI_NUMERIC_ENTRY_KEY_SPACER) continue
                this.prepareKeyContent(key, assets)
                this.keyView_.render(
                    surface,
                    this.controlRects_[i],
                    this.keyContent_,
                    this.keyStyleForKey(key),
                )
            }
        }

        private renderFocus(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus: UiFocusState,
        ): void {
            const activeTargetId =
                focus && focus.getActiveScopeId() == this.modalScopeId_
                    ? focus.getActiveTargetId(this.modalScopeId_)
                    : undefined
            const index = this.keyIndexForTargetId(activeTargetId)
            if (index < 0) return
            const key = this.keyValues_[index]
            this.prepareKeyContent(key, assets)
            this.keyView_.renderFocus(
                surface,
                this.controlRects_[index],
                this.keyContent_,
                this.keyStyleForKey(key),
                undefined,
            )
        }

        private ensureKeyRects(): void {
            while (this.controlRects_.length < this.keyValues_.length)
                this.controlRects_.push(new Rect())
            while (this.controlRects_.length > this.keyValues_.length)
                this.controlRects_.pop()
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
            const keys: UiNumericEntryModalKeyValue[] = []
            keys.push(7)
            keys.push(8)
            keys.push(9)
            keys.push(UI_NUMERIC_ENTRY_KEY_BACKSPACE)
            keys.push(4)
            keys.push(5)
            keys.push(6)
            keys.push(1)
            keys.push(2)
            keys.push(3)
            if (this.deleteEnabled_) keys.push(UI_NUMERIC_ENTRY_KEY_DELETE)
            if (mode == "decimal") keys.push(UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN)
            else keys.push(UI_NUMERIC_ENTRY_KEY_SPACER)
            keys.push(0)
            if (mode == "decimal") keys.push(UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT)
            else keys.push(UI_NUMERIC_ENTRY_KEY_SPACER)
            keys.push(UI_NUMERIC_ENTRY_KEY_ENTER)
            return keys
        }

        private createEntry(
            options: UiNumericEntryModalOptions,
        ): UiNumericEntry {
            return new UiNumericEntry({
                mode: options.mode,
                initialText: options.initialText,
                maxLength: options.maxLength,
                deleteEnabled: options.deleteEnabled,
                cancelEnabled: true,
                validate: options.validate,
            })
        }

        private resolveOptions(
            options: UiNumericEntryModalOptions | UiFocusScopeId,
            initialValue?: number | string,
            onCompleted?: UiNumericEntryCompletedHandler,
        ): UiNumericEntryModalOptions {
            if (typeof options != "string") return options
            return {
                modalScopeId: options,
                mode: "positiveInteger",
                initialText:
                    initialValue === undefined ? "" : "" + initialValue,
                onResult: onCompleted
                    ? result => {
                          if (result.kind == "completed")
                              onCompleted(result.value, result)
                      }
                    : undefined,
            }
        }

        private rowLength(row: number): number {
            if (row == 0 || row == 3) return 4
            if (row == 1) return 3
            return this.deleteEnabled_ ? 4 : 3
        }

        private rowStart(row: number): number {
            if (row == 0) return 0
            if (row == 1) return 4
            if (row == 2) return 7
            return this.deleteEnabled_ ? 11 : 10
        }

        private targetIdForKey(key: UiNumericEntryModalKeyValue): UiFocusId {
            return this.modalScopeId_ + "/" + this.keyIdForKey(key)
        }

        private keyIndexForTargetId(targetId: UiFocusId): number {
            if (targetId === undefined) return -1
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (
                    key != UI_NUMERIC_ENTRY_KEY_SPACER &&
                    targetId == this.targetIdForKey(key)
                )
                    return i
            }
            return -1
        }

        private keyValueForTargetId(
            targetId: UiFocusId,
        ): UiNumericEntryModalKeyValue {
            const index = this.keyIndexForTargetId(targetId)
            return index < 0
                ? UI_NUMERIC_ENTRY_KEY_SPACER
                : this.keyValues_[index]
        }

        private keyIdForKey(key: UiNumericEntryModalKeyValue): string {
            if (key >= 0 && key <= 9) return "digit-" + key
            if (key == UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT) return "decimalPoint"
            if (key == UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN) return "toggleSign"
            if (key == UI_NUMERIC_ENTRY_KEY_BACKSPACE) return "backspace"
            if (key == UI_NUMERIC_ENTRY_KEY_DELETE) return "delete"
            return "enter"
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

        private prepareKeyContent(
            key: UiNumericEntryModalKeyValue,
            assets: UiAssetResolver,
        ): void {
            this.keyContent_.bitmap = undefined
            if (
                key == UI_NUMERIC_ENTRY_KEY_DELETE &&
                this.deleteIcon_ !== undefined
            ) {
                this.keyContent_.text = ""
                this.keyContent_.bitmap = assets.getBitmap(this.deleteIcon_)
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

        private contentMargin(value: number): number {
            if (value !== undefined) return Math.max(0, value)
            return 4
        }
    }
}
