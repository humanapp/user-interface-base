namespace ui {
    /**
     * Palette colors used by the default control renderer.
     */
    export interface UiControlPalette {
        /**
         * Fill color for an ordinary control background.
         */
        backgroundColor?: number

        /**
         * Text and bitmap color used by callers that draw monochrome assets.
         */
        foregroundColor?: number

    }

    /**
     * Handles activation of one control.
     */
    export interface UiControlActivateHandler<T> {
        /**
         * Receives the typed control value, source control, and control id.
         */
        (value: T, control: UiControl<T>, controlId: string): void
    }

    /**
     * Caller-owned control record consumed by action, modal, and toggle views.
     */
    export interface UiControl<T> {
        /**
         * Stable caller id for this control.
         */
        id: string

        /**
         * Typed value returned when this control is activated.
         */
        value: T

        /**
         * Visible label text. Takes precedence over `textId`.
         */
        text?: string

        /**
         * Resolver-backed label id used when `text` is omitted.
         */
        textId?: string

        /**
         * Focus label text. Takes precedence over `focusLabelId`.
         */
        focusLabel?: string

        /**
         * Resolver-backed focus label id used when `focusLabel` is omitted.
         */
        focusLabelId?: string

        /**
         * Caller-owned content drawn by the built-in button view. Takes precedence
         * over `bitmap` and `bitmapId`.
         */
        customContent?: UiButtonCustomContent

        /**
         * Bitmap drawn for this control. Takes precedence over `bitmapId`.
         */
        bitmap?: Bitmap

        /**
         * Resolver-backed bitmap id used when `bitmap` is omitted.
         */
        bitmapId?: string | number

        /**
         * When true, missing resolver-backed bitmaps are not drawn.
         */
        omitMissingBitmap?: boolean

        /**
         * Optional colors used by the default renderer.
         */
        palette?: UiControlPalette

        /**
         * Width requested by variable-size control collections.
         */
        width?: number

        /**
         * Height requested by variable-size control collections.
         */
        height?: number

        /**
         * Extra space before this control in variable-size control collections.
         */
        gapBefore?: number

        /**
         * Extra space after this control in variable-size control collections.
         */
        gapAfter?: number

        /**
         * Whether this visible control can receive focus. Omitted values are
         * treated as `true`.
         */
        focusable?: boolean

        /**
         * Optional control style used when `draw` is omitted.
         */
        style?: UiButtonStyle

        /**
         * Whether this control participates in layout, rendering, focus, and hit
         * testing. Omitted values are treated as `true`.
         */
        visible?: boolean

        /**
         * Whether default focus selection should prefer this control.
         */
        selected?: boolean

        /**
         * Whether built-in control drawing should show toggled state.
         */
        toggled?: boolean

        /**
         * Optional callback invoked when this control is activated.
         */
        onActivate?: UiControlActivateHandler<T>
    }

    /**
     * Creates a bitmap-backed button control whose value is its id.
     *
     * Use this for simple action controls where focus, layout, and rendering are
     * owned by a row, grid, picker, or toggle collection.
     */
    export function button<T extends string>(
        id: T,
        bitmapId: string | number,
        textId?: string,
        onActivate?: () => void,
    ): UiControl<T> {
        return {
            id,
            value: id,
            bitmapId,
            textId,
            onActivate: onActivate
                ? () => {
                      onActivate()
                  }
                : undefined,
        }
    }

    /**
     * Creates a bitmap-only button control whose value is its id.
     */
    export function iconButton<T extends string>(
        id: T,
        bitmapId: string | number,
        onActivate?: () => void,
    ): UiControl<T> {
        return button(id, bitmapId, undefined, onActivate)
    }
}

namespace _uiControls {
    export function targetId(scopeId: string, controlId: string): string {
        return scopeId + "/" + controlId
    }

    export function controlIdFromTargetId(
        scopeId: string,
        targetId: string,
    ): string | undefined {
        const prefix = scopeId + "/"
        if (targetId.substr(0, prefix.length) != prefix) return undefined
        return targetId.substr(prefix.length)
    }

    export function isVisible<T>(control: ui.UiControl<T>): boolean {
        return control.visible !== false
    }

    export function isSelected<T>(control: ui.UiControl<T>): boolean {
        return control.selected || false
    }

    export function isToggled<T>(control: ui.UiControl<T>): boolean {
        return control.toggled || false
    }

    export function isFocusable<T>(control: ui.UiControl<T>): boolean {
        return control.focusable !== false
    }

    export function emitControlActivate<T>(
        value: T,
        control: ui.UiControl<T>,
        controlId: string,
        onActivate?: ui.UiControlActivateHandler<T>,
    ): void {
        if (control.onActivate) control.onActivate(value, control, controlId)
        if (onActivate) onActivate(value, control, controlId)
    }

    export function containsString(values: string[], value: string): boolean {
        for (let i = 0; i < values.length; i++) {
            if (values[i] == value) return true
        }
        return false
    }

    export function defaultLayoutSpec(): ui.UiLayoutSpec {
        return {
            width: { mode: "content" },
            height: { mode: "content" },
        }
    }

    export function fixedLayoutSpec(
        width: number,
        height: number,
    ): ui.UiLayoutSpec {
        return {
            width: { mode: "fixed", value: width },
            height: { mode: "fixed", value: height },
        }
    }

    export function controlWidth(value: number | undefined): number {
        return sanitizeDimension(value, 24)
    }

    export function controlHeight(value: number | undefined): number {
        return sanitizeDimension(value, 20)
    }

    export function gap(value: number | undefined): number {
        return sanitizeDimension(value, 2)
    }

    export function sanitizeDimension(
        value: number | undefined,
        defaultValue: number,
    ): number {
        if (value === undefined || value != value) return defaultValue
        value = Math.round(value)
        return value < 0 ? 0 : value
    }

    export function controlText<T>(
        control: ui.UiControl<T>,
        assets: ui.UiAssetResolver,
    ): string {
        if (control.text !== undefined) return control.text
        if (control.textId !== undefined) return assets.getText(control.textId)
        return ""
    }

    export function controlFocusLabelText<T>(
        control: ui.UiControl<T>,
        assets: ui.UiAssetResolver,
    ): string | undefined {
        if (control.focusLabel !== undefined) return control.focusLabel
        if (control.focusLabelId !== undefined)
            return assets.getText(control.focusLabelId)
        return undefined
    }

    export function controlBitmap<T>(
        control: ui.UiControl<T>,
        assets: ui.UiAssetResolver,
    ): Bitmap | undefined {
        if (control.customContent) return undefined
        if (control.bitmap) return control.bitmap
        if (control.bitmapId !== undefined)
            return assets.getBitmap(
                control.bitmapId,
                control.omitMissingBitmap || false,
            )
        return undefined
    }

    export function findControlById<T>(
        controls: ui.UiControl<T>[],
        controlId: string | undefined,
    ): ui.UiControl<T> {
        if (controlId === undefined) return undefined
        for (let i = 0; i < controls.length; i++) {
            if (controls[i].id == controlId) return controls[i]
        }
        return undefined
    }

    export function findControlByTargetId<T>(
        scopeId: string,
        controls: ui.UiControl<T>[],
        targetId: string | undefined,
    ): ui.UiControl<T> {
        return findControlById(
            controls,
            controlIdFromTargetId(scopeId, targetId),
        )
    }

    export function preferredControlId<T>(
        scopeId: string,
        controls: ui.UiControl<T>[],
        defaultControlId: string | undefined,
    ): string | undefined {
        const explicit = findControlById(controls, defaultControlId)
        if (
            explicit &&
            isVisible(explicit) &&
            isFocusable(explicit)
        )
            return targetId(scopeId, explicit.id)

        for (let i = 0; i < controls.length; i++) {
            const control = controls[i]
            if (
                isVisible(control) &&
                isFocusable(control) &&
                isSelected(control)
            )
                return targetId(scopeId, control.id)
        }

        for (let i = 0; i < controls.length; i++) {
            const control = controls[i]
            if (isVisible(control) && isFocusable(control))
                return targetId(scopeId, control.id)
        }

        return undefined
    }

    export function renderControl<T>(
        surface: ui.DrawSurface,
        assets: ui.UiAssetResolver,
        control: ui.UiControl<T>,
        rect: ui.Rect,
        buttonView: ui.UiButtonView,
        controlStyle?: ui.UiButtonStyle,
        labelBounds?: ui.Rect,
    ): void {
        const toggled = isToggled(control)

        buttonView.render(
            surface,
            rect,
            {
                customContent: control.customContent,
                bitmap: controlBitmap(control, assets),
                text: controlText(control, assets),
            },
            {
                toggled,
                style: control.style || controlStyle,
                palette: control.palette,
                labelBounds,
                focusLabelText: controlFocusLabelText(control, assets),
            },
        )
    }

    export function renderControlFocus<T>(
        surface: ui.DrawSurface,
        assets: ui.UiAssetResolver,
        control: ui.UiControl<T>,
        rect: ui.Rect,
        buttonView: ui.UiButtonView,
        controlStyle?: ui.UiButtonStyle,
        labelBounds?: ui.Rect,
    ): void {
        buttonView.renderFocus(
            surface,
            rect,
            {
                customContent: control.customContent,
                bitmap: controlBitmap(control, assets),
                text: controlText(control, assets),
            },
            {
                focused: true,
                toggled: isToggled(control),
                style: control.style || controlStyle,
                palette: control.palette,
                labelBounds,
                focusLabelText: controlFocusLabelText(control, assets),
            },
        )
    }

    const labelBoundsScratch = new ui.Rect()

    export function resolveLabelBounds(
        surface: ui.DrawSurface,
        explicitBounds: ui.Rect | undefined,
    ): ui.Rect | undefined {
        if (explicitBounds) return explicitBounds
        const profile = surface.displayProfile
        if (!profile) return undefined
        labelBoundsScratch.set(
            0,
            0,
            Math.round(profile.logicalWidth / profile.designToLogicalScaleX),
            Math.round(profile.logicalHeight / profile.designToLogicalScaleY),
        )
        return labelBoundsScratch
    }

    export function copyRect(target: ui.Rect, source: ui.Rect): void {
        ui.copyArrangedLayoutRect(target, source)
    }
}
