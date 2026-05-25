namespace ui {
    const LABEL_DEFAULT_FONT = bitmaps.font8

    /**
     * Options for one passive text label.
     */
    export interface UiLabelOptions {
        /**
         * Text drawn by this label.
         */
        text: string

        /**
         * Width requested by the label. Omitted values use text width.
         */
        width?: number

        /**
         * Height requested by the label. Omitted values use font height.
         */
        height?: number

        /**
         * Text color palette index. Omitted values use `1`.
         */
        color?: number

        /**
         * Optional background fill color for the arranged label rectangle.
         */
        backgroundColor?: number

        /**
         * Font used to render the label.
         */
        font?: TextFont
    }

    /**
     * Passive screen-managed label with retained text, position, and style.
     */
    export class UiLabel implements UiView<undefined> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private text_: string
        private color_: number
        private backgroundColor_: number
        private font_: TextFont
        private width_: number
        private height_: number

        /**
         * Creates a label from full options or from text and color.
         */
        constructor(options: UiLabelOptions | string, color?: number) {
            options = this.resolveOptions(options, color)
            this.text_ = options.text || ""
            this.color_ = options.color !== undefined ? options.color : 1
            this.backgroundColor_ = options.backgroundColor
            this.font_ = options.font || LABEL_DEFAULT_FONT
            this.width_ = _uiLayout.sanitizeDimension(options.width)
            this.height_ = _uiLayout.sanitizeDimension(options.height)
            this.layoutSpec = _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect(0, 0, this.width(), this.height())
            this.layoutDirty = true
        }

        /**
         * Current label text.
         */
        public get text(): string {
            return this.text_
        }

        /**
         * Updates the visible label text and returns this label.
         */
        public setText(text: string): UiLabel {
            this.text_ = text || ""
            this.invalidateLayout()
            return this
        }

        /**
         * Updates the label text color and returns this label.
         */
        public setColor(color: number): UiLabel {
            this.color_ = color
            return this
        }

        /**
         * Measures this label under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                this.width(),
                this.height(),
                this.width(),
                this.height(),
                output,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Assigns the label rectangle for rendering.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the label as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this label's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Renders the label through the supplied draw surface.
         */
        public render(surface: DrawSurface): void {
            if (this.backgroundColor_ !== undefined)
                surface.fillRect(this.finalRect, this.backgroundColor_)
            surface.drawText(this.text_, this.finalRect.x, this.finalRect.y, {
                color: this.color_,
                font: this.font_,
            })
        }

        /**
         * Labels do not consume focus input.
         */
        public handleFocusInput(result: UiFocusInputResult): undefined {
            return undefined
        }

        private resolveOptions(
            options: UiLabelOptions | string,
            color?: number,
        ): UiLabelOptions {
            if (typeof options != "string") return options
            return { text: options, color }
        }

        private width(): number {
            return this.controlDimension(this.width_, this.preferredWidth())
        }

        private height(): number {
            return this.controlDimension(this.height_, this.preferredHeight())
        }

        private preferredWidth(): number {
            return this.text_.length * this.font_.charWidth
        }

        private preferredHeight(): number {
            return this.font_.charHeight
        }

        private controlDimension(value: number, preferred: number): number {
            return value > 0 ? value : preferred
        }
    }
}
