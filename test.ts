namespace ui {
    class TestBitmapDisplayAdapter implements UiDisplayAdapter {
        private surface_: PhysicalBitmapDrawSurface

        constructor(bitmap: Bitmap, options?: PhysicalDrawSurfaceOptions) {
            this.surface_ = new PhysicalBitmapDrawSurface(bitmap, options)
        }

        public get surface(): PhysicalBitmapDrawSurface {
            return this.surface_
        }

        public commit(): Bitmap {
            return this.surface_.bitmap
        }
    }

    /**
     * Smoke harness for primitive geometry helpers.
     */
    export function runGeometrySmokeTest(): void {
        const rect = new Rect(10, 20, 5, 7)
        control.assert(rect.inflate(2) == rect, "rect inflate returns self")
        control.assert(rect.x == 8, "rect inflate x")
        control.assert(rect.y == 18, "rect inflate y")
        control.assert(rect.width == 9, "rect inflate width")
        control.assert(rect.height == 11, "rect inflate height")

        control.assert(
            rect.union(new Rect(20, 10, 4, 5)) == rect,
            "rect union returns self",
        )
        control.assert(rect.x == 8, "rect union x")
        control.assert(rect.y == 10, "rect union y")
        control.assert(rect.width == 16, "rect union width")
        control.assert(rect.height == 19, "rect union height")
    }

    /**
     * Smoke harness for display-profile drawing and scale-mode rendering.
     */
    export function renderLogicalViewportSmokeTest(fillColor: number): void {
        const coverAdapter = new DisplayShieldFrameAdapter({
            scaleMode: "cover",
            displayProfile: UiDisplayProfileId.HighDensity,
            designWidth: STANDARD_DISPLAY_WIDTH,
            designHeight: STANDARD_DISPLAY_HEIGHT,
        })
        const coverSurface = coverAdapter.surface
        const coverRuntime = new UiRuntime({ display: coverAdapter })
        const coverProfile = coverRuntime.displayProfile
        const expectedCoverWidth =
            coverProfile.id == UiDisplayProfileId.HighDensity
                ? HIGH_DENSITY_DISPLAY_WIDTH
                : STANDARD_DISPLAY_WIDTH
        const expectedCoverHeight =
            coverProfile.id == UiDisplayProfileId.HighDensity
                ? HIGH_DENSITY_DISPLAY_HEIGHT
                : STANDARD_DISPLAY_HEIGHT
        const coverUiWidth =
            coverProfile.logicalWidth / coverProfile.designToLogicalScaleX
        const coverUiHeight =
            coverProfile.logicalHeight / coverProfile.designToLogicalScaleY

        control.assert(
            coverProfile.logicalWidth == expectedCoverWidth,
            "cover profile width",
        )
        control.assert(
            coverProfile.logicalHeight == expectedCoverHeight,
            "cover profile height",
        )
        control.assert(
            coverUiWidth == STANDARD_DISPLAY_WIDTH ||
                coverUiWidth == HIGH_DENSITY_DISPLAY_WIDTH,
            "cover ui width",
        )
        control.assert(
            coverUiHeight == STANDARD_DISPLAY_HEIGHT ||
                coverUiHeight == HIGH_DENSITY_DISPLAY_HEIGHT,
            "cover ui height",
        )

        const standardBitmap = bitmaps.create(
            STANDARD_DISPLAY_WIDTH,
            STANDARD_DISPLAY_HEIGHT,
        )
        const standardAdapter = new TestBitmapDisplayAdapter(standardBitmap)
        const standardRuntime = new UiRuntime({ display: standardAdapter })
        const standardProfile = standardRuntime.displayProfile

        control.assert(
            standardProfile.id == UiDisplayProfileId.Standard,
            "standard profile id",
        )
        control.assert(
            standardProfile.logicalWidth == STANDARD_DISPLAY_WIDTH,
            "standard profile width",
        )
        control.assert(
            standardProfile.logicalHeight == STANDARD_DISPLAY_HEIGHT,
            "standard profile height",
        )
        control.assert(
            standardProfile.designToLogicalScaleX == 1,
            "standard scale x",
        )
        control.assert(
            standardProfile.designToLogicalScaleY == 1,
            "standard scale y",
        )

        standardAdapter.surface.fillRect(
            new Rect(0, 74, standardProfile.logicalWidth, 33),
            2,
        )
        control.assert(
            standardBitmap.getPixel(0, 74) == 2,
            "standard ui rect left",
        )
        control.assert(
            standardBitmap.getPixel(standardProfile.logicalWidth - 1, 106) == 2,
            "standard ui rect right",
        )

        const highBitmap = bitmaps.create(
            HIGH_DENSITY_DISPLAY_WIDTH,
            HIGH_DENSITY_DISPLAY_HEIGHT,
        )
        const highAdapter = new TestBitmapDisplayAdapter(highBitmap, {
            displayProfile: UiDisplayProfileId.HighDensity,
            designWidth: standardProfile.logicalWidth,
            designHeight: standardProfile.logicalHeight,
        })
        const highRuntime = new UiRuntime({ display: highAdapter })
        const highProfile = highRuntime.displayProfile
        const highUiWidth =
            highProfile.logicalWidth / highProfile.designToLogicalScaleX
        highAdapter.surface.fillRect(new Rect(0, 74, highUiWidth, 33), 3)
        control.assert(
            highProfile.logicalWidth == HIGH_DENSITY_DISPLAY_WIDTH,
            "high profile width",
        )
        control.assert(
            highProfile.logicalHeight == HIGH_DENSITY_DISPLAY_HEIGHT,
            "high profile height",
        )
        control.assert(highProfile.designToLogicalScaleX == 2, "high scale x")
        control.assert(highProfile.designToLogicalScaleY == 2, "high scale y")
        control.assert(highBitmap.getPixel(0, 148) == 3, "high ui rect left")
        control.assert(
            highBitmap.getPixel(highProfile.logicalWidth - 1, 213) == 3,
            "high ui rect right",
        )
        control.assert(
            highBitmap.getPixel(0, 147) == 0,
            "high ui rect top clip",
        )

        const measuredStandard = standardAdapter.surface.measureText(
            "profile",
            bitmaps.font5,
        )
        const measuredHigh = highAdapter.surface.measureText(
            "profile",
            bitmaps.font5,
        )
        control.assert(
            measuredStandard.width == measuredHigh.width,
            "profile measure width",
        )
        control.assert(
            measuredStandard.height == measuredHigh.height,
            "profile measure height",
        )

        const highUiBitmap = bitmaps.create(
            STANDARD_DISPLAY_WIDTH,
            STANDARD_DISPLAY_HEIGHT,
        )
        const highUiSurface = new PhysicalBitmapDrawSurface(highUiBitmap, {
            displayProfile: UiDisplayProfileId.HighDensity,
            designWidth: HIGH_DENSITY_DISPLAY_WIDTH,
            designHeight: HIGH_DENSITY_DISPLAY_HEIGHT,
        })
        highUiSurface.drawRect(
            new Rect(
                4,
                4,
                HIGH_DENSITY_DISPLAY_WIDTH - 8,
                HIGH_DENSITY_DISPLAY_HEIGHT - 8,
            ),
            4,
        )
        control.assert(
            highUiBitmap.getPixel(2, 2) == 4,
            "downscaled outline top start",
        )
        control.assert(
            highUiBitmap.getPixel(STANDARD_DISPLAY_WIDTH - 3, 60) == 4,
            "downscaled outline right",
        )
        control.assert(
            highUiBitmap.getPixel(80, STANDARD_DISPLAY_HEIGHT - 3) == 4,
            "downscaled outline bottom",
        )

        const displayBitmap = bitmaps.create(80, 60)
        const displaySurface = new PhysicalBitmapDrawSurface(displayBitmap, {
            scaleMode: "cover",
            displayedWidth: 80,
            displayedHeight: 67,
        })
        displaySurface.fillCircle(80, 60, 36, 3)
        control.assert(
            displayBitmap.getPixel(20, 30) == 3,
            "visual circle horizontal edge",
        )
        control.assert(
            displayBitmap.getPixel(60, 30) == 3,
            "visual circle opposite horizontal edge",
        )
        control.assert(
            displayBitmap.getPixel(40, 12) == 3,
            "visual circle vertical edge",
        )
        control.assert(
            displayBitmap.getPixel(40, 48) == 3,
            "visual circle opposite vertical edge",
        )
        control.assert(
            displayBitmap.getPixel(19, 30) == 0,
            "visual circle left outside",
        )
        control.assert(
            displayBitmap.getPixel(61, 30) == 0,
            "visual circle right outside",
        )
        control.assert(
            displayBitmap.getPixel(40, 11) == 0,
            "visual circle top outside",
        )
        control.assert(
            displayBitmap.getPixel(40, 49) == 0,
            "visual circle bottom outside",
        )

        const fitAdapter = new DisplayShieldFrameAdapter({ scaleMode: "fit" })
        const fitSurface = fitAdapter.surface
        fitSurface.clear(0)
        fitSurface.drawRect(new Rect(4, 4, 152, 112), 1)
        fitSurface.drawText(
            `fit (${screen().width}x${screen().height})`,
            12,
            12,
            { color: 1 },
        )
        fitAdapter.commit()

        coverSurface.clear(0)
        coverSurface.fillRect(
            new Rect(0, 0, coverUiWidth, coverUiHeight),
            fillColor,
        )
        coverSurface.drawLine(0, 0, coverUiWidth, coverUiHeight, 6)
        coverSurface.drawCircle(coverUiWidth >> 1, coverUiHeight >> 1, 18, 10)
        coverSurface.fillCircle(coverUiWidth >> 1, coverUiHeight >> 1, 6, 5)
        coverSurface.drawBitmap(
            bmp`
        9 . . 9 . . 9
        . 9 . 9 . 9 .
        . . 9 9 9 . .
        9 9 9 9 9 9 9
        . . 9 9 9 . .
        . 9 . 9 . 9 .
        9 . . 9 . . 9
      `,
            72,
            76,
        )
        coverSurface.drawBitmap(
            bmp`
        9 9 9 9 9 9 9
        9 9 9 9 9 9 9
        9 9 . . . 9 9
        9 9 . . . 9 9
        9 9 . . . 9 9
        9 9 9 9 9 9 9
        9 9 9 9 9 9 9
      `,
            92,
            76,
            { allowDownscale: true },
        )
        coverSurface.drawText(
            `cover (${screen().width}x${screen().height})`,
            6,
            6,
            { color: 0 },
        )
        coverSurface.drawText("downscaled text", 6, 18, {
            color: 0,
            allowDownscale: true,
        })
        coverSurface.drawRect(
            new Rect(4, 4, coverUiWidth - 8, coverUiHeight - 8),
            15,
        )
        coverAdapter.commit()
    }

    class RuntimeSmokeDisplayAdapter implements UiDisplayAdapter {
        private inner_: DisplayShieldFrameAdapter
        private onCommit_: () => void

        constructor(onCommit: () => void) {
            this.inner_ = new DisplayShieldFrameAdapter({ scaleMode: "cover" })
            this.onCommit_ = onCommit
        }

        public get surface(): PhysicalDrawSurface {
            return this.inner_.surface
        }

        public commit(): Bitmap {
            this.onCommit_()
            return this.inner_.commit()
        }
    }

    class RuntimeSmokeScreen extends UiScreen {
        public exitCount: number
        private prefix_: string
        private log_: (name: string) => void

        constructor(
            prefix: string,
            backgroundColor: number,
            log: (name: string) => void,
        ) {
            super()
            this.prefix_ = prefix
            this.backgroundColor = backgroundColor
            this.log_ = log
            this.exitCount = 0
        }

        public enter(runtime: UiRuntime): void {
            this.log_(this.prefix_ + "enter")
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
            if (event.action == "activate") {
                this.log_(this.prefix_ + "input")
                return true
            }
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

    class AssetResolverSmoke implements UiAssetResolver {
        private known_: Bitmap
        private fallback_: Bitmap

        constructor() {
            this.known_ = bmp`7`
            this.fallback_ = bmp`1`
        }

        public getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined {
            if (id == "known") return this.known_
            if (nullIfMissing) return undefined
            return this.fallback_
        }

        public getText(id: string): string {
            if (id == "label") return "Known label"
            return ""
        }
    }

    /**
     * Smoke harness for asset resolver missing-value behavior.
     */
    export function runAssetResolverSmokeTest(): void {
        const resolver = new AssetResolverSmoke()
        const known = resolver.getBitmap("known")
        const fallback = resolver.getBitmap("missing")
        const missing = resolver.getBitmap("missing", true)

        control.assert(!!known, "known bitmap exists")
        control.assert(!!fallback, "fallback bitmap exists")
        control.assert(fallback != known, "fallback is app-owned")
        control.assert(missing === undefined, "missing bitmap can be undefined")
        control.assert(resolver.getText("label") == "Known label", "known text")
        control.assert(resolver.getText("missing") == "", "missing text empty")

        const runtime = new UiRuntime({
            display: new RuntimeSmokeDisplayAdapter(() => {}),
            assets: resolver,
        })
        control.assert(
            runtime.assets.getBitmap("missing") == fallback,
            "runtime fallback bitmap",
        )
        control.assert(
            runtime.assets.getBitmap("missing", true) === undefined,
            "runtime missing bitmap",
        )
        control.assert(
            runtime.assets.getText("missing") == "",
            "runtime missing text",
        )
    }

    /**
     * Smoke harness for runtime stack lifecycle and direct input delivery.
     */
    export function runRuntimeSmokeTest(): void {
        let log = ""
        const appendLog = (name: string) => {
            log += name + ";"
        }
        const display = new RuntimeSmokeDisplayAdapter(() =>
            appendLog("commit"),
        )
        const runtime = new UiRuntime({ display, clearColor: 0 })
        const base = new RuntimeSmokeScreen("base", 1, appendLog)
        const overlay = new RuntimeSmokeScreen("overlay", 2, appendLog)
        const replacement = new RuntimeSmokeScreen("replace", 3, appendLog)

        runtime.push(base)
        control.assert(log == "baseenter;baseactivate;", "base push order")

        runtime.push(overlay)
        control.assert(base.exitCount == 0, "covered screen not exited")
        control.assert(
            log ==
                "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;",
            "overlay push order",
        )

        runtime.dispatchInput({ action: "activate" })
        runtime.runFrame()
        control.assert(
            log ==
                "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
                    "overlayinput;overlayupdate;overlayrender;commit;",
            "input frame order",
        )

        runtime.pop()
        control.assert(overlay.exitCount == 1, "popped screen exited")
        control.assert(runtime.top() == base, "base restored")
        control.assert(
            log ==
                "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
                    "overlayinput;overlayupdate;overlayrender;commit;" +
                    "overlaydeactivate;overlayexit;baseactivate;",
            "pop order",
        )

        runtime.dispatchInput({ action: "activate" })
        runtime.runFrame()
        control.assert(
            log ==
                "baseenter;baseactivate;basedeactivate;overlayenter;overlayactivate;" +
                    "overlayinput;overlayupdate;overlayrender;commit;" +
                    "overlaydeactivate;overlayexit;baseactivate;" +
                    "baseinput;baseupdate;baserender;commit;",
            "popped input disposed",
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
            contentPreferredHeight: number,
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

        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            this.receivedMaxWidth = constraints.maxWidth
            this.receivedMaxHeight = constraints.maxHeight
            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                this.contentMinWidth_,
                this.contentMinHeight_,
                this.contentPreferredWidth_,
                this.contentPreferredHeight_,
                output,
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

        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
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
                height: { mode: "content" },
            },
            12,
            5,
            30,
            10,
        )

        contentNode.measure({ maxWidth: 40.4, maxHeight: 8.2 }, measured)
        control.assert(
            contentNode.receivedMaxWidth == 40.4,
            "content constraints width",
        )
        control.assert(
            contentNode.receivedMaxHeight == 8.2,
            "content constraints height",
        )
        control.assert(measured.minWidth == 12, "content min width")
        control.assert(measured.minHeight == 5, "content min height")
        control.assert(measured.preferredWidth == 30, "content preferred width")
        control.assert(
            measured.preferredHeight == 8,
            "content preferred height",
        )
        control.assert(!contentNode.layoutDirty, "content measure clears dirty")

        contentNode.invalidateLayout()
        control.assert(contentNode.layoutDirty, "content invalidates")
        const arranged = new Rect(3.4, 4.6, 30.2, 8.8)
        contentNode.arrange(arranged)
        arranged.set(0, 0, 1, 1)
        control.assert(contentNode.finalRect.x == 3, "content final x")
        control.assert(contentNode.finalRect.y == 5, "content final y")
        control.assert(contentNode.finalRect.width == 30, "content final width")
        control.assert(
            contentNode.finalRect.height == 9,
            "content final height",
        )

        const fixedNode = new LayoutSmokeNode(
            {
                width: { mode: "fixed", value: 99.4, min: 10, max: 44.2 },
                height: { mode: "fixed", value: -5, min: 7, max: 3 },
            },
            1,
            1,
            2,
            2,
        )

        fixedNode.measure({ maxWidth: 40.6, maxHeight: 100 }, measured)
        control.assert(measured.minWidth == 41, "fixed constrained min width")
        control.assert(
            measured.preferredWidth == 41,
            "fixed constrained preferred width",
        )
        control.assert(measured.minHeight == 7, "fixed constrained min height")
        control.assert(
            measured.preferredHeight == 7,
            "fixed constrained preferred height",
        )

        fixedNode.arrange(new Rect(-2.2, 6.6, -8, 12.3))
        control.assert(fixedNode.finalRect.x == -2, "fixed final x")
        control.assert(fixedNode.finalRect.y == 7, "fixed final y")
        control.assert(fixedNode.finalRect.width == 0, "fixed final width")
        control.assert(fixedNode.finalRect.height == 12, "fixed final height")

        const fillNode = new LayoutSmokeNode(
            {
                width: { mode: "fill", min: 4 },
                height: { mode: "fill", max: 6.2 },
            },
            2,
            3,
            11,
            9,
        )

        fillNode.measure({ maxWidth: 50, maxHeight: 50 }, measured)
        control.assert(measured.minWidth == 4, "fill min width")
        control.assert(measured.preferredWidth == 11, "fill preferred width")
        control.assert(measured.minHeight == 3, "fill min height")
        control.assert(measured.preferredHeight == 6, "fill preferred height")

        measureLayoutSpec(
            undefined,
            { maxWidth: 50, maxHeight: 50 },
            6,
            4,
            14,
            9,
            measured,
        )
        control.assert(measured.minWidth == 6, "missing spec min width")
        control.assert(
            measured.preferredWidth == 14,
            "missing spec preferred width",
        )
        control.assert(measured.minHeight == 4, "missing spec min height")
        control.assert(
            measured.preferredHeight == 9,
            "missing spec preferred height",
        )
    }

    function layoutContentSpec(): UiLayoutSpec {
        return {
            width: { mode: "content" },
            height: { mode: "content" },
        }
    }

    function layoutFixedSpec(width: number, height: number): UiLayoutSpec {
        return {
            width: { mode: "fixed", value: width },
            height: { mode: "fixed", value: height },
        }
    }

    function assertLayoutRect(
        rect: Rect,
        x: number,
        y: number,
        width: number,
        height: number,
        name: string,
    ): void {
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
                height: { mode: "content" },
            },
            5,
            6,
            30,
            12,
        )
        const rowC = new LayoutSmokeNode(
            {
                width: { mode: "fixed", value: 15 },
                height: { mode: "content" },
            },
            1,
            4,
            2,
            8,
        )
        const row = new UiRowLayout({
            layoutSpec: layoutContentSpec(),
            children: [rowA, rowB],
            gap: 2,
            crossAxisAlignment: "start",
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
            crossAxisAlignment: "center",
        })

        column.arrange(new Rect(10, 20, 40, 80))
        assertLayoutRect(columnA.finalRect, 20, 20, 20, 10, "column A")
        assertLayoutRect(columnB.finalRect, 15, 33, 30, 15, "column B")

        const paddedChild = new LayoutSmokeNode(
            layoutContentSpec(),
            10,
            10,
            10,
            10,
        )
        const padding = new UiPaddingLayout({
            layoutSpec: layoutContentSpec(),
            child: paddedChild,
            padding: { top: 2, right: 4, bottom: 6, left: 8 },
        })

        padding.arrange(new Rect(0, 0, 60, 40))
        assertLayoutRect(paddedChild.finalRect, 8, 2, 48, 32, "padding child")

        const alignedChild = new LayoutSmokeNode(
            layoutContentSpec(),
            20,
            10,
            20,
            10,
        )
        const align = new UiAlignLayout({
            layoutSpec: layoutContentSpec(),
            child: alignedChild,
            horizontalAlignment: "end",
            verticalAlignment: "center",
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
                { node: absoluteB, rect: new Rect(30, 4, 15, 12) },
            ],
        })

        absolute.measure({ maxWidth: 100, maxHeight: 100 }, measured)
        control.assert(measured.minWidth == 45, "absolute min width")
        control.assert(measured.minHeight == 16, "absolute min height")
        control.assert(
            measured.preferredWidth == 45,
            "absolute preferred width",
        )
        control.assert(
            measured.preferredHeight == 16,
            "absolute preferred height",
        )
        control.assert(
            absolute.childRectAt(1, storedRect),
            "absolute stored rect exists",
        )
        assertLayoutRect(storedRect, 30, 4, 15, 12, "absolute stored rect")
        storedRect.set(0, 0, 1, 1)
        control.assert(
            absolute.childRectAt(1, storedRect),
            "absolute stored rect copied",
        )
        assertLayoutRect(
            storedRect,
            30,
            4,
            15,
            12,
            "absolute stored rect retained",
        )
        control.assert(
            absolute.setChildRectAt(1, new Rect(30.4, 4.2, 15.1, 12.4)),
            "absolute set rect",
        )
        control.assert(absolute.layoutDirty, "absolute set rect invalidates")
        control.assert(
            absolute.childRectAt(1, storedRect),
            "absolute updated rect copied",
        )
        assertLayoutRect(storedRect, 30, 4, 15, 12, "absolute updated rect")
        absolute.arrange(new Rect(5, 7, 100, 50))
        assertLayoutRect(absoluteA.finalRect, 7, 10, 10, 11, "absolute A")
        assertLayoutRect(absoluteB.finalRect, 35, 11, 15, 12, "absolute B")

        const textButtonA = new LayoutSmokeNode(
            layoutContentSpec(),
            48,
            12,
            48,
            12,
        )
        const textButtonB = new LayoutSmokeNode(
            layoutContentSpec(),
            52,
            12,
            52,
            12,
        )
        const textButtons = new UiColumnLayout({
            layoutSpec: layoutContentSpec(),
            children: [textButtonA, textButtonB],
            gap: 2,
        })
        const paddedTextButtons = new UiPaddingLayout({
            layoutSpec: layoutContentSpec(),
            child: textButtons,
            padding: 4,
        })
        const centeredTextButtons = new UiAlignLayout({
            layoutSpec: layoutContentSpec(),
            child: paddedTextButtons,
            horizontalAlignment: "center",
            verticalAlignment: "center",
        })

        centeredTextButtons.arrange(new Rect(0, 0, 100, 60))
        assertLayoutRect(
            paddedTextButtons.finalRect,
            20,
            13,
            60,
            34,
            "text group padding",
        )
        assertLayoutRect(
            textButtons.finalRect,
            24,
            17,
            52,
            26,
            "text group column",
        )
        assertLayoutRect(textButtonA.finalRect, 24, 17, 48, 12, "text group A")
        assertLayoutRect(textButtonB.finalRect, 24, 31, 52, 12, "text group B")

        const toolbarA = new LayoutSmokeNode(
            layoutFixedSpec(16, 16),
            1,
            1,
            1,
            1,
        )
        const toolbarB = new LayoutSmokeNode(
            layoutFixedSpec(16, 16),
            1,
            1,
            1,
            1,
        )
        const toolbarC = new LayoutSmokeNode(
            layoutFixedSpec(16, 16),
            1,
            1,
            1,
            1,
        )
        const toolbarRow = new UiRowLayout({
            layoutSpec: layoutContentSpec(),
            children: [toolbarA, toolbarB, toolbarC],
            gap: 4,
        })
        const toolbarAbsolute = new UiAbsoluteLayout({
            layoutSpec: layoutContentSpec(),
            children: [{ node: toolbarRow, rect: new Rect(200, 8, 56, 16) }],
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
            gap: 2,
        })
        const menuAlign = new UiAlignLayout({
            layoutSpec: layoutContentSpec(),
            child: menuRow,
            horizontalAlignment: "center",
            verticalAlignment: "center",
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
            verticalAlignment: "center",
        })

        control.assert(pickerGrid.childCount == 4, "picker grid initial count")
        control.assert(pickerGrid.childAt(2) == pickerC, "picker grid order")
        pickerGrid.appendChild(pickerE)
        control.assert(pickerGrid.childCount == 5, "picker grid appended count")
        control.assert(pickerGrid.rowCount == 2, "picker grid row count")
        control.assert(pickerGrid.layoutDirty, "picker grid append invalidates")
        pickerGrid.measure({ maxWidth: 200, maxHeight: 100 }, measured)
        control.assert(
            measured.preferredWidth == 56,
            "picker grid preferred width",
        )
        control.assert(
            measured.preferredHeight == 37,
            "picker grid preferred height",
        )
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
            columnGap: 8,
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
            verticalAlignment: "center",
        })

        control.assert(keyboard.rowCount == 1, "keyboard initial row count")
        control.assert(keyboard.childAt(0, 1) == keyB, "keyboard initial order")
        control.assert(
            keyboard.appendChildToRow(0, keyC),
            "keyboard append child",
        )
        keyboard.appendRow([keyD, keyE])
        keyboard.appendRow([keyF, keyG, keyH, keyI])
        control.assert(
            keyboard.childCountInRow(0) == 3,
            "keyboard first row count",
        )
        control.assert(
            keyboard.childAt(2, 3) == keyI,
            "keyboard appended order",
        )
        keyboard.measure({ maxWidth: 200, maxHeight: 100 }, measured)
        control.assert(
            measured.preferredWidth == 50,
            "keyboard preferred width",
        )
        control.assert(
            measured.preferredHeight == 40,
            "keyboard preferred height",
        )
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

        const overlayContent = new LayoutSmokeNode(
            layoutContentSpec(),
            320,
            240,
            320,
            240,
        )
        const overlayPanel = new LayoutSmokeNode(
            layoutFixedSpec(100, 80),
            1,
            1,
            1,
            1,
        )
        const centeredPanel = new UiAlignLayout({
            layoutSpec: layoutContentSpec(),
            child: overlayPanel,
            horizontalAlignment: "center",
            verticalAlignment: "center",
        })
        const overlayStack = new UiStackLayout({
            layoutSpec: layoutContentSpec(),
            children: [overlayContent],
        })

        overlayStack.appendChild(centeredPanel)
        control.assert(overlayStack.childCount == 2, "overlay stack count")
        control.assert(
            overlayStack.childAt(0) == overlayContent,
            "overlay lower layer",
        )
        control.assert(
            overlayStack.childAt(1) == centeredPanel,
            "overlay higher layer",
        )
        overlayStack.measure({ maxWidth: 320, maxHeight: 240 }, measured)
        control.assert(
            measured.preferredWidth == 320,
            "overlay preferred width",
        )
        control.assert(
            measured.preferredHeight == 240,
            "overlay preferred height",
        )
        overlayStack.arrange(new Rect(0, 0, 320, 240))
        assertLayoutRect(
            overlayContent.finalRect,
            0,
            0,
            320,
            240,
            "overlay content",
        )
        assertLayoutRect(
            centeredPanel.finalRect,
            0,
            0,
            320,
            240,
            "overlay panel layer",
        )
        assertLayoutRect(
            overlayPanel.finalRect,
            110,
            80,
            100,
            80,
            "overlay panel",
        )
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
                new LayoutSmokeNode(layoutFixedSpec(100, 18), 1, 1, 1, 1),
            ],
            gap: 2,
        })
        const editorScroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: editorRows,
            padding,
        })

        editorScroll.measure({ maxWidth: 80, maxHeight: 50 }, measured)
        control.assert(
            measured.preferredWidth == 80,
            "editor scroll preferred width",
        )
        control.assert(
            measured.preferredHeight == 50,
            "editor scroll preferred height",
        )
        editorScroll.arrange(new Rect(10, 20, 80, 50))
        editorScroll.getViewportRect(viewportRect)
        editorScroll.getContentRect(contentRect)
        editorScroll.getVisibleContentRect(visibleContentRect)
        assertLayoutRect(viewportRect, 15, 22, 72, 44, "editor viewport")
        assertLayoutRect(contentRect, 15, 22, 72, 98, "editor content")
        assertLayoutRect(visibleContentRect, 15, 22, 72, 44, "editor visible")
        assertLayoutRect(editorRows.finalRect, 15, 22, 72, 98, "editor child")
        control.assert(
            editorScroll.contentOffsetY == 0,
            "editor initial offset",
        )

        editorScroll.setContentOffset(0, 30)
        editorScroll.arrange(new Rect(10, 20, 80, 50))
        editorScroll.getContentRect(contentRect)
        editorScroll.getVisibleContentRect(visibleContentRect)
        assertLayoutRect(contentRect, 15, -8, 72, 98, "editor scrolled content")
        assertLayoutRect(
            visibleContentRect,
            15,
            22,
            72,
            44,
            "editor scrolled visible",
        )
        assertLayoutRect(
            editorRows.finalRect,
            15,
            -8,
            72,
            98,
            "editor scrolled child",
        )
        control.assert(
            editorScroll.contentOffsetY == 30,
            "editor retained offset",
        )

        const shortList = new LayoutSmokeNode(
            layoutFixedSpec(60, 30),
            1,
            1,
            1,
            1,
        )
        const listScroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: shortList,
            contentOffsetY: 40,
        })

        listScroll.arrange(new Rect(0, 0, 100, 80))
        listScroll.getContentRect(contentRect)
        listScroll.getVisibleContentRect(visibleContentRect)
        assertLayoutRect(contentRect, 0, 0, 60, 30, "short list content")
        assertLayoutRect(visibleContentRect, 0, 0, 60, 30, "short list visible")
        control.assert(
            listScroll.contentOffsetY == 0,
            "short list clamped offset",
        )

        const table = new LayoutSmokeNode(layoutFixedSpec(180, 140), 1, 1, 1, 1)
        const tableScroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: table,
            contentOffsetX: 30,
            contentOffsetY: 45,
            scrollX: true,
            scrollY: true,
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
        control.assert(
            tableScroll.contentOffsetX == 0,
            "scroll into view fully visible x",
        )
        control.assert(
            tableScroll.contentOffsetY == 0,
            "scroll into view fully visible y",
        )
        tableScroll.scrollContentRectIntoView(new Rect(120, 20, 20, 10))
        control.assert(
            tableScroll.contentOffsetX == 40,
            "scroll into view partial x",
        )
        control.assert(
            tableScroll.contentOffsetY == 0,
            "scroll into view partial y",
        )
        tableScroll.setContentOffset(0, 0)
        tableScroll.scrollContentRectIntoView(new Rect(20, 80, 120, 80))
        control.assert(
            tableScroll.contentOffsetX == 20,
            "scroll into view oversized x",
        )
        control.assert(
            tableScroll.contentOffsetY == 70,
            "scroll into view oversized y",
        )
        tableScroll.setContentOffset(0, 0)
        tableScroll.scrollContentRectIntoView(new Rect(500, 500, 10, 10))
        control.assert(
            tableScroll.contentOffsetX == 80,
            "scroll into view clamped x",
        )
        control.assert(
            tableScroll.contentOffsetY == 70,
            "scroll into view clamped y",
        )
        tableScroll.setScrollAxes(false, true)
        tableScroll.setContentOffset(0, 0)
        tableScroll.arrange(new Rect(50, 60, 100, 70))
        tableScroll.scrollContentRectIntoView(new Rect(120, 90, 20, 10))
        control.assert(
            tableScroll.contentOffsetX == 0,
            "scroll into view disabled x",
        )
        control.assert(
            tableScroll.contentOffsetY == 30,
            "scroll into view enabled y",
        )

        const countedRoot = new CountingLayoutSmokeNode(
            layoutFixedSpec(50, 20),
            50,
            20,
        )
        const owner = new UiLayoutOwner({
            root: countedRoot,
            constraints: { maxWidth: 100, maxHeight: 80 },
            rect: new Rect(3, 4, 50, 20),
        })

        owner.runLayout()
        control.assert(countedRoot.measureCount == 1, "owner first measure")
        control.assert(countedRoot.arrangeCount == 1, "owner first arrange")
        control.assert(!owner.layoutDirty, "owner clean after pass")
        owner.runLayout()
        control.assert(
            countedRoot.measureCount == 1,
            "owner clean skips measure",
        )
        control.assert(
            countedRoot.arrangeCount == 1,
            "owner clean skips arrange",
        )
        countedRoot.invalidateLayout()
        owner.runLayout()
        control.assert(
            countedRoot.measureCount == 2,
            "owner observes dirty root measure",
        )
        control.assert(
            countedRoot.arrangeCount == 2,
            "owner observes dirty root arrange",
        )
        owner.invalidateLayout()
        owner.runLayout()
        control.assert(
            countedRoot.measureCount == 3,
            "owner explicit invalidate measure",
        )
        control.assert(
            countedRoot.arrangeCount == 3,
            "owner explicit invalidate arrange",
        )
    }

    type FocusSmokeResult =
        | UiFocusSetResult
        | UiFocusActivationResult
        | UiFocusCancelResult
        | UiFocusHitTestResult
        | UiFocusTargetUpdateResult
        | UiFocusInputResult

    interface FocusStateMachineFixture {
        name: string
        scopes: UiFocusScopeOptions[]
        targets: UiFocusTargetOptions[]
        initialActiveScopeId?: UiFocusScopeId
        initialActiveTargetId?: UiFocusId
        operation: (state: UiFocusState) => FocusSmokeResult
        expectedResult: any
        expectedActiveScopeId?: UiFocusScopeId
        expectedActiveTargetId?: UiFocusId
    }

    function runFocusFixture(fixture: FocusStateMachineFixture): void {
        const state = new UiFocusState()

        for (let i = 0; i < fixture.scopes.length; i++) {
            state.setScope(fixture.scopes[i])
        }

        for (let i = 0; i < fixture.targets.length; i++) {
            state.setTarget(fixture.targets[i])
        }

        if (fixture.initialActiveScopeId && fixture.initialActiveTargetId) {
            state.setActiveTarget(
                fixture.initialActiveScopeId,
                fixture.initialActiveTargetId,
            )
        } else if (fixture.initialActiveScopeId) {
            state.setActiveScope(fixture.initialActiveScopeId)
        }

        const result = fixture.operation(state)
        assertFocusResult(result, fixture.expectedResult, fixture.name)
        control.assert(
            state.getActiveScopeId() == fixture.expectedActiveScopeId,
            fixture.name + " active scope",
        )
        control.assert(
            state.getActiveTargetId(fixture.expectedActiveScopeId) ==
                fixture.expectedActiveTargetId,
            fixture.name + " active target",
        )
    }

    function assertFocusResult(result: any, expected: any, name: string): void {
        const fields = [
            "kind",
            "scopeId",
            "targetId",
            "previousScopeId",
            "previousTargetId",
            "reason",
            "disabled",
        ]

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]
            control.assert(
                result[field] == expected[field],
                name + " result " + field,
            )
        }

        if (expected.scrollRequest) {
            control.assert(!!result.scrollRequest, name + " scroll exists")
            assertFocusScrollRequest(
                result.scrollRequest,
                expected.scrollRequest,
                name,
            )
        } else {
            control.assert(!result.scrollRequest, name + " no scroll")
        }
    }

    function assertFocusScrollRequest(
        result: UiFocusScrollRequest,
        expected: UiFocusScrollRequest,
        name: string,
    ): void {
        control.assert(
            result.scopeId == expected.scopeId,
            name + " scroll scope",
        )
        control.assert(
            result.targetId == expected.targetId,
            name + " scroll target",
        )
        control.assert(
            result.scrollOwnerId == expected.scrollOwnerId,
            name + " scroll owner",
        )
        control.assert(
            result.reason == expected.reason,
            name + " scroll reason",
        )
        assertLayoutRect(
            result.targetRect,
            expected.targetRect.x,
            expected.targetRect.y,
            expected.targetRect.width,
            expected.targetRect.height,
            name + " scroll rect",
        )
    }

    /**
     * Smoke harness for focus state, target records, and typed operation results.
     */
    export function runFocusStateMachineSmokeTest(): void {
        const mainScope: UiFocusScopeOptions = { id: "main" }
        const modalScope: UiFocusScopeOptions = {
            id: "modal",
            parentScopeId: "main",
            handlesCancel: true,
        }
        const secondaryScope: UiFocusScopeOptions = { id: "secondary" }
        const emptyScope: UiFocusScopeOptions = { id: "empty" }
        const targetA: UiFocusTargetOptions = {
            id: "a",
            scopeId: "main",
            rect: new Rect(10.2, 11.6, 20.4, 12.1),
            activatable: true,
        }
        const targetB: UiFocusTargetOptions = {
            id: "b",
            scopeId: "main",
            rect: new Rect(40, 10, 20, 20),
            scrollOwnerId: "main-scroll",
        }
        const disabledTarget: UiFocusTargetOptions = {
            id: "disabled",
            scopeId: "main",
            rect: new Rect(0, 0, 8, 8),
            disabled: true,
        }
        const hiddenTarget: UiFocusTargetOptions = {
            id: "hidden",
            scopeId: "main",
            rect: new Rect(70, 10, 20, 20),
            hidden: true,
        }
        const modalTarget: UiFocusTargetOptions = {
            id: "modal-close",
            scopeId: "modal",
            rect: new Rect(100, 10, 20, 20),
            activatable: true,
        }

        const fixtures: FocusStateMachineFixture[] = [
            {
                name: "missing scope",
                scopes: [],
                targets: [],
                operation: state =>
                    state.setTarget({
                        id: "orphan",
                        scopeId: "missing",
                        rect: new Rect(0, 0, 1, 1),
                    }),
                expectedResult: {
                    kind: "rejected",
                    scopeId: "missing",
                    targetId: "orphan",
                    reason: "missingScope",
                },
            },
            {
                name: "missing target",
                scopes: [mainScope],
                targets: [targetA],
                operation: state => state.setActiveTarget("main", "missing"),
                expectedResult: {
                    kind: "rejected",
                    scopeId: "main",
                    targetId: "missing",
                    reason: "missingTarget",
                },
            },
            {
                name: "stored target reference",
                scopes: [mainScope],
                targets: [],
                operation: state => {
                    const stored = state.setTarget(targetA)
                    if (stored.kind == "stored")
                        return state.setActiveTarget(stored)
                    return stored
                },
                expectedResult: {
                    kind: "focused",
                    scopeId: "main",
                    targetId: "a",
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "a",
            },
            {
                name: "scope mismatch",
                scopes: [mainScope, secondaryScope],
                targets: [targetA],
                operation: state => state.setActiveTarget("secondary", "a"),
                expectedResult: {
                    kind: "rejected",
                    scopeId: "secondary",
                    targetId: "a",
                    reason: "scopeMismatch",
                },
            },
            {
                name: "disabled target",
                scopes: [mainScope],
                targets: [disabledTarget],
                operation: state => state.setActiveTarget("main", "disabled"),
                expectedResult: {
                    kind: "rejected",
                    scopeId: "main",
                    targetId: "disabled",
                    reason: "disabled",
                },
            },
            {
                name: "disabled hit test",
                scopes: [mainScope],
                targets: [disabledTarget],
                operation: state => state.hitTest(1, 1),
                expectedResult: {
                    kind: "hit",
                    scopeId: "main",
                    targetId: "disabled",
                    disabled: true,
                },
            },
            {
                name: "hit test target focus",
                scopes: [mainScope],
                targets: [targetA],
                operation: state => state.setActiveTarget(state.hitTest(11, 12)),
                expectedResult: {
                    kind: "focused",
                    scopeId: "main",
                    targetId: "a",
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "a",
            },
            {
                name: "miss hit test target focus",
                scopes: [mainScope],
                targets: [targetA],
                operation: state =>
                    state.setActiveTarget(state.hitTest(120, 90)),
                expectedResult: {
                    kind: "rejected",
                    reason: "missingTargetReference",
                },
            },
            {
                name: "hidden target",
                scopes: [mainScope],
                targets: [hiddenTarget],
                operation: state => state.setActiveTarget("main", "hidden"),
                expectedResult: {
                    kind: "rejected",
                    scopeId: "main",
                    targetId: "hidden",
                    reason: "hidden",
                },
            },
            {
                name: "hidden hit test",
                scopes: [mainScope],
                targets: [hiddenTarget],
                operation: state => state.hitTest(71, 11),
                expectedResult: { kind: "miss", reason: "outside" },
            },
            {
                name: "empty scope",
                scopes: [emptyScope],
                targets: [],
                operation: state => state.setActiveScope("empty"),
                expectedResult: {
                    kind: "unchanged",
                    scopeId: "empty",
                    reason: "empty",
                },
                expectedActiveScopeId: "empty",
            },
            {
                name: "preferred initial target",
                scopes: [{ id: "main", preferredTargetId: "b" }],
                targets: [targetA, targetB],
                operation: state => state.setActiveScope("main"),
                expectedResult: {
                    kind: "focused",
                    scopeId: "main",
                    targetId: "b",
                    scrollRequest: {
                        scopeId: "main",
                        targetId: "b",
                        scrollOwnerId: "main-scroll",
                        targetRect: new Rect(40, 10, 20, 20),
                        reason: "focus",
                    },
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "b",
            },
            {
                name: "duplicate scope update",
                scopes: [
                    { id: "main", preferredTargetId: "a" },
                    { id: "main", preferredTargetId: "b" },
                ],
                targets: [targetA, targetB],
                operation: state => state.setActiveScope("main"),
                expectedResult: {
                    kind: "focused",
                    scopeId: "main",
                    targetId: "b",
                    scrollRequest: {
                        scopeId: "main",
                        targetId: "b",
                        scrollOwnerId: "main-scroll",
                        targetRect: new Rect(40, 10, 20, 20),
                        reason: "focus",
                    },
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "b",
            },
            {
                name: "duplicate target update",
                scopes: [mainScope],
                targets: [
                    { id: "a", scopeId: "main", rect: new Rect(0, 0, 5, 5) },
                    { id: "a", scopeId: "main", rect: new Rect(10, 10, 5, 5) },
                ],
                operation: state => state.hitTest(11, 11),
                expectedResult: {
                    kind: "hit",
                    scopeId: "main",
                    targetId: "a",
                    disabled: false,
                },
            },
            {
                name: "cleared active scope",
                scopes: [mainScope],
                targets: [targetA],
                initialActiveScopeId: "main",
                initialActiveTargetId: "a",
                operation: state => state.clearActiveScope(),
                expectedResult: {
                    kind: "cleared",
                    scopeId: "main",
                    previousScopeId: "main",
                    previousTargetId: "a",
                },
                expectedActiveTargetId: undefined,
            },
            {
                name: "cleared active target",
                scopes: [mainScope],
                targets: [targetA],
                initialActiveScopeId: "main",
                initialActiveTargetId: "a",
                operation: state => state.clearActiveTarget("main"),
                expectedResult: {
                    kind: "cleared",
                    scopeId: "main",
                    previousScopeId: "main",
                    previousTargetId: "a",
                },
                expectedActiveScopeId: "main",
            },
            {
                name: "handled cancel",
                scopes: [modalScope],
                targets: [modalTarget],
                initialActiveScopeId: "modal",
                initialActiveTargetId: "modal-close",
                operation: state => state.cancel(),
                expectedResult: { kind: "handled", scopeId: "modal" },
                expectedActiveScopeId: "modal",
                expectedActiveTargetId: "modal-close",
            },
            {
                name: "unhandled cancel",
                scopes: [mainScope],
                targets: [targetA],
                initialActiveScopeId: "main",
                initialActiveTargetId: "a",
                operation: state => state.cancel(),
                expectedResult: {
                    kind: "unhandled",
                    scopeId: "main",
                    reason: "notHandled",
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "a",
            },
            {
                name: "hit test miss",
                scopes: [mainScope],
                targets: [targetA],
                operation: state => state.hitTest(200, 200),
                expectedResult: { kind: "miss", reason: "outside" },
            },
            {
                name: "overlapping hit test order",
                scopes: [mainScope],
                targets: [
                    {
                        id: "lower",
                        scopeId: "main",
                        rect: new Rect(0, 0, 20, 20),
                        hitTestOrder: 2,
                    },
                    {
                        id: "upper",
                        scopeId: "main",
                        rect: new Rect(0, 0, 20, 20),
                        hitTestOrder: 3,
                    },
                ],
                operation: state => state.hitTest(5, 5),
                expectedResult: {
                    kind: "hit",
                    scopeId: "main",
                    targetId: "upper",
                    disabled: false,
                },
            },
            {
                name: "scroll request",
                scopes: [mainScope],
                targets: [targetB],
                operation: state => state.setActiveTarget("main", "b"),
                expectedResult: {
                    kind: "focused",
                    scopeId: "main",
                    targetId: "b",
                    scrollRequest: {
                        scopeId: "main",
                        targetId: "b",
                        scrollOwnerId: "main-scroll",
                        targetRect: new Rect(40, 10, 20, 20),
                        reason: "focus",
                    },
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "b",
            },
            {
                name: "activation success",
                scopes: [mainScope],
                targets: [targetA],
                initialActiveScopeId: "main",
                initialActiveTargetId: "a",
                operation: state => state.activate(),
                expectedResult: {
                    kind: "activated",
                    scopeId: "main",
                    targetId: "a",
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "a",
            },
            {
                name: "activation rejected",
                scopes: [mainScope],
                targets: [targetB],
                initialActiveScopeId: "main",
                initialActiveTargetId: "b",
                operation: state => state.activate(),
                expectedResult: {
                    kind: "notActivated",
                    scopeId: "main",
                    targetId: "b",
                    reason: "notActivatable",
                },
                expectedActiveScopeId: "main",
                expectedActiveTargetId: "b",
            },
        ]

        for (let i = 0; i < fixtures.length; i++) {
            runFocusFixture(fixtures[i])
        }

        const state = new UiFocusState()
        const copiedRect = new Rect()
        state.setScope(mainScope)
        state.setTarget(targetA)
        control.assert(
            state.getTargetRect("a", copiedRect),
            "target rect copied",
        )
        assertLayoutRect(copiedRect, 10, 12, 20, 12, "focus copied rect")
        copiedRect.set(0, 0, 1, 1)
        control.assert(
            state.getTargetRect("a", copiedRect),
            "target rect retained",
        )
        assertLayoutRect(copiedRect, 10, 12, 20, 12, "focus retained rect")

        state.setActiveTarget("main", "a")
        state.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(10, 10, 20, 20),
            hidden: true,
        })
        control.assert(
            state.getActiveTargetId("main") === undefined,
            "hidden active target cleared",
        )
        state.setTarget(targetA)
        state.setActiveTarget("main", "a")
        state.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(10, 10, 20, 20),
            disabled: true,
        })
        control.assert(
            state.getActiveTargetId("main") === undefined,
            "disabled active target cleared",
        )
        state.setTarget(targetA)
        state.setActiveTarget("main", "a")
        state.clearActiveScope()
        control.assert(
            state.getActiveTargetId("main") == "a",
            "clear scope retains target",
        )
        state.setActiveScope("main")
        control.assert(
            state.getActiveTargetId("main") == "a",
            "active scope restores target",
        )
        state.removeTarget("a")
        control.assert(
            state.getActiveTargetId("main") === undefined,
            "removed active target cleared",
        )
        state.setTarget(targetA)
        state.setActiveTarget("main", "a")
        state.removeScope("main")
        control.assert(
            state.getActiveScopeId() === undefined,
            "removed active scope cleared",
        )

        const tieState = new UiFocusState()
        tieState.setScope(mainScope)
        tieState.setTarget({
            id: "first",
            scopeId: "main",
            rect: new Rect(0, 0, 20, 20),
            hitTestOrder: 1,
        })
        tieState.setTarget({
            id: "second",
            scopeId: "main",
            rect: new Rect(0, 0, 20, 20),
            hitTestOrder: 1,
        })
        assertFocusResult(
            tieState.hitTest(5, 5),
            {
                kind: "hit",
                scopeId: "main",
                targetId: "second",
                disabled: false,
            },
            "hit test recency tie",
        )

        const scrollState = new UiFocusState()
        scrollState.setScope(mainScope)
        scrollState.setTarget(targetB)
        const scrollResult = scrollState.setActiveTarget("main", "b")
        if (scrollResult.kind == "focused" && scrollResult.scrollRequest) {
            scrollResult.scrollRequest.targetRect.set(0, 0, 1, 1)
        }
        control.assert(
            scrollState.getTargetRect("b", copiedRect),
            "scroll result rect retained",
        )
        assertLayoutRect(
            copiedRect,
            40,
            10,
            20,
            20,
            "scroll result copied rect",
        )

        scrollState.clear()
        assertFocusResult(
            scrollState.hitTest(1, 1),
            { kind: "miss", reason: "empty" },
            "clear removes targets",
        )
        assertFocusResult(
            scrollState.activate(),
            { kind: "notActivated", reason: "missingActive" },
            "clear removes focus",
        )
    }

    /**
     * Smoke harness for focus scroll requests and content-coordinate targets.
     */
    export function runFocusScrollRequestSmokeTest(): void {
        const state = new UiFocusState()
        state.setScope({ id: "editor" })
        state.setTarget({
            id: "hud",
            scopeId: "editor",
            rect: new Rect(4, 4, 24, 18),
            activatable: true,
        })
        state.setTarget({
            id: "rule",
            scopeId: "editor",
            rect: new Rect(20, 60, 80, 18),
            scrollOwnerId: "rules",
            scrollRect: new Rect(0, 156, 80, 18),
            activatable: true,
        })

        assertFocusResult(
            state.setActiveTarget("editor", "hud"),
            { kind: "focused", scopeId: "editor", targetId: "hud" },
            "hud target no scroll request",
        )
        assertFocusResult(
            state.setActiveTarget("editor", "rule"),
            {
                kind: "focused",
                scopeId: "editor",
                targetId: "rule",
                previousScopeId: "editor",
                previousTargetId: "hud",
                scrollRequest: {
                    scopeId: "editor",
                    targetId: "rule",
                    scrollOwnerId: "rules",
                    targetRect: new Rect(0, 156, 80, 18),
                    reason: "focus",
                },
            },
            "rule target content scroll request",
        )

        const moved = moveFocusInRow({
            scopeId: "editor",
            currentTargetId: "hud",
            direction: "right",
            targets: [
                navigationTarget("hud", 4, 4, 24, 18),
                navigationTarget(
                    "rule",
                    20,
                    60,
                    80,
                    18,
                    false,
                    false,
                    "rules",
                    new Rect(0, 156, 80, 18),
                ),
            ],
        })
        assertFocusMoveResult(
            moved,
            {
                kind: "moved",
                fromScopeId: "editor",
                fromTargetId: "hud",
                toScopeId: "editor",
                toTargetId: "rule",
                scrollRequest: {
                    scopeId: "editor",
                    targetId: "rule",
                    scrollOwnerId: "rules",
                    targetRect: new Rect(0, 156, 80, 18),
                    reason: "focus",
                },
            },
            "navigation content scroll request",
        )
    }

    interface FocusMovementFixture {
        name: string
        result: UiFocusMoveResult
        expectedResult: any
    }

    function navigationTarget(
        id: UiFocusId,
        x: number,
        y: number,
        width: number,
        height: number,
        disabled?: boolean,
        hidden?: boolean,
        scrollOwnerId?: UiFocusScrollOwnerId,
        scrollRect?: Rect,
    ): UiFocusNavigationTarget {
        return {
            id,
            rect: new Rect(x, y, width, height),
            disabled,
            hidden,
            scrollOwnerId,
            scrollRect,
        }
    }

    function assertFocusMoveResult(
        result: UiFocusMoveResult,
        expected: any,
        name: string,
    ): void {
        const actual: any = result
        const fields = [
            "kind",
            "scopeId",
            "targetId",
            "reason",
            "direction",
            "fromScopeId",
            "fromTargetId",
            "toScopeId",
            "toTargetId",
        ]

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]
            control.assert(
                actual[field] == expected[field],
                name + " result " + field,
            )
        }

        if (expected.scrollRequest) {
            control.assert(
                result.kind == "moved" && !!result.scrollRequest,
                name + " scroll exists",
            )
            if (result.kind == "moved" && result.scrollRequest) {
                assertFocusScrollRequest(
                    result.scrollRequest,
                    expected.scrollRequest,
                    name,
                )
            }
        } else {
            control.assert(
                result.kind != "moved" || !result.scrollRequest,
                name + " no scroll",
            )
        }
    }

    function runFocusMovementFixtures(fixtures: FocusMovementFixture[]): void {
        for (let i = 0; i < fixtures.length; i++) {
            runFocusMovementFixture(fixtures[i])
        }
    }

    function runFocusMovementFixture(fixture: FocusMovementFixture): void {
        assertFocusMoveResult(
            fixture.result,
            fixture.expectedResult,
            fixture.name,
        )
    }

    function assertFocusInputResult(
        result: UiFocusInputResult,
        expected: any,
        name: string,
    ): void {
        const actual: any = result
        const fields = ["action", "handled", "kind", "reason"]

        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]
            control.assert(
                actual[field] == expected[field],
                name + " result " + field,
            )
        }

        const detail = result.detail
        const expectedDetail = expected.detail
        if (expectedDetail) {
            control.assert(!!detail, name + " detail exists")
        } else {
            control.assert(!detail, name + " no detail")
        }

        if (expectedDetail && expectedDetail.moveResult) {
            control.assert(!!detail.moveResult, name + " move exists")
            assertFocusMoveResult(
                detail.moveResult,
                expectedDetail.moveResult,
                name,
            )
        } else {
            control.assert(!detail || !detail.moveResult, name + " no move")
        }

        if (expectedDetail && expectedDetail.focusResult) {
            control.assert(!!detail.focusResult, name + " focus exists")
            assertFocusResult(
                detail.focusResult,
                expectedDetail.focusResult,
                name,
            )
        } else {
            control.assert(!detail || !detail.focusResult, name + " no focus")
        }

        if (expectedDetail && expectedDetail.activationResult) {
            control.assert(
                !!detail.activationResult,
                name + " activation exists",
            )
            assertFocusResult(
                detail.activationResult,
                expectedDetail.activationResult,
                name,
            )
        } else {
            control.assert(
                !detail || !detail.activationResult,
                name + " no activation",
            )
        }

        if (expectedDetail && expectedDetail.cancelResult) {
            control.assert(!!detail.cancelResult, name + " cancel exists")
            assertFocusResult(
                detail.cancelResult,
                expectedDetail.cancelResult,
                name,
            )
        } else {
            control.assert(!detail || !detail.cancelResult, name + " no cancel")
        }

        if (expectedDetail && expectedDetail.hitTestResult) {
            control.assert(!!detail.hitTestResult, name + " hit test exists")
            assertFocusResult(
                detail.hitTestResult,
                expectedDetail.hitTestResult,
                name,
            )
        } else {
            control.assert(
                !detail || !detail.hitTestResult,
                name + " no hit test",
            )
        }

        if (expected.scrollRequest) {
            control.assert(
                !!result.scrollRequest,
                name + " input scroll exists",
            )
            assertFocusScrollRequest(
                result.scrollRequest,
                expected.scrollRequest,
                name,
            )
        } else {
            control.assert(!result.scrollRequest, name + " no input scroll")
        }
    }

    /**
     * Smoke harness for row, column, grid, and ragged-grid focus movement.
     */
    export function runFocusMovementSmokeTest(): void {
        const menuA = navigationTarget("menu-a", 0, 0, 10, 10)
        const menuDisabled = navigationTarget(
            "menu-disabled",
            12,
            0,
            10,
            10,
            true,
        )
        const menuHidden = navigationTarget(
            "menu-hidden",
            24,
            0,
            10,
            10,
            false,
            true,
        )
        const menuD = navigationTarget(
            "menu-d",
            36,
            0,
            10,
            10,
            false,
            false,
            "menu-scroll",
        )
        const menuRow = [menuA, menuDisabled, menuHidden, menuD]

        runFocusMovementFixtures([
            {
                name: "row right skips disabled hidden and scrolls",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "right",
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "menu",
                    fromTargetId: "menu-a",
                    toScopeId: "menu",
                    toTargetId: "menu-d",
                    scrollRequest: {
                        scopeId: "menu",
                        targetId: "menu-d",
                        scrollOwnerId: "menu-scroll",
                        targetRect: new Rect(36, 0, 10, 10),
                        reason: "focus",
                    },
                },
            },
            {
                name: "row unsupported up",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "up",
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "menu",
                    targetId: "menu-a",
                    reason: "boundary",
                },
            },
            {
                name: "row unsupported down",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "down",
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "menu",
                    targetId: "menu-a",
                    reason: "boundary",
                },
            },
            {
                name: "row boundary exit",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "left",
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "exited",
                    scopeId: "menu",
                    targetId: "menu-a",
                    direction: "left",
                },
            },
            {
                name: "row wrap",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "left",
                    wrap: true,
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "menu",
                    fromTargetId: "menu-a",
                    toScopeId: "menu",
                    toTargetId: "menu-d",
                    scrollRequest: {
                        scopeId: "menu",
                        targetId: "menu-d",
                        scrollOwnerId: "menu-scroll",
                        targetRect: new Rect(36, 0, 10, 10),
                        reason: "focus",
                    },
                },
            },
            {
                name: "row empty",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "right",
                    targets: [],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "menu",
                    reason: "empty",
                },
            },
            {
                name: "row missing active",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "missing",
                    direction: "right",
                    targets: menuRow,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "menu",
                    targetId: "missing",
                    reason: "missingActive",
                },
            },
            {
                name: "row single wrap boundary",
                result: moveFocusInRow({
                    scopeId: "menu",
                    currentTargetId: "menu-a",
                    direction: "right",
                    wrap: true,
                    targets: [menuA],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "menu",
                    targetId: "menu-a",
                    reason: "boundary",
                },
            },
        ])

        const listA = navigationTarget("list-a", 0, 0, 20, 8)
        const listB = navigationTarget("list-b", 0, 10, 20, 8, true)
        const listC = navigationTarget("list-c", 0, 20, 20, 8, false, true)
        const listD = navigationTarget(
            "list-d",
            0,
            30,
            20,
            8,
            false,
            false,
            "list-scroll",
        )
        const textList = [listA, listB, listC, listD]

        runFocusMovementFixtures([
            {
                name: "column down skips disabled hidden and scrolls",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "down",
                    targets: textList,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "list",
                    fromTargetId: "list-a",
                    toScopeId: "list",
                    toTargetId: "list-d",
                    scrollRequest: {
                        scopeId: "list",
                        targetId: "list-d",
                        scrollOwnerId: "list-scroll",
                        targetRect: new Rect(0, 30, 20, 8),
                        reason: "focus",
                    },
                },
            },
            {
                name: "column unsupported right",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "right",
                    targets: textList,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "list",
                    targetId: "list-a",
                    reason: "boundary",
                },
            },
            {
                name: "column unsupported left",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "left",
                    targets: textList,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "list",
                    targetId: "list-a",
                    reason: "boundary",
                },
            },
            {
                name: "column boundary exit",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "up",
                    targets: textList,
                }),
                expectedResult: {
                    kind: "exited",
                    scopeId: "list",
                    targetId: "list-a",
                    direction: "up",
                },
            },
            {
                name: "column wrap",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "up",
                    wrap: true,
                    targets: textList,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "list",
                    fromTargetId: "list-a",
                    toScopeId: "list",
                    toTargetId: "list-d",
                    scrollRequest: {
                        scopeId: "list",
                        targetId: "list-d",
                        scrollOwnerId: "list-scroll",
                        targetRect: new Rect(0, 30, 20, 8),
                        reason: "focus",
                    },
                },
            },
            {
                name: "column empty",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "down",
                    targets: [],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "list",
                    reason: "empty",
                },
            },
            {
                name: "column missing active",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "missing",
                    direction: "down",
                    targets: textList,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "list",
                    targetId: "missing",
                    reason: "missingActive",
                },
            },
            {
                name: "column single wrap boundary",
                result: moveFocusInColumn({
                    scopeId: "list",
                    currentTargetId: "list-a",
                    direction: "down",
                    wrap: true,
                    targets: [listA],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "list",
                    targetId: "list-a",
                    reason: "boundary",
                },
            },
        ])

        const gridA = navigationTarget("grid-a", 0, 0, 10, 10)
        const gridB = navigationTarget("grid-b", 12, 0, 10, 10)
        const gridDuplicate = navigationTarget("grid-duplicate", 12, 0, 10, 10)
        const gridC = navigationTarget("grid-c", 36, 0, 10, 10)
        const gridDisabled = navigationTarget(
            "grid-disabled",
            0,
            12,
            10,
            10,
            true,
        )
        const gridHidden = navigationTarget(
            "grid-hidden",
            12,
            12,
            10,
            10,
            false,
            true,
        )
        const gridD = navigationTarget(
            "grid-d",
            0,
            24,
            10,
            10,
            false,
            false,
            "grid-scroll",
        )
        const gridCells: UiFocusGridNavigationCell[] = [
            { row: 0, column: 0, target: gridA },
            { row: 0, column: 1, target: gridB },
            { row: 0, column: 1, target: gridDuplicate },
            { row: 0, column: 3, target: gridC },
            { row: 1, column: 0, target: gridDisabled },
            { row: 1, column: 1, target: gridHidden },
            { row: 2, column: 0, target: gridD },
        ]

        runFocusMovementFixtures([
            {
                name: "grid duplicate coordinate uses earliest eligible",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-a",
                    direction: "right",
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "grid",
                    fromTargetId: "grid-a",
                    toScopeId: "grid",
                    toTargetId: "grid-b",
                },
            },
            {
                name: "grid skips missing and hidden cells",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-b",
                    direction: "right",
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "grid",
                    fromTargetId: "grid-b",
                    toScopeId: "grid",
                    toTargetId: "grid-c",
                },
            },
            {
                name: "grid skips disabled vertical and scrolls",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-a",
                    direction: "down",
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "grid",
                    fromTargetId: "grid-a",
                    toScopeId: "grid",
                    toTargetId: "grid-d",
                    scrollRequest: {
                        scopeId: "grid",
                        targetId: "grid-d",
                        scrollOwnerId: "grid-scroll",
                        targetRect: new Rect(0, 24, 10, 10),
                        reason: "focus",
                    },
                },
            },
            {
                name: "grid row local wrap",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-c",
                    direction: "right",
                    wrap: true,
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "grid",
                    fromTargetId: "grid-c",
                    toScopeId: "grid",
                    toTargetId: "grid-a",
                },
            },
            {
                name: "grid column local wrap",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-d",
                    direction: "down",
                    wrap: true,
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "grid",
                    fromTargetId: "grid-d",
                    toScopeId: "grid",
                    toTargetId: "grid-a",
                },
            },
            {
                name: "grid boundary exit",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-c",
                    direction: "right",
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "exited",
                    scopeId: "grid",
                    targetId: "grid-c",
                    direction: "right",
                },
            },
            {
                name: "grid empty",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-a",
                    direction: "right",
                    cells: [],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "grid",
                    reason: "empty",
                },
            },
            {
                name: "grid missing active",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "missing",
                    direction: "right",
                    cells: gridCells,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "grid",
                    targetId: "missing",
                    reason: "missingActive",
                },
            },
            {
                name: "grid single wrap boundary",
                result: moveFocusInGrid({
                    scopeId: "grid",
                    currentTargetId: "grid-a",
                    direction: "right",
                    wrap: true,
                    cells: [{ row: 0, column: 0, target: gridA }],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "grid",
                    targetId: "grid-a",
                    reason: "boundary",
                },
            },
        ])

        const keyA = navigationTarget("key-a", 0, 0, 10, 10)
        const keyB = navigationTarget("key-b", 12, 0, 10, 10, true)
        const keyC = navigationTarget("key-c", 24, 0, 10, 10, false, true)
        const keyD = navigationTarget("key-d", 36, 0, 10, 10)
        const keyE = navigationTarget("key-e", 2, 20, 10, 10)
        const keyF = navigationTarget(
            "key-f",
            30,
            20,
            10,
            10,
            false,
            false,
            "key-scroll",
        )
        const keyG = navigationTarget("key-g", 10, 40, 10, 10)
        const keyH = navigationTarget("key-h", 50, 40, 10, 10)
        const raggedRows = [
            [keyA, keyB, keyC, keyD],
            [],
            [keyE, keyF],
            [keyG, keyH],
        ]

        runFocusMovementFixtures([
            {
                name: "ragged horizontal skips disabled hidden",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-a",
                    direction: "right",
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-a",
                    toScopeId: "keys",
                    toTargetId: "key-d",
                },
            },
            {
                name: "ragged vertical exact column and skipped empty row",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-a",
                    direction: "down",
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-a",
                    toScopeId: "keys",
                    toTargetId: "key-e",
                },
            },
            {
                name: "ragged vertical column intent",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-a",
                    direction: "down",
                    columnIntent: 1,
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-a",
                    toScopeId: "keys",
                    toTargetId: "key-f",
                    scrollRequest: {
                        scopeId: "keys",
                        targetId: "key-f",
                        scrollOwnerId: "key-scroll",
                        targetRect: new Rect(30, 20, 10, 10),
                        reason: "focus",
                    },
                },
            },
            {
                name: "ragged nearest center fallback",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-d",
                    direction: "down",
                    columnIntent: 3,
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-d",
                    toScopeId: "keys",
                    toTargetId: "key-f",
                    scrollRequest: {
                        scopeId: "keys",
                        targetId: "key-f",
                        scrollOwnerId: "key-scroll",
                        targetRect: new Rect(30, 20, 10, 10),
                        reason: "focus",
                    },
                },
            },
            {
                name: "ragged nearest center tie uses earliest",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-f",
                    direction: "down",
                    columnIntent: 3,
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-f",
                    toScopeId: "keys",
                    toTargetId: "key-g",
                },
            },
            {
                name: "ragged wrap",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-g",
                    direction: "down",
                    wrap: true,
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "moved",
                    fromScopeId: "keys",
                    fromTargetId: "key-g",
                    toScopeId: "keys",
                    toTargetId: "key-a",
                },
            },
            {
                name: "ragged boundary exit",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-g",
                    direction: "down",
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "exited",
                    scopeId: "keys",
                    targetId: "key-g",
                    direction: "down",
                },
            },
            {
                name: "ragged empty",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-a",
                    direction: "right",
                    rows: [],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "keys",
                    reason: "empty",
                },
            },
            {
                name: "ragged missing active",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "missing",
                    direction: "right",
                    rows: raggedRows,
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "keys",
                    targetId: "missing",
                    reason: "missingActive",
                },
            },
            {
                name: "ragged single wrap boundary",
                result: moveFocusInRaggedGrid({
                    scopeId: "keys",
                    currentTargetId: "key-a",
                    direction: "right",
                    wrap: true,
                    rows: [[keyA]],
                }),
                expectedResult: {
                    kind: "stayed",
                    scopeId: "keys",
                    targetId: "key-a",
                    reason: "boundary",
                },
            },
        ])

        const retainedDestination = navigationTarget(
            "retained-b",
            10,
            10,
            12,
            12,
            false,
            false,
            "retained-scroll",
        )
        const retainedResult = moveFocusInRow({
            scopeId: "retained",
            currentTargetId: "retained-a",
            direction: "right",
            targets: [
                navigationTarget("retained-a", 0, 0, 10, 10),
                retainedDestination,
            ],
        })
        retainedDestination.rect.set(0, 0, 1, 1)
        assertFocusMoveResult(
            retainedResult,
            {
                kind: "moved",
                fromScopeId: "retained",
                fromTargetId: "retained-a",
                toScopeId: "retained",
                toTargetId: "retained-b",
                scrollRequest: {
                    scopeId: "retained",
                    targetId: "retained-b",
                    scrollOwnerId: "retained-scroll",
                    targetRect: new Rect(10, 10, 12, 12),
                    reason: "focus",
                },
            },
            "navigation scroll rect copied",
        )
    }

    function createFocusInputState(handlesCancel?: boolean): UiFocusState {
        const state = new UiFocusState()
        state.setScope({ id: "main", handlesCancel })
        state.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(0, 0, 10, 10),
            activatable: true,
        })
        state.setTarget({
            id: "b",
            scopeId: "main",
            rect: new Rect(20, 0, 10, 10),
            activatable: true,
            scrollOwnerId: "main-scroll",
        })
        state.setTarget({
            id: "plain",
            scopeId: "main",
            rect: new Rect(40, 0, 10, 10),
        })
        state.setTarget({
            id: "disabled",
            scopeId: "main",
            rect: new Rect(60, 0, 10, 10),
            disabled: true,
        })
        state.setTarget({
            id: "hidden",
            scopeId: "main",
            rect: new Rect(80, 0, 10, 10),
            hidden: true,
        })
        state.setActiveTarget("main", "a")
        return state
    }

    function createFocusInputController(
        state: UiFocusState,
        navigation?: UiFocusNavigation,
        scrollLog?: (request: UiFocusScrollRequest) => void,
        wheelHandler?: UiFocusWheelHandler,
    ): UiFocusInputController {
        const controller = new UiFocusInputController({
            focus: state,
            scroll: scrollLog,
            wheel: wheelHandler,
        })
        if (navigation) controller.setNavigation("main", navigation)
        return controller
    }

    function focusInputRowNavigation(
        includeGhost?: boolean,
    ): UiFocusNavigation {
        const targets = [
            navigationTarget("a", 0, 0, 10, 10),
            navigationTarget("b", 20, 0, 10, 10, false, false, "main-scroll"),
        ]

        if (includeGhost) targets.push(navigationTarget("ghost", 40, 0, 10, 10))

        return {
            kind: "row",
            targets,
        }
    }

    function assertActiveTarget(
        state: UiFocusState,
        targetId: UiFocusId,
        name: string,
    ): void {
        control.assert(
            state.getActiveScopeId() == "main",
            name + " active scope",
        )
        control.assert(
            state.getActiveTargetId("main") == targetId,
            name + " active target",
        )
    }

    function assertInputSourcePreserved(
        event: UiInputEvent,
        source: UiInputSource,
        name: string,
    ): void {
        control.assert(event.source == source, name + " source")
    }

    class ActivationResultFocusState extends UiFocusState {
        private result_: UiFocusActivationResult

        constructor(result: UiFocusActivationResult) {
            super()
            this.result_ = result
        }

        public activate(): UiFocusActivationResult {
            return this.result_
        }
    }

    class RejectingPointerFocusState extends UiFocusState {
        public setActiveTarget(
            scopeOrTarget:
                | UiFocusScopeId
                | UiFocusTargetReference
                | UiFocusHitTestResult,
            targetId?: UiFocusId,
        ): UiFocusSetResult {
            if (typeof scopeOrTarget != "string") {
                if ((<UiFocusHitTestResult>scopeOrTarget).kind == "miss") {
                    return {
                        kind: "rejected",
                        reason: "missingTargetReference",
                    }
                }
                const reference = <UiFocusTargetReference>scopeOrTarget
                scopeOrTarget = reference.scopeId
                targetId = reference.targetId
            }
            return {
                kind: "rejected",
                scopeId: <UiFocusScopeId>scopeOrTarget,
                targetId,
                reason: "missingTarget",
            }
        }
    }

    class DirectSimulatorInputScreen extends UiScreen {
        public pointerMoveResult: UiFocusInputResult
        public pointerClickResult: UiFocusInputResult
        public wheelEvent: UiInputEvent
        private simulatorFocus_: UiFocusState
        private simulatorInput_: UiFocusInputController

        constructor() {
            super()
            this.simulatorFocus_ = createFocusInputState()
            this.simulatorInput_ = new UiFocusInputController({
                focus: this.simulatorFocus_,
                wheel: (event: UiInputEvent): boolean => {
                    this.wheelEvent = event
                    return true
                },
            })
        }

        public handleInput(event: UiInputEvent): boolean {
            const result = this.simulatorInput_.handleInput(event)
            if (event.action == "pointerMove") this.pointerMoveResult = result
            if (event.action == "pointerClick") this.pointerClickResult = result
            return result.handled
        }

        public render(surface: DrawSurface): void {}

        public activeTargetId(): UiFocusId | undefined {
            return this.simulatorFocus_.getActiveTargetId("main")
        }
    }

    class InputCoordinateScreen extends UiScreen {
        public pointerEvent: UiInputEvent
        public wheelEvent: UiInputEvent

        public handleInput(event: UiInputEvent): boolean {
            if (event.action == "pointerClick") {
                this.pointerEvent = event
                return true
            }
            if (event.action == "wheel") {
                this.wheelEvent = event
                return true
            }
            return false
        }

        public render(surface: DrawSurface): void {}
    }

    class ModalCancelHandoffScreen extends UiScreen {
        private onEnter_: () => void
        private onCancel_: () => void
        private input_: UiFocusInputController

        constructor(onEnter: () => void, onCancel: () => void) {
            super()
            this.onEnter_ = onEnter
            this.onCancel_ = onCancel
        }

        public enter(runtime: UiRuntime): void {
            const screenFocus = createModalFocusState()
            screenFocus.setScope({ id: "main", handlesCancel: false })
            screenFocus.setScope({
                id: "modal",
                parentScopeId: "main",
                modal: true,
                handlesCancel: false,
            })
            screenFocus.setActiveScope("modal")
            this.input_ = new UiFocusInputController({ focus: screenFocus })
            this.onEnter_()
        }

        public handleInput(event: UiInputEvent): boolean {
            const result = this.input_.handleInput(event)
            if (!result.handled && event.action == "cancel") {
                this.onCancel_()
                return true
            }
            return result.handled
        }

        public render(surface: DrawSurface): void {}
    }

    /**
     * Smoke harness for focus input runtime composition.
     */
    export function runFocusInputRuntimeSmokeTest(): void {
        let scrollCount = 0
        let lastScrollRequest: UiFocusScrollRequest = undefined
        const scrollLog = (request: UiFocusScrollRequest) => {
            scrollCount++
            lastScrollRequest = request
        }

        let state = createFocusInputState()
        let controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
            scrollLog,
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "right",
                source: "displayShieldController",
            }),
            {
                action: "right",
                handled: true,
                kind: "moved",
                detail: {
                    moveResult: {
                        kind: "moved",
                        fromScopeId: "main",
                        fromTargetId: "a",
                        toScopeId: "main",
                        toTargetId: "b",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "b",
                        previousScopeId: "main",
                        previousTargetId: "a",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                },
                scrollRequest: {
                    scopeId: "main",
                    targetId: "b",
                    scrollOwnerId: "main-scroll",
                    targetRect: new Rect(20, 0, 10, 10),
                    reason: "focus",
                },
            },
            "directional moved",
        )
        assertActiveTarget(state, "b", "directional moved")
        control.assert(scrollCount == 1, "directional scroll delivered")
        assertFocusScrollRequest(
            lastScrollRequest,
            {
                scopeId: "main",
                targetId: "b",
                scrollOwnerId: "main-scroll",
                targetRect: new Rect(20, 0, 10, 10),
                reason: "focus",
            },
            "directional scroll callback",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "right",
                source: "synthetic",
                phase: "repeated",
            }),
            {
                action: "right",
                handled: true,
                kind: "moved",
                detail: {
                    moveResult: {
                        kind: "moved",
                        fromScopeId: "main",
                        fromTargetId: "a",
                        toScopeId: "main",
                        toTargetId: "b",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "b",
                        previousScopeId: "main",
                        previousTargetId: "a",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                },
                scrollRequest: {
                    scopeId: "main",
                    targetId: "b",
                    scrollOwnerId: "main-scroll",
                    targetRect: new Rect(20, 0, 10, 10),
                    reason: "focus",
                },
            },
            "directional repeated",
        )
        assertActiveTarget(state, "b", "directional repeated")

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "right", phase: "released" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "unsupportedPhase",
            },
            "directional released",
        )
        assertActiveTarget(state, "a", "directional released")

        state = createFocusInputState()
        state.clearActiveScope()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "missingActiveScope",
            },
            "directional missing active scope",
        )

        state = createFocusInputState()
        controller = new UiFocusInputController({ focus: state })
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "missingNavigation",
            },
            "directional missing navigation",
        )

        controller.setNavigation("main", focusInputRowNavigation())
        controller.clearNavigation("main")
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "missingNavigation",
            },
            "directional cleared navigation",
        )

        state = createFocusInputState()
        controller = createFocusInputController(state, {
            move: (request: UiFocusNavigationRequest): UiFocusMoveResult => {
                control.assert(
                    request.scopeId == "main",
                    "provider request scope",
                )
                control.assert(
                    request.direction == "right",
                    "provider request direction",
                )
                control.assert(
                    request.currentTargetId == "a",
                    "provider request current target",
                )
                return {
                    kind: "exited",
                    scopeId: request.scopeId,
                    targetId: request.currentTargetId,
                    direction: request.direction,
                }
            },
        })
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "exited",
                reason: "movementExited",
                detail: {
                    moveResult: {
                        kind: "exited",
                        scopeId: "main",
                        targetId: "a",
                        direction: "right",
                    },
                },
            },
            "directional provider",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "up" }),
            {
                action: "up",
                handled: true,
                kind: "stayed",
                detail: {
                    moveResult: {
                        kind: "stayed",
                        scopeId: "main",
                        targetId: "a",
                        reason: "boundary",
                    },
                },
            },
            "directional stayed",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "left" }),
            {
                action: "left",
                handled: false,
                kind: "exited",
                reason: "movementExited",
                detail: {
                    moveResult: {
                        kind: "exited",
                        scopeId: "main",
                        targetId: "a",
                        direction: "left",
                    },
                },
            },
            "directional exited",
        )

        state = createFocusInputState()
        state.setActiveTarget("main", "b")
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(true),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "focusRejected",
                detail: {
                    moveResult: {
                        kind: "moved",
                        fromScopeId: "main",
                        fromTargetId: "b",
                        toScopeId: "main",
                        toTargetId: "ghost",
                    },
                    focusResult: {
                        kind: "rejected",
                        scopeId: "main",
                        targetId: "ghost",
                        reason: "missingTarget",
                    },
                },
            },
            "directional rejected focus",
        )

        const semanticSources: UiInputSource[] = [
            "displayShieldController",
            "microbitButton",
            "keyboard",
            "synthetic",
        ]
        for (let i = 0; i < semanticSources.length; i++) {
            state = createFocusInputState()
            controller = createFocusInputController(
                state,
                focusInputRowNavigation(),
            )
            controller.handleInput({
                action: "right",
                source: semanticSources[i],
            })
            assertActiveTarget(
                state,
                "b",
                "source neutral " + semanticSources[i],
            )
        }

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "activate",
                source: "displayShieldController",
            }),
            {
                action: "activate",
                handled: true,
                kind: "activated",
                detail: {
                    activationResult: {
                        kind: "activated",
                        scopeId: "main",
                        targetId: "a",
                    },
                },
            },
            "activate pressed",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "activate", phase: "released" }),
            {
                action: "activate",
                handled: false,
                kind: "ignored",
                reason: "unsupportedPhase",
            },
            "activate released",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "activate", phase: "repeated" }),
            {
                action: "activate",
                handled: false,
                kind: "ignored",
                reason: "unsupportedPhase",
            },
            "activate repeated",
        )
        state.setActiveTarget("main", "plain")
        assertFocusInputResult(
            controller.handleInput({ action: "activate" }),
            {
                action: "activate",
                handled: false,
                kind: "notActivated",
                detail: {
                    activationResult: {
                        kind: "notActivated",
                        scopeId: "main",
                        targetId: "plain",
                        reason: "notActivatable",
                    },
                },
            },
            "activate not activatable",
        )
        state.removeTarget("plain")
        assertFocusInputResult(
            controller.handleInput({ action: "activate" }),
            {
                action: "activate",
                handled: false,
                kind: "notActivated",
                detail: {
                    activationResult: {
                        kind: "notActivated",
                        scopeId: "main",
                        reason: "missingActive",
                    },
                },
            },
            "activate missing target",
        )

        controller = createFocusInputController(
            new ActivationResultFocusState({
                kind: "notActivated",
                scopeId: "main",
                targetId: "disabled",
                reason: "disabled",
            }),
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "activate" }),
            {
                action: "activate",
                handled: false,
                kind: "notActivated",
                detail: {
                    activationResult: {
                        kind: "notActivated",
                        scopeId: "main",
                        targetId: "disabled",
                        reason: "disabled",
                    },
                },
            },
            "activate disabled target result",
        )

        controller = createFocusInputController(
            new ActivationResultFocusState({
                kind: "notActivated",
                scopeId: "main",
                targetId: "hidden",
                reason: "hidden",
            }),
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "activate" }),
            {
                action: "activate",
                handled: false,
                kind: "notActivated",
                detail: {
                    activationResult: {
                        kind: "notActivated",
                        scopeId: "main",
                        targetId: "hidden",
                        reason: "hidden",
                    },
                },
            },
            "activate hidden target result",
        )

        state = createFocusInputState(true)
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "cancel",
                source: "displayShieldController",
            }),
            {
                action: "cancel",
                handled: true,
                kind: "cancelled",
                detail: { cancelResult: { kind: "handled", scopeId: "main" } },
            },
            "cancel handled",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "cancel", phase: "released" }),
            {
                action: "cancel",
                handled: false,
                kind: "ignored",
                reason: "unsupportedPhase",
            },
            "cancel released",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "cancel", phase: "repeated" }),
            {
                action: "cancel",
                handled: false,
                kind: "ignored",
                reason: "unsupportedPhase",
            },
            "cancel repeated",
        )

        state = createFocusInputState(false)
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "cancel" }),
            {
                action: "cancel",
                handled: false,
                kind: "notCancelled",
                detail: {
                    cancelResult: {
                        kind: "unhandled",
                        scopeId: "main",
                        reason: "notHandled",
                    },
                },
            },
            "cancel unhandled",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerMove",
                source: "pointer",
                x: 21,
                y: 1,
            }),
            {
                action: "pointerMove",
                handled: false,
                kind: "hit",
                detail: {
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
            },
            "pointer move hit",
        )
        assertActiveTarget(state, "a", "pointer move no focus change")
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerMove",
                source: "pointer",
            }),
            {
                action: "pointerMove",
                handled: false,
                kind: "ignored",
                reason: "missingPointerCoordinates",
            },
            "pointer move missing coordinates",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
            scrollLog,
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 200,
                y: 200,
            }),
            {
                action: "pointerClick",
                handled: false,
                kind: "miss",
                detail: { hitTestResult: { kind: "miss", reason: "outside" } },
            },
            "pointer click miss",
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 61,
                y: 1,
            }),
            {
                action: "pointerClick",
                handled: true,
                kind: "hit",
                detail: {
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "disabled",
                        disabled: true,
                    },
                },
            },
            "pointer click disabled",
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 1,
                y: 1,
            }),
            {
                action: "pointerClick",
                handled: true,
                kind: "activated",
                detail: {
                    activationResult: {
                        kind: "activated",
                        scopeId: "main",
                        targetId: "a",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "a",
                        disabled: false,
                    },
                },
            },
            "pointer click active target",
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 21,
                y: 1,
            }),
            {
                action: "pointerClick",
                handled: true,
                kind: "activated",
                detail: {
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "b",
                        previousScopeId: "main",
                        previousTargetId: "a",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                    activationResult: {
                        kind: "activated",
                        scopeId: "main",
                        targetId: "b",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
                scrollRequest: {
                    scopeId: "main",
                    targetId: "b",
                    scrollOwnerId: "main-scroll",
                    targetRect: new Rect(20, 0, 10, 10),
                    reason: "focus",
                },
            },
            "pointer click inactive target",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "pointerClick", x: 41, y: 1 }),
            {
                action: "pointerClick",
                handled: true,
                kind: "notActivated",
                detail: {
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "plain",
                        previousScopeId: "main",
                        previousTargetId: "b",
                    },
                    activationResult: {
                        kind: "notActivated",
                        scopeId: "main",
                        targetId: "plain",
                        reason: "notActivatable",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "plain",
                        disabled: false,
                    },
                },
            },
            "pointer click non activatable",
        )
        assertFocusInputResult(
            controller.handleInput({ action: "pointerClick" }),
            {
                action: "pointerClick",
                handled: false,
                kind: "ignored",
                reason: "missingPointerCoordinates",
            },
            "pointer click missing coordinates",
        )

        state = new RejectingPointerFocusState()
        state.setScope({ id: "main" })
        state.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(0, 0, 10, 10),
            activatable: true,
        })
        state.setTarget({
            id: "b",
            scopeId: "main",
            rect: new Rect(20, 0, 10, 10),
            activatable: true,
        })
        state.setActiveTarget("main", "a")
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        assertFocusInputResult(
            controller.handleInput({ action: "pointerClick", x: 21, y: 1 }),
            {
                action: "pointerClick",
                handled: false,
                kind: "ignored",
                reason: "focusRejected",
                detail: {
                    focusResult: {
                        kind: "rejected",
                        scopeId: "main",
                        targetId: "b",
                        reason: "missingTarget",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
            },
            "pointer click rejected transition",
        )

        let wheelEvent: UiInputEvent = undefined
        controller = new UiFocusInputController({
            focus: new UiFocusState(),
            wheel: (event: UiInputEvent) => {
                wheelEvent = event
                return true
            },
        })
        assertFocusInputResult(
            controller.handleInput({
                action: "wheel",
                source: "wheel",
                dx: 1,
                dy: -2,
            }),
            { action: "wheel", handled: true, kind: "wheel" },
            "wheel handled",
        )
        assertInputSourcePreserved(wheelEvent, "wheel", "wheel handled")

        controller = new UiFocusInputController({
            focus: new UiFocusState(),
            wheel: (event: UiInputEvent) => false,
        })
        assertFocusInputResult(
            controller.handleInput({ action: "wheel", source: "wheel" }),
            {
                action: "wheel",
                handled: false,
                kind: "wheel",
                reason: "wheelUnhandled",
            },
            "wheel unhandled callback",
        )
        controller = new UiFocusInputController({
            focus: new UiFocusState(),
        })
        assertFocusInputResult(
            controller.handleInput({ action: "wheel", source: "wheel" }),
            {
                action: "wheel",
                handled: false,
                kind: "wheel",
                reason: "wheelUnhandled",
            },
            "wheel unhandled missing callback",
        )
        assertFocusInputResult(
            controller.handleInput({
                action: "menu",
                source: "displayShieldController",
            }),
            {
                action: "menu",
                handled: false,
                kind: "ignored",
                reason: "unsupportedAction",
            },
            "menu unsupported by focus",
        )

        state = createFocusInputState()
        controller = createFocusInputController(
            state,
            focusInputRowNavigation(),
        )
        const repeatedActivate = controller.handleInput({
            action: "activate",
            phase: "repeated",
        })
        control.assert(!repeatedActivate.handled, "long press falls through")
        const menuInput = controller.handleInput({
            action: "menu",
            source: "displayShieldController",
        })
        control.assert(!menuInput.handled, "menu caller handler")
    }

    /**
     * Smoke harness for simulator-style input delivered through the runtime queue.
     */
    export function runDirectSimulatorInputSmokeTest(): void {
        const screen = new DirectSimulatorInputScreen()
        const runtime = new UiRuntime({
            display: new RuntimeSmokeDisplayAdapter(() => {}),
        })
        const runtimeProfile = runtime.displayProfile

        runtime.push(screen)
        runtime.dispatchInput({
            action: "pointerMove",
            source: "pointer",
            x: 21,
            y: 1,
        })
        runtime.runFrame()
        assertFocusInputResult(
            screen.pointerMoveResult,
            {
                action: "pointerMove",
                handled: false,
                kind: "hit",
                detail: {
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
            },
            "runtime pointer move",
        )
        control.assert(
            screen.activeTargetId() == "a",
            "runtime pointer move keeps focus",
        )

        runtime.dispatchInput({
            action: "pointerClick",
            source: "pointer",
            x: 21,
            y: 1,
        })
        runtime.runFrame()
        assertFocusInputResult(
            screen.pointerClickResult,
            {
                action: "pointerClick",
                handled: true,
                kind: "activated",
                detail: {
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "b",
                        previousScopeId: "main",
                        previousTargetId: "a",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                    activationResult: {
                        kind: "activated",
                        scopeId: "main",
                        targetId: "b",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
                scrollRequest: {
                    scopeId: "main",
                    targetId: "b",
                    scrollOwnerId: "main-scroll",
                    targetRect: new Rect(20, 0, 10, 10),
                    reason: "focus",
                },
            },
            "runtime pointer click",
        )
        control.assert(
            screen.activeTargetId() == "b",
            "runtime pointer click focuses",
        )

        runtime.dispatchInput({
            action: "wheel",
            source: "wheel",
            dx: 3,
            dy: -4,
        })
        runtime.runFrame()
        control.assert(
            screen.wheelEvent.source == "wheel",
            "runtime wheel source",
        )
        control.assert(screen.wheelEvent.dx == 3, "runtime wheel dx")
        control.assert(screen.wheelEvent.dy == -4, "runtime wheel dy")

        const highBitmap = bitmaps.create(
            HIGH_DENSITY_DISPLAY_WIDTH,
            HIGH_DENSITY_DISPLAY_HEIGHT,
        )
        const highRuntime = new UiRuntime({
            display: new TestBitmapDisplayAdapter(highBitmap, {
                displayProfile: UiDisplayProfileId.HighDensity,
                designWidth: runtimeProfile.logicalWidth,
                designHeight: runtimeProfile.logicalHeight,
            }),
        })
        const coordinateScreen = new InputCoordinateScreen()
        highRuntime.push(coordinateScreen)
        const highInputProfile = highRuntime.displayProfile
        const highPointerX = highInputProfile.logicalWidth / 2
        const highPointerY = (highInputProfile.logicalHeight * 3) / 4
        highRuntime.dispatchInput({
            action: "pointerClick",
            source: "pointer",
            x: highPointerX,
            y: highPointerY,
        })
        highRuntime.runFrame()
        control.assert(
            coordinateScreen.pointerEvent.x ==
                highPointerX / highInputProfile.designToLogicalScaleX,
            "high pointer ui x",
        )
        control.assert(
            coordinateScreen.pointerEvent.y ==
                highPointerY / highInputProfile.designToLogicalScaleY,
            "high pointer ui y",
        )

        coordinateScreen.pointerEvent = undefined
        highRuntime.dispatchInput({
            action: "pointerClick",
            source: "pointer",
            x: highInputProfile.logicalWidth + 1,
            y: highPointerY,
        })
        highRuntime.runFrame()
        control.assert(
            coordinateScreen.pointerEvent === undefined,
            "high pointer outside ignored",
        )

        const highFocusScreen = new DirectSimulatorInputScreen()
        const highFocusRuntime = new UiRuntime({
            display: new TestBitmapDisplayAdapter(
                bitmaps.create(
                    highInputProfile.logicalWidth,
                    highInputProfile.logicalHeight,
                ),
                {
                    displayProfile: UiDisplayProfileId.HighDensity,
                    designWidth: runtimeProfile.logicalWidth,
                    designHeight: runtimeProfile.logicalHeight,
                },
            ),
        })
        highFocusRuntime.push(highFocusScreen)
        highFocusRuntime.dispatchInput({
            action: "pointerClick",
            source: "pointer",
            x: 42,
            y: 2,
        })
        highFocusRuntime.runFrame()
        assertFocusInputResult(
            highFocusScreen.pointerClickResult,
            {
                action: "pointerClick",
                handled: true,
                kind: "activated",
                detail: {
                    focusResult: {
                        kind: "focused",
                        scopeId: "main",
                        targetId: "b",
                        previousScopeId: "main",
                        previousTargetId: "a",
                        scrollRequest: {
                            scopeId: "main",
                            targetId: "b",
                            scrollOwnerId: "main-scroll",
                            targetRect: new Rect(20, 0, 10, 10),
                            reason: "focus",
                        },
                    },
                    activationResult: {
                        kind: "activated",
                        scopeId: "main",
                        targetId: "b",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "main",
                        targetId: "b",
                        disabled: false,
                    },
                },
                scrollRequest: {
                    scopeId: "main",
                    targetId: "b",
                    scrollOwnerId: "main-scroll",
                    targetRect: new Rect(20, 0, 10, 10),
                    reason: "focus",
                },
            },
            "high runtime pointer click",
        )
    }

    function createModalFocusState(): UiFocusState {
        const state = new UiFocusState()
        state.setScope({
            id: "main",
            handlesCancel: true,
            preferredTargetId: "main-b",
        })
        state.setScope({ id: "secondary" })
        state.setScope({
            id: "modal",
            parentScopeId: "main",
            modal: true,
            handlesCancel: true,
            preferredTargetId: "modal-a",
        })
        state.setScope({ id: "modal-child", parentScopeId: "modal" })
        state.setTarget({
            id: "main-a",
            scopeId: "main",
            rect: new Rect(0, 0, 20, 20),
            activatable: true,
        })
        state.setTarget({
            id: "main-b",
            scopeId: "main",
            rect: new Rect(24, 0, 20, 20),
            activatable: true,
        })
        state.setTarget({
            id: "secondary-a",
            scopeId: "secondary",
            rect: new Rect(80, 0, 20, 20),
            activatable: true,
        })
        state.setTarget({
            id: "modal-a",
            scopeId: "modal",
            rect: new Rect(10, 40, 20, 20),
            activatable: true,
        })
        state.setTarget({
            id: "modal-b",
            scopeId: "modal",
            rect: new Rect(34, 40, 20, 20),
            activatable: true,
        })
        state.setTarget({
            id: "child-a",
            scopeId: "modal-child",
            rect: new Rect(10, 68, 20, 20),
            activatable: true,
        })
        state.setActiveTarget("main", "main-a")
        return state
    }

    /**
     * Smoke harness for modal focus scopes and cancel propagation.
     */
    export function runModalFocusSmokeTest(): void {
        let state = createModalFocusState()

        assertFocusResult(
            state.setActiveScope("modal"),
            {
                kind: "focused",
                scopeId: "modal",
                targetId: "modal-a",
                previousScopeId: "main",
                previousTargetId: "main-a",
            },
            "modal activates by scope",
        )
        control.assert(
            state.getActiveScopeId() == "modal",
            "modal scope active",
        )
        control.assert(
            state.getActiveTargetId("main") == "main-a",
            "covered target retained",
        )

        assertFocusResult(
            state.setActiveTarget("modal-child", "child-a"),
            {
                kind: "focused",
                scopeId: "modal-child",
                targetId: "child-a",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "modal descendant target activates",
        )
        assertFocusResult(
            state.setActiveScope("main"),
            { kind: "rejected", scopeId: "main", reason: "modalBlocked" },
            "modal blocks covered scope",
        )
        assertFocusResult(
            state.setActiveTarget("secondary", "secondary-a"),
            {
                kind: "rejected",
                scopeId: "secondary",
                targetId: "secondary-a",
                reason: "modalBlocked",
            },
            "modal blocks sibling target",
        )
        assertFocusResult(
            state.activate(),
            { kind: "activated", scopeId: "modal-child", targetId: "child-a" },
            "modal descendant activation",
        )

        state = createModalFocusState()
        state.setActiveTarget("main", "main-b")
        state.setActiveScope("modal")
        assertFocusResult(
            state.closeModalScope("modal"),
            {
                kind: "focused",
                scopeId: "main",
                targetId: "main-b",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "close modal restores retained parent target",
        )
        control.assert(
            state.getActiveScopeId() == "main",
            "close modal parent active",
        )
        control.assert(
            state.getActiveTargetId("modal") == "modal-a",
            "close modal retains modal target",
        )

        state = createModalFocusState()
        state.setActiveTarget("main", "main-b")
        state.setActiveScope("modal")
        state.setActiveTarget("modal-child", "child-a")
        assertFocusResult(
            state.closeModalScope("modal"),
            {
                kind: "focused",
                scopeId: "main",
                targetId: "main-b",
                previousScopeId: "modal-child",
                previousTargetId: "child-a",
            },
            "close modal from descendant restores parent target",
        )
        control.assert(
            state.getActiveTargetId("modal-child") == "child-a",
            "close modal retains child target",
        )

        state = createModalFocusState()
        state.clearActiveTarget("main")
        state.setActiveScope("modal")
        assertFocusResult(
            state.closeModalScope("modal"),
            {
                kind: "focused",
                scopeId: "main",
                targetId: "main-b",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "close modal restores preferred parent target",
        )

        state = new UiFocusState()
        state.setScope({ id: "main" })
        state.setScope({ id: "modal", parentScopeId: "main", modal: true })
        state.setTarget({
            id: "modal-a",
            scopeId: "modal",
            rect: new Rect(0, 0, 10, 10),
        })
        state.setActiveTarget("modal", "modal-a")
        assertFocusResult(
            state.closeModalScope("modal"),
            { kind: "unchanged", scopeId: "main", reason: "empty" },
            "close modal empty parent",
        )
        control.assert(
            state.getActiveScopeId() == "main",
            "empty parent active",
        )

        state = new UiFocusState()
        state.setScope({ id: "modal", modal: true })
        state.setTarget({
            id: "modal-a",
            scopeId: "modal",
            rect: new Rect(0, 0, 10, 10),
        })
        state.setActiveTarget("modal", "modal-a")
        assertFocusResult(
            state.closeModalScope("modal"),
            {
                kind: "cleared",
                scopeId: "modal",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "close root modal clears",
        )

        state = createModalFocusState()
        state.setActiveScope("modal")
        assertFocusResult(
            state.closeModalScope("missing"),
            { kind: "rejected", scopeId: "missing", reason: "missingScope" },
            "close missing modal",
        )
        assertFocusResult(
            state.closeModalScope("main"),
            { kind: "rejected", scopeId: "main", reason: "notModal" },
            "close non modal",
        )
        state.setScope({ id: "secondary", modal: true })
        assertFocusResult(
            state.closeModalScope("secondary"),
            { kind: "rejected", scopeId: "secondary", reason: "inactiveModal" },
            "close inactive modal",
        )

        state = createModalFocusState()
        state.setActiveScope("modal")
        assertFocusResult(
            state.hitTest(12, 42),
            {
                kind: "hit",
                scopeId: "modal",
                targetId: "modal-a",
                disabled: false,
            },
            "modal hit inside",
        )
        assertFocusResult(
            state.hitTest(2, 2),
            { kind: "miss", reason: "outside" },
            "modal hit ignores covered target",
        )
        assertFocusResult(
            state.hitTest(200, 200),
            { kind: "miss", reason: "outside" },
            "modal miss outside",
        )

        state.setScope({ id: "modal", parentScopeId: "main", modal: false })
        assertFocusResult(
            state.setActiveTarget("main", "main-a"),
            {
                kind: "focused",
                scopeId: "main",
                targetId: "main-a",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "modal descriptor update unblocks parent",
        )

        state = createModalFocusState()
        state.setActiveScope("modal")
        assertFocusResult(
            state.clearActiveScope(),
            {
                kind: "cleared",
                scopeId: "modal",
                previousScopeId: "modal",
                previousTargetId: "modal-a",
            },
            "clear active modal",
        )
        control.assert(
            state.getActiveScopeId() === undefined,
            "clear active modal does not restore parent",
        )

        state = createModalFocusState()
        state.setScope({
            id: "modal",
            parentScopeId: "main",
            modal: true,
            handlesCancel: false,
        })
        state.setActiveScope("modal")
        assertFocusResult(
            state.cancel(),
            { kind: "handled", scopeId: "main" },
            "cancel bubbles to covered parent",
        )
        control.assert(
            state.getActiveScopeId() == "modal",
            "cancel does not close modal",
        )
        state.setActiveTarget("modal-child", "child-a")
        assertFocusResult(
            state.cancel(),
            { kind: "handled", scopeId: "main" },
            "cancel bubbles through modal child",
        )
        state.setScope({ id: "main", handlesCancel: false })
        state.setScope({
            id: "modal",
            parentScopeId: "main",
            modal: true,
            handlesCancel: true,
        })
        assertFocusResult(
            state.cancel(),
            { kind: "handled", scopeId: "modal" },
            "cancel handled by modal parent",
        )
        state.setScope({
            id: "modal",
            parentScopeId: "main",
            modal: true,
            handlesCancel: false,
        })
        assertFocusResult(
            state.cancel(),
            { kind: "unhandled", scopeId: "modal-child", reason: "notHandled" },
            "cancel unhandled",
        )
        state.clearActiveScope()
        assertFocusResult(
            state.cancel(),
            { kind: "unhandled", reason: "missingActiveScope" },
            "cancel missing active",
        )

        state = new UiFocusState()
        state.setScope({
            id: "loop",
            parentScopeId: "loop",
            handlesCancel: false,
        })
        state.setTarget({
            id: "loop-a",
            scopeId: "loop",
            rect: new Rect(0, 0, 10, 10),
        })
        state.setActiveTarget("loop", "loop-a")
        assertFocusResult(
            state.cancel(),
            { kind: "unhandled", scopeId: "loop", reason: "notHandled" },
            "cancel self parent",
        )
        state.setScope({
            id: "missing-parent",
            parentScopeId: "missing",
            handlesCancel: false,
        })
        state.setTarget({
            id: "missing-parent-a",
            scopeId: "missing-parent",
            rect: new Rect(0, 0, 10, 10),
        })
        state.setActiveTarget("missing-parent", "missing-parent-a")
        assertFocusResult(
            state.cancel(),
            {
                kind: "unhandled",
                scopeId: "missing-parent",
                reason: "notHandled",
            },
            "cancel missing parent",
        )

        state = createModalFocusState()
        state.setActiveScope("modal")
        const controller = new UiFocusInputController({ focus: state })
        controller.setNavigation("modal", {
            kind: "row",
            targets: [
                navigationTarget("modal-a", 10, 40, 20, 20),
                navigationTarget("modal-b", 34, 40, 20, 20),
            ],
        })
        let coveredNavigationCount = 0
        controller.setNavigation("main", {
            move: (request: UiFocusNavigationRequest): UiFocusMoveResult => {
                coveredNavigationCount++
                return {
                    kind: "stayed",
                    scopeId: request.scopeId,
                    targetId: request.currentTargetId,
                    reason: "boundary",
                }
            },
        })
        assertFocusInputResult(
            controller.handleInput({ action: "right" }),
            {
                action: "right",
                handled: true,
                kind: "moved",
                detail: {
                    moveResult: {
                        kind: "moved",
                        fromScopeId: "modal",
                        fromTargetId: "modal-a",
                        toScopeId: "modal",
                        toTargetId: "modal-b",
                    },
                    focusResult: {
                        kind: "focused",
                        scopeId: "modal",
                        targetId: "modal-b",
                        previousScopeId: "modal",
                        previousTargetId: "modal-a",
                    },
                },
            },
            "modal directional movement",
        )
        control.assert(coveredNavigationCount == 0, "covered navigation unused")

        state = createModalFocusState()
        state.setActiveScope("modal")
        const rejectingController = new UiFocusInputController({ focus: state })
        rejectingController.setNavigation("modal", {
            move: (request: UiFocusNavigationRequest): UiFocusMoveResult => {
                return {
                    kind: "moved",
                    fromScopeId: "modal",
                    fromTargetId: "modal-a",
                    toScopeId: "main",
                    toTargetId: "main-a",
                }
            },
        })
        assertFocusInputResult(
            rejectingController.handleInput({ action: "right" }),
            {
                action: "right",
                handled: false,
                kind: "ignored",
                reason: "focusRejected",
                detail: {
                    moveResult: {
                        kind: "moved",
                        fromScopeId: "modal",
                        fromTargetId: "modal-a",
                        toScopeId: "main",
                        toTargetId: "main-a",
                    },
                    focusResult: {
                        kind: "rejected",
                        scopeId: "main",
                        targetId: "main-a",
                        reason: "modalBlocked",
                    },
                },
            },
            "modal rejects external custom navigation",
        )

        state = createModalFocusState()
        state.setActiveScope("modal")
        const pointerController = new UiFocusInputController({ focus: state })
        assertFocusInputResult(
            pointerController.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 2,
                y: 2,
            }),
            {
                action: "pointerClick",
                handled: false,
                kind: "miss",
                detail: { hitTestResult: { kind: "miss", reason: "outside" } },
            },
            "modal outside pointer falls through",
        )
        assertFocusInputResult(
            pointerController.handleInput({
                action: "pointerClick",
                source: "pointer",
                x: 36,
                y: 42,
            }),
            {
                action: "pointerClick",
                handled: true,
                kind: "activated",
                detail: {
                    focusResult: {
                        kind: "focused",
                        scopeId: "modal",
                        targetId: "modal-b",
                        previousScopeId: "modal",
                        previousTargetId: "modal-a",
                    },
                    activationResult: {
                        kind: "activated",
                        scopeId: "modal",
                        targetId: "modal-b",
                    },
                    hitTestResult: {
                        kind: "hit",
                        scopeId: "modal",
                        targetId: "modal-b",
                        disabled: false,
                    },
                },
            },
            "modal inside pointer activates",
        )

        state = createModalFocusState()
        state.setScope({
            id: "main",
            handlesCancel: false,
            preferredTargetId: "main-b",
        })
        state.setScope({
            id: "modal",
            parentScopeId: "main",
            modal: true,
            handlesCancel: false,
        })
        state.setActiveScope("modal")
        let cancelFallbackCount = 0
        const unhandledCancel = new UiFocusInputController({
            focus: state,
        }).handleInput({ action: "cancel" })
        if (!unhandledCancel.handled)
            cancelFallbackCount++
        control.assert(
            !unhandledCancel.handled,
            "unhandled modal cancel falls through",
        )
        control.assert(cancelFallbackCount == 1, "cancel fallthrough handler")

        let screenCancelCount = 0
        let screenEntered = false
        const runtime = new UiRuntime({
            display: new RuntimeSmokeDisplayAdapter(() => {}),
        })
        runtime.push(
            new ModalCancelHandoffScreen(
                () => {
                    screenEntered = true
                },
                () => {
                    screenCancelCount++
                },
            ),
        )
        control.assert(screenEntered, "handoff screen entered")
        runtime.dispatchInput({ action: "cancel" })
        runtime.runFrame()
        control.assert(
            screenCancelCount == 1,
            "scene stack receives unhandled cancel",
        )
    }

    function focusEventValue(value: string | undefined): string {
        return value === undefined ? "-" : value
    }

    function focusEventText(event: UiFocusEvent): string {
        return (
            focusEventValue(event.previousScopeId) +
            ":" +
            focusEventValue(event.previousTargetId) +
            "->" +
            focusEventValue(event.currentScopeId) +
            ":" +
            focusEventValue(event.currentTargetId) +
            ";"
        )
    }

    function addObservationFocusRecords(state: UiFocusState): void {
        state.setScope({ id: "main" })
        state.setScope({ id: "empty" })
        state.setScope({ id: "secondary" })
        state.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(0, 0, 10, 10),
            activatable: true,
        })
        state.setTarget({
            id: "b",
            scopeId: "main",
            rect: new Rect(12, 0, 10, 10),
            activatable: true,
        })
        state.setTarget({
            id: "c",
            scopeId: "secondary",
            rect: new Rect(0, 20, 10, 10),
            activatable: true,
        })
    }

    function assertFocusEventLog(
        log: string,
        expected: string,
        name: string,
    ): void {
        control.assert(log == expected, name + " focus event log")
    }

    /**
     * Smoke harness for focus, layout, and scroll observation contracts.
     */
    export function runObservationSmokeTest(): void {
        let focusState = new UiFocusState()
        addObservationFocusRecords(focusState)
        let focusLog = ""
        focusState.addFocusObserver((event: UiFocusEvent) => {
            focusLog += focusEventText(event)
        })

        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.setActiveTarget("main", "b")
        assertFocusEventLog(focusLog, "main:a->main:b;", "focus target change")
        focusLog = ""
        focusState.setActiveTarget("main", "b")
        focusState.setActiveTarget("main", "missing")
        assertFocusEventLog(focusLog, "", "focus rejected unchanged")

        focusState.setActiveScope("empty")
        assertFocusEventLog(focusLog, "main:b->empty:-;", "empty scope emits")
        focusLog = ""
        focusState.clearActiveScope()
        assertFocusEventLog(
            focusLog,
            "empty:-->-:-;",
            "clear active scope emits",
        )

        focusState = createModalFocusState()
        focusState.setActiveScope("modal")
        focusLog = ""
        focusState.addFocusObserver((event: UiFocusEvent) => {
            focusLog += focusEventText(event)
        })
        focusState.closeModalScope("modal")
        assertFocusEventLog(
            focusLog,
            "modal:modal-a->main:main-a;",
            "close modal emits restore",
        )

        focusState = new UiFocusState()
        addObservationFocusRecords(focusState)
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.addFocusObserver((event: UiFocusEvent) => {
            focusLog += focusEventText(event)
        })
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
            hidden: true,
        })
        assertFocusEventLog(focusLog, "main:a->main:-;", "hide active emits")
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
        })
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
            disabled: true,
        })
        assertFocusEventLog(focusLog, "main:a->main:-;", "disable active emits")
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
        })
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.setTarget({
            id: "a",
            scopeId: "secondary",
            rect: new Rect(1, 1, 10, 10),
        })
        assertFocusEventLog(focusLog, "main:a->main:-;", "move active emits")
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
        })
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.removeTarget("a")
        assertFocusEventLog(
            focusLog,
            "main:a->main:-;",
            "remove active target emits",
        )
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(1, 1, 10, 10),
        })
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.setTarget({
            id: "a",
            scopeId: "main",
            rect: new Rect(5, 5, 10, 10),
        })
        assertFocusEventLog(focusLog, "", "active rect update silent")
        focusState.setActiveTarget("secondary", "c")
        focusState.setActiveTarget("main", "a")
        focusLog = ""
        focusState.setTarget({
            id: "c",
            scopeId: "secondary",
            rect: new Rect(0, 20, 10, 10),
            hidden: true,
        })
        assertFocusEventLog(focusLog, "", "inactive retained target silent")
        focusState.clear()
        assertFocusEventLog(focusLog, "main:a->-:-;", "clear focus emits")
        focusLog = ""
        focusState.clear()
        assertFocusEventLog(focusLog, "", "clear empty silent")

        const disposedState = new UiFocusState()
        addObservationFocusRecords(disposedState)
        let disposeLog = ""
        let secondHandle: UiObserverHandle = undefined
        disposedState.addFocusObserver((event: UiFocusEvent) => {
            disposeLog += "first;"
            secondHandle.dispose()
        })
        secondHandle = disposedState.addFocusObserver((event: UiFocusEvent) => {
            disposeLog += "second;"
        })
        disposedState.setActiveTarget("main", "a")
        control.assert(disposeLog == "first;", "dispose later observer")

        const selfDisposeState = new UiFocusState()
        addObservationFocusRecords(selfDisposeState)
        let selfLog = ""
        let selfHandle: UiObserverHandle = undefined
        selfHandle = selfDisposeState.addFocusObserver(
            (event: UiFocusEvent) => {
                selfLog += "self;"
                selfHandle.dispose()
            },
        )
        selfDisposeState.setActiveTarget("main", "a")
        selfDisposeState.setActiveTarget("main", "b")
        control.assert(selfLog == "self;", "self dispose finishes current")

        const addDuringFocusState = new UiFocusState()
        addObservationFocusRecords(addDuringFocusState)
        let addDuringLog = ""
        let observerAdded = false
        addDuringFocusState.addFocusObserver((event: UiFocusEvent) => {
            addDuringLog += "first;"
            if (!observerAdded) {
                observerAdded = true
                addDuringFocusState.addFocusObserver(
                    (addedEvent: UiFocusEvent) => {
                        addDuringLog += "added;"
                    },
                )
            }
        })
        addDuringFocusState.setActiveTarget("main", "a")
        control.assert(addDuringLog == "first;", "added observer skips current")
        addDuringLog = ""
        addDuringFocusState.setActiveTarget("main", "b")
        control.assert(
            addDuringLog == "first;added;",
            "added observer receives later",
        )

        const nestedState = new UiFocusState()
        addObservationFocusRecords(nestedState)
        nestedState.setActiveTarget("main", "a")
        let nestedLog = ""
        nestedState.addFocusObserver((event: UiFocusEvent) => {
            if (event.currentTargetId == "b") {
                nestedLog += "outer-first;"
                nestedState.setActiveTarget("main", "a")
                nestedLog += "outer-after;"
            } else {
                nestedLog += "nested-first;"
            }
        })
        nestedState.addFocusObserver((event: UiFocusEvent) => {
            if (event.currentTargetId == "b") nestedLog += "outer-second;"
            else nestedLog += "nested-second;"
        })
        nestedState.setActiveTarget("main", "b")
        control.assert(
            nestedLog ==
                "outer-first;nested-first;nested-second;outer-after;outer-second;",
            "nested focus events",
        )

        const throwingState = new UiFocusState()
        addObservationFocusRecords(throwingState)
        let observerFailurePropagated = false
        throwingState.addFocusObserver((event: UiFocusEvent) => {
            throw "observer failure"
        })
        try {
            throwingState.setActiveTarget("main", "a")
        } catch (e) {
            observerFailurePropagated = true
        }
        control.assert(observerFailurePropagated, "observer failure propagates")

        const layoutNode = new CountingLayoutSmokeNode(
            layoutFixedSpec(50, 20),
            50,
            20,
        )
        const layoutOwner = new UiLayoutOwner({
            root: layoutNode,
            constraints: { maxWidth: 100, maxHeight: 80 },
            rect: new Rect(3, 4, 50, 20),
        })
        let layoutLog = ""
        const layoutHandle = layoutOwner.addLayoutObserver(() => {
            layoutLog += "layout;"
            assertLayoutRect(
                layoutNode.finalRect,
                6,
                8,
                60,
                24,
                "observed layout rect",
            )
        })
        layoutOwner.setRect(new Rect(6, 8, 60, 24))
        control.assert(layoutLog == "", "layout dirty silent")
        layoutOwner.runLayout()
        control.assert(layoutLog == "layout;", "dirty layout emits")
        layoutLog = ""
        layoutOwner.runLayout()
        control.assert(layoutLog == "", "clean layout silent")
        layoutHandle.dispose()
        layoutOwner.invalidateLayout()
        layoutOwner.runLayout()
        control.assert(layoutLog == "", "disposed layout observer silent")

        const observedFocus = new UiFocusState()
        observedFocus.setScope({ id: "main" })
        observedFocus.setTarget({
            id: "node",
            scopeId: "main",
            rect: new Rect(0, 0, 1, 1),
        })
        const focusNode = new LayoutSmokeNode(
            layoutFixedSpec(30, 12),
            1,
            1,
            1,
            1,
        )
        const focusLayoutOwner = new UiLayoutOwner({
            root: focusNode,
            constraints: { maxWidth: 100, maxHeight: 80 },
            rect: new Rect(9, 10, 30, 12),
        })
        focusLayoutOwner.addLayoutObserver(() => {
            observedFocus.setTarget({
                id: "node",
                scopeId: "main",
                rect: focusNode.finalRect,
            })
        })
        focusLayoutOwner.runLayout()
        const observedRect = new Rect()
        control.assert(
            observedFocus.getTargetRect("node", observedRect),
            "layout observer focus rect",
        )
        assertLayoutRect(
            observedRect,
            9,
            10,
            30,
            12,
            "layout-updated focus rect",
        )

        const scrollNode = new LayoutSmokeNode(
            layoutFixedSpec(180, 140),
            1,
            1,
            1,
            1,
        )
        const scroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: scrollNode,
            scrollX: true,
            scrollY: true,
        })
        let scrollLog = ""
        scroll.addScrollObserver((event: UiScrollEvent) => {
            scrollLog += event.kind + ";"
        })
        scroll.setContentOffset(0, 10)
        control.assert(scrollLog == "offset;", "set offset emits")
        scrollLog = ""
        scroll.setContentOffset(0, 10)
        control.assert(scrollLog == "", "unchanged offset silent")
        scroll.arrange(new Rect(0, 0, 100, 70))
        scrollLog = ""
        scroll.setContentOffset(0, 0)
        scrollLog = ""
        scroll.scrollContentRectIntoView(new Rect(120, 20, 20, 10))
        control.assert(scrollLog == "offset;", "scroll into view emits")
        const queriedOffset = new Point()
        scrollLog = ""
        scroll.setContentOffset(0, 0)
        scroll.arrange(new Rect(0, 0, 100, 70))
        scrollLog = ""
        scroll.getContentOffsetForRect(new Rect(120, 20, 20, 10), queriedOffset)
        control.assert(queriedOffset.x == 40, "query offset x")
        control.assert(queriedOffset.y == 0, "query offset y")
        control.assert(scroll.contentOffsetX == 0, "query keeps offset x")
        control.assert(scroll.contentOffsetY == 0, "query keeps offset y")
        control.assert(!scroll.layoutDirty, "query keeps layout clean")
        control.assert(scrollLog == "", "query emits no scroll event")
        scroll.scrollContentRectIntoView(new Rect(120, 20, 20, 10))
        control.assert(
            scroll.contentOffsetX == queriedOffset.x,
            "query matches stored x",
        )
        control.assert(
            scroll.contentOffsetY == queriedOffset.y,
            "query matches stored y",
        )
        scrollLog = ""
        scroll.setPadding(2)
        scroll.setPadding(2)
        scroll.setScrollAxes(false, true)
        scroll.setScrollAxes(false, true)
        const replacementChild = new LayoutSmokeNode(
            layoutFixedSpec(60, 30),
            1,
            1,
            1,
            1,
        )
        scroll.setChild(replacementChild)
        scroll.setChild(replacementChild)
        scroll.clearChild()
        scroll.clearChild()
        control.assert(
            scrollLog ==
                "configuration;configuration;configuration;configuration;",
            "configuration events",
        )

        const clampingScroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: new LayoutSmokeNode(layoutFixedSpec(60, 30), 1, 1, 1, 1),
            contentOffsetY: 40,
        })
        scrollLog = ""
        clampingScroll.addScrollObserver((event: UiScrollEvent) => {
            scrollLog += event.kind + ";"
        })
        clampingScroll.arrange(new Rect(0, 0, 100, 80))
        control.assert(scrollLog == "geometry;offset;", "arrange event order")

        const addDuringScroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: new LayoutSmokeNode(layoutFixedSpec(60, 30), 1, 1, 1, 1),
            contentOffsetY: 40,
        })
        let addDuringScrollLog = ""
        let addedScrollObserver = false
        addDuringScroll.addScrollObserver((event: UiScrollEvent) => {
            addDuringScrollLog += "first-" + event.kind + ";"
            if (event.kind == "geometry" && !addedScrollObserver) {
                addedScrollObserver = true
                addDuringScroll.addScrollObserver(
                    (addedEvent: UiScrollEvent) => {
                        addDuringScrollLog += "added-" + addedEvent.kind + ";"
                    },
                )
            }
        })
        addDuringScroll.arrange(new Rect(0, 0, 100, 80))
        control.assert(
            addDuringScrollLog == "first-geometry;first-offset;added-offset;",
            "added observer receives later operation event",
        )
    }

    class ControlSmokeSurface implements DrawSurface {
        public log: string

        constructor() {
            this.log = ""
        }

        public clear(color: number): void {
            this.log += "clear:" + color + ";"
        }

        public fillRect(rect: Rect, color: number): void {
            this.log += "fill:" + color + ";"
        }

        public drawRect(rect: Rect, color: number): void {
            this.log += "rect:" + color + ";"
        }

        public drawRoundedRect(
            rect: Rect,
            color?: number,
            fillColor?: number,
        ): void {
            this.log +=
                "rounded:" +
                (color === undefined ? "" : color) +
                ":" +
                (fillColor === undefined ? "" : fillColor) +
                ";"
        }

        public drawLine(
            x0: number,
            y0: number,
            x1: number,
            y1: number,
            color: number,
        ): void {
            this.log += "line:" + color + ";"
        }

        public drawCircle(
            cx: number,
            cy: number,
            radius: number,
            color: number,
        ): void {
            this.log += "circle:" + color + ";"
        }

        public fillCircle(
            cx: number,
            cy: number,
            radius: number,
            color: number,
        ): void {
            this.log += "fcircle:" + color + ";"
        }

        public drawBitmap(
            bitmap: Bitmap,
            x: number,
            y: number,
            options?: DrawBitmapOptions,
        ): void {
            this.log += "bitmap:" + bitmap.width + "x" + bitmap.height + ";"
        }

        public drawText(
            text: string,
            x: number,
            y: number,
            options?: DrawTextOptions,
        ): void {
            this.log += "text:" + text + ";"
        }

        public measureText(
            text: string,
            font?: TextFont,
            options?: DrawTextOptions,
        ): Size {
            return new Size(text.length * 5, 8)
        }
    }

    class PositionSmokeSurface extends ControlSmokeSurface {
        private displayProfile_: UiDisplayProfile
        public textX: number
        public textY: number

        constructor(displayProfile?: UiDisplayProfile) {
            super()
            this.displayProfile_ = displayProfile
        }

        public get displayProfile(): UiDisplayProfile {
            return this.displayProfile_
        }

        public drawText(
            text: string,
            x: number,
            y: number,
            options?: DrawTextOptions,
        ): void {
            this.textX = x
            this.textY = y
            super.drawText(text, x, y, options)
        }
    }

    class ControlSmokeAssets implements UiAssetResolver {
        public fallbackBitmap: Bitmap
        public knownBitmap: Bitmap

        constructor() {
            this.fallbackBitmap = bmp`1`
            this.knownBitmap = bmp`2 2`
        }

        public getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined {
            if (id == "known") return this.knownBitmap
            if (nullIfMissing) return undefined
            return this.fallbackBitmap
        }

        public getText(id: string): string {
            if (id == "knownText") return "resolved"
            return ""
        }
    }

    class ControlSmokeScreen extends UiScreen {
        private inputHandler_: (event: UiInputEvent) => boolean | undefined

        constructor(handler: (event: UiInputEvent) => boolean | undefined) {
            super()
            this.inputHandler_ = handler
        }

        public handleScreenInput(
            event: UiInputEvent,
        ): boolean | undefined {
            return this.inputHandler_(event)
        }
    }

    /**
     * Smoke harness for reusable control visuals.
     */
    export function runControlButtonSmokeTest(): void {
        const surface = new ControlSmokeSurface()
        const buttonView = new UiButtonView({
            style: UiButtonStyles.LightShadowedWhite,
        })
        const rect = new Rect(10, 20, 18, 18)
        const contentRect = new Rect()
        const measured = new UiMeasuredSize()
        const bitmap = bmp`
      2 2
      2 2
    `

        buttonView.measure({ bitmap }, measured)
        control.assert(measured.preferredWidth == 6, "control measured width")
        control.assert(measured.preferredHeight == 6, "control measured height")
        buttonView.render(surface, rect, { bitmap }, { focused: true, contentRect })

        assertLayoutRect(contentRect, 18, 28, 2, 2, "control content rect")
        control.assert(surface.log.indexOf("fill:1;") >= 0, "control fill")
        control.assert(surface.log.indexOf("line:11;") >= 0, "control shadow")
        control.assert(surface.log.indexOf("bitmap:2x2;") >= 0, "control bitmap")
        control.assert(surface.log.indexOf("line:9;") >= 0, "control focus")

        const focusLabelStyle = buttonStyle(
            UiButtonStyles.Transparent,
            UiButtonStyles.FocusLabel,
            {
                focusColor: 4,
                focusLabelBackgroundColor: 7,
                focusLabelColor: 3,
                focusLabelFont: bitmaps.font5,
                focusLabelGap: 2,
            },
        )
        control.assert(focusLabelStyle.focusColor == 4, "control style override")
        surface.log = ""
        buttonView.render(surface, rect, { bitmap, text: "go" }, {
            style: focusLabelStyle,
        })
        control.assert(
            surface.log.indexOf("text:go;") < 0,
            "control focus label hidden",
        )
        surface.log = ""
        buttonView.render(surface, rect, { bitmap, text: "go" }, {
            focused: true,
            style: focusLabelStyle,
            labelBounds: new Rect(0, 0, 40, 40),
        })
        control.assert(
            surface.log.indexOf("fill:7;") >= 0,
            "control focus label fill",
        )
        control.assert(
            surface.log.indexOf("text:go;") >= 0,
            "control focus label text",
        )
    }

    /**
     * Smoke harness for screen-owned view focus and input plumbing.
     */
    export function runScreenControllerSmokeTest(): void {
        let screenLog = ""
        const screen = new ControlSmokeScreen((event: UiInputEvent) => {
            if (event.action == "cancel" && event.phase != "released") {
                screenLog += "root-cancel;"
                return true
            }
            return undefined
        })
        const screenRuntime = new UiRuntime({
            display: new RuntimeSmokeDisplayAdapter(() => {}),
            assets: new ControlSmokeAssets(),
        })
        const screenRow = new UiRow<string>({
            scopeId: "screen-row",
            controls: [
                { id: "a", value: "A" },
                { id: "b", value: "B", selected: true },
            ],
            onActivate: value => {
                screenLog += value + ";"
            },
        })
        screen.addCentered(screenRow, 15, 100, 20)
        const autoRow = new UiRow<string>({
            scopeId: "screen-auto-row",
            controls: [
                { id: "a", value: "A" },
                { id: "b", value: "B" },
            ],
            controlWidth: 10,
            controlHeight: 6,
            gap: 3,
        })
        screen.add(autoRow, {
            x: 7,
            y: 32,
        })
        screen.enter(screenRuntime)
        control.assert(
            screen.focus.getActiveTargetId("screen-row") == "screen-row/b",
            "screen controller root focus",
        )
        const screenControlRect = new Rect()
        control.assert(
            screenRow.getControlRect("b", screenControlRect),
            "screen controller placed control exists",
        )
        assertLayoutRect(
            screenControlRect,
            51,
            5,
            24,
            20,
            "screen controller placed control rect",
        )
        const autoControlRect = new Rect()
        control.assert(
            autoRow.getControlRect("b", autoControlRect),
            "screen auto placed control exists",
        )
        assertLayoutRect(
            autoControlRect,
            20,
            32,
            10,
            6,
            "screen auto placed control rect",
        )
        control.assert(
            screen.handleInput({ action: "activate" }),
            "screen controller activation handled",
        )
        control.assert(screenLog == "B;", "screen controller root callback")
        control.assert(
            screen.handleInput({ action: "cancel" }),
            "screen controller root cancel handled",
        )
        control.assert(
            !screen.handleInput({ action: "cancel", phase: "released" }),
            "screen controller cancel release unhandled",
        )
        control.assert(
            !screen.handleInput({ action: "menu" }),
            "screen controller leaves menu unregistered",
        )

        const screenSurface = new ControlSmokeSurface()
        screen.render(screenSurface)
        control.assert(
            screenSurface.log.length > 0,
            "screen controller renders roots",
        )

        const screenModal = new UiPicker<string>({
            parentScopeId: "screen-row",
            modalScopeId: "screen-modal",
            controls: [{ id: "modal", value: "M" }],
            onCancel: () => {
                screenLog += "modal-cancel;"
            },
        })
        screen.openModal(screenModal)
        assertLayoutRect(
            screenModal.finalRect,
            64,
            40,
            32,
            40,
            "screen controller default modal layout",
        )
        control.assert(screen.hasModal, "screen controller has modal")
        control.assert(
            screen.handleInput({ action: "cancel" }),
            "screen controller modal input handled",
        )
        control.assert(
            screenLog == "B;root-cancel;modal-cancel;",
            "screen controller modal-first input",
        )
        control.assert(!screen.hasModal, "screen controller modal cancel closes")
        screen.exit()
    }

    function assertControlActivation<T>(
        result: any,
        kind: string,
        controlId: string,
        value: T,
        name: string,
    ): void {
        control.assert(!!result, name + " result exists")
        control.assert(result.kind == kind, name + " result kind")
        control.assert(result.controlId == controlId, name + " control id")
        control.assert(result.value == value, name + " value")
        control.assert(
            !!result.control && result.control.id == controlId,
            name + " source control",
        )
    }

    /**
     * Smoke harness for shared control records and default rendering.
     */
    export function runControlRecordSmokeTest(): void {
        const assets = new ControlSmokeAssets()
        const surface = new ControlSmokeSurface()
        let drawLog = ""
        const drawControl: UiControl<string> = {
            id: "custom",
            value: "custom-value",
            draw: (
                target: DrawSurface,
                control: UiControl<string>,
                rect: Rect,
                focused: boolean,
            ) => {
                drawLog += control.id + ":" + focused + ";"
            },
        }
        const controls: UiControl<string>[] = [
            { id: "text", value: "typed", text: "caller", selected: true },
            { id: "textId", value: "text-id", textId: "knownText" },
            { id: "bitmap", value: "bitmap", bitmap: bmp`3` },
            { id: "bitmapId", value: "bitmap-id", bitmapId: "known" },
            { id: "fallback", value: "fallback", bitmapId: "missing" },
            {
                id: "omitted",
                value: "omitted",
                bitmapId: "missing",
                omitMissingBitmap: true,
            },
            {
                id: "disabled",
                value: "disabled",
                text: "disabled",
                disabled: true,
            },
            { id: "hidden", value: "hidden", text: "hidden", visible: false },
            { id: "toggle", value: "toggle", text: "toggle", toggled: true },
            drawControl,
        ]
        const row = new UiRow<string>({
            scopeId: "controls",
            controls,
            controlWidth: 30,
            controlHeight: 12,
            gap: 1,
        })
        const measured = new UiMeasuredSize()
        row.measure({ maxWidth: 400, maxHeight: 40 }, measured)
        control.assert(
            measured.preferredWidth == 309,
            "control row measured width",
        )
        row.arrange(new Rect(0, 0, 400, 20))
        row.render(surface, assets)

        const labelFocus = new UiFocusState()
        const labelSurface = new ControlSmokeSurface()
        const labelRow = new UiRow<string>({
            scopeId: "control-labels",
            controls: [{ id: "label", value: "label", textId: "knownText" }],
            controlWidth: 24,
            controlHeight: 20,
            controlStyle: buttonStyle(
                UiButtonStyles.Transparent,
                UiButtonStyles.FocusLabel,
                { focusLabelBackgroundColor: 7 },
            ),
            labelBounds: new Rect(0, 0, 40, 40),
        })
        labelRow.arrange(new Rect(0, 0, 24, 20))
        labelRow.registerFocusTargets(labelFocus)
        labelRow.focusDefault(labelFocus)
        labelRow.render(labelSurface, assets, labelFocus)
        control.assert(
            labelSurface.log.indexOf("text:resolved;") >= 0,
            "control focus label text",
        )
        control.assert(
            labelSurface.log.indexOf("fill:7;") >= 0,
            "control focus label fill",
        )

        control.assert(
            controls[0].visible === undefined,
            "visible omitted default",
        )
        control.assert(_uiControls.isVisible(controls[0]), "visible default true")
        control.assert(
            _uiControls.controlText(
                {
                    id: "precedence",
                    value: "value",
                    text: "caller",
                    textId: "knownText",
                },
                assets,
            ) == "caller",
            "caller text precedence",
        )
        control.assert(
            _uiControls.controlBitmap(
                {
                    id: "precedence",
                    value: "value",
                    bitmap: bmp`4`,
                    bitmapId: "known",
                },
                assets,
            ).width == 1,
            "caller bitmap precedence",
        )
        control.assert(
            surface.log.indexOf("text:caller;") >= 0,
            "caller text rendered",
        )
        control.assert(
            surface.log.indexOf("text:resolved;") >= 0,
            "resolver text rendered",
        )
        control.assert(
            surface.log.indexOf("bitmap:1x1;") >= 0,
            "caller bitmap rendered",
        )
        control.assert(
            surface.log.indexOf("bitmap:2x1;") >= 0,
            "resolver bitmap rendered",
        )
        control.assert(surface.log.indexOf("text:;") < 0, "missing text empty")
        control.assert(
            surface.log.indexOf("fallback") < 0,
            "fallback text absent",
        )
        control.assert(drawLog == "custom:false;", "draw callback precedence")
        control.assert(
            _uiControls.controlBitmap(controls[4], assets) == assets.fallbackBitmap,
            "missing bitmap fallback",
        )
        control.assert(
            _uiControls.controlBitmap(controls[5], assets) === undefined,
            "missing bitmap omitted",
        )
        control.assert(_uiControls.isDisabled(controls[6]), "disabled flag")
        control.assert(!_uiControls.isVisible(controls[7]), "hidden flag")
        control.assert(_uiControls.isSelected(controls[0]), "selected flag")
        control.assert(_uiControls.isToggled(controls[8]), "toggled flag")

        let helperActivationLog = ""
        const helperButton = button(
            "helper",
            "known",
            "knownText",
            () => {
                helperActivationLog += "clicked;"
            },
        )
        control.assert(helperButton.value == "helper", "button helper value")
        control.assert(helperButton.bitmapId == "known", "button helper bitmap")
        control.assert(helperButton.textId == "knownText", "button helper text")
        _uiControls.emitControlActivate(
            helperButton.value,
            helperButton,
            helperButton.id,
        )
        control.assert(
            helperActivationLog == "clicked;",
            "button helper activation",
        )
        const helperIcon = iconButton("icon", "known")
        control.assert(helperIcon.value == "icon", "icon helper value")
        control.assert(
            helperIcon.textId === undefined,
            "icon helper omits text",
        )
    }

    /**
     * Smoke harness for control row focus, navigation, activation, and exits.
     */
    export function runControlRowSmokeTest(): void {
        const focus = new UiFocusState()
        const controller = new UiFocusInputController({ focus })
        let activationLog = ""
        const row = new UiRow<number>({
            scopeId: "row",
            defaultControlId: "disabled",
            controls: [
                {
                    id: "a",
                    value: 1,
                    onActivate: (
                        value: number,
                        control: UiControl<number>,
                        controlId: string,
                    ) => {
                        activationLog +=
                            "control:" +
                            controlId +
                            ":" +
                            value +
                            ":" +
                            control.id +
                            ";"
                    },
                },
                { id: "hidden", value: 2, visible: false },
                { id: "disabled", value: 3, disabled: true },
                { id: "c", value: 4, selected: true },
            ],
            controlWidth: 10,
            controlHeight: 10,
            gap: 0,
            onActivate: (
                value: number,
                control: UiControl<number>,
                controlId: string,
            ) => {
                activationLog += controlId + ":" + value + ":" + control.id + ";"
            },
        })

        row.arrange(new Rect(0, 0, 60, 10))
        row.registerFocusTargets(focus)
        row.registerNavigation(controller)
        row.focusDefault(focus)
        control.assert(
            focus.getActiveTargetId("row") == "row/c",
            "row selected default focus",
        )

        let inputResult = controller.handleInput({ action: "left" })
        control.assert(inputResult.kind == "moved", "row skips hidden disabled")
        control.assert(
            focus.getActiveTargetId("row") == "row/a",
            "row moved to first enabled",
        )
        inputResult = controller.handleInput({ action: "activate" })
        const activated = row.handleFocusInput(inputResult)
        assertControlActivation(activated, "activated", "a", 1, "row activated")
        control.assert(
            activationLog == "control:a:1:a;a:1:a;",
            "row activation callback",
        )
        inputResult = controller.handleInput({ action: "left" })
        const exited = row.handleFocusInput(inputResult)
        control.assert(exited.kind == "exited", "row boundary exit")
        control.assert((<any>exited).direction == "left", "row exit direction")
        control.assert((<any>exited).controlId == "a", "row exit control")

        const rect = new Rect()
        control.assert(row.getControlRect("c", rect), "row control rect exists")
        assertLayoutRect(rect, 30, 0, 10, 10, "row control rect")

        row.setControls([{ id: "replacement", value: 9 }])
        row.arrange(new Rect(0, 0, 20, 10))
        row.registerFocusTargets(focus)
        row.registerNavigation(controller)
        const staleRowTarget = focus.setActiveTarget("row", "row/a")
        control.assert(
            staleRowTarget.kind == "rejected",
            "row stale target rejected",
        )
        control.assert(
            staleRowTarget.kind == "rejected" &&
                staleRowTarget.reason == "missingTarget",
            "row stale target removed",
        )
        row.focusDefault(focus)
        control.assert(
            focus.getActiveTargetId("row") == "row/replacement",
            "row replacement focus",
        )
        inputResult = controller.handleInput({ action: "activate" })
        assertControlActivation(
            row.handleFocusInput(inputResult),
            "activated",
            "replacement",
            9,
            "row replacement activation",
        )
        control.assert(
            activationLog ==
                "control:a:1:a;a:1:a;replacement:9:replacement;",
            "row replacement callback",
        )
    }

    /**
     * Smoke harness for variable-size control strip layout and focus behavior.
     */
    export function runControlStripSmokeTest(): void {
        const focus = new UiFocusState()
        const controller = new UiFocusInputController({ focus })
        const strip = new UiControlStrip<number>({
            scopeId: "strip",
            controls: [
                { id: "a", value: 1, width: 4, height: 4 },
                {
                    id: "static",
                    value: 2,
                    width: 3,
                    height: 2,
                    gapBefore: 2,
                    gapAfter: 3,
                    focusable: false,
                },
                { id: "c", value: 3, width: 5, height: 6, selected: true },
            ],
            controlWidth: 10,
            controlHeight: 10,
            gap: 1,
        })
        const measured = new UiMeasuredSize()
        strip.measure({ maxWidth: 100, maxHeight: 20 }, measured)
        control.assert(
            measured.preferredWidth == 18,
            "control strip measured width",
        )
        control.assert(
            measured.preferredHeight == 6,
            "control strip measured height",
        )
        strip.arrange(new Rect(10, 20, 50, 12))

        const rect = new Rect()
        control.assert(strip.getControlRect("a", rect), "strip a rect exists")
        assertLayoutRect(rect, 10, 21, 4, 4, "strip a rect")
        control.assert(
            strip.getControlRect("static", rect),
            "strip static rect exists",
        )
        assertLayoutRect(rect, 16, 22, 3, 2, "strip static rect")
        control.assert(strip.getControlRect("c", rect), "strip c rect exists")
        assertLayoutRect(rect, 23, 20, 5, 6, "strip c rect")

        const targets: UiFocusNavigationTarget[] = []
        strip.copyNavigationTargets(targets)
        control.assert(targets.length == 2, "strip skips static target")
        control.assert(targets[0].id == "strip/a", "strip first target")
        control.assert(targets[1].id == "strip/c", "strip second target")

        strip.registerFocusTargets(focus)
        strip.registerNavigation(controller)
        strip.focusDefault(focus)
        control.assert(
            focus.getActiveTargetId("strip") == "strip/c",
            "strip selected default focus",
        )
        const inputResult = controller.handleInput({ action: "left" })
        control.assert(inputResult.kind == "moved", "strip moves left")
        control.assert(
            focus.getActiveTargetId("strip") == "strip/a",
            "strip skips static on move",
        )
    }

    /**
     * Smoke harness for control grid rectangular, ragged, scroll, and exit behavior.
     */
    export function runControlGridSmokeTest(): void {
        const focus = new UiFocusState()
        const scrollRequests: UiFocusScrollRequest[] = []
        const controller = new UiFocusInputController({
            focus,
            scroll: request => scrollRequests.push(request),
        })
        let activationLog = ""
        const grid = new UiGrid<number>({
            scopeId: "grid",
            controls: [
                { id: "a", value: 1 },
                { id: "b", value: 2, visible: false },
                {
                    id: "c",
                    value: 3,
                    onActivate: (
                        value: number,
                        control: UiControl<number>,
                        controlId: string,
                    ) => {
                        activationLog +=
                            "control:" +
                            controlId +
                            ":" +
                            value +
                            ":" +
                            control.id +
                            ";"
                    },
                },
                { id: "d", value: 4, disabled: true },
                { id: "e", value: 5, selected: true },
            ],
            columnCount: 3,
            controlWidth: 8,
            controlHeight: 6,
            rowGap: 1,
            columnGap: 2,
            scrollOwnerId: "grid-scroll",
            onActivate: (
                value: number,
                control: UiControl<number>,
                controlId: string,
            ) => {
                activationLog += controlId + ":" + value + ":" + control.id + ";"
            },
        })

        grid.arrange(new Rect(10, 20, 100, 60))
        grid.registerFocusTargets(focus)
        grid.registerNavigation(controller)
        const defaultFocusResult = grid.focusDefault(focus)
        control.assert(
            focus.getActiveTargetId("grid") == "grid/e",
            "grid selected default focus",
        )
        control.assert(
            defaultFocusResult.kind == "focused",
            "grid default focus result",
        )
        control.assert(
            defaultFocusResult.kind == "focused" &&
                !!defaultFocusResult.scrollRequest,
            "grid default scroll request",
        )
        if (
            defaultFocusResult.kind == "focused" &&
            defaultFocusResult.scrollRequest
        ) {
            assertLayoutRect(
                defaultFocusResult.scrollRequest.targetRect,
                20,
                27,
                8,
                6,
                "grid scroll rect",
            )
        }

        focus.setActiveTarget("grid", "grid/a")
        let inputResult = controller.handleInput({ action: "right" })
        control.assert(inputResult.kind == "moved", "grid moves right")
        control.assert(
            focus.getActiveTargetId("grid") == "grid/c",
            "grid skips hidden",
        )
        control.assert(
            scrollRequests.length == 1,
            "grid movement delivers scroll request",
        )
        assertLayoutRect(
            scrollRequests[0].targetRect,
            30,
            20,
            8,
            6,
            "grid movement scroll rect",
        )
        inputResult = controller.handleInput({ action: "activate" })
        assertControlActivation(
            grid.handleFocusInput(inputResult),
            "activated",
            "c",
            3,
            "grid activated",
        )
        control.assert(
            activationLog == "control:c:3:c;c:3:c;",
            "grid activation callback",
        )
        inputResult = controller.handleInput({ action: "right" })
        const exit = grid.handleFocusInput(inputResult)
        control.assert(exit.kind == "exited", "grid boundary exit")
        control.assert((<any>exit).direction == "right", "grid exit direction")

        grid.setControls([{ id: "replacement", value: 99 }])
        grid.arrange(new Rect(10, 20, 40, 20))
        grid.registerFocusTargets(focus)
        grid.registerNavigation(controller)
        const staleGridTarget = focus.setActiveTarget("grid", "grid/c")
        control.assert(
            staleGridTarget.kind == "rejected",
            "grid stale target rejected",
        )
        control.assert(
            staleGridTarget.kind == "rejected" &&
                staleGridTarget.reason == "missingTarget",
            "grid stale target removed",
        )
        grid.focusDefault(focus)
        control.assert(
            focus.getActiveTargetId("grid") == "grid/replacement",
            "grid replacement focus",
        )
        inputResult = controller.handleInput({ action: "activate" })
        assertControlActivation(
            grid.handleFocusInput(inputResult),
            "activated",
            "replacement",
            99,
            "grid replacement activation",
        )
        control.assert(
            activationLog ==
                "control:c:3:c;c:3:c;replacement:99:replacement;",
            "grid replacement callback",
        )

        const raggedFocus = new UiFocusState()
        const raggedController = new UiFocusInputController({
            focus: raggedFocus,
        })
        const ragged = new UiGrid<string>({
            scopeId: "ragged",
            controls: [
                { id: "r0a", value: "r0a" },
                { id: "r1a", value: "r1a" },
                { id: "r1b", value: "r1b" },
                { id: "r2a", value: "r2a" },
            ],
            rows: [1, 2, 1],
            controlWidth: 10,
            controlHeight: 8,
        })
        ragged.arrange(new Rect(0, 0, 60, 60))
        ragged.registerFocusTargets(raggedFocus)
        ragged.registerNavigation(raggedController)
        ragged.focusDefault(raggedFocus)
        control.assert(
            raggedFocus.getActiveTargetId("ragged") == "ragged/r0a",
            "ragged default",
        )
        raggedController.handleInput({ action: "down" })
        control.assert(
            raggedFocus.getActiveTargetId("ragged") == "ragged/r1a",
            "ragged down",
        )
        raggedController.handleInput({ action: "right" })
        control.assert(
            raggedFocus.getActiveTargetId("ragged") == "ragged/r1b",
            "ragged right",
        )
        raggedController.handleInput({ action: "down" })
        control.assert(
            raggedFocus.getActiveTargetId("ragged") == "ragged/r2a",
            "ragged nearest down",
        )

        const labelFocus = new UiFocusState()
        const labelSurface = new PositionSmokeSurface({
            id: UiDisplayProfileId.Standard,
            logicalWidth: STANDARD_DISPLAY_WIDTH,
            logicalHeight: STANDARD_DISPLAY_HEIGHT,
            aspectRatio: STANDARD_DISPLAY_WIDTH / STANDARD_DISPLAY_HEIGHT,
            designToLogicalScaleX: 2,
            designToLogicalScaleY: 2,
        })
        const labelGrid = new UiGrid<string>({
            scopeId: "grid-labels",
            controls: [{ id: "label", value: "label", textId: "knownText" }],
            controlWidth: 24,
            controlHeight: 20,
            controlStyle: buttonStyle(
                UiButtonStyles.Transparent,
                UiButtonStyles.FocusLabel,
            ),
        })
        labelGrid.arrange(new Rect(70, 50, 24, 20))
        labelGrid.registerFocusTargets(labelFocus)
        labelGrid.focusDefault(labelFocus)
        labelGrid.render(labelSurface, new ControlSmokeAssets(), labelFocus)
        const labelTextWidth = bitmaps.font5.charWidth * "resolved".length
        const labelTextHeight = bitmaps.font5.charHeight
        control.assert(
            labelSurface.textX <= 80 - 1 - labelTextWidth,
            "grid default label bounds x",
        )
        control.assert(
            labelSurface.textY <= 60 - 1 - labelTextHeight,
            "grid default label bounds y",
        )
    }

    /**
     * Smoke harness for modal grid result timing and focus restoration.
     */
    export function runPickerSmokeTest(): void {
        const focus = new UiFocusState()
        const controller = new UiFocusInputController({ focus })
        const assets = new ControlSmokeAssets()
        let activationLog = ""
        let cancelLog = ""
        focus.setScope({ id: "parent" })
        focus.setTarget({
            id: "parent/control",
            scopeId: "parent",
            rect: new Rect(0, 0, 10, 10),
            activatable: true,
        })
        focus.setActiveTarget("parent", "parent/control")

        const modal = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "modal",
            title: "Caller title",
            titleId: "knownText",
            defaultControlId: "disabled",
            deleteEnabled: true,
            closeOnActivate: true,
            columnCount: 2,
            controls: [
                { id: "a", value: "A" },
                { id: "disabled", value: "D", disabled: true },
                { id: "hidden", value: "H", visible: false },
                {
                    id: "selected",
                    value: "S",
                    selected: true,
                    onActivate: (
                        value: string,
                        control: UiControl<string>,
                        controlId: string,
                    ) => {
                        activationLog +=
                            "control:" +
                            controlId +
                            ":" +
                            value +
                            ":" +
                            control.id +
                            ";"
                    },
                },
            ],
            onActivate: (
                value: string,
                control: UiControl<string>,
                controlId: string,
            ) => {
                activationLog += controlId + ":" + value + ":" + control.id + ";"
            },
            onCancel: (modalScopeId: UiFocusScopeId) => {
                cancelLog += modalScopeId + ";"
            },
        })
        modal.arrange(new Rect(20, 20, 80, 60))
        const modalControlRect = new Rect()
        control.assert(
            modal.getControlRect("selected", modalControlRect),
            "modal control rect exists",
        )
        assertLayoutRect(
            modalControlRect,
            50,
            58,
            24,
            20,
            "modal selected control rect",
        )
        const roomyModal = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "roomy",
            contentMargin: 6,
            columnCount: 2,
            controls: [
                { id: "a", value: "A" },
                { id: "b", value: "B" },
            ],
        })
        const roomyMeasured = new UiMeasuredSize()
        roomyModal.measure({ maxWidth: 100, maxHeight: 100 }, roomyMeasured)
        control.assert(
            roomyMeasured.preferredWidth == 62,
            "modal custom margin width",
        )
        control.assert(
            roomyMeasured.preferredHeight == 42,
            "modal custom margin height",
        )
        const styledModal = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "styled",
            modalStyle: modalStyle(UiModalStyles.Default, {
                contentMargin: 6,
            }),
            columnCount: 2,
            controls: [
                { id: "a", value: "A" },
                { id: "b", value: "B" },
            ],
        })
        const styledMeasured = new UiMeasuredSize()
        styledModal.measure({ maxWidth: 100, maxHeight: 100 }, styledMeasured)
        control.assert(
            styledMeasured.preferredWidth == 62,
            "modal style margin width",
        )
        control.assert(
            styledMeasured.preferredHeight == 42,
            "modal style margin height",
        )
        const gappedModal = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "gapped",
            titleGap: 3,
            controls: [{ id: "a", value: "A" }],
        })
        const gappedMeasured = new UiMeasuredSize()
        gappedModal.measure({ maxWidth: 100, maxHeight: 100 }, gappedMeasured)
        control.assert(
            gappedMeasured.preferredHeight == 43,
            "modal title gap height",
        )
        gappedModal.arrange(new Rect(0, 0, 40, 50))
        control.assert(
            gappedModal.getControlRect("a", modalControlRect),
            "modal title gap control rect exists",
        )
        assertLayoutRect(
            modalControlRect,
            4,
            19,
            24,
            20,
            "modal title gap control rect",
        )
        const titlelessModal = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "titleless",
            showTitleBar: false,
            controls: [{ id: "a", value: "A" }],
        })
        const titlelessMeasured = new UiMeasuredSize()
        titlelessModal.measure(
            { maxWidth: 100, maxHeight: 100 },
            titlelessMeasured,
        )
        control.assert(
            titlelessMeasured.preferredHeight == 28,
            "modal hidden title bar height",
        )
        titlelessModal.arrange(new Rect(0, 0, 40, 40))
        control.assert(
            titlelessModal.getControlRect("a", modalControlRect),
            "modal hidden title bar control rect exists",
        )
        assertLayoutRect(
            modalControlRect,
            4,
            4,
            24,
            20,
            "modal hidden title bar control rect",
        )
        modal.open(focus, controller)
        control.assert(
            focus.getActiveScopeId() == "modal",
            "modal active scope",
        )
        control.assert(
            focus.getActiveTargetId("parent") == "parent/control",
            "modal preserved parent target",
        )
        control.assert(
            focus.getActiveTargetId("modal") == "modal/selected",
            "modal selected default",
        )
        control.assert(
            modal.resolveTitleText(assets) == "Caller title",
            "modal title precedence",
        )
        const resolverTitle = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "title",
            titleId: "knownText",
            controls: [{ id: "a", value: "A" }],
        })
        control.assert(
            resolverTitle.resolveTitleText(assets) == "resolved",
            "modal title id",
        )
        const disabledHit = focus.hitTest(51, 37)
        control.assert(disabledHit.kind == "hit", "modal disabled hit")
        control.assert(
            disabledHit.kind == "hit" && disabledHit.disabled,
            "modal disabled hit state",
        )
        const hiddenHit = focus.hitTest(25, 59)
        control.assert(hiddenHit.kind == "miss", "modal hidden skip")

        const outside = focus.hitTest(1, 1)
        control.assert(outside.kind == "miss", "modal blocks outside hit test")
        const cancelInput = controller.handleInput({ action: "cancel" })
        const cancelResult = modal.handleFocusInput(cancelInput)
        control.assert(
            cancelResult.kind == "cancelled",
            "modal cancel result before close",
        )
        control.assert(cancelLog == "modal;", "modal cancel callback")
        control.assert(
            focus.getActiveScopeId() == "modal",
            "modal remains active for cancel processing",
        )
        modal.close(focus)
        control.assert(
            focus.getActiveScopeId() == "parent",
            "modal close restores parent",
        )
        control.assert(
            focus.getActiveTargetId("parent") == "parent/control",
            "modal close restores target",
        )

        modal.open(focus, controller)
        const activateInput = controller.handleInput({ action: "activate" })
        const activated = modal.handleFocusInput(activateInput)
        assertControlActivation(
            activated,
            "activated",
            "selected",
            "S",
            "modal activate",
        )
        control.assert(
            activationLog == "control:selected:S:selected;selected:S:selected;",
            "modal activation callback",
        )
        control.assert((<any>activated).close, "modal activate close flag")
        const deleted = modal.createDeleteResult()
        control.assert(deleted.kind == "deleted", "modal delete result")
        const closed = modal.createCloseResult()
        control.assert(closed.kind == "closed", "modal close result")
        modal.close(focus)
        control.assert(
            focus.getActiveScopeId() == "parent",
            "modal activate caller close restores parent",
        )

        const keepOpen = new UiPicker<string>({
            parentScopeId: "parent",
            modalScopeId: "keep",
            closeOnActivate: false,
            controls: [
                {
                    id: "edit",
                    value: "E",
                    onActivate: (
                        value: string,
                        control: UiControl<string>,
                        controlId: string,
                    ) => {
                        activationLog +=
                            "control:" +
                            controlId +
                            ":" +
                            value +
                            ":" +
                            control.id +
                            ";"
                    },
                },
            ],
            onActivate: (
                value: string,
                control: UiControl<string>,
                controlId: string,
            ) => {
                activationLog += controlId + ":" + value + ":" + control.id + ";"
            },
        })
        keepOpen.arrange(new Rect(0, 0, 60, 40))
        keepOpen.open(focus, controller)
        const keepInput = controller.handleInput({ action: "activate" })
        const keepResult = keepOpen.handleFocusInput(keepInput)
        assertControlActivation(
            keepResult,
            "keepOpen",
            "edit",
            "E",
            "modal keep open",
        )
        control.assert(
            activationLog ==
                "control:selected:S:selected;selected:S:selected;" +
                    "control:edit:E:edit;edit:E:edit;",
            "modal keep-open callback",
        )
        control.assert(
            focus.getActiveScopeId() == "keep",
            "keep-open modal remains active",
        )

        const surface = new ControlSmokeSurface()
        keepOpen.render(surface, assets, focus)
        control.assert(
            surface.log.indexOf("rounded:15:1;") >= 0,
            "modal panel rounded frame",
        )
    }

    /**
     * Smoke harness for toggle grid keep-open, delete, cancel, and caller policy behavior.
     */
    export function runToggleGridSmokeTest(): void {
        const focus = new UiFocusState()
        const controller = new UiFocusInputController({ focus })
        focus.setScope({ id: "parent" })
        focus.setTarget({
            id: "parent/control",
            scopeId: "parent",
            rect: new Rect(0, 0, 10, 10),
            activatable: true,
        })
        focus.setActiveTarget("parent", "parent/control")

        const ledControls: UiControl<number>[] = []
        for (let i = 0; i < 25; i++) {
            ledControls.push({
                id: "led" + i,
                value: i,
                toggled: i == 12,
                palette: i == 12 ? { toggledColor: 9 } : undefined,
            })
        }
        const led = new UiToggleGrid<number>({
            parentScopeId: "parent",
            modalScopeId: "led",
            controls: ledControls,
            columnCount: 5,
            defaultControlId: "led12",
            deleteEnabled: true,
            toggle: control => ({ kind: "keepOpen", value: control.value + 100 }),
        })
        led.arrange(new Rect(0, 0, 100, 100))
        led.open(focus, controller)
        control.assert(
            focus.getActiveTargetId("led") == "led/led12",
            "led default focus",
        )
        const ledSurface = new ControlSmokeSurface()
        led.render(ledSurface, new ControlSmokeAssets(), focus)
        control.assert(
            ledSurface.log.indexOf("fill:9;") >= 0,
            "led toggled rendering",
        )
        const ledResult = led.handleFocusInput(
            controller.handleInput({ action: "activate" }),
        )
        assertControlActivation(ledResult, "keepOpen", "led12", 12, "led toggle")
        control.assert(
            (<any>ledResult).updatedValue == 112,
            "led updated value",
        )
        control.assert(focus.getActiveScopeId() == "led", "led keeps open")
        control.assert(
            led.createDeleteResult().kind == "deleted",
            "led delete result",
        )
        control.assert(
            led.handleFocusInput(controller.handleInput({ action: "cancel" }))
                .kind == "cancelled",
            "led cancel",
        )
        led.close(focus)
        control.assert(
            focus.getActiveScopeId() == "parent",
            "led close restore",
        )

        const melodyControls: UiControl<string>[] = []
        for (let column = 0; column < 4; column++) {
            for (let row = 0; row < 5; row++) {
                melodyControls.push({
                    id: "m" + column + "-" + row,
                    value: column + ":" + row,
                })
            }
        }
        let melodyColumn = ""
        const melody = new UiToggleGrid<string>({
            parentScopeId: "parent",
            modalScopeId: "melody",
            controls: melodyControls,
            columnCount: 4,
            defaultControlId: "m2-3",
            toggle: control => {
                melodyColumn = control.id.substr(1, 1)
                return { kind: "keepOpen", value: "column-" + melodyColumn }
            },
        })
        melody.arrange(new Rect(0, 0, 100, 100))
        melody.open(focus, controller)
        const melodyResult = melody.handleFocusInput(
            controller.handleInput({ action: "activate" }),
        )
        assertControlActivation(
            melodyResult,
            "keepOpen",
            "m2-3",
            "2:3",
            "melody toggle",
        )
        control.assert(
            (<any>melodyResult).updatedValue == "column-2",
            "melody one column policy",
        )
        control.assert(
            melody.createCloseResult().kind == "closed",
            "melody close result",
        )
    }

    /**
     * Smoke harness for numeric entry edit rules and typed results.
     */
    export function runNumericEntrySmokeTest(): void {
        const decimal = new UiNumericEntry({
            mode: "decimal",
            initialText: "1",
            deleteEnabled: true,
        })
        control.assert(decimal.maxLength == 8, "decimal max length default")
        decimal.toggleSign()
        control.assert(decimal.text == "-1", "decimal sign toggle")
        decimal.inputDecimalPoint()
        decimal.inputDecimalPoint()
        control.assert(decimal.text == "-1.", "decimal one point")
        decimal.inputDigit(5)
        control.assert(decimal.text == "-1.5", "decimal digit")
        control.assert(
            decimal.createDeleteResult().kind == "deleted",
            "decimal delete result",
        )
        const backResult = decimal.back()
        control.assert(backResult.kind == "completed", "decimal back completes")
        control.assert((<any>backResult).text == "-1.5", "decimal back text")
        control.assert((<any>backResult).value == -1.5, "decimal back value")

        const zero = new UiNumericEntry({ mode: "decimal", initialText: "-0" })
        const zeroResult = zero.enter()
        control.assert(
            (<any>zeroResult).text == "0",
            "decimal minus zero normalized",
        )
        control.assert((<any>zeroResult).value == 0, "decimal minus zero value")

        const trailingPoint = new UiNumericEntry({
            mode: "decimal",
            initialText: "1",
        })
        trailingPoint.inputDecimalPoint()
        const trailingPointResult = trailingPoint.enter()
        control.assert(
            (<any>trailingPointResult).text == "1",
            "decimal trailing point normalized",
        )

        const decimalPointFirst = new UiNumericEntry({ mode: "decimal" })
        decimalPointFirst.inputDecimalPoint()
        control.assert(
            decimalPointFirst.text == "",
            "decimal rejects leading point",
        )
        decimalPointFirst.toggleSign()
        decimalPointFirst.inputDecimalPoint()
        control.assert(
            decimalPointFirst.text == "-",
            "decimal rejects point after sign",
        )

        const decimalLeadingZero = new UiNumericEntry({
            mode: "decimal",
            initialText: "0",
        })
        decimalLeadingZero.inputDigit(5)
        control.assert(
            decimalLeadingZero.text == "5",
            "decimal replaces zero with digit",
        )
        const decimalZeroFraction = new UiNumericEntry({
            mode: "decimal",
            initialText: "0",
        })
        decimalZeroFraction.inputDecimalPoint()
        decimalZeroFraction.inputDigit(5)
        control.assert(
            decimalZeroFraction.text == "0.5",
            "decimal accepts digit after zero point",
        )

        const decimalNegativeLeadingZero = new UiNumericEntry({
            mode: "decimal",
            initialText: "-0",
        })
        decimalNegativeLeadingZero.inputDigit(5)
        control.assert(
            decimalNegativeLeadingZero.text == "-5",
            "decimal replaces minus zero with digit",
        )
        const decimalNegativeZeroFraction = new UiNumericEntry({
            mode: "decimal",
            initialText: "-0",
        })
        decimalNegativeZeroFraction.inputDecimalPoint()
        decimalNegativeZeroFraction.inputDigit(5)
        control.assert(
            decimalNegativeZeroFraction.text == "-0.5",
            "decimal accepts digit after minus zero point",
        )

        const positive = new UiNumericEntry({
            mode: "positiveInteger",
            initialText: "0",
            maxLength: 3,
        })
        positive.toggleSign()
        positive.inputDecimalPoint()
        control.assert(
            positive.text == "0",
            "positive rejects sign and decimal",
        )
        positive.inputDigit(7)
        positive.inputDigit(8)
        positive.inputDigit(9)
        positive.inputDigit(6)
        control.assert(
            positive.text == "789",
            "positive leading zero replacement",
        )
        const positiveResult = positive.enter()
        control.assert(
            positiveResult.kind == "completed",
            "positive enter completes",
        )
        control.assert(
            (<any>positiveResult).value == 789,
            "positive integer value",
        )

        const positiveZero = new UiNumericEntry({
            mode: "positiveInteger",
            initialText: "0",
        })
        const positiveZeroResult = positiveZero.enter()
        control.assert(
            (<any>positiveZeroResult).text == "1",
            "positive zero fixup",
        )
        control.assert(
            (<any>positiveZeroResult).value == 1,
            "positive zero value",
        )

        const noCancel = new UiNumericEntry({ mode: "decimal" })
        control.assert(
            noCancel.cancel() === undefined,
            "cancel absent by default",
        )
        control.assert(
            noCancel.createDeleteResult() === undefined,
            "delete absent by default",
        )
        const cancel = new UiNumericEntry({
            mode: "decimal",
            cancelEnabled: true,
            initialText: "3",
        })
        control.assert(cancel.cancel().kind == "cancelled", "cancel enabled")

        let validateLog = ""
        let completedValidatorCalls = 0
        const validated = new UiNumericEntry({
            mode: "decimal",
            validate: (
                mode: UiNumericEntryMode,
                candidate: string,
                action: UiNumericEntryEditAction,
            ) => {
                validateLog += action + ":" + candidate + ";"
                if (mode == "decimal" && candidate == "9" && action == "digit")
                    completedValidatorCalls++
                return candidate == "9" ? "completed" : "accepted"
            },
        })
        const completed = validated.inputDigit(9)
        control.assert(completed.kind == "completed", "validator completed")
        control.assert(
            completedValidatorCalls >= 1,
            "validator receives typed action",
        )
        control.assert(
            validateLog.indexOf("digit:9;") >= 0,
            "validator receives candidate",
        )

        let modalResult: UiNumericEntryResult = undefined
        const modal = new UiNumericEntryModal({
            modalScopeId: "numeric-modal",
            mode: "positiveInteger",
            initialText: "0",
            modalStyle: modalStyle(UiModalStyles.Titleless, {
                contentMargin: 5,
            }),
            displayPalette: { backgroundColor: 1, foregroundColor: 15 },
            onResult: result => {
                modalResult = result
            },
        })
        const modalMeasured = new UiMeasuredSize()
        modal.measure({ maxWidth: 160, maxHeight: 120 }, modalMeasured)
        control.assert(
            modalMeasured.preferredWidth == 88,
            "numeric modal measured width",
        )
        control.assert(
            modalMeasured.preferredHeight == 111,
            "numeric modal measured height",
        )
        modal.arrange(new Rect(0, 0, 88, 111))

        const modalFocus = new UiFocusState()
        const modalController = new UiFocusInputController({ focus: modalFocus })
        modalFocus.setScope({ id: "parent" })
        modalFocus.setActiveScope("parent")
        modal.open(modalFocus, modalController)
        control.assert(
            modalFocus.getActiveScopeId() == "numeric-modal",
            "numeric modal active scope",
        )
        const modalCancel = modal.handleFocusInput(
            modalController.handleInput({ action: "cancel" }),
        )
        control.assert(
            modalCancel.kind == "cancelled",
            "numeric modal cancel result",
        )
        control.assert(
            modalResult && modalResult.kind == "cancelled",
            "numeric modal cancel callback",
        )

        const modalSurface = new ControlSmokeSurface()
        modal.render(modalSurface, new ControlSmokeAssets(), modalFocus)
        control.assert(
            modalSurface.log.indexOf("rounded:15:1;") >= 0,
            "numeric modal rounded panel",
        )
    }

    /**
     * Smoke harness for control observation ownership.
     */
    export function runControlObservationSmokeTest(): void {
        const focus = new UiFocusState()
        let focusRequests = 0
        focus.addFocusObserver((event: UiFocusEvent) => {
            focusRequests++
        })
        const row = new UiRow<number>({
            scopeId: "observe-row",
            controls: [
                { id: "a", value: 1 },
                { id: "b", value: 2 },
            ],
        })
        row.arrange(new Rect(0, 0, 60, 20))
        row.registerFocusTargets(focus)
        row.focusDefault(focus)
        control.assert(focusRequests == 1, "control focus observer frame")

        let layoutRequests = 0
        const owner = new UiLayoutOwner({
            root: row,
            constraints: { maxWidth: 100, maxHeight: 30 },
            rect: new Rect(0, 0, 60, 20),
        })
        owner.addLayoutObserver(() => {
            layoutRequests++
        })
        row.invalidateLayout()
        owner.runLayout()
        control.assert(layoutRequests == 1, "control layout observer frame")

        const scrollChild = new LayoutSmokeNode(
            layoutFixedSpec(120, 100),
            1,
            1,
            1,
            1,
        )
        const scroll = new UiScrollViewportLayout({
            layoutSpec: layoutContentSpec(),
            child: scrollChild,
            scrollY: true,
        })
        let scrollGeometryRequests = 0
        let scrollOffsetRequests = 0
        scroll.addScrollObserver((event: UiScrollEvent) => {
            if (event.kind == "geometry") scrollGeometryRequests++
            if (event.kind == "offset") scrollOffsetRequests++
        })
        scroll.arrange(new Rect(0, 0, 80, 40))
        control.assert(
            scrollGeometryRequests == 1,
            "control scroll geometry observer frame",
        )
        scroll.scrollContentRectIntoView(new Rect(0, 80, 20, 10))
        control.assert(
            scrollOffsetRequests == 1,
            "control scroll offset observer frame",
        )
    }
}

ui.runGeometrySmokeTest()
ui.renderLogicalViewportSmokeTest(2)
ui.runAssetResolverSmokeTest()
ui.runRuntimeSmokeTest()
ui.runLayoutSmokeTest()
ui.runPrimitiveLayoutSmokeTest()
ui.runStructuredLayoutSmokeTest()
ui.runScrollLayoutSmokeTest()
ui.runFocusScrollRequestSmokeTest()
ui.runFocusStateMachineSmokeTest()
ui.runFocusMovementSmokeTest()
ui.runFocusInputRuntimeSmokeTest()
ui.runDirectSimulatorInputSmokeTest()
ui.runModalFocusSmokeTest()
ui.runObservationSmokeTest()
ui.runControlButtonSmokeTest()
ui.runScreenControllerSmokeTest()
ui.runControlRecordSmokeTest()
ui.runControlRowSmokeTest()
ui.runControlStripSmokeTest()
ui.runControlGridSmokeTest()
ui.runPickerSmokeTest()
ui.runToggleGridSmokeTest()
ui.runNumericEntrySmokeTest()
ui.runControlObservationSmokeTest()

// run display-profile test again as it produces something visual
ui.renderLogicalViewportSmokeTest(7)

control.__log(1, "All tests passed!")
