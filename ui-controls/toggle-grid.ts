namespace ui {
    /**
     * Result returned by a caller toggle action.
     */
    export type UiToggleGridActionResult<T> =
        | { kind: "keepOpen"; value?: T }
        | { kind: "closed" }
        | { kind: "deleted" }

    /**
     * Callback for applying a toggle activation.
     */
    export interface UiToggleGridAction<T> {
        /**
         * Applies a toggle request and returns the result to emit.
         */
        (control: UiControl<T>): UiToggleGridActionResult<T>
    }

    /**
     * Options for a keep-open selectable grid.
     */
    export interface UiToggleGridOptions<T> {
        /**
         * Modal focus scope owned by this grid while open.
         */
        modalScopeId: UiFocusScopeId

        /**
         * Caller-owned selectable control records.
         */
        controls: UiControl<T>[]

        /**
         * Number of columns for the grid.
         */
        columnCount: number

        /**
         * Control id to focus first when available.
         */
        defaultControlId?: string

        /**
         * Whether delete may emit a `deleted` result.
         */
        deleteEnabled?: boolean

        /**
         * Action that applies a toggle and may update the returned value.
         */
        toggle?: UiToggleGridAction<T>

        /**
         * Width assigned to each control.
         */
        controlWidth?: number

        /**
         * Height assigned to each control.
         */
        controlHeight?: number

        /**
         * Panel, title, and spacing style for this modal.
         */
        modalStyle?: UiModalStyle
    }

    /**
     * Result emitted by a toggle grid.
     */
    export type UiToggleGridResult<T> =
        | {
              kind: "keepOpen"
              controlId: string
              value: T
              control: UiControl<T>
              updatedValue?: T
          }
        | { kind: "closed"; modalScopeId: UiFocusScopeId }
        | { kind: "cancelled"; modalScopeId: UiFocusScopeId }
        | { kind: "deleted"; modalScopeId: UiFocusScopeId }

    /**
     * Modal selectable grid whose activation normally keeps the modal open.
     */
    export class UiToggleGrid<T> implements UiLayoutNode {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private modal_: UiPicker<T>
        private toggle_: UiToggleGridAction<T>
        private deleteEnabled_: boolean

        constructor(options: UiToggleGridOptions<T>) {
            this.modal_ = new UiPicker<T>({
                modalScopeId: options.modalScopeId,
                controls: options.controls,
                defaultControlId: options.defaultControlId,
                closeOnActivate: false,
                columnCount: options.columnCount,
                controlWidth: options.controlWidth,
                controlHeight: options.controlHeight,
                modalStyle: options.modalStyle,
            })
            this.toggle_ = options.toggle
            this.deleteEnabled_ = options.deleteEnabled || false
            this.layoutSpec = this.modal_.layoutSpec
            this.finalRect = this.modal_.finalRect
            this.layoutDirty = true
        }

        /**
         * Modal focus scope id used by this grid.
         */
        public get modalScopeId(): UiFocusScopeId {
            return this.modal_.modalScopeId
        }

        /**
         * Current caller-owned control array.
         */
        public get controls(): UiControl<T>[] {
            return this.modal_.controls
        }

        /**
         * Measures the toggle grid under parent constraints.
         */
        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            this.modal_.measure(constraints, output)
            this.clearLayoutInvalidation()
        }

        /**
         * Arranges the toggle grid in the assigned bounds.
         */
        public arrange(rect: Rect): void {
            this.modal_.arrange(rect)
            this.clearLayoutInvalidation()
        }

        /**
         * Marks the toggle grid as needing layout.
         */
        public invalidateLayout(): void {
            this.layoutDirty = true
            this.modal_.invalidateLayout()
        }

        /**
         * Clears this toggle grid's layout invalidation flag.
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
            return this.modal_.open(focus, controller)
        }

        /**
         * Restores focus to the parent modal scope through `ui-core`.
         */
        public close(focus: UiFocusState): UiFocusSetResult {
            return this.modal_.close(focus)
        }

        /**
         * Converts focus activation into a keep-open toggle result.
         */
        public createResultForActivation(
            scopeId: UiFocusScopeId,
            targetId: UiFocusId,
        ): UiToggleGridResult<T> {
            const modalResult = this.modal_.createResultForActivation(
                scopeId,
                targetId,
            )
            if (!modalResult || modalResult.kind != "keepOpen") return undefined
            const policyResult: UiToggleGridActionResult<T> = this.toggle_
                ? this.toggle_(modalResult.control)
                : { kind: "keepOpen" }
            if (policyResult.kind == "closed")
                return { kind: "closed", modalScopeId: this.modalScopeId }
            if (policyResult.kind == "deleted")
                return { kind: "deleted", modalScopeId: this.modalScopeId }
            return {
                kind: "keepOpen",
                controlId: modalResult.controlId,
                value: modalResult.value,
                control: modalResult.control,
                updatedValue: policyResult.value,
            }
        }

        /**
         * Converts focus input into a toggle result when one occurred.
         */
        public handleFocusInput(
            result: UiFocusInputResult,
        ): UiToggleGridResult<T> {
            if (result.kind == "activated") {
                return this.createResultForActivation(
                    result.scopeId,
                    result.targetId,
                )
            }
            if (result.kind == "cancelled")
                return {
                    kind: "cancelled",
                    modalScopeId: this.modalScopeId,
                }
            return undefined
        }

        /**
         * Creates a delete result when delete is enabled.
         */
        public createDeleteResult(): UiToggleGridResult<T> {
            if (!this.deleteEnabled_) return undefined
            return { kind: "deleted", modalScopeId: this.modalScopeId }
        }

        /**
         * Creates a close result without closing the focus scope.
         */
        public createCloseResult(): UiToggleGridResult<T> {
            return { kind: "closed", modalScopeId: this.modalScopeId }
        }

        /**
         * Renders the toggle grid.
         */
        public render(
            surface: DrawSurface,
            assets: UiAssetResolver,
            focus?: UiFocusState,
        ): void {
            this.modal_.render(surface, assets, focus)
        }
    }
}
