namespace ui {
  /**
   * Options for a modal picker or action grid.
   */
  export interface UiModalGridOptions<T> {
    /**
     * Parent focus scope restored after the modal closes.
     */
    parentScopeId: UiFocusScopeId

    /**
     * Modal focus scope owned by this grid while open.
     */
    modalScopeId: UiFocusScopeId

    /**
     * Caller-owned modal item records.
     */
    items: UiActionItem<T>[]

    /**
     * Visible modal title. Takes precedence over `titleId`.
     */
    title?: string

    /**
     * Resolver-backed modal title id.
     */
    titleId?: string

    /**
     * Item id to focus first when available.
     */
    defaultItemId?: string

    /**
     * Whether delete may emit a `deleted` result.
     */
    deleteEnabled?: boolean

    /**
     * Whether activation emits `activated` with `close: true`. Defaults to `true`.
     */
    closeOnActivate?: boolean

    /**
     * Number of columns for rectangular modal grids.
     */
    columnCount?: number

    /**
     * Row lengths for ragged modal grids.
     */
    rows?: number[]

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
   * Result emitted by a modal grid.
   */
  export type UiModalGridResult<T> =
    | { kind: "activated"; itemId: string; value: T; item: UiActionItem<T>; close: true }
    | { kind: "keepOpen"; itemId: string; value: T; item: UiActionItem<T>; updatedValue?: T }
    | { kind: "cancelled"; modalScopeId: UiFocusScopeId }
    | { kind: "closed"; modalScopeId: UiFocusScopeId }
    | { kind: "deleted"; modalScopeId: UiFocusScopeId }

  /**
   * Modal picker or action grid backed by a `ui-core` modal focus scope.
   */
  export class UiModalGrid<T> implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private parentScopeId_: UiFocusScopeId
    private modalScopeId_: UiFocusScopeId
    private title_: string
    private titleId_: string
    private deleteEnabled_: boolean
    private closeOnActivate_: boolean
    private grid_: UiActionGrid<T>

    constructor(options: UiModalGridOptions<T>) {
      this.parentScopeId_ = options.parentScopeId
      this.modalScopeId_ = options.modalScopeId
      this.title_ = options.title
      this.titleId_ = options.titleId
      this.deleteEnabled_ = options.deleteEnabled || false
      this.closeOnActivate_ = options.closeOnActivate !== false
      this.grid_ = new UiActionGrid<T>({
        scopeId: options.modalScopeId,
        items: options.items,
        defaultItemId: options.defaultItemId,
        columnCount: options.columnCount,
        rows: options.rows,
        itemWidth: options.itemWidth,
        itemHeight: options.itemHeight
      })
      this.layoutSpec = _uiWidgets.defaultLayoutSpec()
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
     * Current caller-owned item array.
     */
    public get items(): UiActionItem<T>[] {
      return this.grid_.items
    }

    /**
     * Measures the modal grid under parent constraints.
     */
    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      this.grid_.measure(constraints, output)
      output.set(output.minWidth + 8, output.minHeight + 18, output.preferredWidth + 8, output.preferredHeight + 18)
      this.clearLayoutInvalidation()
    }

    /**
     * Arranges the modal panel and item grid.
     */
    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.grid_.arrange(new Rect(rect.x + 4, rect.y + 16, Math.max(0, rect.width - 8), Math.max(0, rect.height - 20)))
      this.clearLayoutInvalidation()
    }

    /**
     * Marks the modal grid as needing layout.
     */
    public invalidateLayout(): void {
      this.layoutDirty = true
      this.grid_.invalidateLayout()
    }

    /**
     * Clears this modal grid's layout invalidation flag.
     */
    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    /**
     * Registers the modal scope, item targets, and optional navigation.
     */
    public open(focus: UiFocusState, controller?: UiFocusInputController): UiFocusSetResult {
      this.grid_.registerFocusTargets(focus, {
        id: this.modalScopeId_,
        parentScopeId: this.parentScopeId_,
        preferredTargetId: this.grid_.resolvePreferredTargetId(),
        handlesCancel: true,
        modal: true
      })
      if (controller) this.grid_.registerNavigation(controller)
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
      if (this.titleId_ !== undefined) return assets.getText(this.titleId_)
      return ""
    }

    /**
     * Converts focus activation into a modal activation or keep-open result.
     */
    public createResultForActivation(result: UiFocusActivationResult): UiModalGridResult<T> {
      const gridResult = this.grid_.createResultForActivation(result)
      if (!gridResult || gridResult.kind != "activated") return undefined
      if (this.closeOnActivate_) {
        return {
          kind: "activated",
          itemId: gridResult.itemId,
          value: gridResult.value,
          item: gridResult.item,
          close: true
        }
      }
      return {
        kind: "keepOpen",
        itemId: gridResult.itemId,
        value: gridResult.value,
        item: gridResult.item
      }
    }

    /**
     * Converts focus input into a modal result when one occurred.
     */
    public handleFocusInput(result: UiFocusInputResult): UiModalGridResult<T> {
      if (result.kind == "activated" && result.detail && result.detail.activationResult) {
        return this.createResultForActivation(result.detail.activationResult)
      }
      if (result.kind == "cancelled") return this.createCancelResult()
      return undefined
    }

    /**
     * Creates a cancellation result without closing the focus scope.
     */
    public createCancelResult(): UiModalGridResult<T> {
      return { kind: "cancelled", modalScopeId: this.modalScopeId_ }
    }

    /**
     * Creates a close result without closing the focus scope.
     */
    public createCloseResult(): UiModalGridResult<T> {
      return { kind: "closed", modalScopeId: this.modalScopeId_ }
    }

    /**
     * Creates a delete result when delete is enabled.
     */
    public createDeleteResult(): UiModalGridResult<T> {
      if (!this.deleteEnabled_) return undefined
      return { kind: "deleted", modalScopeId: this.modalScopeId_ }
    }

    /**
     * Renders the modal panel, title, and visible items.
     */
    public render(surface: DrawSurface, assets: UiAssetResolver, focus?: UiFocusState): void {
      surface.fillRect(this.finalRect, 1)
      surface.drawRect(this.finalRect, 15)
      const title = this.resolveTitleText(assets)
      if (title.length > 0) surface.drawText(title, this.finalRect.x + 4, this.finalRect.y + 4, { color: 15 })
      this.grid_.render(surface, assets, focus)
    }
  }
}
