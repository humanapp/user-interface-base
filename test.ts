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

        public handleScreenInput(event: UiInputEvent): boolean | undefined {
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
        const bitmap = bmp`
      2 2
      2 2
    `

        buttonView.render(surface, rect, { bitmap })
        buttonView.renderFocus(surface, rect, { bitmap })

        control.assert(surface.log.indexOf("fill:1;") >= 0, "control fill")
        control.assert(surface.log.indexOf("line:11;") >= 0, "control shadow")
        control.assert(
            surface.log.indexOf("bitmap:2x2;") >= 0,
            "control bitmap",
        )
        control.assert(surface.log.indexOf("line:9;") >= 0, "control focus")

        const focusLabelStyle = buttonStyle(
            UiButtonStyles.Transparent,
            UiButtonStyles.FocusLabel,
            {
                focusLabelGap: 2,
            },
        )
        control.assert(
            UiButtonStyles.GreenBorderedWhite.borderColor == 7,
            "control green border style",
        )
        surface.log = ""
        buttonView.render(
            surface,
            rect,
            { bitmap, text: "go" },
            focusLabelStyle,
        )
        surface.log = ""
        _uiControls.renderControl(
            surface,
            new ControlSmokeAssets(),
            {
                id: "selected",
                value: "selected",
                bitmap,
                selected: true,
            },
            rect,
            buttonView,
            UiButtonStyles.LightShadowedWhite,
        )
        control.assert(
            surface.log.indexOf("fill:7;") < 0,
            "selected control does not fill green",
        )
        control.assert(
            surface.log.indexOf("text:go;") < 0,
            "control focus label hidden",
        )
        surface.log = ""
        buttonView.render(
            surface,
            rect,
            { bitmap, text: "go" },
            focusLabelStyle,
        )
        buttonView.renderFocus(
            surface,
            rect,
            { bitmap, text: "go" },
            focusLabelStyle,
            new Rect(0, 0, 40, 40),
        )
        control.assert(
            surface.log.indexOf("fill:15;") >= 0,
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
        control.assert(
            !screen.hasModal,
            "screen controller modal cancel closes",
        )
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

        const displaySurface = new ControlSmokeSurface()
        const displayEntry = new UiNumericEntry({
            mode: "decimal",
            initialText: "42",
        })
        displayEntry.render(displaySurface, new Rect(0, 0, 24, 12))
        control.assert(
            displaySurface.log.indexOf("rounded:15:1;") >= 0,
            "numeric display rounded border",
        )

        let modalResult: UiNumericEntryResult = undefined
        const modal = new UiNumericEntryModal({
            modalScopeId: "numeric-modal",
            mode: "positiveInteger",
            initialText: "0",
            modalStyle: modalStyle(UiModalStyles.Titleless, {
                contentMargin: 5,
            }),
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
        const modalController = new UiFocusInputController({
            focus: modalFocus,
        })
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
        control.assert(
            modalSurface.log.indexOf("rounded:7:1;") >= 0,
            "numeric modal enter green outline",
        )

        let deleteModalResult: UiNumericEntryResult = undefined
        const deleteModal = new UiNumericEntryModal({
            modalScopeId: "numeric-delete",
            mode: "decimal",
            initialText: "7",
            deleteEnabled: true,
            deleteIcon: "known",
            onResult: result => {
                deleteModalResult = result
            },
        })
        const deleteModalMeasured = new UiMeasuredSize()
        deleteModal.measure(
            { maxWidth: 160, maxHeight: 120 },
            deleteModalMeasured,
        )
        control.assert(
            deleteModalMeasured.preferredWidth == 86,
            "numeric delete modal measured width",
        )
        control.assert(
            deleteModalMeasured.preferredHeight == 109,
            "numeric delete modal measured height",
        )
        deleteModal.arrange(new Rect(0, 0, 86, 109))
        const deleteFocus = new UiFocusState()
        const deleteController = new UiFocusInputController({
            focus: deleteFocus,
        })
        deleteFocus.setScope({ id: "parent-delete" })
        deleteFocus.setActiveScope("parent-delete")
        deleteModal.open(deleteFocus, deleteController)
        const deleteModalSurface = new ControlSmokeSurface()
        deleteModal.render(
            deleteModalSurface,
            new ControlSmokeAssets(),
            deleteFocus,
        )
        control.assert(
            deleteModalSurface.log.indexOf("bitmap:2x1;") >= 0,
            "numeric modal delete icon",
        )
        deleteFocus.setActiveTarget("numeric-delete", "numeric-delete/delete")
        const deleteResult = deleteModal.handleFocusInput(
            deleteController.handleInput({ action: "activate" }),
        )
        control.assert(
            deleteResult.kind == "deleted",
            "numeric modal delete result",
        )
        control.assert(
            deleteModalResult && deleteModalResult.kind == "deleted",
            "numeric modal delete callback",
        )
    }

}

ui.runGeometrySmokeTest()
ui.renderLogicalViewportSmokeTest(2)
ui.runAssetResolverSmokeTest()
ui.runRuntimeSmokeTest()
ui.runLayoutSmokeTest()
ui.runControlButtonSmokeTest()
ui.runScreenControllerSmokeTest()
ui.runNumericEntrySmokeTest()

// run display-profile test again as it produces something visual
ui.renderLogicalViewportSmokeTest(7)

control.__log(1, "All tests passed!")
