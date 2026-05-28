namespace ui {
    /**
     * Handles activation of one control.
     */
    export type UiControlActivateHandler<T> = (
        value: T,
        control: UiControl<T>,
        controlId: string,
    ) => void

    /**
     * Optional width and height in pixels.
     */
    export interface UiSizeOptions {
        /**
         * Requested width in pixels.
         */
        width?: number

        /**
         * Requested height in pixels.
         */
        height?: number
    }

    /**
     * Content rendered by a control.
     */
    export interface UiControlContent {
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
     * Caller-provided control content before resolver lookup.
     */
    export interface UiControlContentOptions extends UiControlContent {
        /**
         * Resolver-backed bitmap id.
         */
        bitmapId?: string | number

        /**
         * Resolver-backed display text id.
         */
        textId?: string
    }

    /**
     * Shared fields for one rendered control.
     */
    export interface UiControlFields<
        T = string,
    > extends UiControlContentOptions {
        /**
         * Stable caller id for this control.
         */
        id: string

        /**
         * Typed value returned when this control is activated.
         */
        value?: T

        /**
         * Focus label text. Takes precedence over `focusLabelId`.
         */
        focusLabel?: string

        /**
         * Resolver-backed focus label id used when `focusLabel` is omitted.
         */
        focusLabelId?: string

        /**
         * When true, missing resolver-backed bitmaps are not drawn.
         */
        omitMissingBitmap?: boolean

        /**
         * Whether this visible control can receive focus. Omitted values are
         * treated as `true`.
         */
        focusable?: boolean

        /**
         * Optional control style used when rendering.
         */
        style?: UiButtonStyle

        /**
         * Whether this control participates in layout, rendering, focus, and hit
         * testing. Omitted values are treated as `true`.
         */
        visible?: boolean

        /**
         * Optional callback invoked when this control is activated.
         */
        onActivate?: UiControlActivateHandler<T>
    }

    /**
     * Caller-owned control record consumed by action, modal, and toggle views.
     */
    export interface UiControl<T> extends UiControlFields<T> {
        /**
         * Typed value returned when this control is activated.
         */
        value: T
    }

    /**
     * Shared options for controls that render caller-owned control records.
     */
    export interface UiControlCollectionOptions<T = string> {
        /**
         * Caller-owned control records in render order.
         */
        controls: UiControl<T>[]

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Size assigned to each control.
         */
        controlSize?: UiSizeOptions

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Called when an enabled control is activated.
         */
        onActivate?: UiControlActivateHandler<T>
    }

    /**
     * Shared layout options for rectangular control grids.
     */
    export interface UiControlGridLayoutOptions {
        /**
         * Number of columns for rectangular grids.
         */
        columnCount?: number

        /**
         * Space between adjacent rows.
         */
        rowGap?: number

        /**
         * Space between adjacent columns.
         */
        columnGap?: number
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
        if (targetId === undefined) return undefined
        const prefix = scopeId + "/"
        if (targetId.substr(0, prefix.length) != prefix) return undefined
        return targetId.substr(prefix.length)
    }

    export function isVisible<T>(control: ui.UiControl<T>): boolean {
        return control.visible !== false
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

    export function sizeWidth(
        size: ui.UiSizeOptions | undefined,
        defaultValue: number,
    ): number {
        return sanitizeDimension(size ? size.width : undefined, defaultValue)
    }

    export function sizeHeight(
        size: ui.UiSizeOptions | undefined,
        defaultValue: number,
    ): number {
        return sanitizeDimension(size ? size.height : undefined, defaultValue)
    }

    export function controlWidth(size: ui.UiSizeOptions | undefined): number {
        return sizeWidth(size, 24)
    }

    export function controlHeight(size: ui.UiSizeOptions | undefined): number {
        return sizeHeight(size, 20)
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

    export function findControlById<T>(
        controls: ui.UiControl<T>[],
        controlId: string | undefined,
    ): ui.UiControl<T> {
        if (!controls || controlId === undefined) return undefined
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
        if (!controls) return undefined

        const explicit = findControlById(controls, defaultControlId)
        if (explicit && isVisible(explicit) && isFocusable(explicit))
            return targetId(scopeId, explicit.id)

        for (let i = 0; i < controls.length; i++) {
            const control = controls[i]
            if (isVisible(control) && isFocusable(control))
                return targetId(scopeId, control.id)
        }

        return undefined
    }

    export function renderControl<T>(
        surface: ui.DrawSurface,
        control: ui.UiControl<T>,
        rect: ui.Rect,
        buttonView: ui.UiButtonView,
        controlStyle?: ui.UiButtonStyle,
        labelBounds?: ui.Rect,
        focused?: boolean,
        assets?: ui.UiAssetResolver,
    ): void {
        const content = controlContentScratch
        resolveContent(control, assets, content, control.omitMissingBitmap)
        const style = control.style || controlStyle
        if (focused) {
            const focusLabel =
                control.focusLabel !== undefined
                    ? control.focusLabel
                    : control.focusLabelId !== undefined && assets
                      ? assets.getText(control.focusLabelId)
                      : undefined
            buttonView.renderFocus(
                surface,
                rect,
                content,
                style,
                labelBounds,
                focusLabel,
            )
        } else {
            buttonView.render(surface, rect, content, style)
        }
    }

    const controlContentScratch: ui.UiControlContent = {}
    const labelBoundsScratch = new ui.Rect()

    export function resolveLabelBounds(
        surface: ui.DrawSurface,
        explicitBounds: ui.Rect | undefined,
    ): ui.Rect | undefined {
        if (explicitBounds) return explicitBounds
        labelBoundsScratch.set(
            0,
            0,
            ui.STANDARD_DISPLAY_WIDTH,
            ui.STANDARD_DISPLAY_HEIGHT,
        )
        return labelBoundsScratch
    }

    export function resolveContent(
        source: ui.UiControlContentOptions | string | undefined,
        assets: ui.UiAssetResolver | undefined,
        output: ui.UiControlContent,
        omitMissingBitmap?: boolean,
    ): void {
        const text =
            typeof source == "string"
                ? source
                : source && source.text !== undefined
                  ? source.text
                  : source && assets && source.textId !== undefined
                    ? assets.getText(source.textId)
                    : ""
        const bitmap =
            source && typeof source != "string" && source.bitmap
                ? source.bitmap
                : source &&
                    typeof source != "string" &&
                    assets &&
                    source.bitmapId !== undefined
                  ? assets.getBitmap(
                        source.bitmapId,
                        omitMissingBitmap || false,
                    )
                  : undefined
        output.text = text
        output.bitmap = bitmap
    }

    export function resolveControlContent<T>(
        control: ui.UiControl<T>,
        assets: ui.UiAssetResolver,
    ): void {
        resolveContentOptions(control, assets, control.omitMissingBitmap)
        if (
            control.focusLabel === undefined &&
            control.focusLabelId !== undefined
        )
            control.focusLabel = assets.getText(control.focusLabelId)
        control.focusLabelId = undefined
    }

    export function resolveContentOptions(
        content: ui.UiControlContentOptions,
        assets: ui.UiAssetResolver,
        omitMissingBitmap?: boolean,
    ): void {
        resolveContent(content, assets, content, omitMissingBitmap)
        content.textId = undefined
        content.bitmapId = undefined
    }

    export function resolveControlCollectionContent<T>(
        controls: ui.UiControl<T>[],
        assets: ui.UiAssetResolver,
    ): void {
        if (!controls) return
        for (let i = 0; i < controls.length; i++)
            resolveControlContent(controls[i], assets)
    }

    export function activeTargetIdForScope(
        focus: ui.UiFocusState,
        scopeId: ui.UiFocusScopeId,
    ): ui.UiFocusId {
        if (!focus || focus.getActiveScopeId() != scopeId) return undefined
        return focus.getActiveTargetId(scopeId)
    }

    export function focusedControlOverlayIndex<T>(
        scopeId: ui.UiFocusScopeId,
        controls: ui.UiControl<T>[],
        activeTargetId: ui.UiFocusId,
    ): number {
        const controlId = controlIdFromTargetId(scopeId, activeTargetId)
        if (controlId === undefined) return -1
        for (let i = 0; i < controls.length; i++) {
            const control = controls[i]
            if (
                isVisible(control) &&
                isFocusable(control) &&
                control.id == controlId
            )
                return i
        }
        return -1
    }

    export function copyRect(target: ui.Rect, source: ui.Rect): void {
        ui.copyArrangedLayoutRect(target, source)
    }
}

namespace _uiCore {
    resolveContentAssets = function (
        view: ui.UiView<any>,
        assets: ui.UiAssetResolver,
    ): void {
        const resolvedView = <any>view
        if (resolvedView._resolveContentAssets)
            resolvedView._resolveContentAssets(assets)
    }
}
