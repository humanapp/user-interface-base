namespace ui {
    /**
     * Border or frame treatment drawn behind button content.
     */
    export type UiButtonFrame = "none" | "rect" | "roundedRect" | "roundedShadow"

    /**
     * Horizontal content placement inside a button rectangle.
     */
    export type UiButtonContentAlignment = "start" | "center"

    /**
     * Focus treatment drawn for a focused button.
     */
    export type UiButtonFocusKind = "none" | "rect" | "contentRing"

    /**
     * Placement for button text.
     */
    export type UiButtonTextPlacement = "content" | "focusLabel"

    /**
     * Visual style used by `UiButtonView`.
     */
    export interface UiButtonStyle {
        /**
         * Fill color for the button background.
         */
        backgroundColor?: number

        /**
         * Foreground color used for text.
         */
        foregroundColor?: number

        /**
         * Foreground color used when disabled.
         */
        disabledForegroundColor?: number

        /**
         * Fill color used when selected.
         */
        selectedColor?: number

        /**
         * Fill color used when toggled.
         */
        toggledColor?: number

        /**
         * Fill color used when disabled.
         */
        disabledColor?: number

        /**
         * Frame shape drawn around the button.
         */
        frame?: UiButtonFrame

        /**
         * Color used for rectangle and rounded-rectangle frames.
         */
        borderColor?: number

        /**
         * Edge color used for one-pixel rounded shadow frames.
         */
        edgeColor?: number

        /**
         * Shadow color used for one-pixel rounded shadow frames.
         */
        shadowColor?: number

        /**
         * Button content alignment.
         */
        contentAlignment?: UiButtonContentAlignment

        /**
         * Horizontal and vertical inset used for start-aligned content.
         */
        padding?: number

        /**
         * Gap between icon and text when both are present.
         */
        contentGap?: number

        /**
         * Focus treatment drawn when focused.
         */
        focusKind?: UiButtonFocusKind

        /**
         * Focus color.
         */
        focusColor?: number

        /**
         * Focus ring thickness in UI units.
         */
        focusThickness?: number

        /**
         * Extra space between content and a content focus ring.
         */
        focusPadding?: number

        /**
         * Font used for text content.
         */
        font?: TextFont

        /**
         * Where text is rendered. Defaults to `"content"`.
         */
        textPlacement?: UiButtonTextPlacement

        /**
         * Fill color for focus-label text background.
         */
        focusLabelBackgroundColor?: number

        /**
         * Text color for focus-label text.
         */
        focusLabelColor?: number

        /**
         * Font used for focus-label text.
         */
        focusLabelFont?: TextFont

        /**
         * Distance between the focused content ring and focus label.
         */
        focusLabelGap?: number

        /**
         * Background padding around focus-label text.
         */
        focusLabelPadding?: number
    }

    /**
     * Bitmap and text content rendered by `UiButtonView`.
     */
    export interface UiButtonContent {
        /**
         * Bitmap drawn before the text or centered by itself.
         */
        bitmap?: Bitmap

        /**
         * Text drawn beside the bitmap or centered by itself.
         */
        text?: string
    }

    /**
     * State flags used when rendering a button.
     */
    export interface UiButtonState {
        /**
         * Whether the button is focused.
         */
        focused?: boolean

        /**
         * Whether the button is selected.
         */
        selected?: boolean

        /**
         * Whether the button is toggled on.
         */
        toggled?: boolean

        /**
         * Whether the button is disabled.
         */
        disabled?: boolean
    }

    /**
     * Options for rendering a button.
     */
    export interface UiButtonViewRenderOptions extends UiButtonState {
        /**
         * Style override for this render call.
         */
        style?: UiButtonStyle

        /**
         * Palette override for button rendering.
         */
        palette?: UiButtonStyle

        /**
         * Receives the content rectangle used for content focus rings.
         */
        contentRect?: Rect

        /**
         * Bounds used to keep a focus label visible.
         */
        labelBounds?: Rect
    }

    /**
     * Creates a button style by copying defined fields from each style in order.
     */
    export function buttonStyle(
        style0?: UiButtonStyle,
        style1?: UiButtonStyle,
        style2?: UiButtonStyle,
        style3?: UiButtonStyle,
        style4?: UiButtonStyle,
    ): UiButtonStyle {
        const result: UiButtonStyle = {}
        copyButtonStyle(result, style0)
        copyButtonStyle(result, style1)
        copyButtonStyle(result, style2)
        copyButtonStyle(result, style3)
        copyButtonStyle(result, style4)
        return result
    }

    /**
     * Options for constructing a reusable button visual.
     */
    export interface UiButtonViewOptions {
        /**
         * Default style used by later render calls.
         */
        style?: UiButtonStyle
    }

    /**
     * Reusable button view that measures and renders button content and state.
     */
    export class UiButtonView {
        private style_: UiButtonStyle
        private scratch_: Rect

        constructor(options?: UiButtonViewOptions) {
            this.style_ =
                options && options.style
                    ? options.style
                    : UiButtonStyles.Default
            this.scratch_ = new Rect()
        }

        /**
         * Replaces the default style used by later render calls.
         */
        public setStyle(style: UiButtonStyle): void {
            this.style_ = style || UiButtonStyles.Default
        }

        /**
         * Measures the preferred size for button content.
         */
        public measure(
            content: UiButtonContent,
            output: UiMeasuredSize,
            style?: UiButtonStyle,
        ): void {
            const resolved = style || this.style_
            const font = resolved.font || bitmaps.font5
            const text = this.contentText(content, resolved)
            const gap =
                content.bitmap && text.length > 0
                    ? this.contentGap(resolved)
                    : 0
            const textWidth = text.length > 0 ? font.charWidth * text.length : 0
            const textHeight = text.length > 0 ? font.charHeight : 0
            const bitmapWidth = content.bitmap ? content.bitmap.width : 0
            const bitmapHeight = content.bitmap ? content.bitmap.height : 0
            const padding = this.padding(resolved)
            const width = bitmapWidth + gap + textWidth + padding * 2
            const height = Math.max(bitmapHeight, textHeight) + padding * 2
            output.set(width, height, width, height)
        }

        /**
         * Renders the button frame, content, and optional focus state.
         */
        public render(
            surface: DrawSurface,
            rect: Rect,
            content: UiButtonContent,
            options?: UiButtonViewRenderOptions,
        ): void {
            const style = this.styleFor(options)
            this.renderFrame(surface, rect, style, options)
            this.renderContent(surface, rect, content, style, options)
            if (options && options.focused) {
                this.renderFocus(surface, rect, content, options)
            }
        }

        /**
         * Renders only the focus treatment for a button.
         */
        public renderFocus(
            surface: DrawSurface,
            rect: Rect,
            content: UiButtonContent,
            options?: UiButtonViewRenderOptions,
        ): void {
            const style = this.styleFor(options)
            const focusKind = style.focusKind || "rect"
            if (focusKind == "none") return
            const focusColor = this.focusColor(style, options)
            if (focusKind == "contentRing") {
                const contentRect =
                    options && options.contentRect
                        ? options.contentRect
                        : this.scratch_
                if (!options || !options.contentRect)
                    this.contentRect(rect, content, style, contentRect)
                drawButtonContentFocusRing(
                    surface,
                    contentRect,
                    focusColor,
                    style.focusThickness,
                    style.focusPadding,
                )
            } else {
                surface.drawRect(rect, focusColor)
            }
            this.renderFocusLabel(surface, rect, content, style, options)
        }

        private renderFrame(
            surface: DrawSurface,
            rect: Rect,
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): void {
            const background = this.backgroundColor(style, options)
            const frame = style.frame || "none"
            if (frame == "roundedShadow") {
                drawShadowedButtonFrame(
                    surface,
                    rect,
                    this.scratch_,
                    background,
                    style.edgeColor,
                    style.shadowColor,
                )
            } else if (frame == "roundedRect") {
                surface.drawRoundedRect(rect, style.borderColor, background)
            } else {
                if (background !== undefined) surface.fillRect(rect, background)
                if (frame == "rect" && style.borderColor !== undefined) {
                    surface.drawRect(rect, style.borderColor)
                }
            }
        }

        private renderContent(
            surface: DrawSurface,
            rect: Rect,
            content: UiButtonContent,
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): void {
            const contentRect =
                options && options.contentRect
                    ? options.contentRect
                    : this.scratch_
            this.contentRect(rect, content, style, contentRect)
            const bitmap = content.bitmap
            const text = this.contentText(content, style)
            const font = style.font || bitmaps.font5
            const foreground = this.foregroundColor(style, options)

            if (bitmap) {
                surface.drawBitmap(bitmap, contentRect.x, contentRect.y)
            }
            if (text.length > 0) {
                const textX = bitmap
                    ? contentRect.x + bitmap.width + this.contentGap(style)
                    : contentRect.x
                const textY =
                    rect.y +
                    Math.max(0, Math.idiv(rect.height - font.charHeight, 2))
                surface.drawText(text, textX, textY, {
                    color: foreground,
                    font,
                    transparent: true,
                    allowDownscale: true,
                })
            }
        }

        private contentRect(
            rect: Rect,
            content: UiButtonContent,
            style: UiButtonStyle,
            output: Rect,
        ): void {
            const font = style.font || bitmaps.font5
            const text = this.contentText(content, style)
            const textWidth = text.length > 0 ? font.charWidth * text.length : 0
            const textHeight = text.length > 0 ? font.charHeight : 0
            const bitmapWidth = content.bitmap ? content.bitmap.width : 0
            const bitmapHeight = content.bitmap ? content.bitmap.height : 0
            const gap =
                content.bitmap && text.length > 0 ? this.contentGap(style) : 0
            const width = bitmapWidth + gap + textWidth
            const height = Math.max(bitmapHeight, textHeight)
            const alignment = style.contentAlignment || "start"
            const padding = this.padding(style)
            const x =
                alignment == "center"
                    ? rect.x + Math.idiv(rect.width - width, 2)
                    : rect.x + padding
            const y = rect.y + Math.max(0, Math.idiv(rect.height - height, 2))
            output.set(x, y, width, height)
        }

        private renderFocusLabel(
            surface: DrawSurface,
            rect: Rect,
            content: UiButtonContent,
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): void {
            if (style.textPlacement != "focusLabel") return
            const text = content.text || ""
            if (text.length == 0) return
            const font = style.focusLabelFont || style.font || bitmaps.font5
            const textWidth = font.charWidth * text.length
            const textHeight = font.charHeight
            const padding =
                style.focusLabelPadding !== undefined
                    ? style.focusLabelPadding
                    : 1
            const contentRect =
                options && options.contentRect
                    ? options.contentRect
                    : this.scratch_
            if (!options || !options.contentRect)
                this.contentRect(rect, content, style, contentRect)
            const centerX =
                contentRect.width > 0
                    ? contentRect.x + Math.idiv(contentRect.width, 2)
                    : rect.x + Math.idiv(rect.width, 2)
            const contentBottom =
                contentRect.height > 0
                    ? contentRect.y + contentRect.height - 1
                    : rect.y + rect.height - 1
            const labelGap =
                style.focusLabelGap !== undefined ? style.focusLabelGap : 1
            const labelTop =
                contentBottom +
                (style.focusThickness !== undefined
                    ? style.focusThickness
                    : 0) +
                labelGap
            const bounds = options ? options.labelBounds : undefined
            const minX = bounds ? bounds.x + padding : padding
            const maxX = bounds
                ? bounds.x + bounds.width - padding - textWidth
                : rect.x + rect.width - padding - textWidth
            const minY = bounds ? bounds.y + padding : padding
            const maxY = bounds
                ? bounds.y + bounds.height - padding - textHeight
                : labelTop
            const x = Math.max(minX, Math.min(maxX, centerX - (textWidth >> 1)))
            const y = Math.max(minY, Math.min(maxY, labelTop))
            const background =
                style.focusLabelBackgroundColor !== undefined
                    ? style.focusLabelBackgroundColor
                    : 15
            const color =
                style.focusLabelColor !== undefined
                    ? style.focusLabelColor
                    : this.foregroundColor(style, options)

            this.scratch_.set(
                x - padding,
                y - padding,
                textWidth + padding * 2,
                textHeight + padding * 2,
            )
            surface.fillRect(this.scratch_, background)
            surface.drawText(text, x, y, {
                color,
                font,
            })
        }

        private styleFor(options?: UiButtonViewRenderOptions): UiButtonStyle {
            if (options && options.style) return options.style
            return this.style_
        }

        private backgroundColor(
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): number | undefined {
            const palette = options ? options.palette : undefined
            if (options) {
                if (options.disabled) {
                    if (palette && palette.disabledColor !== undefined)
                        return palette.disabledColor
                    if (style.disabledColor !== undefined)
                        return style.disabledColor
                }
                if (options.toggled) {
                    if (palette && palette.toggledColor !== undefined)
                        return palette.toggledColor
                    if (style.toggledColor !== undefined)
                        return style.toggledColor
                }
                if (options.selected) {
                    if (palette && palette.selectedColor !== undefined)
                        return palette.selectedColor
                    if (style.selectedColor !== undefined)
                        return style.selectedColor
                }
            }
            if (palette && palette.backgroundColor !== undefined)
                return palette.backgroundColor
            return style.backgroundColor
        }

        private foregroundColor(
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): number {
            const palette = options ? options.palette : undefined
            if (palette && palette.foregroundColor !== undefined)
                return palette.foregroundColor
            if (
                options &&
                options.disabled &&
                style.disabledForegroundColor !== undefined
            ) {
                return style.disabledForegroundColor
            }
            return style.foregroundColor !== undefined
                ? style.foregroundColor
                : 15
        }

        private focusColor(
            style: UiButtonStyle,
            options?: UiButtonViewRenderOptions,
        ): number {
            const palette = options ? options.palette : undefined
            if (palette && palette.focusColor !== undefined)
                return palette.focusColor
            return style.focusColor !== undefined ? style.focusColor : 15
        }

        private padding(style: UiButtonStyle): number {
            return style.padding !== undefined ? style.padding : 2
        }

        private contentGap(style: UiButtonStyle): number {
            return style.contentGap !== undefined ? style.contentGap : 3
        }

        private contentText(
            content: UiButtonContent,
            style: UiButtonStyle,
        ): string {
            if (style.textPlacement == "focusLabel") return ""
            return content.text || ""
        }
    }

    /**
     * Common button styles.
     */
    export namespace UiButtonStyles {
        /**
         * Default button style.
         */
        export const Default: UiButtonStyle = {
            backgroundColor: 0,
            foregroundColor: 15,
            disabledForegroundColor: 8,
            selectedColor: 5,
            toggledColor: 6,
            disabledColor: 1,
            frame: "none",
            contentAlignment: "start",
            focusKind: "rect",
            focusColor: 15,
        }

        /**
         * Transparent icon style with a content focus ring.
         */
        export const Transparent: UiButtonStyle = {
            frame: "none",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
            focusPadding: 0,
        }

        /**
         * Draws text as a label while the button is focused.
         */
        export const FocusLabel: UiButtonStyle = {
            textPlacement: "focusLabel",
            focusLabelBackgroundColor: 15,
            focusLabelColor: 1,
            focusLabelGap: 1,
            focusLabelPadding: 1,
        }

        /**
         * One-pixel rounded frame. Corner pixels are not drawn.
         */
        export const RoundedFrame: UiButtonStyle = {
            frame: "roundedRect",
        }

        /**
         * White button with a one-pixel rounded shadow frame.
         */
        export const LightShadowedWhite: UiButtonStyle = {
            backgroundColor: 1,
            edgeColor: 1,
            shadowColor: 11,
            frame: "roundedShadow",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
            focusPadding: 1,
        }

        /**
         * White button with a stronger shadow frame.
         */
        export const ShadowedWhite: UiButtonStyle = {
            backgroundColor: 1,
            edgeColor: 1,
            shadowColor: 12,
            frame: "roundedShadow",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
            focusPadding: 1,
        }

        /**
         * White button with a one-pixel rectangular frame.
         */
        export const FlatWhite: UiButtonStyle = {
            backgroundColor: 1,
            borderColor: 1,
            frame: "rect",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
        }

        /**
         * Purple button with a purple border.
         */
        export const BorderedPurple: UiButtonStyle = {
            backgroundColor: 11,
            borderColor: 12,
            frame: "rect",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
        }

        /**
         * White button with a red border.
         */
        export const RedBorderedWhite: UiButtonStyle = {
            backgroundColor: 1,
            borderColor: 2,
            frame: "rect",
            contentAlignment: "center",
            focusKind: "contentRing",
            focusColor: 9,
            focusThickness: 3,
        }
    }

    function copyButtonStyle(
        target: UiButtonStyle,
        source?: UiButtonStyle,
    ): void {
        if (!source) return
        if (source.backgroundColor !== undefined)
            target.backgroundColor = source.backgroundColor
        if (source.foregroundColor !== undefined)
            target.foregroundColor = source.foregroundColor
        if (source.disabledForegroundColor !== undefined)
            target.disabledForegroundColor = source.disabledForegroundColor
        if (source.selectedColor !== undefined)
            target.selectedColor = source.selectedColor
        if (source.toggledColor !== undefined)
            target.toggledColor = source.toggledColor
        if (source.disabledColor !== undefined)
            target.disabledColor = source.disabledColor
        if (source.frame !== undefined) target.frame = source.frame
        if (source.borderColor !== undefined)
            target.borderColor = source.borderColor
        if (source.edgeColor !== undefined) target.edgeColor = source.edgeColor
        if (source.shadowColor !== undefined)
            target.shadowColor = source.shadowColor
        if (source.contentAlignment !== undefined)
            target.contentAlignment = source.contentAlignment
        if (source.padding !== undefined) target.padding = source.padding
        if (source.contentGap !== undefined)
            target.contentGap = source.contentGap
        if (source.focusKind !== undefined) target.focusKind = source.focusKind
        if (source.focusColor !== undefined)
            target.focusColor = source.focusColor
        if (source.focusThickness !== undefined)
            target.focusThickness = source.focusThickness
        if (source.focusPadding !== undefined)
            target.focusPadding = source.focusPadding
        if (source.font !== undefined) target.font = source.font
        if (source.textPlacement !== undefined)
            target.textPlacement = source.textPlacement
        if (source.focusLabelBackgroundColor !== undefined)
            target.focusLabelBackgroundColor = source.focusLabelBackgroundColor
        if (source.focusLabelColor !== undefined)
            target.focusLabelColor = source.focusLabelColor
        if (source.focusLabelFont !== undefined)
            target.focusLabelFont = source.focusLabelFont
        if (source.focusLabelGap !== undefined)
            target.focusLabelGap = source.focusLabelGap
        if (source.focusLabelPadding !== undefined)
            target.focusLabelPadding = source.focusLabelPadding
    }

    function drawShadowedButtonFrame(
        surface: DrawSurface,
        rect: Rect,
        scratch: Rect,
        backgroundColor?: number,
        edgeColor?: number,
        shadowColor?: number,
    ): void {
        const background = backgroundColor !== undefined ? backgroundColor : 1
        const edge = edgeColor !== undefined ? edgeColor : 1
        const shadow = shadowColor !== undefined ? shadowColor : 11

        scratch.set(rect.x + 1, rect.y + 1, rect.width - 2, rect.height - 2)
        surface.fillRect(scratch, background)
        surface.drawLine(
            rect.x + 1,
            rect.y,
            rect.x + rect.width - 2,
            rect.y,
            edge,
        )
        surface.drawLine(
            rect.x,
            rect.y + 1,
            rect.x,
            rect.y + rect.height - 3,
            edge,
        )
        surface.drawLine(
            rect.x + rect.width - 1,
            rect.y + 1,
            rect.x + rect.width - 1,
            rect.y + rect.height - 3,
            edge,
        )
        surface.drawLine(
            rect.x + 1,
            rect.y + rect.height - 1,
            rect.x + rect.width - 2,
            rect.y + rect.height - 1,
            shadow,
        )
        surface.drawLine(
            rect.x,
            rect.y + rect.height - 2,
            rect.x,
            rect.y + rect.height - 2,
            shadow,
        )
        surface.drawLine(
            rect.x + rect.width - 1,
            rect.y + rect.height - 2,
            rect.x + rect.width - 1,
            rect.y + rect.height - 2,
            shadow,
        )
    }

    function drawButtonContentFocusRing(
        surface: DrawSurface,
        rect: Rect,
        color?: number,
        thickness?: number,
        padding?: number,
    ): void {
        const focusColor = color !== undefined ? color : 9
        const focusThickness = thickness !== undefined ? thickness : 3
        const focusPadding = padding !== undefined ? padding : 0
        const left = rect.x - focusPadding
        const top = rect.y - focusPadding
        const right = rect.x + rect.width - 1 + focusPadding
        const bottom = rect.y + rect.height - 1 + focusPadding

        for (let dist = 1; dist <= focusThickness; dist++) {
            surface.drawLine(left - dist, top, left - dist, bottom, focusColor)
            surface.drawLine(
                right + dist,
                top,
                right + dist,
                bottom,
                focusColor,
            )
            surface.drawLine(left, top - dist, right, top - dist, focusColor)
            surface.drawLine(
                left,
                bottom + dist,
                right,
                bottom + dist,
                focusColor,
            )
            if (dist > 1) {
                surface.drawLine(left - dist, top, left, top - dist, focusColor)
                surface.drawLine(
                    right + dist,
                    top,
                    right,
                    top - dist,
                    focusColor,
                )
                surface.drawLine(
                    left - dist,
                    bottom,
                    left,
                    bottom + dist,
                    focusColor,
                )
                surface.drawLine(
                    right + dist,
                    bottom,
                    right,
                    bottom + dist,
                    focusColor,
                )
            }
        }
    }
}
