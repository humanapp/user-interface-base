namespace ui {
  /**
   * Display target that exposes a logical draw surface and presents frames.
   */
  export interface UiDisplayAdapter {
    /**
     * Logical drawing surface for the next committed frame.
     */
    surface: DrawSurface

    /**
     * Presents the current frame and returns the physical bitmap that was sent.
     */
    commit(): Bitmap
  }

  /**
   * Resolves optional bitmap and text assets by id.
   */
  export interface UiAssetResolver {
    /**
     * Looks up a bitmap by asset id.
     *
     * Missing ids return a resolver-owned fallback bitmap by default. When
     * `nullIfMissing` is `true`, missing ids may return `undefined`; callers
     * must handle both bitmap and `undefined` results.
     */
    getBitmap(id: string | number, nullIfMissing?: boolean): Bitmap | undefined

    /**
     * Returns display text for an asset id. Missing text returns the empty
     * string.
     */
    getText(id: string): string
  }

  /**
   * Sink for accessibility announcements.
   */
  export interface UiAccessibilitySink {
    /**
     * Publishes an accessibility message.
     */
    publish(message: string): void
  }

  /**
   * Sink for named profiling marks.
   */
  export interface UiProfiler {
    /**
     * Records a named profiling mark.
     */
    mark(name: string): void
  }

  /**
   * Frame scheduling hook for integrations with an automatic frame pump.
   */
  export interface UiScheduler {
    /**
     * Requests that a frame handler run later.
     */
    requestFrame(handler: () => void): void
  }

  /**
   * Runtime dependency bundle.
   */
  export interface UiRuntimeServices {
    /**
     * Required display adapter for frame rendering and commit.
     */
    display: UiDisplayAdapter

    /**
     * Bitmap and text resolver. Missing service uses an empty fallback resolver.
     */
    assets?: UiAssetResolver

    /**
     * Accessibility message sink. Missing service drops messages.
     */
    accessibility?: UiAccessibilitySink

    /**
     * Profiling sink. Missing service drops marks.
     */
    profiler?: UiProfiler

    /**
     * Frame scheduler. Missing service requires manual `runFrame()` calls.
     */
    scheduler?: UiScheduler

    /**
     * Palette color used when a screen has no background color. Defaults to `0`.
     */
    clearColor?: number
  }

  /**
   * Screen that can be pushed onto a runtime stack.
   */
  export interface UiScreen {
    /**
     * Palette color used to clear before rendering. Omitted screens use the
     * runtime clear color.
     */
    backgroundColor?: number

    /**
     * Called after the screen has an input scope and controller bindings.
     */
    enter?: (runtime: UiRuntime, input: UiInputScope) => void

    /**
     * Called after the screen is removed from the stack.
     */
    exit?: () => void

    /**
     * Called when the screen becomes the active top screen.
     */
    activate?: () => void

    /**
     * Called before another screen becomes active over this screen.
     */
    deactivate?: () => void

    /**
     * Handles input that no registered scope handler consumed.
     */
    handleInput?: (event: UiInputEvent) => boolean

    /**
     * Updates state after input delivery and before rendering.
     */
    update?: () => void

    /**
     * Renders the active screen.
     */
    render(surface: DrawSurface): void
  }

  class UiNoopAssetResolver implements UiAssetResolver {
    private emptyBitmap_: Bitmap

    constructor() {
      this.emptyBitmap_ = bmp`.`
    }

    public getBitmap(id: string | number, nullIfMissing?: boolean): Bitmap | undefined {
      if (nullIfMissing) return undefined
      return this.emptyBitmap_
    }

    public getText(id: string): string {
      return ""
    }
  }

  class UiNoopAccessibilitySink implements UiAccessibilitySink {
    public publish(message: string): void {
    }
  }

  class UiNoopProfiler implements UiProfiler {
    public mark(name: string): void {
    }
  }

  class UiManualScheduler implements UiScheduler {
    public requestFrame(handler: () => void): void {
    }
  }

  /**
   * Owns screen stack state, queued input, and frame execution.
   */
  export class UiRuntime {
    private display_: UiDisplayAdapter
    private assets_: UiAssetResolver
    private accessibility_: UiAccessibilitySink
    private profiler_: UiProfiler
    private scheduler_: UiScheduler
    private clearColor_: number
    private stack_: UiSceneStack
    private inputQueue_: UiInputEvent[]

    constructor(services: UiRuntimeServices) {
      this.display_ = services.display
      this.assets_ = services.assets || new UiNoopAssetResolver()
      this.accessibility_ = services.accessibility || new UiNoopAccessibilitySink()
      this.profiler_ = services.profiler || new UiNoopProfiler()
      this.scheduler_ = services.scheduler || new UiManualScheduler()
      this.clearColor_ = services.clearColor !== undefined ? services.clearColor : 0
      this.inputQueue_ = []
      this.stack_ = new UiSceneStack(this)
    }

    /**
     * Display target used for rendering and frame commit.
     */
    public get display(): UiDisplayAdapter {
      return this.display_
    }

    /**
     * Asset resolver for screens and controls.
     */
    public get assets(): UiAssetResolver {
      return this.assets_
    }

    /**
     * Accessibility announcement sink.
     */
    public get accessibility(): UiAccessibilitySink {
      return this.accessibility_
    }

    /**
     * Profiling mark sink.
     */
    public get profiler(): UiProfiler {
      return this.profiler_
    }

    /**
     * Frame scheduling hook.
     */
    public get scheduler(): UiScheduler {
      return this.scheduler_
    }

    /**
     * Stack that controls active screen lifecycle.
     */
    public get scenes(): UiSceneStack {
      return this.stack_
    }

    /**
     * Pushes a screen and makes it active.
     */
    public push(screen: UiScreen): void {
      this.stack_.push(screen)
    }

    /**
     * Removes the active screen and reactivates the screen below it. Returns
     * `undefined` when the stack is empty.
     */
    public pop(): UiScreen | undefined {
      return this.stack_.pop()
    }

    /**
     * Replaces the active screen without reactivating the screen below it.
     * Returns `undefined` when the stack is empty.
     */
    public replace(screen: UiScreen): UiScreen | undefined {
      return this.stack_.replace(screen)
    }

    /**
     * Returns the active screen, or `undefined` when the stack is empty.
     */
    public top(): UiScreen | undefined {
      return this.stack_.top()
    }

    /**
     * Returns the number of screens in the stack.
     */
    public depth(): number {
      return this.stack_.depth()
    }

    /**
     * Queues an input event for the next frame.
     */
    public dispatchInput(event: UiInputEvent): void {
      this.inputQueue_.push(event)
    }

    /**
     * Drops all queued input events.
     */
    public clearInputQueue(): void {
      while (this.inputQueue_.length) this.inputQueue_.pop()
    }

    /**
     * Delivers queued input, updates, renders, and commits the active screen.
     */
    public runFrame(): void {
      this.stack_.runFrame(this.inputQueue_, this.display_, this.clearColor_)
    }
  }
}
