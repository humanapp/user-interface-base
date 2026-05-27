namespace ui {
    const TEXT_ENTRY_FONT = bitmaps.font8
    const TEXT_ENTRY_LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
    const TEXT_ENTRY_UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const TEXT_ENTRY_SYMBOLS = "-_.,!?@#"
    const UI_TEXT_ENTRY_MODAL_DISPLAY_HEIGHT = 18
    const UI_TEXT_ENTRY_MODAL_TITLE_HEIGHT = 10
    const UI_TEXT_ENTRY_MODAL_DISPLAY_GAP = 3
    const UI_TEXT_ENTRY_MODAL_TITLE_GAP = 1
    const UI_TEXT_ENTRY_MODAL_KEY_WIDTH = 10
    const UI_TEXT_ENTRY_MODAL_ACTION_KEY_WIDTH = 18
    const UI_TEXT_ENTRY_MODAL_SPACE_KEY_WIDTH = 36
    const UI_TEXT_ENTRY_MODAL_KEY_HEIGHT = 12
    const UI_TEXT_ENTRY_MODAL_KEY_GAP = 1
    const UI_TEXT_ENTRY_KEY_SHIFT = "\u0001"
    const UI_TEXT_ENTRY_KEY_BACKSPACE = "\u0002"
    const UI_TEXT_ENTRY_KEY_ENTER = "\u0003"
    const UI_TEXT_ENTRY_KEY_PAGE_LETTERS = "\u0004"
    const UI_TEXT_ENTRY_KEY_PAGE_DIGITS = "\u0005"
    const UI_TEXT_ENTRY_KEY_PAGE_SYMBOLS = "\u0006"
    const UI_TEXT_ENTRY_KEY_SPACE = "\u0007"
    const UI_TEXT_ENTRY_KEY_CUSTOM = "\u0008"
    const UI_TEXT_ENTRY_KEY_SPACER = "\u0009"
    const UI_TEXT_ENTRY_DIGIT_KEYS = "1234567890"
    const UI_TEXT_ENTRY_FLAG_ALLOW_EMPTY = 1
    const UI_TEXT_ENTRY_FLAG_ALLOW_WHITESPACE = 2
    const UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS = 4
    const UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS = 8
    const UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY = 16
    const UI_TEXT_ENTRY_FLAG_CANCEL_ENABLED = 32
    const UI_TEXT_ENTRY_FLAG_UPPERCASE = 64
    const UI_TEXT_ENTRY_PAGE_LETTERS = 0
    const UI_TEXT_ENTRY_PAGE_DIGITS = 1
    const UI_TEXT_ENTRY_PAGE_SYMBOLS = 2
    const UI_TEXT_ENTRY_MODAL_ENTER_STYLE: UiButtonStyle = {
        backgroundColor: 1,
        borderColor: 7,
        frame: "roundedRect",
        font: bitmaps.font8,
        textPlacement: "content",
    }
    const UI_TEXT_ENTRY_MODAL_CUSTOM_STYLE: UiButtonStyle = {
        backgroundColor: 1,
        borderColor: 10,
        frame: "roundedRect",
        font: bitmaps.font8,
        textPlacement: "content",
    }

    /**
     * Validation result for entry edits.
     */
    export type UiEntryValidationResult = "accepted" | "rejected" | "completed"

    /**
     * Edit action offered to a text entry validator.
     */
    export type UiTextEntryEditAction =
        | "character"
        | "backspace"
        | "custom"
        | "enter"
        | "back"

    /**
     * Optional validator for text entry.
     */
    export type UiTextEntryValidator = (
        candidateText: string,
        action: UiTextEntryEditAction,
    ) => UiEntryValidationResult

    /**
     * Handles a text entry custom action.
     */
    export type UiTextEntryCustomActionHandler = (text: string) => string

    /**
     * Result emitted by text entry.
     */
    export type UiTextEntryResult =
        | { kind: "completed"; text: string }
        | { kind: "cancelled"; text: string }
        | { kind: "custom"; text: string }

    /**
     * Options for a modal text keyboard backed by `UiTextEntry`.
     */
    export interface UiTextEntryModalOptions extends UiModalStyle {
        /**
         * Modal focus scope owned while the keyboard is open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Initial editable text. Defaults to the empty string.
         */
        initialText?: string

        /**
         * Maximum editable text length. Defaults to `16`.
         */
        maxLength?: number

        /**
         * Minimum completed text length after trimming. Defaults to `0`.
         */
        minLength?: number

        /**
         * Whether completion accepts empty trimmed text.
         */
        allowEmpty?: boolean

        /**
         * Whether space characters are accepted.
         */
        allowWhitespace?: boolean

        /**
         * Whether digit characters are accepted. Defaults to `true`.
         */
        allowDigits?: boolean

        /**
         * Whether built-in symbol characters are accepted.
         */
        allowSymbols?: boolean

        /**
         * Whether letters are normalized to uppercase.
         */
        uppercaseOnly?: boolean

        /**
         * Optional edit validator.
         */
        validate?: UiTextEntryValidator

        /**
         * Optional title content.
         */
        title?: UiControlContentOptions | string

        /**
         * Style applied to keyboard buttons.
         */
        keyStyle?: UiButtonStyle

        /**
         * Optional custom action key content.
         */
        customAction?: UiControlContentOptions | string

        /**
         * Optional in-modal custom action handler.
         */
        onCustomAction?: UiTextEntryCustomActionHandler

        /**
         * Receives text entry modal results.
         */
        onResult?: (result: UiTextEntryResult) => void
    }

    /**
     * Short text entry state with typed completion results.
     */
    export class UiTextEntry {
        private text_: string
        private maxLength_: number
        private minLength_: number
        private flags_: number
        private validate_: UiTextEntryValidator

        constructor(
            initialText?: string,
            maxLength?: number,
            minLength?: number,
            allowEmpty?: boolean,
            allowWhitespace?: boolean,
            allowDigits?: boolean,
            allowSymbols?: boolean,
            uppercaseOnly?: boolean,
            cancelEnabled?: boolean,
            validate?: UiTextEntryValidator,
        ) {
            this.flags_ = 0
            if (allowEmpty) this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_EMPTY
            if (allowWhitespace)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_WHITESPACE
            if (allowDigits !== false)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS
            if (allowSymbols) this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS
            if (uppercaseOnly) this.flags_ |= UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY
            if (cancelEnabled) this.flags_ |= UI_TEXT_ENTRY_FLAG_CANCEL_ENABLED
            this.maxLength_ = _uiControls.sanitizeDimension(maxLength, 16)
            if (this.maxLength_ == 0) this.maxLength_ = 16
            this.minLength_ = _uiControls.sanitizeDimension(minLength, 0)
            this.validate_ = validate
            this.text_ = this.normalizedEditableText(initialText || "")
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
         * Minimum completed text length after trimming.
         */
        public get minLength(): number {
            return this.minLength_
        }

        /**
         * Attempts to append one character.
         */
        public inputCharacter(ch: string): UiTextEntryResult {
            if (!ch || ch.length == 0) return undefined
            return this.applyText(this.text_ + ch.charAt(0), "character")
        }

        /**
         * Attempts to replace the editable text.
         */
        public replaceText(text: string): UiTextEntryResult {
            return this.applyText(text || "", "custom")
        }

        /**
         * Removes the last character when one exists.
         */
        public backspace(): UiTextEntryResult {
            if (this.text_.length == 0) return undefined
            return this.applyText(
                this.text_.substr(0, this.text_.length - 1),
                "backspace",
            )
        }

        /**
         * Completes the current text.
         */
        public enter(): UiTextEntryResult {
            return this.complete("enter")
        }

        /**
         * Completes the current text using the default back behavior.
         */
        public back(): UiTextEntryResult {
            return this.complete("back")
        }

        /**
         * Emits a custom result after validation.
         */
        public custom(): UiTextEntryResult {
            const text = this.trimmedText(this.text_)
            const validation = this.validate_
                ? this.validate_(text, "custom")
                : "accepted"
            if (validation == "rejected") return undefined
            if (validation == "completed") return this.complete("custom")
            return { kind: "custom", text }
        }

        /**
         * Emits a non-committing cancellation when enabled.
         */
        public cancel(): UiTextEntryResult {
            if (!(this.flags_ & UI_TEXT_ENTRY_FLAG_CANCEL_ENABLED))
                return undefined
            return { kind: "cancelled", text: this.trimmedText(this.text_) }
        }

        /**
         * Renders the current entry text.
         */
        public render(surface: DrawSurface, rect: Rect): void {
            _uiEntryModal.renderEntryText(
                surface,
                rect,
                this.text_,
                TEXT_ENTRY_FONT,
            )
        }

        private applyText(
            candidate: string,
            action: UiTextEntryEditAction,
        ): UiTextEntryResult {
            candidate = this.normalizedEditableText(candidate)
            const validation = this.validate_
                ? this.validate_(candidate, action)
                : "accepted"
            if (validation == "rejected") return undefined
            this.text_ = candidate
            if (validation == "completed") return this.complete(action)
            return undefined
        }

        private complete(action: UiTextEntryEditAction): UiTextEntryResult {
            const text = this.trimmedText(this.text_)
            if (!this.canComplete(text)) return undefined
            const validation = this.validate_
                ? this.validate_(text, action)
                : "accepted"
            if (validation == "rejected") return undefined
            this.text_ = text
            return { kind: "completed", text }
        }

        private normalizedEditableText(text: string): string {
            let result = ""
            for (let i = 0; i < text.length; i++) {
                const ch = this.normalizedCharacter(text.charAt(i))
                if (ch.length == 0) continue
                if (result.length >= this.maxLength_) break
                result += ch
            }
            return result
        }

        private normalizedCharacter(ch: string): string {
            if (ch >= "a" && ch <= "z") {
                if (this.flags_ & UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY)
                    return TEXT_ENTRY_UPPERCASE.charAt(
                        TEXT_ENTRY_LOWERCASE.indexOf(ch),
                    )
                return ch
            }
            if (ch >= "A" && ch <= "Z") return ch
            if (ch >= "0" && ch <= "9")
                return this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS ? ch : ""
            if (ch == " ")
                return this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_WHITESPACE
                    ? ch
                    : ""
            if (
                this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS &&
                this.isSymbol(ch)
            )
                return ch
            return ""
        }

        private isSymbol(ch: string): boolean {
            return TEXT_ENTRY_SYMBOLS.indexOf(ch) >= 0
        }

        private canComplete(text: string): boolean {
            if (
                !(this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_EMPTY) &&
                text.length == 0
            )
                return false
            return text.length >= this.minLength_
        }

        private trimmedText(text: string): string {
            let start = 0
            let end = text.length
            while (start < end && text.charAt(start) == " ") start++
            while (end > start && text.charAt(end - 1) == " ") end--
            return text.substr(start, end - start)
        }
    }

    /**
     * Modal text keyboard for short text entry.
     */
    export class UiTextEntryModal
        implements UiModal<UiTextEntryResult>, UiFocusNavigationProvider
    {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private modalScopeId_: UiFocusScopeId
        private entry_: UiTextEntry
        private title_: UiControlContentOptions | string
        private customAction_: UiControlContentOptions | string
        private onCustomAction_: UiTextEntryCustomActionHandler
        private keyStyle_: UiButtonStyle
        private titleStyle_: UiButtonStyle
        private keyView_: UiButtonView
        private keyContent_: UiControlContent
        private keyValues_: string[]
        private keyXs_: number[]
        private keyRect_: Rect
        private displayRect_: Rect
        private titleRect_: Rect
        private gridRect_: Rect
        private backgroundColor_: number
        private contentMargin_: number
        private titleGap_: number
        private page_: number
        private flags_: number
        private onResult_: (result: UiTextEntryResult) => void

        constructor(options: UiTextEntryModalOptions) {
            this.modalScopeId_ = options.modalScopeId
            this.entry_ = this.createEntry(options)
            this.title_ = options.title
            this.customAction_ = options.customAction
            this.onCustomAction_ = options.onCustomAction
            this.flags_ = 0
            if (options.allowDigits !== false)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS
            if (options.allowSymbols)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS
            if (options.allowWhitespace)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_ALLOW_WHITESPACE
            if (options.uppercaseOnly)
                this.flags_ |= UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY
            this.backgroundColor_ =
                options.backgroundColor === undefined
                    ? 12
                    : options.backgroundColor
            this.contentMargin_ = _uiEntryModal.contentMargin(
                options.contentMargin,
            )
            this.titleGap_ = this.titleGap(options.titleGap)
            this.keyStyle_ =
                options.keyStyle ||
                buttonStyle(UiButtonStyles.LightShadowedWhite, {
                    font: bitmaps.font8,
                    textPlacement: "content",
                })
            if (this.title_ !== undefined)
                this.titleStyle_ = {
                    color: options.color === undefined ? 1 : options.color,
                    font: bitmaps.font8,
                    textPlacement: "content",
                }
            this.keyView_ = new UiButtonView(this.keyStyle_)
            this.keyContent_ = {}
            this.keyValues_ = []
            this.keyXs_ = []
            for (let i = 0; i < 32; i++) {
                this.keyValues_.push(UI_TEXT_ENTRY_KEY_SPACER)
                this.keyXs_.push(0)
            }
            this.keyRect_ = new Rect()
            this.displayRect_ = new Rect()
            this.titleRect_ = new Rect()
            this.gridRect_ = new Rect()
            this.page_ = UI_TEXT_ENTRY_PAGE_LETTERS
            this.onResult_ = options.onResult
            this.layoutSpec = {
                width: { mode: "content" },
                height: { mode: "content" },
            }
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.rebuildKeys()
        }

        /**
         * Modal focus scope id used by this keyboard.
         */
        public get modalScopeId(): UiFocusScopeId {
            return this.modalScopeId_
        }

        /**
         * Measures the display and keyboard under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const width = Math.min(constraints.maxWidth || 160, 160)
            let height =
                this.contentMargin_ * 2 +
                UI_TEXT_ENTRY_MODAL_DISPLAY_HEIGHT +
                UI_TEXT_ENTRY_MODAL_DISPLAY_GAP +
                this.gridHeight()
            if (this.hasTitle())
                height += UI_TEXT_ENTRY_MODAL_TITLE_HEIGHT + this.titleGap_
            output.set(width, height, width, height)
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the modal panel, title, display, and keyboard grid.
         */
        public arrange(rect: Rect): void {
            this.finalRect.copyFrom(rect)
            let y = rect.y + this.contentMargin_
            const contentWidth = Math.max(
                0,
                rect.width - this.contentMargin_ * 2,
            )
            if (this.hasTitle()) {
                this.titleRect_.set(
                    rect.x + this.contentMargin_,
                    y,
                    contentWidth,
                    UI_TEXT_ENTRY_MODAL_TITLE_HEIGHT,
                )
                y += UI_TEXT_ENTRY_MODAL_TITLE_HEIGHT + this.titleGap_
            } else {
                this.titleRect_.set(0, 0, 0, 0)
            }
            this.displayRect_.set(
                rect.x + this.contentMargin_,
                y,
                contentWidth,
                UI_TEXT_ENTRY_MODAL_DISPLAY_HEIGHT,
            )
            y +=
                UI_TEXT_ENTRY_MODAL_DISPLAY_HEIGHT +
                UI_TEXT_ENTRY_MODAL_DISPLAY_GAP
            this.gridRect_.set(
                rect.x + this.contentMargin_,
                y,
                contentWidth,
                this.gridHeight(),
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
         * Resolves resolver-backed content ids for title and custom action content.
         */
        public _resolveContentAssets(assets: UiAssetResolver): void {
            if (this.title_ !== undefined && typeof this.title_ != "string")
                _uiControls.resolveContentOptions(this.title_, assets)
            if (
                this.customAction_ !== undefined &&
                typeof this.customAction_ != "string"
            )
                _uiControls.resolveContentOptions(this.customAction_, assets)
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
                    this.firstVisibleKeyIndex(),
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
         * Converts focus input into a text entry result.
         */
        public handleFocusInput(result: UiFocusInputResult): UiTextEntryResult {
            let entryResult: UiTextEntryResult = undefined
            if (result.kind == "activated") {
                const key = this.keyValueForTargetId(result.targetId)
                if (key.length && result.scopeId == this.modalScopeId_)
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

            let destinationIndex = -1
            if (request.direction == "left" || request.direction == "right") {
                destinationIndex = this.horizontalDestinationIndex(
                    currentIndex,
                    request.direction,
                )
            } else {
                destinationIndex = this.verticalDestinationIndex(
                    currentIndex,
                    request.direction,
                )
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

            return {
                kind: "stayed",
                scopeId: this.modalScopeId_,
                targetId: request.currentTargetId,
                reason: "boundary",
            }
        }

        /**
         * Renders the modal panel, title, display, and keyboard.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            surface.drawRoundedRect(this.finalRect, 15, this.backgroundColor_)
            this.renderTitle(surface)
            this.entry_.render(surface, this.displayRect_)
            this.renderKeys(surface)
            this.renderFocus(surface, focus)
        }

        private createEntry(options: UiTextEntryModalOptions): UiTextEntry {
            return new UiTextEntry(
                options.initialText,
                options.maxLength,
                options.minLength,
                options.allowEmpty,
                options.allowWhitespace,
                options.allowDigits,
                options.allowSymbols,
                options.uppercaseOnly,
                true,
                options.validate,
            )
        }

        private rebuildKeys(): void {
            for (let i = 0; i < this.keyValues_.length; i++)
                this.keyValues_[i] = UI_TEXT_ENTRY_KEY_SPACER
            if (this.page_ == UI_TEXT_ENTRY_PAGE_LETTERS) this.addLetterKeys()
            else if (this.page_ == UI_TEXT_ENTRY_PAGE_DIGITS)
                this.addDigitKeys()
            else this.addSymbolKeys()
        }

        private addLetterKeys(): void {
            for (let i = 0; i < TEXT_ENTRY_LOWERCASE.length; i++)
                this.keyValues_[i] = TEXT_ENTRY_LOWERCASE.charAt(i)
            if (!(this.flags_ & UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY))
                this.keyValues_[26] = UI_TEXT_ENTRY_KEY_SHIFT
            if (
                this.flags_ &
                (UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS |
                    UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS)
            )
                this.keyValues_[27] = UI_TEXT_ENTRY_KEY_PAGE_DIGITS
            this.addActionKeys()
        }

        private addDigitKeys(): void {
            for (let i = 0; i < UI_TEXT_ENTRY_DIGIT_KEYS.length; i++)
                this.keyValues_[i] = UI_TEXT_ENTRY_DIGIT_KEYS.charAt(i)
            this.keyValues_[26] = UI_TEXT_ENTRY_KEY_PAGE_LETTERS
            this.keyValues_[27] =
                this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_SYMBOLS
                    ? UI_TEXT_ENTRY_KEY_PAGE_SYMBOLS
                    : UI_TEXT_ENTRY_KEY_PAGE_LETTERS
            this.addActionKeys()
        }

        private addSymbolKeys(): void {
            for (let i = 0; i < TEXT_ENTRY_SYMBOLS.length; i++)
                this.keyValues_[i] = TEXT_ENTRY_SYMBOLS.charAt(i)
            this.keyValues_[26] = UI_TEXT_ENTRY_KEY_PAGE_LETTERS
            if (this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_DIGITS)
                this.keyValues_[27] = UI_TEXT_ENTRY_KEY_PAGE_DIGITS
            this.addActionKeys()
        }

        private addActionKeys(): void {
            if (this.flags_ & UI_TEXT_ENTRY_FLAG_ALLOW_WHITESPACE)
                this.keyValues_[28] = UI_TEXT_ENTRY_KEY_SPACE
            if (this.customAction_)
                this.keyValues_[29] = UI_TEXT_ENTRY_KEY_CUSTOM
            this.keyValues_[30] = UI_TEXT_ENTRY_KEY_BACKSPACE
            this.keyValues_[31] = UI_TEXT_ENTRY_KEY_ENTER
        }

        private arrangeKeys(): void {
            for (let row = 0; row < 3; row++) {
                const start = this.rowStart(row)
                const length = this.rowLength(row)
                let x = this.rowX(row)
                let visibleCount = 0
                for (let i = 0; i < length; i++) {
                    const index = start + i
                    const key = this.keyValues_[index]
                    const width = this.keyWidth(key)
                    if (key != UI_TEXT_ENTRY_KEY_SPACER) {
                        if (visibleCount > 0) x += UI_TEXT_ENTRY_MODAL_KEY_GAP
                        this.keyXs_[index] = x
                        x += width
                        visibleCount++
                    } else {
                        this.keyXs_[index] = x
                    }
                }
            }
        }

        private registerTargets(focus: UiFocusState): void {
            for (let i = 0; i < this.keyValues_.length; i++) {
                this.setKeyRect(i)
                focus.setTarget({
                    id: _uiEntryModal.targetIdForIndex(this.modalScopeId_, i),
                    scopeId: this.modalScopeId_,
                    rect: this.keyRect_,
                    hidden: this.keyValues_[i] == UI_TEXT_ENTRY_KEY_SPACER,
                    activatable: true,
                })
            }
        }

        private renderTitle(surface: DrawSurface): void {
            if (!this.hasTitle()) return
            this.prepareContent(this.title_)
            this.keyView_.render(
                surface,
                this.titleRect_,
                this.keyContent_,
                this.titleStyle_,
            )
        }

        private renderKeys(surface: DrawSurface): void {
            for (let i = 0; i < this.keyValues_.length; i++) {
                const key = this.keyValues_[i]
                if (key == UI_TEXT_ENTRY_KEY_SPACER) continue
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
            if (key == UI_TEXT_ENTRY_KEY_SPACER) return
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

        private applyKey(key: string): UiTextEntryResult {
            if (this.isCharacterKey(key))
                return this.entry_.inputCharacter(this.keyTextForKey(key))
            switch (key) {
                case UI_TEXT_ENTRY_KEY_SHIFT:
                    this.flags_ ^= UI_TEXT_ENTRY_FLAG_UPPERCASE
                    this.rebuildKeys()
                    this.arrangeKeys()
                    return undefined
                case UI_TEXT_ENTRY_KEY_BACKSPACE:
                    return this.entry_.backspace()
                case UI_TEXT_ENTRY_KEY_ENTER:
                    return this.entry_.enter()
                case UI_TEXT_ENTRY_KEY_PAGE_LETTERS:
                    this.setPage(UI_TEXT_ENTRY_PAGE_LETTERS)
                    return undefined
                case UI_TEXT_ENTRY_KEY_PAGE_DIGITS:
                    this.setPage(UI_TEXT_ENTRY_PAGE_DIGITS)
                    return undefined
                case UI_TEXT_ENTRY_KEY_PAGE_SYMBOLS:
                    this.setPage(UI_TEXT_ENTRY_PAGE_SYMBOLS)
                    return undefined
                case UI_TEXT_ENTRY_KEY_SPACE:
                    return this.entry_.inputCharacter(" ")
                case UI_TEXT_ENTRY_KEY_CUSTOM:
                    return this.applyCustomAction()
            }
            return undefined
        }

        private applyCustomAction(): UiTextEntryResult {
            if (this.onCustomAction_) {
                return this.entry_.replaceText(
                    this.onCustomAction_(this.trimmedEntryText()),
                )
            }
            return this.entry_.custom()
        }

        private setPage(page: number): void {
            this.page_ = page
            this.rebuildKeys()
            this.arrangeKeys()
        }

        private prepareKeyContent(key: string): void {
            if (key == UI_TEXT_ENTRY_KEY_CUSTOM) {
                this.prepareContent(this.customAction_)
            } else {
                this.keyContent_.bitmap = undefined
                this.keyContent_.text = this.keyTextForKey(key)
            }
        }

        private prepareContent(source: UiControlContentOptions | string): void {
            _uiControls.resolveContent(source, undefined, this.keyContent_)
        }

        private keyTextForKey(key: string): string {
            if (key == UI_TEXT_ENTRY_KEY_SHIFT)
                return this.flags_ & UI_TEXT_ENTRY_FLAG_UPPERCASE
                    ? "abc"
                    : "ABC"
            if (key == UI_TEXT_ENTRY_KEY_BACKSPACE) return "<-"
            if (key == UI_TEXT_ENTRY_KEY_ENTER) return "OK"
            if (key == UI_TEXT_ENTRY_KEY_PAGE_LETTERS) return "ABC"
            if (key == UI_TEXT_ENTRY_KEY_PAGE_DIGITS) return "123"
            if (key == UI_TEXT_ENTRY_KEY_PAGE_SYMBOLS) return "#+="
            if (key == UI_TEXT_ENTRY_KEY_SPACE) return "space"
            if (
                this.flags_ &
                (UI_TEXT_ENTRY_FLAG_UPPERCASE |
                    UI_TEXT_ENTRY_FLAG_UPPERCASE_ONLY)
            ) {
                const index = TEXT_ENTRY_LOWERCASE.indexOf(key)
                if (index >= 0) return TEXT_ENTRY_UPPERCASE.charAt(index)
            }
            return key
        }

        private keyStyleForKey(key: string): UiButtonStyle {
            if (key == UI_TEXT_ENTRY_KEY_ENTER)
                return UI_TEXT_ENTRY_MODAL_ENTER_STYLE
            if (key == UI_TEXT_ENTRY_KEY_CUSTOM)
                return UI_TEXT_ENTRY_MODAL_CUSTOM_STYLE
            return this.keyStyle_
        }

        private rowForIndex(index: number): number {
            if (index < 13) return 0
            if (index < 26) return 1
            return 2
        }

        private rowStart(row: number): number {
            if (row == 0) return 0
            if (row == 1) return 13
            return 26
        }

        private rowLength(row: number): number {
            if (row == 2) return 6
            return 13
        }

        private keyIndexForTargetId(targetId: UiFocusId): number {
            return _uiEntryModal.indexForTargetId(
                this.modalScopeId_,
                targetId,
                this.keyValues_.length,
            )
        }

        private keyValueForTargetId(targetId: UiFocusId): string {
            const index = this.keyIndexForTargetId(targetId)
            return index < 0 ? "" : this.keyValues_[index]
        }

        private setKeyRect(index: number): void {
            const row = this.rowForIndex(index)
            this.keyRect_.set(
                this.keyXs_[index],
                this.gridRect_.y +
                    row *
                        (UI_TEXT_ENTRY_MODAL_KEY_HEIGHT +
                            UI_TEXT_ENTRY_MODAL_KEY_GAP),
                this.keyWidth(this.keyValues_[index]),
                UI_TEXT_ENTRY_MODAL_KEY_HEIGHT,
            )
        }

        private firstVisibleKeyIndex(): number {
            for (let i = 0; i < this.keyValues_.length; i++) {
                if (this.keyValues_[i] != UI_TEXT_ENTRY_KEY_SPACER) return i
            }
            return 0
        }

        private horizontalDestinationIndex(
            currentIndex: number,
            direction: UiFocusDirection,
        ): number {
            const row = this.rowForIndex(currentIndex)
            const start = this.rowStart(row)
            const length = this.rowLength(row)
            const step = direction == "left" ? -1 : 1
            let column = currentIndex - start + step
            if (column < 0) column = length - 1
            else if (column >= length) column = 0
            while (column != currentIndex - start) {
                const index = start + column
                if (this.keyValues_[index] != UI_TEXT_ENTRY_KEY_SPACER)
                    return index
                column += step
                if (column < 0) column = length - 1
                else if (column >= length) column = 0
            }
            return -1
        }

        private verticalDestinationIndex(
            currentIndex: number,
            direction: UiFocusDirection,
        ): number {
            const currentRow = this.rowForIndex(currentIndex)
            const currentX =
                this.keyXs_[currentIndex] +
                Math.idiv(this.keyWidth(this.keyValues_[currentIndex]), 2)
            const step = direction == "up" ? -1 : 1
            let row = currentRow + step
            while (row >= 0 && row < 3) {
                const start = this.rowStart(row)
                const length = this.rowLength(row)
                let bestIndex = -1
                let bestDistance = 0
                for (let i = 0; i < length; i++) {
                    const index = start + i
                    if (this.keyValues_[index] == UI_TEXT_ENTRY_KEY_SPACER)
                        continue
                    const distance = Math.abs(
                        this.keyXs_[index] +
                            Math.idiv(
                                this.keyWidth(this.keyValues_[index]),
                                2,
                            ) -
                            currentX,
                    )
                    if (bestIndex < 0 || distance < bestDistance) {
                        bestIndex = index
                        bestDistance = distance
                    }
                }
                if (bestIndex >= 0) return bestIndex
                row += step
            }
            return -1
        }

        private rowX(row: number): number {
            return (
                this.gridRect_.x +
                Math.max(
                    0,
                    Math.idiv(this.gridRect_.width - this.rowWidth(row), 2),
                )
            )
        }

        private rowWidth(row: number): number {
            const start = this.rowStart(row)
            const length = this.rowLength(row)
            let width = 0
            let visibleCount = 0
            for (let i = 0; i < length; i++) {
                const key = this.keyValues_[start + i]
                if (key == UI_TEXT_ENTRY_KEY_SPACER) continue
                width += this.keyWidth(key)
                visibleCount++
            }
            if (visibleCount > 1)
                width += UI_TEXT_ENTRY_MODAL_KEY_GAP * (visibleCount - 1)
            return width
        }

        private isCharacterKey(key: string): boolean {
            return key >= " "
        }

        private keyWidth(key: string): number {
            if (key == UI_TEXT_ENTRY_KEY_SPACE)
                return UI_TEXT_ENTRY_MODAL_SPACE_KEY_WIDTH
            if (key >= " ") return UI_TEXT_ENTRY_MODAL_KEY_WIDTH
            return UI_TEXT_ENTRY_MODAL_ACTION_KEY_WIDTH
        }

        private gridHeight(): number {
            return (
                UI_TEXT_ENTRY_MODAL_KEY_HEIGHT * 3 +
                UI_TEXT_ENTRY_MODAL_KEY_GAP * 2
            )
        }

        private hasTitle(): boolean {
            return this.title_ !== undefined
        }

        private trimmedEntryText(): string {
            let text = this.entry_.text
            let start = 0
            let end = text.length
            while (start < end && text.charAt(start) == " ") start++
            while (end > start && text.charAt(end - 1) == " ") end--
            return text.substr(start, end - start)
        }

        private titleGap(value: number): number {
            if (value !== undefined) return Math.max(0, value)
            return UI_TEXT_ENTRY_MODAL_TITLE_GAP
        }
    }
}
