namespace ui {
  /**
   * Stable id for a focusable target.
   */
  export type UiFocusId = string

  /**
   * Stable id for a group of related focus targets.
   */
  export type UiFocusScopeId = string

  /**
   * Application-defined id for the scrollable area that owns a target.
   */
  export type UiFocusScrollOwnerId = string

  /**
   * Direction of a requested focus move.
   */
  export type UiFocusDirection = "up" | "down" | "left" | "right"

  /**
   * Request to bring a focused target into view.
   */
  export interface UiFocusScrollRequest {
    /**
     * Scope that owns the focused target.
     */
    scopeId: UiFocusScopeId

    /**
     * Target that should be visible.
     */
    targetId: UiFocusId

    /**
     * Scrollable area that should bring the target into view.
     */
    scrollOwnerId: UiFocusScrollOwnerId

    /**
     * Logical target rectangle to make visible.
     */
    targetRect: Rect

    /**
     * Focus is the reason for this scroll request.
     */
    reason: "focus"
  }

  /**
   * Target descriptor used by focus state operations.
   */
  export interface UiFocusTargetOptions {
    /**
     * Stable id for this target.
     */
    id: UiFocusId

    /**
     * Scope that owns this target.
     */
    scopeId: UiFocusScopeId

    /**
     * Final target rectangle in logical viewport coordinates.
     */
    rect: Rect

    /**
     * Whether focus and activation reject this target.
     */
    disabled?: boolean

    /**
     * Whether focus, activation, and hit testing ignore this target.
     */
    hidden?: boolean

    /**
     * Whether `activate()` can return an activated result for this target.
     */
    activatable?: boolean

    /**
     * Scrollable area to include in focus scroll requests for this target.
     */
    scrollOwnerId?: UiFocusScrollOwnerId

    /**
     * Stacking order for overlapping hit tests. Larger values win.
     */
    hitTestOrder?: number
  }

  /**
   * Scope descriptor used by focus state operations.
   */
  export interface UiFocusScopeOptions {
    /**
     * Stable id for this scope.
     */
    id: UiFocusScopeId

    /**
     * Optional parent scope id for nested focus scopes.
     */
    parentScopeId?: UiFocusScopeId

    /**
     * Target to focus when this scope is activated with no stored active target.
     */
    preferredTargetId?: UiFocusId

    /**
     * Whether directional focus movement may wrap inside this scope.
     */
    wrap?: boolean

    /**
     * Whether `cancel()` returns a handled result for this scope.
     */
    handlesCancel?: boolean
  }

  /**
   * Result returned by focus-setting operations.
   */
  export type UiFocusSetResult =
    | {
        kind: "focused"
        scopeId: UiFocusScopeId
        targetId: UiFocusId
        previousScopeId?: UiFocusScopeId
        previousTargetId?: UiFocusId
        scrollRequest?: UiFocusScrollRequest
      }
    | {
        kind: "cleared"
        scopeId?: UiFocusScopeId
        previousScopeId?: UiFocusScopeId
        previousTargetId?: UiFocusId
      }
    | {
        kind: "unchanged"
        scopeId?: UiFocusScopeId
        targetId?: UiFocusId
        reason: "alreadyFocused" | "alreadyClear" | "empty"
      }
    | {
        kind: "rejected"
        scopeId?: UiFocusScopeId
        targetId?: UiFocusId
        reason: "missingScope" | "missingTarget" | "scopeMismatch" | "disabled" | "hidden"
      }

  /**
   * Result returned by directional focus movement.
   */
  export type UiFocusMoveResult =
    | {
        kind: "moved"
        fromScopeId: UiFocusScopeId
        fromTargetId?: UiFocusId
        toScopeId: UiFocusScopeId
        toTargetId: UiFocusId
        scrollRequest?: UiFocusScrollRequest
      }
    | {
        kind: "stayed"
        scopeId?: UiFocusScopeId
        targetId?: UiFocusId
        reason: "boundary" | "empty" | "missingActive"
      }
    | {
        kind: "exited"
        scopeId: UiFocusScopeId
        targetId?: UiFocusId
        direction: UiFocusDirection
      }

  /**
   * Result returned when the current focus is activated.
   */
  export type UiFocusActivationResult =
    | { kind: "activated"; scopeId: UiFocusScopeId; targetId: UiFocusId }
    | {
        kind: "notActivated"
        scopeId?: UiFocusScopeId
        targetId?: UiFocusId
        reason: "missingActive" | "missingTarget" | "disabled" | "hidden" | "notActivatable"
      }

  /**
   * Result returned when cancellation is requested.
   */
  export type UiFocusCancelResult =
    | { kind: "handled"; scopeId: UiFocusScopeId }
    | { kind: "unhandled"; scopeId?: UiFocusScopeId; reason: "missingActiveScope" | "notHandled" }

  /**
   * Result returned by read-only logical hit testing.
   */
  export type UiFocusHitTestResult =
    | { kind: "hit"; scopeId: UiFocusScopeId; targetId: UiFocusId; disabled: boolean }
    | { kind: "miss"; reason: "empty" | "outside" }

  /**
   * Result returned when a target descriptor is accepted or rejected.
   */
  export type UiFocusTargetUpdateResult =
    | { kind: "stored"; scopeId: UiFocusScopeId; targetId: UiFocusId }
    | { kind: "rejected"; scopeId?: UiFocusScopeId; targetId: UiFocusId; reason: "missingScope" }

  class UiFocusScopeRecord {
    public id: UiFocusScopeId
    public parentScopeId: UiFocusScopeId | undefined
    public preferredTargetId: UiFocusId | undefined
    public wrap: boolean
    public handlesCancel: boolean
    public activeTargetId: UiFocusId | undefined

    constructor(options: UiFocusScopeOptions) {
      this.id = options.id
      this.parentScopeId = options.parentScopeId
      this.preferredTargetId = options.preferredTargetId
      this.wrap = options.wrap || false
      this.handlesCancel = options.handlesCancel || false
      this.activeTargetId = undefined
    }

    public update(options: UiFocusScopeOptions): void {
      this.parentScopeId = options.parentScopeId
      this.preferredTargetId = options.preferredTargetId
      this.wrap = options.wrap || false
      this.handlesCancel = options.handlesCancel || false
    }
  }

  class UiFocusTargetRecord {
    public id: UiFocusId
    public scopeId: UiFocusScopeId
    public rect: Rect
    public disabled: boolean
    public hidden: boolean
    public activatable: boolean
    public scrollOwnerId: UiFocusScrollOwnerId | undefined
    public hitTestOrder: number
    public updateOrder: number

    constructor(options: UiFocusTargetOptions, updateOrder: number) {
      this.id = options.id
      this.scopeId = options.scopeId
      this.rect = new Rect()
      this.disabled = false
      this.hidden = false
      this.activatable = false
      this.scrollOwnerId = undefined
      this.hitTestOrder = 0
      this.updateOrder = updateOrder
      this.update(options, updateOrder)
    }

    public update(options: UiFocusTargetOptions, updateOrder: number): void {
      this.scopeId = options.scopeId
      copyArrangedLayoutRect(this.rect, options.rect)
      this.disabled = options.disabled || false
      this.hidden = options.hidden || false
      this.activatable = options.activatable || false
      this.scrollOwnerId = options.scrollOwnerId
      this.hitTestOrder = _uiLayout.sanitizeCoordinate(options.hitTestOrder)
      this.updateOrder = updateOrder
    }
  }

  /**
   * Stores focus scopes, targets, and the current active focus.
   */
  export class UiFocusState {
    private scopes_: UiFocusScopeRecord[]
    private targets_: UiFocusTargetRecord[]
    private activeScopeId_: UiFocusScopeId | undefined
    private nextUpdateOrder_: number

    constructor() {
      this.scopes_ = []
      this.targets_ = []
      this.activeScopeId_ = undefined
      this.nextUpdateOrder_ = 1
    }

    /**
     * Creates or replaces a focus scope descriptor.
     */
    public setScope(options: UiFocusScopeOptions): void {
      const scope = this.findScope(options.id)
      if (scope) {
        scope.update(options)
        if (!this.isTargetEligible(scope.activeTargetId, scope.id)) {
          scope.activeTargetId = undefined
        }
      } else {
        this.scopes_.push(new UiFocusScopeRecord(options))
      }
    }

    /**
     * Removes a scope, its targets, and active focus for that scope.
     */
    public removeScope(id: UiFocusScopeId): void {
      const scopeIndex = this.findScopeIndex(id)
      if (scopeIndex < 0) return

      this.scopes_.removeAt(scopeIndex)
      for (let i = this.targets_.length - 1; i >= 0; i--) {
        if (this.targets_[i].scopeId == id) this.targets_.removeAt(i)
      }

      if (this.activeScopeId_ == id) {
        this.activeScopeId_ = undefined
      }
    }

    /**
     * Creates or replaces a focus target descriptor.
     */
    public setTarget(options: UiFocusTargetOptions): UiFocusTargetUpdateResult {
      if (!this.findScope(options.scopeId)) {
        return { kind: "rejected", scopeId: options.scopeId, targetId: options.id, reason: "missingScope" }
      }

      const target = this.findTarget(options.id)
      const oldScopeId = target ? target.scopeId : undefined
      const updateOrder = this.nextUpdateOrder_
      this.nextUpdateOrder_++

      if (target) {
        target.update(options, updateOrder)
      } else {
        this.targets_.push(new UiFocusTargetRecord(options, updateOrder))
      }

      if (oldScopeId && oldScopeId != options.scopeId) {
        this.clearRetainedActiveTarget(oldScopeId, options.id)
      }

      if (!this.isTargetEligible(options.id, options.scopeId)) {
        this.clearRetainedActiveTarget(options.scopeId, options.id)
      }

      return { kind: "stored", scopeId: options.scopeId, targetId: options.id }
    }

    /**
     * Removes a target and clears active focus if that target was active.
     */
    public removeTarget(id: UiFocusId): void {
      const targetIndex = this.findTargetIndex(id)
      if (targetIndex < 0) return

      const scopeId = this.targets_[targetIndex].scopeId
      this.targets_.removeAt(targetIndex)
      this.clearRetainedActiveTarget(scopeId, id)
    }

    /**
     * Removes all scopes, targets, and active focus.
     */
    public clear(): void {
      while (this.scopes_.length) this.scopes_.pop()
      while (this.targets_.length) this.targets_.pop()
      this.activeScopeId_ = undefined
      this.nextUpdateOrder_ = 1
    }

    /**
     * Returns the current active scope id.
     */
    public getActiveScopeId(): UiFocusScopeId | undefined {
      return this.activeScopeId_
    }

    /**
     * Returns the stored active target for a scope.
     */
    public getActiveTargetId(scopeId?: UiFocusScopeId): UiFocusId | undefined {
      const resolvedScopeId = scopeId === undefined ? this.activeScopeId_ : scopeId
      const scope = this.findScope(resolvedScopeId)
      return scope ? scope.activeTargetId : undefined
    }

    /**
     * Makes a scope active and focuses its stored or preferred target when available.
     */
    public setActiveScope(scopeId: UiFocusScopeId): UiFocusSetResult {
      const scope = this.findScope(scopeId)
      if (!scope) return { kind: "rejected", scopeId, reason: "missingScope" }

      const previousScopeId = this.activeScopeId_
      const previousTargetId = this.getActiveTargetId()
      let targetId = this.eligibleActiveTargetId(scope)
      if (!targetId) targetId = this.eligiblePreferredTargetId(scope)

      if (targetId) {
        if (this.activeScopeId_ == scopeId && scope.activeTargetId == targetId) {
          return { kind: "unchanged", scopeId, targetId, reason: "alreadyFocused" }
        }
        scope.activeTargetId = targetId
        this.activeScopeId_ = scopeId
        return this.focusedResult(scopeId, targetId, previousScopeId, previousTargetId)
      }

      this.activeScopeId_ = scopeId
      return { kind: "unchanged", scopeId, reason: "empty" }
    }

    /**
     * Clears the active scope without clearing each scope's stored active target.
     */
    public clearActiveScope(): UiFocusSetResult {
      if (this.activeScopeId_ === undefined) {
        return { kind: "unchanged", reason: "alreadyClear" }
      }

      const previousScopeId = this.activeScopeId_
      const previousTargetId = this.getActiveTargetId()
      this.activeScopeId_ = undefined
      return { kind: "cleared", scopeId: previousScopeId, previousScopeId, previousTargetId }
    }

    /**
     * Makes a target active within its scope.
     */
    public setActiveTarget(scopeId: UiFocusScopeId, targetId: UiFocusId): UiFocusSetResult {
      const scope = this.findScope(scopeId)
      if (!scope) return { kind: "rejected", scopeId, targetId, reason: "missingScope" }

      const target = this.findTarget(targetId)
      if (!target) return { kind: "rejected", scopeId, targetId, reason: "missingTarget" }
      if (target.scopeId != scopeId) return { kind: "rejected", scopeId, targetId, reason: "scopeMismatch" }
      if (target.disabled) return { kind: "rejected", scopeId, targetId, reason: "disabled" }
      if (target.hidden) return { kind: "rejected", scopeId, targetId, reason: "hidden" }

      if (this.activeScopeId_ == scopeId && scope.activeTargetId == targetId) {
        return { kind: "unchanged", scopeId, targetId, reason: "alreadyFocused" }
      }

      const previousScopeId = this.activeScopeId_
      const previousTargetId = this.getActiveTargetId()
      scope.activeTargetId = targetId
      this.activeScopeId_ = scopeId
      return this.focusedResult(scopeId, targetId, previousScopeId, previousTargetId)
    }

    /**
     * Clears the stored active target for one scope.
     */
    public clearActiveTarget(scopeId: UiFocusScopeId): UiFocusSetResult {
      const scope = this.findScope(scopeId)
      if (!scope) return { kind: "rejected", scopeId, reason: "missingScope" }
      if (scope.activeTargetId === undefined) {
        return { kind: "unchanged", scopeId, reason: "alreadyClear" }
      }

      const previousTargetId = scope.activeTargetId
      scope.activeTargetId = undefined
      return {
        kind: "cleared",
        scopeId,
        previousScopeId: this.activeScopeId_,
        previousTargetId
      }
    }

    /**
     * Copies a target's logical rectangle into `output`.
     */
    public getTargetRect(id: UiFocusId, output: Rect): boolean {
      const target = this.findTarget(id)
      if (!target) return false
      output.copyFrom(target.rect)
      return true
    }

    /**
     * Returns the topmost visible target at a logical point.
     */
    public hitTest(x: number, y: number): UiFocusHitTestResult {
      let best: UiFocusTargetRecord | undefined = undefined

      for (let i = 0; i < this.targets_.length; i++) {
        const target = this.targets_[i]
        if (target.hidden || !target.rect.contains(x, y)) continue
        if (!best || this.compareHitTestOrder(target, best) > 0) best = target
      }

      if (best) {
        return { kind: "hit", scopeId: best.scopeId, targetId: best.id, disabled: best.disabled }
      }

      return { kind: "miss", reason: this.targets_.length ? "outside" : "empty" }
    }

    /**
     * Reports whether the active target can be activated.
     */
    public activate(): UiFocusActivationResult {
      const scope = this.findScope(this.activeScopeId_)
      if (!scope || scope.activeTargetId === undefined) {
        return { kind: "notActivated", scopeId: this.activeScopeId_, reason: "missingActive" }
      }

      const target = this.findTarget(scope.activeTargetId)
      if (!target) {
        return { kind: "notActivated", scopeId: scope.id, targetId: scope.activeTargetId, reason: "missingTarget" }
      }
      if (target.disabled) return { kind: "notActivated", scopeId: scope.id, targetId: target.id, reason: "disabled" }
      if (target.hidden) return { kind: "notActivated", scopeId: scope.id, targetId: target.id, reason: "hidden" }
      if (!target.activatable) {
        return { kind: "notActivated", scopeId: scope.id, targetId: target.id, reason: "notActivatable" }
      }

      return { kind: "activated", scopeId: scope.id, targetId: target.id }
    }

    /**
     * Reports whether the active scope handles cancellation.
     */
    public cancel(): UiFocusCancelResult {
      const scope = this.findScope(this.activeScopeId_)
      if (!scope) return { kind: "unhandled", scopeId: this.activeScopeId_, reason: "missingActiveScope" }
      if (!scope.handlesCancel) return { kind: "unhandled", scopeId: scope.id, reason: "notHandled" }
      return { kind: "handled", scopeId: scope.id }
    }

    private findScope(id: UiFocusScopeId | undefined): UiFocusScopeRecord | undefined {
      const index = this.findScopeIndex(id)
      return index >= 0 ? this.scopes_[index] : undefined
    }

    private findScopeIndex(id: UiFocusScopeId | undefined): number {
      if (id === undefined) return -1
      for (let i = 0; i < this.scopes_.length; i++) {
        if (this.scopes_[i].id == id) return i
      }
      return -1
    }

    private findTarget(id: UiFocusId | undefined): UiFocusTargetRecord | undefined {
      const index = this.findTargetIndex(id)
      return index >= 0 ? this.targets_[index] : undefined
    }

    private findTargetIndex(id: UiFocusId | undefined): number {
      if (id === undefined) return -1
      for (let i = 0; i < this.targets_.length; i++) {
        if (this.targets_[i].id == id) return i
      }
      return -1
    }

    private isTargetEligible(targetId: UiFocusId | undefined, scopeId: UiFocusScopeId): boolean {
      const target = this.findTarget(targetId)
      return !!target && target.scopeId == scopeId && !target.disabled && !target.hidden
    }

    private eligibleActiveTargetId(scope: UiFocusScopeRecord): UiFocusId | undefined {
      return this.isTargetEligible(scope.activeTargetId, scope.id) ? scope.activeTargetId : undefined
    }

    private eligiblePreferredTargetId(scope: UiFocusScopeRecord): UiFocusId | undefined {
      return this.isTargetEligible(scope.preferredTargetId, scope.id) ? scope.preferredTargetId : undefined
    }

    private clearRetainedActiveTarget(scopeId: UiFocusScopeId, targetId: UiFocusId): void {
      const scope = this.findScope(scopeId)
      if (scope && scope.activeTargetId == targetId) scope.activeTargetId = undefined
    }

    private focusedResult(
      scopeId: UiFocusScopeId,
      targetId: UiFocusId,
      previousScopeId: UiFocusScopeId | undefined,
      previousTargetId: UiFocusId | undefined
    ): UiFocusSetResult {
      const result: UiFocusSetResult = {
        kind: "focused",
        scopeId,
        targetId,
        previousScopeId,
        previousTargetId
      }
      const scrollRequest = this.buildScrollRequest(scopeId, targetId)
      if (scrollRequest) result.scrollRequest = scrollRequest
      return result
    }

    private buildScrollRequest(scopeId: UiFocusScopeId, targetId: UiFocusId): UiFocusScrollRequest | undefined {
      const target = this.findTarget(targetId)
      if (!target || target.scrollOwnerId === undefined) return undefined
      return {
        scopeId,
        targetId,
        scrollOwnerId: target.scrollOwnerId,
        targetRect: target.rect.clone(),
        reason: "focus"
      }
    }

    private compareHitTestOrder(a: UiFocusTargetRecord, b: UiFocusTargetRecord): number {
      if (a.hitTestOrder != b.hitTestOrder) return a.hitTestOrder - b.hitTestOrder
      return a.updateOrder - b.updateOrder
    }
  }
}
