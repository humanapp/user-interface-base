namespace ui {
  class UiActionHandlers {
    public action: UiInputAction
    public handlers: UiInputHandler[]

    constructor(action: UiInputAction) {
      this.action = action
      this.handlers = []
    }
  }

  class UiInputScopeState implements UiInputScope {
    private runtime_: UiRuntime
    private disposed_: boolean
    private actionHandlers_: UiActionHandlers[]

    constructor(runtime: UiRuntime) {
      this.runtime_ = runtime
      this.disposed_ = false
      this.actionHandlers_ = []
    }

    public onAction(action: UiInputAction, handler: UiInputHandler): void {
      if (this.disposed_) return

      let handlers = this.handlersForAction(action)
      if (!handlers) {
        handlers = new UiActionHandlers(action)
        this.actionHandlers_.push(handlers)
      }
      handlers.handlers.push(handler)
    }

    public dispose(): void {
      this.disposed_ = true
      for (let i = 0; i < this.actionHandlers_.length; i++) {
        while (this.actionHandlers_[i].handlers.length) this.actionHandlers_[i].handlers.pop()
      }
      while (this.actionHandlers_.length) this.actionHandlers_.pop()
    }

    public dispatchAction(action: UiInputAction, source?: UiInputSource, phase?: UiInputPhase): void {
      if (this.disposed_) return
      this.runtime_.dispatchInput({ action, source, phase })
    }

    public deliver(event: UiInputEvent): boolean {
      if (this.disposed_) return false

      const handlers = this.handlersForAction(event.action)
      if (!handlers) return false

      for (let i = 0; i < handlers.handlers.length; i++) {
        if (handlers.handlers[i](event)) return true
      }
      return false
    }

    private handlersForAction(action: UiInputAction): UiActionHandlers | undefined {
      for (let i = 0; i < this.actionHandlers_.length; i++) {
        const handlers = this.actionHandlers_[i]
        if (handlers.action == action) return handlers
      }
      return undefined
    }
  }

  class UiSceneRecord {
    public screen: UiScreen
    public input: UiInputScopeState

    constructor(screen: UiScreen, input: UiInputScopeState) {
      this.screen = screen
      this.input = input
    }
  }

  /**
   * Stack that owns screen lifecycle and input scopes.
   */
  export class UiSceneStack {
    private runtime_: UiRuntime
    private records_: UiSceneRecord[]

    constructor(runtime: UiRuntime) {
      this.runtime_ = runtime
      this.records_ = []
    }

    /**
     * Pushes a screen and makes it active.
     */
    public push(screen: UiScreen): void {
      this.runtime_.clearInputQueue()

      const current = this.topRecord()
      if (current && current.screen.deactivate) current.screen.deactivate()

      context.pushEventContext()
      const input = new UiInputScopeState(this.runtime_)
      this.bindDefaultControllerActions(input)

      const record = new UiSceneRecord(screen, input)
      this.records_.push(record)

      if (screen.enter) screen.enter(this.runtime_, input)
      if (screen.activate) screen.activate()
    }

    /**
     * Removes the active screen and reactivates the screen below it. Returns
     * `undefined` when the stack is empty.
     */
    public pop(): UiScreen | undefined {
      this.runtime_.clearInputQueue()

      const record = this.records_.pop()
      if (!record) return undefined

      if (record.screen.deactivate) record.screen.deactivate()
      if (record.screen.exit) record.screen.exit()
      record.input.dispose()
      context.popEventContext()

      const current = this.topRecord()
      if (current && current.screen.activate) current.screen.activate()

      return record.screen
    }

    /**
     * Replaces the active screen without reactivating the screen below it.
     * Returns `undefined` when the stack is empty.
     */
    public replace(screen: UiScreen): UiScreen | undefined {
      this.runtime_.clearInputQueue()

      const replaced = this.records_.pop()
      if (replaced) {
        if (replaced.screen.deactivate) replaced.screen.deactivate()
        if (replaced.screen.exit) replaced.screen.exit()
        replaced.input.dispose()
        context.popEventContext()
      }

      context.pushEventContext()
      const input = new UiInputScopeState(this.runtime_)
      this.bindDefaultControllerActions(input)

      const record = new UiSceneRecord(screen, input)
      this.records_.push(record)

      if (screen.enter) screen.enter(this.runtime_, input)
      if (screen.activate) screen.activate()

      return replaced ? replaced.screen : undefined
    }

    /**
     * Returns the active screen, or `undefined` when the stack is empty.
     */
    public top(): UiScreen | undefined {
      const record = this.topRecord()
      return record ? record.screen : undefined
    }

    /**
     * Returns the number of screens in the stack.
     */
    public depth(): number {
      return this.records_.length
    }

    /**
     * Delivers queued input, updates, renders, and commits the active screen.
     */
    public runFrame(queue: UiInputEvent[], display: UiDisplayAdapter, clearColor: number): void {
      if (!this.topRecord()) {
        this.clearInputQueue(queue)
        return
      }

      this.deliverQueuedInput(queue)

      const active = this.topRecord()
      if (!active) {
        this.clearInputQueue(queue)
        return
      }

      if (active.screen.update) active.screen.update()

      const color =
        active.screen.backgroundColor !== undefined ? active.screen.backgroundColor : clearColor
      display.surface.clear(color)
      active.screen.render(display.surface)
      display.commit()
    }

    private deliverQueuedInput(queue: UiInputEvent[]): void {
      const record = this.topRecord()
      if (!record) {
        this.clearInputQueue(queue)
        return
      }

      let index = 0
      while (index < queue.length && this.topRecord() == record) {
        const event = queue[index++]
        const consumed = record.input.deliver(event)
        if (!consumed && record.screen.handleInput) record.screen.handleInput(event)
      }

      this.clearInputQueue(queue)
    }

    private topRecord(): UiSceneRecord | undefined {
      if (!this.records_.length) return undefined
      return this.records_[this.records_.length - 1]
    }

    private clearInputQueue(queue: UiInputEvent[]): void {
      while (queue.length) queue.pop()
    }

    private bindDefaultControllerActions(input: UiInputScopeState): void {
      this.bindDefaultControllerAction(input, controller.up.id, "up")
      this.bindDefaultControllerAction(input, controller.down.id, "down")
      this.bindDefaultControllerAction(input, controller.left.id, "left")
      this.bindDefaultControllerAction(input, controller.right.id, "right")
      this.bindDefaultControllerAction(input, controller.A.id, "activate")
      this.bindDefaultControllerAction(input, controller.B.id, "cancel")
      this.bindDefaultControllerAction(input, controller.menu.id, "menu")
    }

    private bindDefaultControllerAction(input: UiInputScopeState, buttonId: number, action: UiInputAction): void {
      context.onEvent(ControllerButtonEvent.Pressed, buttonId, () => {
        input.dispatchAction(action, "displayShieldController", "pressed")
      })
      context.onEvent(ControllerButtonEvent.Released, buttonId, () => {
        input.dispatchAction(action, "displayShieldController", "released")
      })
      context.onEvent(ControllerButtonEvent.Repeated, buttonId, () => {
        input.dispatchAction(action, "displayShieldController", "repeated")
      })
    }
  }
}
