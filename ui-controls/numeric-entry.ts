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
     * Result emitted by numeric entry.
     */
    export type UiNumericEntryResult =
        | {
              kind: "completed"
              mode: UiNumericEntryMode
              text: string
              value: number
          }
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
        public render(
            surface: DrawSurface,
            rect: Rect,
            palette?: UiControlPalette,
        ): void {
            const background =
                palette && palette.backgroundColor !== undefined
                    ? palette.backgroundColor
                    : 0
            const foreground =
                palette && palette.foregroundColor !== undefined
                    ? palette.foregroundColor
                    : 15
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
            const border =
                palette && palette.focusColor !== undefined
                    ? palette.focusColor
                    : 15
            surface.drawRoundedRect(rect, border, background)
            surface.drawText(this.text_, textX, textY, {
                color: foreground,
                font,
                transparent: true,
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
        contentAlignment: "center",
        focusColor: 9,
    }
    const UI_NUMERIC_ENTRY_MODAL_DELETE_STYLE: UiButtonStyle = {
        backgroundColor: 1,
        borderColor: 2,
        frame: "roundedRect",
        contentAlignment: "center",
        focusColor: 9,
    }

    /**
     * Options for a modal numeric keypad backed by `UiNumericEntry`.
     */
    export interface UiNumericEntryModalOptions extends UiNumericEntryOptions {
        /**
         * Modal focus scope owned while the keypad is open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Panel, frame, and spacing style for the modal.
         */
        modalStyle?: UiModalStyle

        /**
         * Style applied to keypad buttons.
         */
        keyStyle?: UiButtonStyle

        /**
         * Palette used by the numeric display.
         */
        displayPalette?: UiControlPalette

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
     * Modal numeric keypad for decimal and positive-integer entry.
     */
    export class UiNumericEntryModal implements UiModal<UiNumericEntryResult> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private modalScopeId_: UiFocusScopeId
        private entry_: UiNumericEntry
        private grid_: UiGrid<UiNumericEntryModalKeyValue>
        private displayRect_: Rect
        private gridRect_: Rect
        private measuredGrid_: UiMeasuredSize
        private modalStyle_: UiModalStyle
        private displayPalette_: UiControlPalette
        private contentMargin_: number
        private deleteEnabled_: boolean
        private deleteIcon_: UiNumericEntryKeyIcon
        private onResult_: (result: UiNumericEntryResult) => void

        constructor(options: UiNumericEntryModalOptions) {
            this.modalScopeId_ = options.modalScopeId
            this.entry_ = this.createEntry(options)
            this.modalStyle_ = options.modalStyle
            this.displayPalette_ = options.displayPalette || {}
            this.contentMargin_ = this.contentMargin(options.modalStyle)
            this.deleteEnabled_ = options.deleteEnabled || false
            this.deleteIcon_ = options.deleteIcon
            const keyGap = UI_NUMERIC_ENTRY_MODAL_KEY_GAP
            this.grid_ = new UiGrid<UiNumericEntryModalKeyValue>({
                scopeId: options.modalScopeId,
                controls: this.createControls(options.mode),
                rows: this.rows(),
                defaultControlId: "digit-1",
                controlWidth: UI_NUMERIC_ENTRY_MODAL_KEY_SIZE,
                controlHeight: UI_NUMERIC_ENTRY_MODAL_KEY_SIZE,
                rowGap: keyGap,
                columnGap: keyGap,
                controlStyle:
                    options.keyStyle || UiButtonStyles.LightShadowedWhite,
            })
            this.layoutSpec = {
                width: { mode: "content" },
                height: { mode: "content" },
            }
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.displayRect_ = new Rect()
            this.gridRect_ = new Rect()
            this.measuredGrid_ = new UiMeasuredSize()
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
            this.grid_.measure(constraints, this.measuredGrid_)
            const width =
                this.measuredGrid_.preferredWidth + this.contentMargin_ * 2
            const height =
                this.contentMargin_ * 2 +
                UI_NUMERIC_ENTRY_MODAL_DISPLAY_HEIGHT +
                UI_NUMERIC_ENTRY_MODAL_DISPLAY_GAP +
                this.measuredGrid_.preferredHeight
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
            this.grid_.arrange(this.gridRect_)
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the modal as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
            this.grid_.invalidateLayout()
        }

        /**
         * Clears pending layout invalidation.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
            this.grid_.clearLayoutInvalidation()
        }

        /**
         * Registers modal focus targets and activates the modal scope.
         */
        public open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult {
            this.grid_.registerFocusTargets(focus, {
                id: this.modalScopeId_,
                parentScopeId: focus.getActiveScopeId(),
                preferredTargetId: this.grid_.resolvePreferredTargetId(),
                handlesCancel: true,
                modal: true,
            })
            if (controller) this.grid_.registerNavigation(controller)
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
            if (
                result.kind == "activated" &&
                result.detail &&
                result.detail.activationResult
            ) {
                const gridResult = this.grid_.createResultForActivation(
                    result.detail.activationResult,
                )
                if (gridResult && gridResult.kind == "activated")
                    entryResult = this.applyKey(gridResult.value)
            } else if (result.kind == "cancelled") {
                entryResult = this.entry_.cancel()
            }

            if (entryResult && this.onResult_) this.onResult_(entryResult)
            return entryResult
        }

        /**
         * Renders the modal panel, display, and keypad.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            drawModalPanel(surface, this.finalRect, this.modalStyle_)
            this.entry_.render(surface, this.displayRect_, this.displayPalette_)
            this.grid_.render(surface, assets, focus)
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

        private createControls(
            mode: UiNumericEntryMode,
        ): UiControl<UiNumericEntryModalKeyValue>[] {
            const controls: UiControl<UiNumericEntryModalKeyValue>[] = []
            this.pushDigitControl(controls, 1)
            this.pushDigitControl(controls, 2)
            this.pushDigitControl(controls, 3)
            controls.push(
                this.keyControl(
                    UI_NUMERIC_ENTRY_KEY_BACKSPACE,
                    "<-",
                    "backspace",
                ),
            )
            this.pushDigitControl(controls, 4)
            this.pushDigitControl(controls, 5)
            this.pushDigitControl(controls, 6)
            this.pushDigitControl(controls, 7)
            this.pushDigitControl(controls, 8)
            this.pushDigitControl(controls, 9)
            if (this.deleteEnabled_) controls.push(this.deleteControl())
            if (mode == "decimal")
                controls.push(
                    this.keyControl(
                        UI_NUMERIC_ENTRY_KEY_DECIMAL_POINT,
                        ".",
                        "decimalPoint",
                    ),
                )
            else controls.push(this.spacerControl("spacer-zero-left"))
            this.pushDigitControl(controls, 0)
            if (mode == "decimal")
                controls.push(
                    this.keyControl(
                        UI_NUMERIC_ENTRY_KEY_TOGGLE_SIGN,
                        "+/-",
                        "toggleSign",
                    ),
                )
            else controls.push(this.spacerControl("spacer-zero-right"))
            controls.push(
                this.keyControl(UI_NUMERIC_ENTRY_KEY_ENTER, "OK", "enter"),
            )
            return controls
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

        private rows(): number[] {
            return this.deleteEnabled_ ? [4, 3, 4, 4] : [4, 3, 3, 4]
        }

        private pushDigitControl(
            controls: UiControl<UiNumericEntryModalKeyValue>[],
            digit: number,
        ): void {
            controls.push({
                id: "digit-" + digit,
                value: digit,
                text: "" + digit,
            })
        }

        private keyControl(
            key: UiNumericEntryModalKeyValue,
            text: string,
            id: string,
        ): UiControl<UiNumericEntryModalKeyValue> {
            return {
                id,
                value: key,
                text,
                style:
                    key == UI_NUMERIC_ENTRY_KEY_ENTER
                        ? UI_NUMERIC_ENTRY_MODAL_ENTER_STYLE
                        : key == UI_NUMERIC_ENTRY_KEY_DELETE
                          ? UI_NUMERIC_ENTRY_MODAL_DELETE_STYLE
                          : undefined,
            }
        }

        private deleteControl(): UiControl<UiNumericEntryModalKeyValue> {
            const control = this.keyControl(
                UI_NUMERIC_ENTRY_KEY_DELETE,
                "DEL",
                "delete",
            )
            if (this.deleteIcon_ !== undefined) {
                control.text = undefined
                control.bitmapId = this.deleteIcon_
            }
            return control
        }

        private spacerControl(
            id: string,
        ): UiControl<UiNumericEntryModalKeyValue> {
            return {
                id,
                value: UI_NUMERIC_ENTRY_KEY_SPACER,
                focusable: false,
                visible: false,
            }
        }

        private contentMargin(style: UiModalStyle): number {
            if (style && style.contentMargin !== undefined)
                return Math.max(0, style.contentMargin)
            return 4
        }
    }
}
