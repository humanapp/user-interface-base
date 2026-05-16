namespace ui {
  /**
   * Options for a one-dimensional action collection.
   */
  export interface UiActionRowOptions<T> {
    /**
     * Focus scope id for this row.
     */
    scopeId: UiFocusScopeId

    /**
     * Caller-owned item records in row order.
     */
    items: UiActionItem<T>[]

    /**
     * Item id to focus first when available.
     */
    defaultItemId?: string

    /**
     * Scroll owner used when this row is arranged in scroll content.
     */
    scrollOwnerId?: UiFocusScrollOwnerId

    /**
     * Whether left/right movement may wrap inside the row.
     */
    wrap?: boolean

    /**
     * Sizing request for the row as a layout node.
     */
    layoutSpec?: UiLayoutSpec

    /**
     * Width assigned to each item.
     */
    itemWidth?: number

    /**
     * Height assigned to each item.
     */
    itemHeight?: number

    /**
     * Space between adjacent items.
     */
    gap?: number
  }

  /**
   * Result emitted by an action row.
   */
  export type UiActionRowResult<T> =
    | { kind: "activated"; itemId: string; value: T; item: UiActionItem<T> }
    | { kind: "exited"; direction: UiFocusDirection; scopeId: UiFocusScopeId; itemId?: string }

  /**
   * Renders and navigates one horizontal action row.
   */
  export class UiActionRow<T> implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    private scopeId_: UiFocusScopeId
    private items_: UiActionItem<T>[]
    private defaultItemId_: string
    private scrollOwnerId_: UiFocusScrollOwnerId
    private wrap_: boolean
    private itemWidth_: number
    private itemHeight_: number
    private gap_: number
    private itemRects_: Rect[]
    private registeredTargetIds_: string[]
    private measured_: UiMeasuredSize

    constructor(options: UiActionRowOptions<T>) {
      this.scopeId_ = options.scopeId
      this.items_ = options.items
      this.defaultItemId_ = options.defaultItemId
      this.scrollOwnerId_ = options.scrollOwnerId
      this.wrap_ = options.wrap || false
      this.itemWidth_ = _uiWidgets.itemWidth(options.itemWidth)
      this.itemHeight_ = _uiWidgets.itemHeight(options.itemHeight)
      this.gap_ = _uiWidgets.gap(options.gap)
      this.layoutSpec = options.layoutSpec || _uiWidgets.defaultLayoutSpec()
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.itemRects_ = []
      this.registeredTargetIds_ = []
      this.measured_ = new UiMeasuredSize()
    }

    /**
     * Focus scope id used by this row.
     */
    public get scopeId(): UiFocusScopeId {
      return this.scopeId_
    }

    /**
     * Current caller-owned item array.
     */
    public get items(): UiActionItem<T>[] {
      return this.items_
    }

    /**
     * Replaces the caller-owned item array used on later layout and render passes.
     */
    public setItems(items: UiActionItem<T>[]): void {
      this.items_ = items
      this.invalidateLayout()
    }

    /**
     * Measures this row under parent constraints.
     */
    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      const count = this.items_.length
      const width = count > 0 ? count * this.itemWidth_ + (count - 1) * this.gap_ : 0
      const height = count > 0 ? this.itemHeight_ : 0
      measureLayoutSpec(this.layoutSpec, constraints, width, height, width, height, output)
      this.measured_.set(output.minWidth, output.minHeight, output.preferredWidth, output.preferredHeight)
      this.clearLayoutInvalidation()
    }

    /**
     * Arranges row item rectangles in the assigned bounds.
     */
    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.ensureItemRects()
      let x = this.finalRect.x
      for (let i = 0; i < this.items_.length; i++) {
        this.itemRects_[i].set(x, this.finalRect.y, this.itemWidth_, Math.min(this.itemHeight_, this.finalRect.height))
        x += this.itemWidth_ + this.gap_
      }
      this.clearLayoutInvalidation()
    }

    /**
     * Marks the row as needing layout.
     */
    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    /**
     * Clears this row's layout invalidation flag.
     */
    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }

    /**
     * Copies one arranged item rectangle into `output`.
     */
    public getItemRect(itemId: string, output: Rect): boolean {
      for (let i = 0; i < this.items_.length; i++) {
        if (this.items_[i].id == itemId && this.itemRects_[i]) {
          output.copyFrom(this.itemRects_[i])
          return true
        }
      }
      return false
    }

    /**
     * Registers this row's focus scope and targets.
     */
    public registerFocusTargets(focus: UiFocusState, scopeOptions?: UiFocusScopeOptions): void {
      const preferred = _uiWidgets.preferredItemId(this.scopeId_, this.items_, this.defaultItemId_)
      focus.setScope(scopeOptions || {
        id: this.scopeId_,
        preferredTargetId: preferred,
        wrap: this.wrap_
      })
      this.ensureItemRects()
      const currentTargetIds: string[] = []
      for (let i = 0; i < this.items_.length; i++) {
        currentTargetIds.push(_uiWidgets.targetId(this.scopeId_, this.items_[i].id))
      }
      for (let i = 0; i < this.registeredTargetIds_.length; i++) {
        const targetId = this.registeredTargetIds_[i]
        if (!_uiWidgets.containsString(currentTargetIds, targetId)) focus.removeTarget(targetId)
      }
      for (let i = 0; i < this.items_.length; i++) {
        const item = this.items_[i]
        const rect = this.itemRects_[i] || new Rect()
        focus.setTarget({
          id: _uiWidgets.targetId(this.scopeId_, item.id),
          scopeId: this.scopeId_,
          rect,
          scrollOwnerId: this.scrollOwnerId_,
          scrollRect: this.scrollOwnerId_ ? rect : undefined,
          disabled: _uiWidgets.isDisabled(item),
          hidden: !_uiWidgets.isVisible(item),
          activatable: true
        })
      }
      this.registeredTargetIds_ = currentTargetIds
    }

    /**
     * Registers row navigation with a focus input controller.
     */
    public registerNavigation(controller: UiFocusInputController): void {
      controller.setNavigation(this.scopeId_, {
        kind: "row",
        targets: this.navigationTargets(),
        wrap: this.wrap_
      })
    }

    /**
     * Focuses the row's retained, default, selected, or first enabled item.
     */
    public focusDefault(focus: UiFocusState): UiFocusSetResult {
      return focus.setActiveScope(this.scopeId_)
    }

    /**
     * Returns the target id chosen by default-item and selected-item rules.
     */
    public resolvePreferredTargetId(): UiFocusId | undefined {
      return _uiWidgets.preferredItemId(this.scopeId_, this.items_, this.defaultItemId_)
    }

    /**
     * Converts a focus input result into a row result when one occurred.
     */
    public handleFocusInput(result: UiFocusInputResult): UiActionRowResult<T> {
      if (result.kind == "activated" && result.detail && result.detail.activationResult) {
        return this.createResultForActivation(result.detail.activationResult)
      }
      if (result.kind == "exited" && result.detail && result.detail.moveResult) {
        return this.createResultForMove(result.detail.moveResult)
      }
      return undefined
    }

    /**
     * Converts a focus activation result into a typed row activation.
     */
    public createResultForActivation(result: UiFocusActivationResult): UiActionRowResult<T> {
      if (result.kind != "activated" || result.scopeId != this.scopeId_) return undefined
      const item = _uiWidgets.findItemByTargetId(this.scopeId_, this.items_, result.targetId)
      if (!item) return undefined
      return { kind: "activated", itemId: item.id, value: item.value, item }
    }

    /**
     * Converts a focus movement result into a generic row boundary exit.
     */
    public createResultForMove(result: UiFocusMoveResult): UiActionRowResult<T> {
      if (result.kind != "exited" || result.scopeId != this.scopeId_) return undefined
      return {
        kind: "exited",
        direction: result.direction,
        scopeId: result.scopeId,
        itemId: _uiWidgets.itemIdFromTargetId(this.scopeId_, result.targetId)
      }
    }

    /**
     * Renders visible row items through the supplied draw surface.
     */
    public render(surface: DrawSurface, assets: UiAssetResolver, focus?: UiFocusState): void {
      this.ensureItemRects()
      const activeTargetId = focus ? focus.getActiveTargetId(this.scopeId_) : undefined
      for (let i = 0; i < this.items_.length; i++) {
        const item = this.items_[i]
        if (!_uiWidgets.isVisible(item)) continue
        _uiWidgets.renderActionItem(
          surface,
          assets,
          item,
          this.itemRects_[i],
          activeTargetId == _uiWidgets.targetId(this.scopeId_, item.id)
        )
      }
    }

    private ensureItemRects(): void {
      while (this.itemRects_.length < this.items_.length) this.itemRects_.push(new Rect())
      while (this.itemRects_.length > this.items_.length) this.itemRects_.pop()
    }

    private navigationTargets(): UiFocusNavigationTarget[] {
      this.ensureItemRects()
      const targets: UiFocusNavigationTarget[] = []
      for (let i = 0; i < this.items_.length; i++) {
        const item = this.items_[i]
        const rect = this.itemRects_[i]
        targets.push({
          id: _uiWidgets.targetId(this.scopeId_, item.id),
          rect,
          scrollOwnerId: this.scrollOwnerId_,
          scrollRect: this.scrollOwnerId_ ? rect : undefined,
          disabled: _uiWidgets.isDisabled(item),
          hidden: !_uiWidgets.isVisible(item)
        })
      }
      return targets
    }
  }
}
