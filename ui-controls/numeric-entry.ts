namespace ui {
  /**
   * Numeric entry editing mode.
   */
  export type UiNumericEntryMode = "decimal" | "positiveInteger"

  /**
   * Edit action offered to a numeric entry validator.
   */
  export type UiNumericEntryEditAction =
    "digit" |
    "decimalPoint" |
    "toggleSign" |
    "backspace" |
    "enter" |
    "back"

  /**
   * Validation result for a proposed numeric edit.
   */
  export type UiNumericEntryValidationResult = "accepted" | "rejected" | "completed"

  /**
   * Optional validator for numeric entry text.
   */
  export interface UiNumericEntryValidator {
    /**
     * Reviews a proposed edit before it is committed.
     */
    (mode: UiNumericEntryMode, candidateText: string, action: UiNumericEntryEditAction): UiNumericEntryValidationResult
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
    | { kind: "completed"; mode: UiNumericEntryMode; text: string; value: number }
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
      this.maxLength_ = _uiControls.sanitizeDimension(options.maxLength, 8)
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
      if (this.mode_ == "positiveInteger" && this.text_ == "0") candidate = "" + digit
      return this.applyText(candidate, "digit")
    }

    /**
     * Attempts to append a decimal point.
     */
    public inputDecimalPoint(): UiNumericEntryResult {
      if (this.mode_ != "decimal") return undefined
      if (this.text_.indexOf(".") >= 0) return undefined
      return this.applyText(this.text_ + ".", "decimalPoint")
    }

    /**
     * Toggles a leading minus sign in decimal mode.
     */
    public toggleSign(): UiNumericEntryResult {
      if (this.mode_ != "decimal") return undefined
      if (this.text_.charAt(0) == "-") return this.applyText(this.text_.substr(1), "toggleSign")
      return this.applyText("-" + this.text_, "toggleSign")
    }

    /**
     * Removes the last character when one exists.
     */
    public backspace(): UiNumericEntryResult {
      if (this.text_.length == 0) return undefined
      return this.applyText(this.text_.substr(0, this.text_.length - 1), "backspace")
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
    public render(surface: DrawSurface, rect: Rect, palette?: UiControlPalette): void {
      const background = palette && palette.backgroundColor !== undefined ? palette.backgroundColor : 0
      const foreground = palette && palette.foregroundColor !== undefined ? palette.foregroundColor : 15
      surface.fillRect(rect, background)
      surface.drawRect(rect, palette && palette.focusColor !== undefined ? palette.focusColor : 15)
      surface.drawText(this.text_, rect.x + 4, rect.y + 4, { color: foreground, transparent: true })
    }

    private applyText(candidate: string, action: UiNumericEntryEditAction): UiNumericEntryResult {
      if (candidate.length > this.maxLength_) return undefined
      if (!this.isCandidateAllowed(candidate)) return undefined
      const validation = this.validate_ ? this.validate_(this.mode_, candidate, action) : "accepted"
      if (validation == "rejected") return undefined
      this.text_ = candidate
      if (validation == "completed") return this.complete(action)
      return undefined
    }

    private complete(action: UiNumericEntryEditAction): UiNumericEntryResult {
      let text = this.normalizedText()
      const validation = this.validate_ ? this.validate_(this.mode_, text, action) : "accepted"
      if (validation == "rejected") return undefined
      this.text_ = text
      return { kind: "completed", mode: this.mode_, text, value: parseFloat(text) }
    }

    private normalizedText(): string {
      let text = this.text_
      if (text == "" || text == "-" || text == "." || text == "-.") text = "0"
      if (this.mode_ == "decimal") {
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
        } else if (ch < "0" || ch > "9") {
          return false
        }
      }
      return true
    }
  }
}
