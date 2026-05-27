namespace ui {
    const BUTTON_FOCUS_COLOR = 9
    const BUTTON_FOCUS_THICKNESS = 3
    const BUTTON_FOCUS_LABEL_OFFSET = 1
    const BUTTON_FOCUS_LABEL_PADDING = 1
    const BUTTON_CONTENT_GAP = 3
    const BUTTON_DEFAULT_FONT = bitmaps.font8
    const BUTTON_CONTROL_HORIZONTAL_PADDING = 16
    const BUTTON_CONTROL_VERTICAL_PADDING = 8
    const BUTTON_CONTROL_MIN_WIDTH = 24
    const BUTTON_CONTROL_MIN_HEIGHT = 20

    /**
     * Border or frame treatment drawn behind button content.
     */
    export type UiButtonFrame =
        | "none"
        | "rect"
        | "roundedRect"
        | "roundedShadow"

    /**
     * Placement for button text.
     */
    export type UiButtonTextPlacement = "content"

    /**
     * Visual style used by `UiButtonView`.
     */
    export interface UiButtonStyle {
        /**
         * Fill color for the button background.
         */
        backgroundColor?: number

        /**
         * Text color used for button content.
         */
        color?: number

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
         * Font used for text content.
         */
        font?: TextFont

        /**
         * When set to `"content"`, text is rendered inside the button even when
         * the style also has focus-label settings.
         */
        textPlacement?: UiButtonTextPlacement

        /**
         * Extra distance between the focus ring and focus label. Defined values
         * render text as a focus label.
         */
        focusLabelGap?: number
    }

    /**
     * Creates a button control whose value is its id.
     */
    export function button<T extends string>(
        id: T,
        content?: UiControlContentOptions | string,
        onActivate?: () => void,
    ): UiControl<T> {
        const control: UiControl<T> = {
            id,
            value: id,
        }
        if (onActivate)
            control.onActivate = () => {
                onActivate()
            }
        if (typeof content == "object") {
            control.text = content.text
            control.textId = content.textId
            control.bitmap = content.bitmap
            control.bitmapId = content.bitmapId
        } else {
            control.text = content
        }
        return control
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
     * Reusable button view that measures and renders button content and state.
     */
    export class UiButtonView {
        private style_: UiButtonStyle
        private scratch_: Rect

        constructor(style?: UiButtonStyle) {
            this.style_ = style || UiButtonStyles.Default
            this.scratch_ = new Rect()
        }

        /**
         * Renders the button frame, content, and optional focus state.
         */
        public render(
            surface: DrawSurface,
            rect: Rect,
            content: UiControlContent,
            style?: UiButtonStyle,
        ): void {
            style = style || this.style_
            this.renderFrame(surface, rect, style)
            this.renderContent(surface, rect, content, style)
        }

        /**
         * Renders only the focus treatment for a button.
         */
        public renderFocus(
            surface: DrawSurface,
            rect: Rect,
            content: UiControlContent,
            style?: UiButtonStyle,
            labelBounds?: Rect,
            focusLabelText?: string,
        ): void {
            style = style || this.style_
            drawButtonFocusRing(surface, rect)
            this.renderFocusLabel(
                surface,
                rect,
                content,
                style,
                labelBounds,
                focusLabelText,
            )
        }

        private renderFrame(
            surface: DrawSurface,
            rect: Rect,
            style: UiButtonStyle,
        ): void {
            const background = style.backgroundColor
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
            content: UiControlContent,
            style: UiButtonStyle,
        ): void {
            const contentRect = this.scratch_
            this.contentRect(rect, content, style, contentRect)
            const bitmap = content.bitmap
            const text = this.contentText(content, style)
            const font = style.font || BUTTON_DEFAULT_FONT
            const color = style.color !== undefined ? style.color : 15
            const graphicWidth = this.contentWidth(content)

            if (bitmap) {
                surface.drawBitmap(bitmap, contentRect.x, contentRect.y)
            }
            if (text.length > 0) {
                const textX =
                    graphicWidth > 0
                        ? contentRect.x + graphicWidth + BUTTON_CONTENT_GAP
                        : contentRect.x
                const textY =
                    rect.y +
                    Math.max(0, Math.idiv(rect.height - font.charHeight, 2))
                surface.drawText(text, textX, textY, {
                    color,
                    font,
                })
            }
        }

        private contentRect(
            rect: Rect,
            content: UiControlContent,
            style: UiButtonStyle,
            output: Rect,
        ): void {
            const font = style.font || BUTTON_DEFAULT_FONT
            const text = this.contentText(content, style)
            const textWidth = text.length > 0 ? font.charWidth * text.length : 0
            const textHeight = text.length > 0 ? font.charHeight : 0
            const contentWidth = this.contentWidth(content)
            const contentHeight = this.contentHeight(content)
            const gap =
                contentWidth > 0 && text.length > 0 ? BUTTON_CONTENT_GAP : 0
            const width = contentWidth + gap + textWidth
            const height = Math.max(contentHeight, textHeight)
            const x = rect.x + Math.idiv(rect.width - width, 2)
            const y = rect.y + Math.max(0, Math.idiv(rect.height - height, 2))
            output.set(x, y, width, height)
        }

        private renderFocusLabel(
            surface: DrawSurface,
            rect: Rect,
            content: UiControlContent,
            style: UiButtonStyle,
            bounds?: Rect,
            focusLabelText?: string,
        ): void {
            const text = this.focusLabelText(content, style, focusLabelText)
            if (text.length == 0) return
            const font = style.font || BUTTON_DEFAULT_FONT
            const textWidth = font.charWidth * text.length
            const textHeight = font.charHeight
            const padding = BUTTON_FOCUS_LABEL_PADDING
            const centerX = _uiLayout.rectCenterX(rect)
            const labelGap =
                style.focusLabelGap !== undefined ? style.focusLabelGap : 0
            const labelTop =
                rect.y +
                rect.height +
                BUTTON_FOCUS_THICKNESS +
                BUTTON_FOCUS_LABEL_OFFSET +
                labelGap
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
            const background = 15
            const color = 1

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

        private contentText(
            content: UiControlContent,
            style: UiButtonStyle,
        ): string {
            if (
                style.focusLabelGap !== undefined &&
                style.textPlacement != "content"
            )
                return ""
            return content.text || ""
        }

        private focusLabelText(
            content: UiControlContent,
            style: UiButtonStyle,
            focusLabelText?: string,
        ): string {
            if (focusLabelText !== undefined) return focusLabelText
            if (
                style.focusLabelGap !== undefined &&
                style.textPlacement != "content"
            )
                return content.text || ""
            return ""
        }

        private contentWidth(content: UiControlContent): number {
            return content.bitmap ? content.bitmap.width : 0
        }

        private contentHeight(content: UiControlContent): number {
            return content.bitmap ? content.bitmap.height : 0
        }
    }

    /**
     * Options for one screen-managed button control. Inherited `value` defaults
     * to the button id when omitted.
     */
    export interface UiButtonOptions<T = string> extends UiControlFields<T> {
        /**
         * Requested size for this button.
         */
        size?: UiSizeOptions

        /**
         * Scroll owner used when this button is arranged in scroll content.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Bounds used to keep the focus label visible. Omitted values use the
         * active display surface's pixel bounds when available.
         */
        labelBounds?: Rect
    }

    /**
     * Result emitted by a single button control.
     */
    export type UiButtonResult<T = string> =
        | {
              kind: "activated"
              controlId: string
              value: T
              control: UiControl<T>
          }
        | {
              kind: "exited"
              direction: UiFocusDirection
              scopeId: UiFocusScopeId
              controlId?: string
          }

    /**
     * Screen-managed button with retained layout, focus, rendering, and activation.
     */
    export class UiButton<T = string>
        implements UiFocusableView<UiButtonResult<T>>, UiFocusNavigationProvider
    {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private scopeId_: UiFocusScopeId
        private control_: UiControl<T>
        private scrollOwnerId_: UiFocusScrollOwnerId
        private labelBounds_: Rect
        private controlView_: UiButtonView

        /**
         * Creates a button from full options or from `id`, `text`, and callback.
         */
        constructor(
            options: UiButtonOptions<T> | string,
            text?: string,
            onActivate?: () => void,
        ) {
            if (typeof options == "string") {
                const id = options
                options = <UiButtonOptions<T>>{
                    id,
                    text,
                    onActivate: <any>onActivate,
                }
            }
            this.scopeId_ = options.id
            this.control_ = <UiControl<T>>options
            if (this.control_.value === undefined)
                this.control_.value = <any>options.id
            if (!this.control_.style)
                this.control_.style = UiButtonStyles.LightShadowedWhite
            this.scrollOwnerId_ = options.scrollOwnerId
            this.labelBounds_ = options.labelBounds
            this.layoutSpec = _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.controlView_ = new UiButtonView(options.style)
        }

        /**
         * Focus scope id used by this button.
         */
        public get scopeId(): UiFocusScopeId {
            return this.scopeId_
        }

        /**
         * Caller-owned control record rendered by this button.
         */
        public get control(): UiControl<T> {
            return this.control_
        }

        /**
         * Updates the visible button text and returns this button.
         */
        public setText(text: string): UiButton<T> {
            this.control_.text = text
            this.control_.textId = undefined
            return this
        }

        /**
         * Resolves resolver-backed content ids into retained button content.
         */
        public _resolveContentAssets(assets: UiAssetResolver): void {
            _uiControls.resolveControlContent(this.control_, assets)
        }

        /**
         * Measures this button under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const size = (<UiButtonOptions<T>>this.control_).size
            const width = _uiControls.sizeWidth(
                size,
                this.preferredWidth(),
            )
            const height = _uiControls.sizeHeight(
                size,
                this.preferredHeight(),
            )
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                width,
                height,
                width,
                height,
                output,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Assigns the button rectangle for rendering and focus.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the button as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        /**
         * Clears this button's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Registers this button's focus scope and target.
         */
        public registerFocusTargets(focus: UiFocusState): void {
            const targetId = this.targetId()
            const focusable = this.isNavigationControl()
            focus.setScope({
                id: this.scopeId_,
                preferredTargetId: focusable ? targetId : undefined,
            })
            if (!focusable) return
            focus.setTarget({
                id: targetId,
                scopeId: this.scopeId_,
                rect: this.finalRect,
                scrollOwnerId: this.scrollOwnerId_,
                scrollRect: this.scrollOwnerId_ ? this.finalRect : undefined,
                activatable: true,
            })
        }

        /**
         * Registers button navigation with a focus input controller.
         */
        public registerNavigation(controller: UiFocusInputController): void {
            controller.setNavigation(this.scopeId_, this)
        }

        /**
         * Focuses this button when it is available.
         */
        public focusDefault(focus: UiFocusState): UiFocusSetResult {
            return focus.setActiveScope(this.scopeId_)
        }

        /**
         * Returns this button's boundary result for directional focus movement.
         */
        public move(request: UiFocusNavigationRequest): UiFocusMoveResult {
            if (
                request.scopeId != this.scopeId_ ||
                request.currentTargetId != this.targetId() ||
                !this.isNavigationControl()
            )
                return {
                    kind: "stayed",
                    scopeId: request.scopeId,
                    targetId: request.currentTargetId,
                    reason: "missingActive",
                }
            return {
                kind: "exited",
                scopeId: this.scopeId_,
                targetId: request.currentTargetId,
                direction: request.direction,
            }
        }

        /**
         * Converts a focus input result into a button result when one occurred.
         */
        public handleFocusInput(result: UiFocusInputResult): UiButtonResult<T> {
            if (result.kind == "activated") {
                const activation = this.createResultForActivation(
                    result.scopeId,
                    result.targetId,
                )
                this.emitActivate(activation)
                return activation
            }
            if (result.kind == "exited") {
                return this.createResultForMove(
                    result.scopeId,
                    result.targetId,
                    result.direction,
                )
            }
            return undefined
        }

        /**
         * Converts a focus activation result into a typed button activation.
         */
        public createResultForActivation(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiButtonResult<T> {
            if (scopeId != this.scopeId_ || targetId != this.targetId())
                return undefined
            return {
                kind: "activated",
                controlId: this.control_.id,
                value: this.control_.value,
                control: this.control_,
            }
        }

        /**
         * Converts a focus movement result into a button boundary exit.
         */
        public createResultForMove(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
            direction: UiFocusDirection,
        ): UiButtonResult<T> {
            if (scopeId != this.scopeId_ || targetId != this.targetId())
                return undefined
            return {
                kind: "exited",
                direction,
                scopeId,
                controlId: this.control_.id,
            }
        }

        /**
         * Renders the button and its focused overlay.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            if (!_uiControls.isVisible(this.control_)) return
            const labelBounds = _uiControls.resolveLabelBounds(
                surface,
                this.labelBounds_,
            )
            _uiControls.renderControl(
                surface,
                this.control_,
                this.finalRect,
                this.controlView_,
                undefined,
                labelBounds,
                undefined,
                assets,
            )
            if (this.isFocused(focus)) {
                _uiControls.renderControl(
                    surface,
                    this.control_,
                    this.finalRect,
                    this.controlView_,
                    undefined,
                    labelBounds,
                    true,
                    assets,
                )
            }
        }

        private targetId(): UiFocusId {
            return _uiControls.targetId(this.scopeId_, this.control_.id)
        }

        private isNavigationControl(): boolean {
            return (
                _uiControls.isVisible(this.control_) &&
                _uiControls.isFocusable(this.control_)
            )
        }

        private isFocused(focus?: UiFocusState): boolean {
            return (
                _uiControls.activeTargetIdForScope(focus, this.scopeId_) ==
                this.targetId()
            )
        }

        private emitActivate(result: UiButtonResult<T>): void {
            if (!result || result.kind != "activated") return
            _uiControls.emitControlActivate(
                result.value,
                result.control,
                result.controlId,
            )
        }

        private preferredWidth(): number {
            const style =
                this.control_.style || UiButtonStyles.LightShadowedWhite
            const font = style.font || BUTTON_DEFAULT_FONT
            const text = this.control_.text || ""
            const textWidth = text.length ? font.charWidth * text.length : 0
            const bitmapWidth = this.control_.bitmap
                ? this.control_.bitmap.width
                : 0
            const gap = textWidth && bitmapWidth ? BUTTON_CONTENT_GAP : 0
            return Math.max(
                BUTTON_CONTROL_MIN_WIDTH,
                bitmapWidth +
                    gap +
                    textWidth +
                    BUTTON_CONTROL_HORIZONTAL_PADDING,
            )
        }

        private preferredHeight(): number {
            const style =
                this.control_.style || UiButtonStyles.LightShadowedWhite
            const font = style.font || BUTTON_DEFAULT_FONT
            const textHeight = this.control_.text ? font.charHeight : 0
            const bitmapHeight = this.control_.bitmap
                ? this.control_.bitmap.height
                : 0
            return Math.max(
                BUTTON_CONTROL_MIN_HEIGHT,
                Math.max(textHeight, bitmapHeight) +
                    BUTTON_CONTROL_VERTICAL_PADDING,
            )
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
            color: 15,
            frame: "none",
        }

        /**
         * Transparent icon style.
         */
        export const Transparent: UiButtonStyle = {
            frame: "none",
        }

        /**
         * Draws text as a label while the button is focused.
         */
        export const FocusLabel: UiButtonStyle = {
            focusLabelGap: 0,
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
        }

        /**
         * White button with a stronger shadow frame.
         */
        export const ShadowedWhite: UiButtonStyle = {
            backgroundColor: 1,
            edgeColor: 1,
            shadowColor: 12,
            frame: "roundedShadow",
        }

        /**
         * Purple button with a purple border.
         */
        export const BorderedPurple: UiButtonStyle = {
            backgroundColor: 11,
            borderColor: 12,
            frame: "rect",
        }

        /**
         * White button with a red border.
         */
        export const RedBorderedWhite: UiButtonStyle = {
            backgroundColor: 1,
            borderColor: 2,
            frame: "rect",
        }

        /**
         * White button with a green border.
         */
        export const GreenBorderedWhite: UiButtonStyle = {
            backgroundColor: 1,
            borderColor: 7,
            frame: "rect",
        }
    }

    function copyButtonStyle(
        target: UiButtonStyle,
        source?: UiButtonStyle,
    ): void {
        if (!source) return
        if (source.backgroundColor !== undefined)
            target.backgroundColor = source.backgroundColor
        if (source.color !== undefined) target.color = source.color
        if (source.frame !== undefined) target.frame = source.frame
        if (source.borderColor !== undefined)
            target.borderColor = source.borderColor
        if (source.edgeColor !== undefined) target.edgeColor = source.edgeColor
        if (source.shadowColor !== undefined)
            target.shadowColor = source.shadowColor
        if (source.font !== undefined) target.font = source.font
        if (source.textPlacement !== undefined)
            target.textPlacement = source.textPlacement
        if (source.focusLabelGap !== undefined)
            target.focusLabelGap = source.focusLabelGap
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

    function drawButtonFocusRing(surface: DrawSurface, rect: Rect): void {
        const focusColor = BUTTON_FOCUS_COLOR
        const left = rect.x
        const top = rect.y
        const right = rect.x + rect.width - 1
        const bottom = rect.y + rect.height - 1

        for (let dist = 1; dist <= BUTTON_FOCUS_THICKNESS; dist++) {
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
