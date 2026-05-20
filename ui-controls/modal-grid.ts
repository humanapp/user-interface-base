namespace ui {
    /**
     * Border treatment drawn around modal panels.
     */
    export type UiModalFrame = "rect" | "roundedRect"

    /**
     * Visual style and spacing used by modal panels.
     */
    export interface UiModalStyle {
        /**
         * Fill color for the modal panel.
         */
        panelColor?: number

        /**
         * Outline color for the modal panel.
         */
        outlineColor?: number

        /**
         * Panel frame shape.
         */
        frame?: UiModalFrame

        /**
         * Text color for the modal title.
         */
        titleColor?: number

        /**
         * Font used for the modal title.
         */
        titleFont?: TextFont

        /**
         * Inset between the modal outline and modal content.
         */
        contentMargin?: number

        /**
         * Extra vertical space between the title band and modal content.
         */
        titleGap?: number

        /**
         * Whether an empty modal reserves title-band space.
         */
        showTitleBar?: boolean
    }

    /**
     * Creates a modal style by copying defined fields from each style in order.
     */
    export function modalStyle(
        style0?: UiModalStyle,
        style1?: UiModalStyle,
        style2?: UiModalStyle,
        style3?: UiModalStyle,
        style4?: UiModalStyle,
    ): UiModalStyle {
        const result: UiModalStyle = {}
        copyModalStyle(result, style0)
        copyModalStyle(result, style1)
        copyModalStyle(result, style2)
        copyModalStyle(result, style3)
        copyModalStyle(result, style4)
        return result
    }

    export namespace UiModalStyles {
        /**
         * Default rounded modal panel style.
         */
        export const Default: UiModalStyle = {
            panelColor: 1,
            outlineColor: 15,
            frame: "roundedRect",
            titleColor: 15,
            contentMargin: 4,
            titleGap: 0,
            showTitleBar: true,
        }

        /**
         * Omits title-band space when no title is present.
         */
        export const Titleless: UiModalStyle = {
            showTitleBar: false,
        }
    }

    /**
     * Options for a modal picker or control grid.
     */
    export interface UiPickerOptions<T> {
        /**
         * Parent focus scope restored after the modal closes. Defaults to the
         * active scope when the modal opens.
         */
        parentScopeId?: UiFocusScopeId

        /**
         * Modal focus scope owned by this grid while open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Caller-owned modal control records.
         */
        controls: UiControl<T>[]

        /**
         * Visible modal title. Takes precedence over `titleId`.
         */
        title?: string

        /**
         * Resolver-backed modal title id.
         */
        titleId?: string

        /**
         * Static bitmap or resolver-backed bitmap id drawn in the title bar.
         */
        titleBitmap?: Bitmap | string

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Caller-owned controls rendered at the right edge of the title bar.
         */
        titleControls?: UiControl<T>[]

        /**
         * Whether activation emits `activated` with `close: true`. Defaults to `true`.
         */
        closeOnActivate?: boolean

        /**
         * Whether left/right movement may wrap inside content rows.
         */
        horizontalWrap?: boolean

        /**
         * Number of columns for rectangular modal grids.
         */
        columnCount?: number

        /**
         * Row lengths for ragged modal grids.
         */
        rows?: number[]

        /**
         * Width assigned to each control.
         */
        controlWidth?: number

        /**
         * Height assigned to each control.
         */
        controlHeight?: number

        /**
         * Space between adjacent content rows.
         */
        rowGap?: number

        /**
         * Space between adjacent content columns.
         */
        columnGap?: number

        /**
         * Control style used by controls without a custom draw callback.
         */
        controlStyle?: UiButtonStyle

        /**
         * Width assigned to each title-bar control.
         */
        titleControlWidth?: number

        /**
         * Height assigned to each title-bar control.
         */
        titleControlHeight?: number

        /**
         * Space between adjacent title-bar controls.
         */
        titleControlGap?: number

        /**
         * Control style used by title-bar controls without a custom draw callback.
         */
        titleControlStyle?: UiButtonStyle

        /**
         * Panel, title, and spacing style for this modal.
         */
        modalStyle?: UiModalStyle

        /**
         * Inset between the modal outline and control grid. Defaults to `4`.
         */
        contentMargin?: number

        /**
         * Extra vertical space between the title band and control grid. Defaults to `0`.
         */
        titleGap?: number

        /**
         * Whether an empty modal reserves title-band space. Defaults to `true`.
         */
        showTitleBar?: boolean

        /**
         * Fill color for the modal panel. Defaults to `1`.
         */
        panelColor?: number

        /**
         * Outline color for the modal panel. Defaults to `15`.
         */
        outlineColor?: number

        /**
         * Text color for the modal title. Defaults to `15`.
         */
        titleColor?: number

        /**
         * Called when an enabled modal control is activated.
         */
        onActivate?: UiControlActivateHandler<T>

        /**
         * Called when the modal reports cancellation.
         */
        onCancel?: UiPickerCancelHandler
    }

    /**
     * Handles modal cancellation.
     */
    export interface UiPickerCancelHandler {
        /**
         * Receives the cancelled modal focus scope id.
         */
        (modalScopeId: UiFocusScopeId): void
    }

    /**
     * Result emitted by a modal grid.
     */
    export type UiPickerResult<T> =
        | {
              kind: "activated"
              controlId: string
              value: T
              control: UiControl<T>
              close: true
          }
        | {
              kind: "keepOpen"
              controlId: string
              value: T
              control: UiControl<T>
              updatedValue?: T
          }
        | { kind: "cancelled"; modalScopeId: UiFocusScopeId }

    /**
     * Draws a modal panel using the supplied style.
     */
    export function drawModalPanel(
        surface: DrawSurface,
        rect: Rect,
        style?: UiModalStyle,
        _scratch?: Rect,
    ): void {
        const resolved = modalStyle(UiModalStyles.Default, style)
        const fill = resolved.panelColor
        const outline = resolved.outlineColor
        const frame = resolved.frame || "roundedRect"
        if (frame == "rect") {
            surface.fillRect(rect, fill)
            surface.drawRect(rect, outline)
        } else {
            surface.drawRoundedRect(rect, outline, fill)
        }
    }

    /**
     * Modal picker or control grid backed by a `ui-core` modal focus scope.
     */
    export class UiPicker<T> implements UiModal<UiPickerResult<T>> {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private parentScopeId_: UiFocusScopeId
        private modalScopeId_: UiFocusScopeId
        private title_: string
        private titleId_: string
        private titleBitmap_: Bitmap | string
        private closeOnActivate_: boolean
        private style_: UiModalStyle
        private titleRow_: UiRow<T>
        private grid_: UiGrid<T>
        private onActivate_: UiControlActivateHandler<T>
        private onCancel_: UiPickerCancelHandler
        private scratch_: Rect
        private titleRowSize_: UiMeasuredSize
        private horizontalWrap_: boolean

        constructor(options: UiPickerOptions<T>) {
            this.parentScopeId_ = options.parentScopeId
            this.modalScopeId_ = options.modalScopeId
            this.title_ = options.title
            this.titleId_ = options.titleId
            this.titleBitmap_ = options.titleBitmap
            this.closeOnActivate_ = options.closeOnActivate !== false
            this.style_ = this.resolveModalStyle(options)
            this.onActivate_ = options.onActivate
            this.onCancel_ = options.onCancel
            this.scratch_ = new Rect()
            this.titleRowSize_ = new UiMeasuredSize()
            this.horizontalWrap_ = options.horizontalWrap || false
            if (options.titleControls && options.titleControls.length)
                this.titleRow_ = new UiRow<T>({
                    scopeId: options.modalScopeId,
                    controls: options.titleControls,
                    controlWidth:
                        options.titleControlWidth || options.controlWidth,
                    controlHeight:
                        options.titleControlHeight || options.controlHeight,
                    gap: options.titleControlGap,
                    controlStyle:
                        options.titleControlStyle || options.controlStyle,
                })
            this.grid_ = new UiGrid<T>({
                scopeId: options.modalScopeId,
                controls: options.controls,
                defaultControlId: options.defaultControlId,
                columnCount: options.columnCount,
                rows: options.rows,
                controlWidth: options.controlWidth,
                controlHeight: options.controlHeight,
                rowGap: options.rowGap,
                columnGap: options.columnGap,
                horizontalWrap: options.horizontalWrap,
                controlStyle: options.controlStyle,
            })
            this.layoutSpec = _uiControls.defaultLayoutSpec()
            this.finalRect = new Rect()
            this.layoutDirty = true
        }

        /**
         * Modal focus scope id used by this grid.
         */
        public get modalScopeId(): UiFocusScopeId {
            return this.modalScopeId_
        }

        /**
         * Current caller-owned control array.
         */
        public get controls(): UiControl<T>[] {
            return this.grid_.controls
        }

        /**
         * Copies one arranged modal control rectangle into `output`.
         */
        public getControlRect(controlId: string, output: Rect): boolean {
            return (
                this.grid_.getControlRect(controlId, output) ||
                (this.titleRow_
                    ? this.titleRow_.getControlRect(controlId, output)
                    : false)
            )
        }

        /**
         * Measures the modal grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            this.measureTitleRow(constraints)
            this.grid_.measure(constraints, output)
            const titleHeight = this.titleHeight()
            const contentMargin = this.contentMargin()
            const minWidth = Math.max(
                output.minWidth,
                this.titleRowSize_.minWidth,
            )
            const preferredWidth = Math.max(
                output.preferredWidth,
                this.titleRowSize_.preferredWidth,
            )
            output.set(
                minWidth + contentMargin * 2,
                output.minHeight + titleHeight + contentMargin,
                preferredWidth + contentMargin * 2,
                output.preferredHeight + titleHeight + contentMargin,
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the modal panel and control grid.
         */
        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            const titleHeight = this.titleHeight()
            const contentMargin = this.contentMargin()
            this.arrangeTitleRow(rect, contentMargin)
            this.grid_.arrange(
                new Rect(
                    rect.x + contentMargin,
                    rect.y + titleHeight,
                    Math.max(0, rect.width - contentMargin * 2),
                    Math.max(0, rect.height - titleHeight - contentMargin),
                ),
            )
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the modal grid as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
            if (this.titleRow_) this.titleRow_.invalidateLayout()
            this.grid_.invalidateLayout()
        }

        /**
         * Clears this modal grid's layout invalidation flag.
         */
        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        /**
         * Registers the modal scope, control targets, and optional navigation.
         */
        public open(
            focus: UiFocusState,
            controller?: UiFocusInputController,
        ): UiFocusSetResult {
            const scopeOptions: UiFocusScopeOptions = {
                id: this.modalScopeId_,
                parentScopeId: this.parentScopeId_ || focus.getActiveScopeId(),
                preferredTargetId: this.resolvePreferredTargetId(),
                handlesCancel: true,
                modal: true,
            }
            if (this.titleRow_)
                this.titleRow_.registerFocusTargets(focus, scopeOptions)
            this.grid_.registerFocusTargets(focus, scopeOptions)
            if (controller) this.registerNavigation(controller)
            return focus.setActiveScope(this.modalScopeId_)
        }

        /**
         * Restores focus to the parent modal scope through `ui-core`.
         */
        public close(focus: UiFocusState): UiFocusSetResult {
            return focus.closeModalScope(this.modalScopeId_)
        }

        /**
         * Returns the resolved title text.
         */
        public resolveTitleText(assets: UiAssetResolver): string {
            if (this.title_ !== undefined) return this.title_
            if (this.titleId_ !== undefined)
                return assets.getText(this.titleId_)
            return ""
        }

        /**
         * Converts focus activation into a modal activation or keep-open result.
         */
        public createResultForActivation(
            result: UiFocusActivationResult,
        ): UiPickerResult<T> {
            const gridResult = this.createGridResultForActivation(result)
            if (!gridResult || gridResult.kind != "activated") return undefined
            if (this.closeOnActivate_) {
                return {
                    kind: "activated",
                    controlId: gridResult.controlId,
                    value: gridResult.value,
                    control: gridResult.control,
                    close: true,
                }
            }
            return {
                kind: "keepOpen",
                controlId: gridResult.controlId,
                value: gridResult.value,
                control: gridResult.control,
            }
        }

        /**
         * Converts focus input into a modal result when one occurred.
         */
        public handleFocusInput(result: UiFocusInputResult): UiPickerResult<T> {
            if (
                result.kind == "activated" &&
                result.detail &&
                result.detail.activationResult
            ) {
                const activation = this.createResultForActivation(
                    result.detail.activationResult,
                )
                this.emitActivate(activation)
                return activation
            }
            if (result.kind == "cancelled") {
                const cancelled: UiPickerResult<T> = {
                    kind: "cancelled",
                    modalScopeId: this.modalScopeId_,
                }
                this.emitCancel(cancelled)
                return cancelled
            }
            return undefined
        }

        /**
         * Renders the modal panel, title, and visible controls.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            drawModalPanel(surface, this.finalRect, this.style_, this.scratch_)
            const title = this.resolveTitleText(assets)
            const titleBitmap = this.resolveTitleBitmap(assets)
            let titleX = this.finalRect.x + 4
            if (titleBitmap) {
                surface.drawBitmap(titleBitmap, titleX, this.finalRect.y + 4)
                titleX += titleBitmap.width + 2
            }
            if (title.length > 0)
                surface.drawText(title, titleX, this.finalRect.y + 4, {
                    color: this.titleColor(),
                    font: this.style_.titleFont,
                })
            if (this.titleRow_) {
                this.grid_.renderControls(surface, assets, focus)
                this.titleRow_.renderControls(surface, assets, focus)
                this.grid_.renderFocus(surface, assets, focus)
                this.titleRow_.renderFocus(surface, assets, focus)
            } else {
                this.grid_.render(surface, assets, focus)
            }
        }

        private emitActivate(result: UiPickerResult<T>): void {
            if (
                !result ||
                (result.kind != "activated" && result.kind != "keepOpen")
            )
                return
            _uiControls.emitControlActivate(
                result.value,
                result.control,
                result.controlId,
                this.onActivate_,
            )
        }

        private emitCancel(result: UiPickerResult<T>): void {
            if (!this.onCancel_ || !result || result.kind != "cancelled") return
            this.onCancel_(result.modalScopeId)
        }

        private titleHeight(): number {
            if (this.titleRow_) {
                return (
                    this.contentMargin() +
                    this.titleRowSize_.preferredHeight +
                    this.titleGap()
                )
            }
            if (
                !this.showTitleBar() &&
                this.title_ === undefined &&
                this.titleId_ === undefined &&
                this.titleBitmap_ === undefined
            )
                return this.contentMargin()
            return 16 + this.titleGap()
        }

        private contentMargin(): number {
            return _uiControls.sanitizeDimension(this.style_.contentMargin, 4)
        }

        private titleGap(): number {
            return _uiControls.sanitizeDimension(this.style_.titleGap, 0)
        }

        private titleColor(): number {
            return this.style_.titleColor !== undefined
                ? this.style_.titleColor
                : 15
        }

        private resolveTitleBitmap(
            assets: UiAssetResolver,
        ): Bitmap | undefined {
            if (this.titleBitmap_ === undefined) return undefined
            if (typeof this.titleBitmap_ == "string")
                return assets.getBitmap(this.titleBitmap_)
            return this.titleBitmap_
        }

        private showTitleBar(): boolean {
            return this.style_.showTitleBar !== false
        }

        private measureTitleRow(constraints: UiLayoutConstraints): void {
            if (!this.titleRow_) {
                this.titleRowSize_.set(0, 0, 0, 0)
                return
            }
            this.titleRow_.measure(constraints, this.titleRowSize_)
        }

        private arrangeTitleRow(rect: Rect, contentMargin: number): void {
            if (!this.titleRow_) return
            this.titleRow_.arrange(
                new Rect(
                    rect.x +
                        rect.width -
                        contentMargin -
                        this.titleRowSize_.preferredWidth,
                    rect.y + contentMargin,
                    this.titleRowSize_.preferredWidth,
                    this.titleRowSize_.preferredHeight,
                ),
            )
        }

        private resolvePreferredTargetId(): UiFocusId | undefined {
            return (
                this.grid_.resolvePreferredTargetId() ||
                (this.titleRow_
                    ? this.titleRow_.resolvePreferredTargetId()
                    : undefined)
            )
        }

        private registerNavigation(controller: UiFocusInputController): void {
            if (!this.titleRow_) {
                this.grid_.registerNavigation(controller)
                return
            }
            controller.setNavigation(this.modalScopeId_, {
                kind: "raggedGrid",
                rows: this.navigationRows(),
                horizontalWrap: this.horizontalWrap_,
                verticalStrategy: "nearest",
            })
        }

        private createGridResultForActivation(
            result: UiFocusActivationResult,
        ): UiGridResult<T> {
            if (this.titleRow_) {
                const rowResult =
                    this.titleRow_.createResultForActivation(result)
                if (rowResult) return rowResult
            }
            return this.grid_.createResultForActivation(result)
        }

        private navigationRows(): UiFocusNavigationTarget[][] {
            const rows: UiFocusNavigationTarget[][] = []
            if (this.titleRow_) {
                const titleTargets = this.titleNavigationTargets()
                if (titleTargets.length) rows.push(titleTargets)
            }
            const contentRows = this.contentNavigationRows()
            for (let i = 0; i < contentRows.length; i++)
                if (contentRows[i].length) rows.push(contentRows[i])
            return rows
        }

        private titleNavigationTargets(): UiFocusNavigationTarget[] {
            const targets: UiFocusNavigationTarget[] = []
            if (!this.titleRow_) return targets
            this.titleRow_.copyNavigationTargets(targets)
            return targets
        }

        private contentNavigationRows(): UiFocusNavigationTarget[][] {
            return this.grid_.navigationRows()
        }

        private resolveModalStyle(options: UiPickerOptions<T>): UiModalStyle {
            return modalStyle(
                UiModalStyles.Default,
                options.modalStyle,
                this.optionModalStyle(options),
            )
        }

        private optionModalStyle(options: UiPickerOptions<T>): UiModalStyle {
            const style: UiModalStyle = {}
            if (options.panelColor !== undefined)
                style.panelColor = options.panelColor
            if (options.outlineColor !== undefined)
                style.outlineColor = options.outlineColor
            if (options.titleColor !== undefined)
                style.titleColor = options.titleColor
            if (options.contentMargin !== undefined)
                style.contentMargin = options.contentMargin
            if (options.titleGap !== undefined)
                style.titleGap = options.titleGap
            if (options.showTitleBar !== undefined)
                style.showTitleBar = options.showTitleBar
            return style
        }
    }

    function copyModalStyle(target: UiModalStyle, source?: UiModalStyle): void {
        if (!source) return
        if (source.panelColor !== undefined)
            target.panelColor = source.panelColor
        if (source.outlineColor !== undefined)
            target.outlineColor = source.outlineColor
        if (source.frame !== undefined) target.frame = source.frame
        if (source.titleColor !== undefined)
            target.titleColor = source.titleColor
        if (source.titleFont !== undefined) target.titleFont = source.titleFont
        if (source.contentMargin !== undefined)
            target.contentMargin = source.contentMargin
        if (source.titleGap !== undefined) target.titleGap = source.titleGap
        if (source.showTitleBar !== undefined)
            target.showTitleBar = source.showTitleBar
    }
}
