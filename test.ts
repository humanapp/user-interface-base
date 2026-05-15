namespace ui {
  /**
   * Smoke harness for logical viewport drawing and scale-mode rendering.
   */
  export function renderLogicalViewportSmokeTest(): void {
    const adapter = new DisplayShieldFrameAdapter({ scaleMode: "cover" })
    const surface = adapter.surface
    const coverScale = physicalViewportScale(160, 100, "cover")
    const fitScale = physicalViewportScale(160, 100, "fit")

    control.assert(coverScale == 0.5, "cover scale")
    control.assert(physicalViewportOffsetY(160, 100, "cover") == -10, "cover clip")
    control.assert(fitScale > 0.416 && fitScale < 0.417, "fit scale")
    control.assert(physicalViewportOffsetX(160, 100, "fit") > 13, "fit bars")

    surface.setScaleMode("fit")
    surface.clear(0)
    surface.drawRect(new Rect(8, 8, 304, 224), 1)
    surface.drawText(`fit (${screen().width}x${screen().height})`, 24, 24, { color: 1 })
    adapter.commit()

    surface.setScaleMode("cover")
    surface.clear(1)
    surface.fillRect(new Rect(0, 0, LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT), 2)
    surface.drawRect(new Rect(8, 8, 304, 224), 15)
    surface.drawLine(0, 0, LOGICAL_VIEWPORT_WIDTH - 1, LOGICAL_VIEWPORT_HEIGHT - 1, 7)
    surface.drawCircle(160, 120, 36, 10)
    surface.fillCircle(160, 120, 12, 5)
    surface.drawBitmap(
      bmp`
        9 . . 9 . . 9
        . 9 . 9 . 9 .
        . . 9 9 9 . .
        9 9 9 9 9 9 9
        . . 9 9 9 . .
        . 9 . 9 . 9 .
        9 . . 9 . . 9
      `,
      144,
      152
    )
    surface.drawBitmap(
      bmp`
        9 9 9 9 9 9 9
        9 9 9 9 9 9 9
        9 9 . . . 9 9
        9 9 . . . 9 9
        9 9 . . . 9 9
        9 9 9 9 9 9 9
        9 9 9 9 9 9 9
      `,
      184,
      152,
      { allowDownscale: true }
    )
    surface.drawText(`cover (${screen().width}x${screen().height})`, 12, 12, { color: 0 })
    surface.drawText("downscaled text", 12, 36, { color: 0, allowDownscale: true })
    adapter.commit()
  }

  class RuntimeSmokeDisplayAdapter implements UiDisplayAdapter {
    private inner_: DisplayShieldFrameAdapter
    private onCommit_: () => void

    constructor(onCommit: () => void) {
      this.inner_ = new DisplayShieldFrameAdapter({ scaleMode: "cover" })
      this.onCommit_ = onCommit
    }

    public get surface(): DrawSurface {
      return this.inner_.surface
    }

    public commit(): Bitmap {
      this.onCommit_()
      return this.inner_.commit()
    }
  }

  class RuntimeSmokeScreen implements UiScreen {
    public backgroundColor: number
    public exitCount: number
    private prefix_: string
    private log_: (name: string) => void

    constructor(prefix: string, backgroundColor: number, log: (name: string) => void) {
      this.prefix_ = prefix
      this.backgroundColor = backgroundColor
      this.log_ = log
      this.exitCount = 0
    }

    public enter(runtime: UiRuntime, input: UiInputScope): void {
      this.log_(this.prefix_ + "enter")
      input.onAction("activate", (event: UiInputEvent) => {
        this.log_(this.prefix_ + "scope")
        return true
      })
    }

    public exit(): void {
      this.exitCount++
      this.log_(this.prefix_ + "exit")
    }

    public activate(): void {
      this.log_(this.prefix_ + "activate")
    }

    public deactivate(): void {
      this.log_(this.prefix_ + "deactivate")
    }

    public handleInput(event: UiInputEvent): boolean {
      this.log_(this.prefix_ + "handle")
      return false
    }

    public update(): void {
      this.log_(this.prefix_ + "update")
    }

    public render(surface: DrawSurface): void {
      this.log_(this.prefix_ + "render")
      surface.drawText(this.prefix_, 16, 16, { color: 15 })
    }
  }

  /**
   * Smoke harness for runtime stack lifecycle and scoped input delivery.
   */
  export function runRuntimeSmokeTest(): void {
    let log = ""
    const appendLog = (name: string) => {
      log += name + ";"
    }
    const display = new RuntimeSmokeDisplayAdapter(() => appendLog("commit"))
    const runtime = new UiRuntime({ display, clearColor: 0 })
    const base = new RuntimeSmokeScreen("base", 1, appendLog)
    const overlay = new RuntimeSmokeScreen("overlay", 2, appendLog)
    const replacement = new RuntimeSmokeScreen("replace", 3, appendLog)

    runtime.push(base)
    control.assert(log == "baseenter;baseactivate;", "base push order")

    runtime.push(overlay)
    control.assert(base.exitCount == 0, "covered screen not exited")
    control.assert(
      log == "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;",
      "overlay push order"
    )

    runtime.dispatchInput({ action: "activate" })
    runtime.runFrame()
    control.assert(
      log ==
        "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
        "overlayscope;overlayupdate;overlayrender;commit;",
      "input frame order"
    )

    runtime.pop()
    control.assert(overlay.exitCount == 1, "popped screen exited")
    control.assert(runtime.top() == base, "base restored")
    control.assert(
      log ==
        "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
        "overlayscope;overlayupdate;overlayrender;commit;" +
        "overlaydeactivate;overlayexit;baseactivate;",
      "pop order"
    )

    runtime.dispatchInput({ action: "activate" })
    runtime.runFrame()
    control.assert(
      log ==
        "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
        "overlayscope;overlayupdate;overlayrender;commit;" +
        "overlaydeactivate;overlayexit;baseactivate;" +
        "basescope;baseupdate;baserender;commit;",
      "popped input disposed"
    )

    runtime.replace(replacement)
    control.assert(runtime.top() == replacement, "replacement active")
    runtime.pop()
    control.assert(runtime.depth() == 0, "stack empty")
  }
}

ui.renderLogicalViewportSmokeTest()
ui.runRuntimeSmokeTest()

control.__log(1, "All tests passed!")