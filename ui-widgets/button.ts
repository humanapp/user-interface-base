namespace ui {
    /**
     * Border or frame treatment drawn behind button content.
     */
    export type UiButtonFrame = "none" | "rect" | "roundedShadow"

    /**
     * Horizontal content placement inside a button rectangle.
     */
    export type UiButtonContentAlignment = "start" | "center"

    /**
     * Focus treatment drawn for a focused button.
     */
    export type UiButtonFocusKind = "none" | "rect" | "contentRing"

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
         * Color used for rectangular frames.
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
         * Palette override for action-item compatibility.
         */
        palette?: UiButtonStyle

        /**
         * Receives the content rectangle used for content focus rings.
         */
        contentRect?: Rect
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
                    : UiButtonStyles.ActionItem
            this.scratch_ = new Rect()
        }

        /**
         * Replaces the default style used by later render calls.
         */
        public setStyle(style: UiButtonStyle): void {
            this.style_ = style || UiButtonStyles.ActionItem
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
            const text = content.text || ""
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
            const text = content.text || ""
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
            const text = content.text || ""
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
    }

    /**
     * Common button styles.
     */
    export namespace UiButtonStyles {
        /**
         * Default action-item style.
         */
        export const ActionItem: UiButtonStyle = {
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
