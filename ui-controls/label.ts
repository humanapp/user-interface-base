namespace ui {
    const LABEL_DEFAULT_FONT = bitmaps.font8
    const LABEL_CONTENT_GAP = 3

    /**
     * Options for one passive text or bitmap label.
     */
    export interface UiLabelOptions extends UiControlContentOptions {
        /**
         * Requested label size. Omitted axes use literal content size.
         */
        size?: UiSizeOptions

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
     * Creates a passive text or bitmap label.
     */
    export function label(
        options: UiLabelOptions | string,
        color?: number,
    ): UiLabel {
        return new UiLabel(options, color)
    }

    /**
     * Passive screen-managed label with retained text, position, and style.
     */
    export class UiLabel implements UiView<undefined> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private text_: string
        private bitmap_: Bitmap
        private content_: UiControlContentOptions
        private color_: number
        private backgroundColor_: number
        private font_: TextFont
        private width_: number
        private height_: number

        /**
         * Creates a label from full options or from text and color.
         */
        constructor(options: UiLabelOptions | string, color?: number) {
            const source = options
            options = this.resolveOptions(options, color)
            this.text_ = options.text || ""
            this.bitmap_ = options.bitmap
            this.content_ = typeof source == "string" ? undefined : options
            this.color_ = options.color !== undefined ? options.color : 1
            this.backgroundColor_ = options.backgroundColor
            this.font_ = options.font || LABEL_DEFAULT_FONT
            this.width_ = _uiControls.sizeWidth(options.size, 0)
            this.height_ = _uiControls.sizeHeight(options.size, 0)
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
            if (this.content_) {
                this.content_.text = this.text_
                this.content_.textId = undefined
            }
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
            const bitmap = this.bitmap_
            const text = this.text_
            let textX = this.finalRect.x
            if (bitmap) {
                surface.drawBitmap(bitmap, this.finalRect.x, this.finalRect.y)
                textX += bitmap.width + (text.length ? LABEL_CONTENT_GAP : 0)
            }
            if (text.length > 0)
                surface.drawText(text, textX, this.finalRect.y, {
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

        /**
         * Resolves resolver-backed content ids into retained label content.
         */
        public _resolveContentAssets(assets: UiAssetResolver): void {
            const content = this.content_
            if (!content) return
            _uiControls.resolveContentOptions(content, assets)
            this.text_ = content.text || ""
            this.bitmap_ = content.bitmap
            this.content_ = undefined
            this.invalidateLayout()
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
            const textWidth = this.text_.length * this.font_.charWidth
            const bitmap = this.bitmap_
            const bitmapWidth = bitmap ? bitmap.width : 0
            if (textWidth > 0 && bitmapWidth > 0)
                return bitmapWidth + LABEL_CONTENT_GAP + textWidth
            return bitmapWidth + textWidth
        }

        private preferredHeight(): number {
            const bitmap = this.bitmap_
            return Math.max(this.font_.charHeight, bitmap ? bitmap.height : 0)
        }

        private controlDimension(value: number, preferred: number): number {
            return value > 0 ? value : preferred
        }
    }
}
