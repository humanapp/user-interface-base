namespace ui {
  /**
   * Result returned by a caller toggle policy.
   */
  export type UiToggleGridPolicyResult<T> =
    | { kind: "keepOpen"; value?: T }
    | { kind: "closed" }
    | { kind: "deleted" }

  /**
   * Caller policy for applying a toggle activation.
   */
  export interface UiToggleGridPolicy<T> {
    /**
     * Applies a toggle request and returns the result to emit.
     */
    (item: UiActionItem<T>): UiToggleGridPolicyResult<T>
  }

  /**
   * Options for a keep-open selectable grid.
   */
  export interface UiToggleGridOptions<T> {
    /**
     * Parent focus scope restored after the modal closes.
     */
    parentScopeId: UiFocusScopeId

    /**
     * Modal focus scope owned by this grid while open.
     */
    modalScopeId: UiFocusScopeId

    /**
     * Caller-owned selectable item records.
     */
    items: UiActionItem<T>[]

    /**
     * Number of columns for the grid.
     */
    columnCount: number

    /**
     * Item id to focus first when available.
     */
    defaultItemId?: string

    /**
     * Whether delete may emit a `deleted` result.
     */
    deleteEnabled?: boolean

    /**
     * Policy that applies a toggle and may update the returned value.
     */
    toggle?: UiToggleGridPolicy<T>

    /**
     * Width assigned to each item.
     */
    itemWidth?: number

    /**
     * Height assigned to each item.
     */
    itemHeight?: number
  }

  /**
   * Result emitted by a toggle grid.
   */
  export type UiToggleGridResult<T> =
    | { kind: "keepOpen"; itemId: string; value: T; item: UiActionItem<T>; updatedValue?: T }
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
    private modal_: UiModalGrid<T>
    private toggle_: UiToggleGridPolicy<T>

    constructor(options: UiToggleGridOptions<T>) {
      this.modal_ = new UiModalGrid<T>({
        parentScopeId: options.parentScopeId,
        modalScopeId: options.modalScopeId,
        items: options.items,
        defaultItemId: options.defaultItemId,
        deleteEnabled: options.deleteEnabled,
        closeOnActivate: false,
        columnCount: options.columnCount,
        itemWidth: options.itemWidth,
        itemHeight: options.itemHeight
      })
      this.toggle_ = options.toggle
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
     * Current caller-owned item array.
     */
    public get items(): UiActionItem<T>[] {
      return this.modal_.items
    }

    /**
     * Measures the toggle grid under parent constraints.
     */
    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
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
     * Registers the modal scope, item targets, and optional navigation.
     */
    public open(focus: UiFocusState, controller?: UiFocusInputController): UiFocusSetResult {
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
    public createResultForActivation(result: UiFocusActivationResult): UiToggleGridResult<T> {
      const modalResult = this.modal_.createResultForActivation(result)
      if (!modalResult || modalResult.kind != "keepOpen") return undefined
      const policyResult: UiToggleGridPolicyResult<T> = this.toggle_ ?
        this.toggle_(modalResult.item) :
        { kind: "keepOpen" }
      if (policyResult.kind == "closed") return { kind: "closed", modalScopeId: this.modalScopeId }
      if (policyResult.kind == "deleted") return { kind: "deleted", modalScopeId: this.modalScopeId }
      return {
        kind: "keepOpen",
        itemId: modalResult.itemId,
        value: modalResult.value,
        item: modalResult.item,
        updatedValue: policyResult.value
      }
    }

    /**
     * Converts focus input into a toggle result when one occurred.
     */
    public handleFocusInput(result: UiFocusInputResult): UiToggleGridResult<T> {
      if (result.kind == "activated" && result.detail && result.detail.activationResult) {
        return this.createResultForActivation(result.detail.activationResult)
      }
      if (result.kind == "cancelled") return { kind: "cancelled", modalScopeId: this.modalScopeId }
      return undefined
    }

    /**
     * Creates a delete result when delete is enabled.
     */
    public createDeleteResult(): UiToggleGridResult<T> {
      const result = this.modal_.createDeleteResult()
      return result && result.kind == "deleted" ? { kind: "deleted", modalScopeId: this.modalScopeId } : undefined
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
    public render(surface: DrawSurface, assets: UiAssetResolver, focus?: UiFocusState): void {
      this.modal_.render(surface, assets, focus)
    }
  }
}
