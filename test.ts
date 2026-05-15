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

  class LayoutSmokeNode implements UiLayoutNode {
    public readonly layoutSpec: UiLayoutSpec
    public readonly finalRect: Rect
    public layoutDirty: boolean
    public receivedMaxWidth: number
    public receivedMaxHeight: number
    private contentMinWidth_: number
    private contentMinHeight_: number
    private contentPreferredWidth_: number
    private contentPreferredHeight_: number

    constructor(
      layoutSpec: UiLayoutSpec,
      contentMinWidth: number,
      contentMinHeight: number,
      contentPreferredWidth: number,
      contentPreferredHeight: number
    ) {
      this.layoutSpec = layoutSpec
      this.finalRect = new Rect()
      this.layoutDirty = true
      this.receivedMaxWidth = 0
      this.receivedMaxHeight = 0
      this.contentMinWidth_ = contentMinWidth
      this.contentMinHeight_ = contentMinHeight
      this.contentPreferredWidth_ = contentPreferredWidth
      this.contentPreferredHeight_ = contentPreferredHeight
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      this.receivedMaxWidth = constraints.maxWidth
      this.receivedMaxHeight = constraints.maxHeight
      measureLayoutSpec(
        this.layoutSpec,
        constraints,
        this.contentMinWidth_,
        this.contentMinHeight_,
        this.contentPreferredWidth_,
        this.contentPreferredHeight_,
        output
      )
      this.clearLayoutInvalidation()
    }

    public arrange(rect: Rect): void {
      copyArrangedLayoutRect(this.finalRect, rect)
      this.clearLayoutInvalidation()
    }

    public invalidateLayout(): void {
      this.layoutDirty = true
    }

    public clearLayoutInvalidation(): void {
      this.layoutDirty = false
    }
  }

  class CountingLayoutSmokeNode extends LayoutSmokeNode {
    public measureCount: number
    public arrangeCount: number

    constructor(layoutSpec: UiLayoutSpec, width: number, height: number) {
      super(layoutSpec, width, height, width, height)
      this.measureCount = 0
      this.arrangeCount = 0
    }

    public measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void {
      this.measureCount++
      super.measure(constraints, output)
    }

    public arrange(rect: Rect): void {
      this.arrangeCount++
      super.arrange(rect)
    }
  }

  /**
   * Smoke harness for measured layout contracts and final rectangle storage.
   */
  export function runLayoutSmokeTest(): void {
    const measured = new UiMeasuredSize()
    const contentNode = new LayoutSmokeNode(
      {
        width: { mode: "content" },
        height: { mode: "content" }
      },
      12,
      5,
      30,
      10
    )

    contentNode.measure({ maxWidth: 40.4, maxHeight: 8.2 }, measured)
    control.assert(contentNode.receivedMaxWidth == 40.4, "content constraints width")
    control.assert(contentNode.receivedMaxHeight == 8.2, "content constraints height")
    control.assert(measured.minWidth == 12, "content min width")
    control.assert(measured.minHeight == 5, "content min height")
    control.assert(measured.preferredWidth == 30, "content preferred width")
    control.assert(measured.preferredHeight == 8, "content preferred height")
    control.assert(!contentNode.layoutDirty, "content measure clears dirty")

    contentNode.invalidateLayout()
    control.assert(contentNode.layoutDirty, "content invalidates")
    const arranged = new Rect(3.4, 4.6, 30.2, 8.8)
    contentNode.arrange(arranged)
    arranged.set(0, 0, 1, 1)
    control.assert(contentNode.finalRect.x == 3, "content final x")
    control.assert(contentNode.finalRect.y == 5, "content final y")
    control.assert(contentNode.finalRect.width == 30, "content final width")
    control.assert(contentNode.finalRect.height == 9, "content final height")

    const fixedNode = new LayoutSmokeNode(
      {
        width: { mode: "fixed", value: 99.4, min: 10, max: 44.2 },
        height: { mode: "fixed", value: -5, min: 7, max: 3 }
      },
      1,
      1,
      2,
      2
    )

    fixedNode.measure({ maxWidth: 40.6, maxHeight: 100 }, measured)
    control.assert(measured.minWidth == 41, "fixed constrained min width")
    control.assert(measured.preferredWidth == 41, "fixed constrained preferred width")
    control.assert(measured.minHeight == 7, "fixed constrained min height")
    control.assert(measured.preferredHeight == 7, "fixed constrained preferred height")

    fixedNode.arrange(new Rect(-2.2, 6.6, -8, 12.3))
    control.assert(fixedNode.finalRect.x == -2, "fixed final x")
    control.assert(fixedNode.finalRect.y == 7, "fixed final y")
    control.assert(fixedNode.finalRect.width == 0, "fixed final width")
    control.assert(fixedNode.finalRect.height == 12, "fixed final height")

    const fillNode = new LayoutSmokeNode(
      {
        width: { mode: "fill", min: 4 },
        height: { mode: "fill", max: 6.2 }
      },
      2,
      3,
      11,
      9
    )

    fillNode.measure({ maxWidth: 50, maxHeight: 50 }, measured)
    control.assert(measured.minWidth == 4, "fill min width")
    control.assert(measured.preferredWidth == 11, "fill preferred width")
    control.assert(measured.minHeight == 3, "fill min height")
    control.assert(measured.preferredHeight == 6, "fill preferred height")
  }

  function layoutContentSpec(): UiLayoutSpec {
    return {
      width: { mode: "content" },
      height: { mode: "content" }
    }
  }

  function layoutFixedSpec(width: number, height: number): UiLayoutSpec {
    return {
      width: { mode: "fixed", value: width },
      height: { mode: "fixed", value: height }
    }
  }

  function assertLayoutRect(rect: Rect, x: number, y: number, width: number, height: number, name: string): void {
    control.assert(rect.x == x, name + " x")
    control.assert(rect.y == y, name + " y")
    control.assert(rect.width == width, name + " width")
    control.assert(rect.height == height, name + " height")
  }

  /**
   * Smoke harness for primitive layout containers.
   */
  export function runPrimitiveLayoutSmokeTest(): void {
    const measured = new UiMeasuredSize()
    const storedRect = new Rect()

    const rowA = new LayoutSmokeNode(layoutContentSpec(), 10, 6, 20, 10)
    const rowB = new LayoutSmokeNode(
      {
        width: { mode: "fill" },
        height: { mode: "content" }
      },
      5,
      6,
      30,
      12
    )
    const rowC = new LayoutSmokeNode(
      {
        width: { mode: "fixed", value: 15 },
        height: { mode: "content" }
      },
      1,
      4,
      2,
      8
    )
    const row = new UiRowLayout({
      layoutSpec: layoutContentSpec(),
      children: [rowA, rowB],
      gap: 2,
      crossAxisAlignment: "start"
    })

    control.assert(row.childCount == 2, "row initial count")
    control.assert(row.childAt(0) == rowA, "row initial order")
    row.appendChild(rowC)
    control.assert(row.childCount == 3, "row appended count")
    control.assert(row.childAt(2) == rowC, "row appended order")
    control.assert(row.layoutDirty, "row append invalidates")
    row.arrange(new Rect(0, 0, 100, 20))
    assertLayoutRect(rowA.finalRect, 0, 0, 20, 10, "row A")
    assertLayoutRect(rowB.finalRect, 22, 0, 61, 12, "row B")
    assertLayoutRect(rowC.finalRect, 85, 0, 15, 8, "row C")

    const columnA = new LayoutSmokeNode(layoutContentSpec(), 20, 10, 20, 10)
    const columnB = new LayoutSmokeNode(layoutContentSpec(), 30, 15, 30, 15)
    const column = new UiColumnLayout({
      layoutSpec: layoutContentSpec(),
      children: [columnA, columnB],
      gap: 3,
      crossAxisAlignment: "center"
    })

    column.arrange(new Rect(10, 20, 40, 80))
    assertLayoutRect(columnA.finalRect, 20, 20, 20, 10, "column A")
    assertLayoutRect(columnB.finalRect, 15, 33, 30, 15, "column B")

    const paddedChild = new LayoutSmokeNode(layoutContentSpec(), 10, 10, 10, 10)
    const padding = new UiPaddingLayout({
      layoutSpec: layoutContentSpec(),
      child: paddedChild,
      padding: { top: 2, right: 4, bottom: 6, left: 8 }
    })

    padding.arrange(new Rect(0, 0, 60, 40))
    assertLayoutRect(paddedChild.finalRect, 8, 2, 48, 32, "padding child")

    const alignedChild = new LayoutSmokeNode(layoutContentSpec(), 20, 10, 20, 10)
    const align = new UiAlignLayout({
      layoutSpec: layoutContentSpec(),
      child: alignedChild,
      horizontalAlignment: "end",
      verticalAlignment: "center"
    })

    align.arrange(new Rect(0, 0, 60, 40))
    assertLayoutRect(alignedChild.finalRect, 40, 15, 20, 10, "align child")
    align.clearChild()
    control.assert(align.child === undefined, "align clear child")
    control.assert(align.layoutDirty, "align clear invalidates")

    const absoluteA = new LayoutSmokeNode(layoutContentSpec(), 1, 1, 1, 1)
    const absoluteB = new LayoutSmokeNode(layoutContentSpec(), 1, 1, 1, 1)
    const absolute = new UiAbsoluteLayout({
      layoutSpec: layoutContentSpec(),
      children: [
        { node: absoluteA, rect: new Rect(2, 3, 10, 11) },
        { node: absoluteB, rect: new Rect(30, 4, 15, 12) }
      ]
    })

    absolute.measure({ maxWidth: 100, maxHeight: 100 }, measured)
    control.assert(measured.minWidth == 45, "absolute min width")
    control.assert(measured.minHeight == 16, "absolute min height")
    control.assert(measured.preferredWidth == 45, "absolute preferred width")
    control.assert(measured.preferredHeight == 16, "absolute preferred height")
    control.assert(absolute.childRectAt(1, storedRect), "absolute stored rect exists")
    assertLayoutRect(storedRect, 30, 4, 15, 12, "absolute stored rect")
    storedRect.set(0, 0, 1, 1)
    control.assert(absolute.childRectAt(1, storedRect), "absolute stored rect copied")
    assertLayoutRect(storedRect, 30, 4, 15, 12, "absolute stored rect retained")
    control.assert(absolute.setChildRectAt(1, new Rect(30.4, 4.2, 15.1, 12.4)), "absolute set rect")
    control.assert(absolute.layoutDirty, "absolute set rect invalidates")
    control.assert(absolute.childRectAt(1, storedRect), "absolute updated rect copied")
    assertLayoutRect(storedRect, 30, 4, 15, 12, "absolute updated rect")
    absolute.arrange(new Rect(5, 7, 100, 50))
    assertLayoutRect(absoluteA.finalRect, 7, 10, 10, 11, "absolute A")
    assertLayoutRect(absoluteB.finalRect, 35, 11, 15, 12, "absolute B")

    const textButtonA = new LayoutSmokeNode(layoutContentSpec(), 48, 12, 48, 12)
    const textButtonB = new LayoutSmokeNode(layoutContentSpec(), 52, 12, 52, 12)
    const textButtons = new UiColumnLayout({
      layoutSpec: layoutContentSpec(),
      children: [textButtonA, textButtonB],
      gap: 2
    })
    const paddedTextButtons = new UiPaddingLayout({
      layoutSpec: layoutContentSpec(),
      child: textButtons,
      padding: 4
    })
    const centeredTextButtons = new UiAlignLayout({
      layoutSpec: layoutContentSpec(),
      child: paddedTextButtons,
      horizontalAlignment: "center",
      verticalAlignment: "center"
    })

    centeredTextButtons.arrange(new Rect(0, 0, 100, 60))
    assertLayoutRect(paddedTextButtons.finalRect, 20, 13, 60, 34, "text group padding")
    assertLayoutRect(textButtons.finalRect, 24, 17, 52, 26, "text group column")
    assertLayoutRect(textButtonA.finalRect, 24, 17, 48, 12, "text group A")
    assertLayoutRect(textButtonB.finalRect, 24, 31, 52, 12, "text group B")

    const toolbarA = new LayoutSmokeNode(layoutFixedSpec(16, 16), 1, 1, 1, 1)
    const toolbarB = new LayoutSmokeNode(layoutFixedSpec(16, 16), 1, 1, 1, 1)
    const toolbarC = new LayoutSmokeNode(layoutFixedSpec(16, 16), 1, 1, 1, 1)
    const toolbarRow = new UiRowLayout({
      layoutSpec: layoutContentSpec(),
      children: [toolbarA, toolbarB, toolbarC],
      gap: 4
    })
    const toolbarAbsolute = new UiAbsoluteLayout({
      layoutSpec: layoutContentSpec(),
      children: [{ node: toolbarRow, rect: new Rect(200, 8, 56, 16) }]
    })

    toolbarAbsolute.arrange(new Rect(0, 0, 320, 240))
    assertLayoutRect(toolbarA.finalRect, 200, 8, 16, 16, "toolbar A")
    assertLayoutRect(toolbarB.finalRect, 220, 8, 16, 16, "toolbar B")
    assertLayoutRect(toolbarC.finalRect, 240, 8, 16, 16, "toolbar C")

    const menuA = new LayoutSmokeNode(layoutFixedSpec(18, 18), 1, 1, 1, 1)
    const menuB = new LayoutSmokeNode(layoutFixedSpec(18, 18), 1, 1, 1, 1)
    const menuC = new LayoutSmokeNode(layoutFixedSpec(18, 18), 1, 1, 1, 1)
    const menuD = new LayoutSmokeNode(layoutFixedSpec(18, 18), 1, 1, 1, 1)
    const menuRow = new UiRowLayout({
      layoutSpec: layoutContentSpec(),
      children: [menuA, menuB, menuC, menuD],
      gap: 2
    })
    const menuAlign = new UiAlignLayout({
      layoutSpec: layoutContentSpec(),
      child: menuRow,
      horizontalAlignment: "center",
      verticalAlignment: "center"
    })

    menuAlign.arrange(new Rect(0, 0, 100, 30))
    assertLayoutRect(menuA.finalRect, 11, 6, 18, 18, "menu A")
    assertLayoutRect(menuB.finalRect, 31, 6, 18, 18, "menu B")
    assertLayoutRect(menuC.finalRect, 51, 6, 18, 18, "menu C")
    assertLayoutRect(menuD.finalRect, 71, 6, 18, 18, "menu D")
  }

  /**
   * Smoke harness for structured layout containers.
   */
  export function runStructuredLayoutSmokeTest(): void {
    const measured = new UiMeasuredSize()

    const pickerA = new LayoutSmokeNode(layoutFixedSpec(12, 10), 1, 1, 1, 1)
    const pickerB = new LayoutSmokeNode(layoutFixedSpec(20, 8), 1, 1, 1, 1)
    const pickerC = new LayoutSmokeNode(layoutFixedSpec(14, 18), 1, 1, 1, 1)
    const pickerD = new LayoutSmokeNode(layoutFixedSpec(16, 12), 1, 1, 1, 1)
    const pickerE = new LayoutSmokeNode(layoutFixedSpec(10, 14), 1, 1, 1, 1)
    const pickerGrid = new UiGridLayout({
      layoutSpec: layoutContentSpec(),
      columnCount: 3,
      children: [pickerA, pickerB, pickerC, pickerD],
      rowGap: 5,
      columnGap: 3,
      horizontalAlignment: "center",
      verticalAlignment: "center"
    })

    control.assert(pickerGrid.childCount == 4, "picker grid initial count")
    control.assert(pickerGrid.childAt(2) == pickerC, "picker grid order")
    pickerGrid.appendChild(pickerE)
    control.assert(pickerGrid.childCount == 5, "picker grid appended count")
    control.assert(pickerGrid.rowCount == 2, "picker grid row count")
    control.assert(pickerGrid.layoutDirty, "picker grid append invalidates")
    pickerGrid.measure({ maxWidth: 200, maxHeight: 100 }, measured)
    control.assert(measured.preferredWidth == 56, "picker grid preferred width")
    control.assert(measured.preferredHeight == 37, "picker grid preferred height")
    pickerGrid.arrange(new Rect(10, 10, 200, 100))
    assertLayoutRect(pickerA.finalRect, 12, 14, 12, 10, "picker grid A")
    assertLayoutRect(pickerB.finalRect, 29, 15, 20, 8, "picker grid B")
    assertLayoutRect(pickerC.finalRect, 52, 10, 14, 18, "picker grid C")
    assertLayoutRect(pickerD.finalRect, 10, 34, 16, 12, "picker grid D")
    assertLayoutRect(pickerE.finalRect, 34, 33, 10, 14, "picker grid E")

    const sensorA = new LayoutSmokeNode(layoutFixedSpec(72, 44), 1, 1, 1, 1)
    const sensorB = new LayoutSmokeNode(layoutFixedSpec(72, 44), 1, 1, 1, 1)
    const sensorC = new LayoutSmokeNode(layoutFixedSpec(72, 44), 1, 1, 1, 1)
    const sensorD = new LayoutSmokeNode(layoutFixedSpec(72, 44), 1, 1, 1, 1)
    const sensorGrid = new UiGridLayout({
      layoutSpec: layoutContentSpec(),
      columnCount: 2,
      children: [sensorA, sensorB, sensorC, sensorD],
      rowGap: 6,
      columnGap: 8
    })

    sensorGrid.arrange(new Rect(12, 70, 200, 120))
    assertLayoutRect(sensorA.finalRect, 12, 70, 72, 44, "sensor grid A")
    assertLayoutRect(sensorB.finalRect, 92, 70, 72, 44, "sensor grid B")
    assertLayoutRect(sensorC.finalRect, 12, 120, 72, 44, "sensor grid C")
    assertLayoutRect(sensorD.finalRect, 92, 120, 72, 44, "sensor grid D")

    const keyA = new LayoutSmokeNode(layoutFixedSpec(12, 10), 1, 1, 1, 1)
    const keyB = new LayoutSmokeNode(layoutFixedSpec(20, 14), 1, 1, 1, 1)
    const keyC = new LayoutSmokeNode(layoutFixedSpec(12, 8), 1, 1, 1, 1)
    const keyD = new LayoutSmokeNode(layoutFixedSpec(30, 12), 1, 1, 1, 1)
    const keyE = new LayoutSmokeNode(layoutFixedSpec(18, 6), 1, 1, 1, 1)
    const keyF = new LayoutSmokeNode(layoutFixedSpec(10, 8), 1, 1, 1, 1)
    const keyG = new LayoutSmokeNode(layoutFixedSpec(10, 8), 1, 1, 1, 1)
    const keyH = new LayoutSmokeNode(layoutFixedSpec(10, 8), 1, 1, 1, 1)
    const keyI = new LayoutSmokeNode(layoutFixedSpec(10, 8), 1, 1, 1, 1)
    const keyboard = new UiRaggedGridLayout({
      layoutSpec: layoutContentSpec(),
      rows: [[keyA, keyB]],
      rowGap: 3,
      columnGap: 2,
      verticalAlignment: "center"
    })

    control.assert(keyboard.rowCount == 1, "keyboard initial row count")
    control.assert(keyboard.childAt(0, 1) == keyB, "keyboard initial order")
    control.assert(keyboard.appendChildToRow(0, keyC), "keyboard append child")
    keyboard.appendRow([keyD, keyE])
    keyboard.appendRow([keyF, keyG, keyH, keyI])
    control.assert(keyboard.childCountInRow(0) == 3, "keyboard first row count")
    control.assert(keyboard.childAt(2, 3) == keyI, "keyboard appended order")
    keyboard.measure({ maxWidth: 200, maxHeight: 100 }, measured)
    control.assert(measured.preferredWidth == 50, "keyboard preferred width")
    control.assert(measured.preferredHeight == 40, "keyboard preferred height")
    keyboard.arrange(new Rect(40, 120, 200, 100))
    assertLayoutRect(keyA.finalRect, 40, 122, 12, 10, "keyboard A")
    assertLayoutRect(keyB.finalRect, 54, 120, 20, 14, "keyboard B")
    assertLayoutRect(keyC.finalRect, 76, 123, 12, 8, "keyboard C")
    assertLayoutRect(keyD.finalRect, 40, 137, 30, 12, "keyboard D")
    assertLayoutRect(keyE.finalRect, 72, 140, 18, 6, "keyboard E")
    assertLayoutRect(keyF.finalRect, 40, 152, 10, 8, "keyboard F")
    assertLayoutRect(keyG.finalRect, 52, 152, 10, 8, "keyboard G")
    assertLayoutRect(keyH.finalRect, 64, 152, 10, 8, "keyboard H")
    assertLayoutRect(keyI.finalRect, 76, 152, 10, 8, "keyboard I")

    const overlayContent = new LayoutSmokeNode(layoutContentSpec(), 320, 240, 320, 240)
    const overlayPanel = new LayoutSmokeNode(layoutFixedSpec(100, 80), 1, 1, 1, 1)
    const centeredPanel = new UiAlignLayout({
      layoutSpec: layoutContentSpec(),
      child: overlayPanel,
      horizontalAlignment: "center",
      verticalAlignment: "center"
    })
    const overlayStack = new UiStackLayout({
      layoutSpec: layoutContentSpec(),
      children: [overlayContent]
    })

    overlayStack.appendChild(centeredPanel)
    control.assert(overlayStack.childCount == 2, "overlay stack count")
    control.assert(overlayStack.childAt(0) == overlayContent, "overlay lower layer")
    control.assert(overlayStack.childAt(1) == centeredPanel, "overlay higher layer")
    overlayStack.measure({ maxWidth: 320, maxHeight: 240 }, measured)
    control.assert(measured.preferredWidth == 320, "overlay preferred width")
    control.assert(measured.preferredHeight == 240, "overlay preferred height")
    overlayStack.arrange(new Rect(0, 0, 320, 240))
    assertLayoutRect(overlayContent.finalRect, 0, 0, 320, 240, "overlay content")
    assertLayoutRect(centeredPanel.finalRect, 0, 0, 320, 240, "overlay panel layer")
    assertLayoutRect(overlayPanel.finalRect, 110, 80, 100, 80, "overlay panel")
  }

  /**
   * Smoke harness for scroll viewport geometry and bounded layout invalidation.
   */
  export function runScrollLayoutSmokeTest(): void {
    const measured = new UiMeasuredSize()
    const viewportRect = new Rect()
    const contentRect = new Rect()
    const visibleContentRect = new Rect()
    const padding = { top: 2, right: 3, bottom: 4, left: 5 }

    const editorRows = new UiColumnLayout({
      layoutSpec: layoutContentSpec(),
      children: [
        new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1),
        new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1),
        new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1),
        new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1),
        new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1)
      ],
      gap: 2
    })
    const editorScroll = new UiScrollViewportLayout({
      layoutSpec: layoutContentSpec(),
      child: editorRows,
      padding
    })

    editorScroll.measure({ maxWidth: 80, maxHeight: 50 }, measured)
    control.assert(measured.preferredWidth == 80, "editor scroll preferred width")
    control.assert(measured.preferredHeight == 50, "editor scroll preferred height")
    editorScroll.arrange(new Rect(10, 20, 80, 50))
    editorScroll.getViewportRect(viewportRect)
    editorScroll.getContentRect(contentRect)
    editorScroll.getVisibleContentRect(visibleContentRect)
    assertLayoutRect(viewportRect, 15, 22, 72, 44, "editor viewport")
    assertLayoutRect(contentRect, 15, 22, 72, 98, "editor content")
    assertLayoutRect(visibleContentRect, 15, 22, 72, 44, "editor visible")
    assertLayoutRect(editorRows.finalRect, 15, 22, 72, 98, "editor child")
    control.assert(editorScroll.contentOffsetY == 0, "editor initial offset")

    editorScroll.setContentOffset(0, 30)
    editorScroll.arrange(new Rect(10, 20, 80, 50))
    editorScroll.getContentRect(contentRect)
    editorScroll.getVisibleContentRect(visibleContentRect)
    assertLayoutRect(contentRect, 15, -8, 72, 98, "editor scrolled content")
    assertLayoutRect(visibleContentRect, 15, 22, 72, 44, "editor scrolled visible")
    assertLayoutRect(editorRows.finalRect, 15, -8, 72, 98, "editor scrolled child")
    control.assert(editorScroll.contentOffsetY == 30, "editor retained offset")

    const shortList = new LayoutSmokeNode(layoutFixedSpec(60, 30), 1, 1, 1, 1)
    const listScroll = new UiScrollViewportLayout({
      layoutSpec: layoutContentSpec(),
      child: shortList,
      contentOffsetY: 40
    })

    listScroll.arrange(new Rect(0, 0, 100, 80))
    listScroll.getContentRect(contentRect)
    listScroll.getVisibleContentRect(visibleContentRect)
    assertLayoutRect(contentRect, 0, 0, 60, 30, "short list content")
    assertLayoutRect(visibleContentRect, 0, 0, 60, 30, "short list visible")
    control.assert(listScroll.contentOffsetY == 0, "short list clamped offset")

    const table = new LayoutSmokeNode(layoutFixedSpec(180, 140), 1, 1, 1, 1)
    const tableScroll = new UiScrollViewportLayout({
      layoutSpec: layoutContentSpec(),
      child: table,
      contentOffsetX: 30,
      contentOffsetY: 45,
      scrollX: true,
      scrollY: true
    })

    tableScroll.arrange(new Rect(50, 60, 100, 70))
    tableScroll.getContentRect(contentRect)
    tableScroll.getVisibleContentRect(visibleContentRect)
    assertLayoutRect(contentRect, 20, 15, 180, 140, "table content")
    assertLayoutRect(visibleContentRect, 50, 60, 100, 70, "table visible")
    assertLayoutRect(table.finalRect, 20, 15, 180, 140, "table child")
    control.assert(tableScroll.contentOffsetX == 30, "table offset x")
    control.assert(tableScroll.contentOffsetY == 45, "table offset y")

    tableScroll.setContentOffset(0, 0)
    tableScroll.scrollContentRectIntoView(new Rect(10, 10, 20, 10))
    control.assert(tableScroll.contentOffsetX == 0, "scroll into view fully visible x")
    control.assert(tableScroll.contentOffsetY == 0, "scroll into view fully visible y")
    tableScroll.scrollContentRectIntoView(new Rect(120, 20, 20, 10))
    control.assert(tableScroll.contentOffsetX == 40, "scroll into view partial x")
    control.assert(tableScroll.contentOffsetY == 0, "scroll into view partial y")
    tableScroll.setContentOffset(0, 0)
    tableScroll.scrollContentRectIntoView(new Rect(20, 80, 120, 80))
    control.assert(tableScroll.contentOffsetX == 20, "scroll into view oversized x")
    control.assert(tableScroll.contentOffsetY == 70, "scroll into view oversized y")
    tableScroll.setContentOffset(0, 0)
    tableScroll.scrollContentRectIntoView(new Rect(500, 500, 10, 10))
    control.assert(tableScroll.contentOffsetX == 80, "scroll into view clamped x")
    control.assert(tableScroll.contentOffsetY == 70, "scroll into view clamped y")
    tableScroll.setScrollAxes(false, true)
    tableScroll.setContentOffset(0, 0)
    tableScroll.arrange(new Rect(50, 60, 100, 70))
    tableScroll.scrollContentRectIntoView(new Rect(120, 90, 20, 10))
    control.assert(tableScroll.contentOffsetX == 0, "scroll into view disabled x")
    control.assert(tableScroll.contentOffsetY == 30, "scroll into view enabled y")

    const countedRoot = new CountingLayoutSmokeNode(layoutFixedSpec(50, 20), 50, 20)
    const owner = new UiLayoutOwner({
      root: countedRoot,
      constraints: { maxWidth: 100, maxHeight: 80 },
      rect: new Rect(3, 4, 50, 20)
    })

    owner.runLayout()
    control.assert(countedRoot.measureCount == 1, "owner first measure")
    control.assert(countedRoot.arrangeCount == 1, "owner first arrange")
    control.assert(!owner.layoutDirty, "owner clean after pass")
    owner.runLayout()
    control.assert(countedRoot.measureCount == 1, "owner clean skips measure")
    control.assert(countedRoot.arrangeCount == 1, "owner clean skips arrange")
    countedRoot.invalidateLayout()
    owner.runLayout()
    control.assert(countedRoot.measureCount == 2, "owner observes dirty root measure")
    control.assert(countedRoot.arrangeCount == 2, "owner observes dirty root arrange")
    owner.invalidateLayout()
    owner.runLayout()
    control.assert(countedRoot.measureCount == 3, "owner explicit invalidate measure")
    control.assert(countedRoot.arrangeCount == 3, "owner explicit invalidate arrange")
  }
}

ui.renderLogicalViewportSmokeTest()
ui.runRuntimeSmokeTest()
ui.runLayoutSmokeTest()
ui.runPrimitiveLayoutSmokeTest()
ui.runStructuredLayoutSmokeTest()
ui.runScrollLayoutSmokeTest()

control.__log(1, "All tests passed!")
