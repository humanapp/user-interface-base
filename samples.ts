//-------------------------------------------------
// README samples
//-------------------------------------------------

class HelloScreen extends ui.UiScreen {
    public render(surface: ui.DrawSurface): void {
        surface.drawText("Hello", 19, 11, { color: 3 })
        surface.drawRect(new ui.Rect(4, 4, 60, 22), 7)
        super.render(surface)
    }
}

class CounterScreen extends ui.UiScreen {
    private count: number

    constructor() {
        super()
        this.count = 0
        this.backgroundColor = 0
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.phase == "released") return undefined

        if (event.action == "activate") {
            this.count += 1
            return true
        }

        if (event.action == "cancel") {
            this.count = 0
            return true
        }

        return undefined
    }

    public render(surface: ui.DrawSurface): void {
        surface.drawText("Count:", 8, 8, { color: 1 })
        surface.drawText("" + this.count, 8, 24, { color: 7 })
        super.render(surface)
    }
}

class StartScreen extends ui.UiScreen {
    private status: "Ready" | "Started" | "Stopped"
    private toggleButton: ui.UiButton

    constructor() {
        super()
        this.status = "Ready"
        this.toggleButton = new ui.UiButton("start", "Start", () => {
            this.status = this.status == "Started" ? "Stopped" : "Started"
            this.toggleButton.setText(
                this.status == "Started" ? "Stop" : "Start",
            )
        })
        this.add(this.toggleButton, { centerX: 80, centerY: 60 })
    }

    public render(surface: ui.DrawSurface): void {
        surface.drawText(this.status, 8, 8, { color: 1 })
        super.render(surface)
    }
}

class SettingsScreen extends ui.UiScreen {
    private speed: number

    constructor() {
        super()
        this.speed = 5
        this.backgroundColor = 8
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.action == "activate" && event.phase != "released") {
            this.openSpeedEditor()
            return true
        }

        return undefined
    }

    public render(surface: ui.DrawSurface): void {
        surface.drawText("Speed", 8, 8, { color: 1 })
        surface.drawText("" + this.speed, 8, 24, { color: 7 })
        super.render(surface)
    }

    private openSpeedEditor(): void {
        const modal = new ui.UiNumericEntryModal({
            modalScopeId: "speed-editor",
            mode: "positiveInteger",
            initialText: "" + this.speed,
            maxLength: 3,
            cancelEnabled: true,
            panelColor: 10,
            onResult: result => {
                if (result.kind == "completed") {
                    this.speed = result.value
                }
            },
        })
        this.openModal(modal)
    }
}

type ConfirmChoice = "cancel" | "ok"

class SaveScreen extends ui.UiScreen {
    private status: string

    constructor() {
        super()
        this.status = "Not saved"
        this.backgroundColor = 8
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.action == "activate" && event.phase != "released") {
            this.openConfirmDialog()
            return true
        }

        return undefined
    }

    public render(surface: ui.DrawSurface): void {
        surface.drawText(`Status: ${this.status}`, 8, 8, { color: 7 })
        surface.drawText("Press A to save", 8, 18, { color: 1 })
        super.render(surface)
    }

    private openConfirmDialog(): void {
        const modal = new ui.UiPicker<ConfirmChoice>({
            modalScopeId: "save-dialog",
            title: "Save changes?",
            controls: [
                { id: "cancel", value: "cancel", text: "Cancel" },
                { id: "ok", value: "ok", text: "OK", selected: true },
            ],
            defaultControlId: "ok",
            columnCount: 2,
            controlWidth: 44,
            controlHeight: 18,
            columnGap: 4,
            controlStyle: ui.UiButtonStyles.LightShadowedWhite,
            modalStyle: ui.modalStyle(ui.UiModalStyles.Default),
            onActivate: choice => {
                this.status = choice == "ok" ? "Saved" : "Cancelled"
            },
            onCancel: () => {
                this.status = "Cancelled"
            },
        })

        this.openModal(modal)
    }
}

class DataGraphScreen extends ui.UiScreen {
    private values: number[]
    private tick: number
    private graphRect: ui.Rect
    private toggleButton: ui.UiButton
    private running: boolean

    constructor() {
        super()
        this.backgroundColor = 0
        this.tick = 0
        this.running = true
        this.graphRect = new ui.Rect(8, 22, 144, 70)
        this.toggleButton = new ui.UiButton("toggle", "Stop", () => {
            this.running = !this.running
            this.toggleButton.setText(this.running ? "Stop" : "Start")
        })
        this.add(this.toggleButton, { centerX: 80, centerY: 107 })
        this.values = [
            24, 28, 35, 40, 46, 52, 58, 63, 68, 72, 70, 66, 60, 54, 48, 42, 36,
            31, 27, 25,
        ]
    }

    public update(): void {
        if (!this.running) return

        this.tick += 1
        if (this.tick % 6 != 0) return

        const phase = Math.idiv(this.tick, 6) % 20
        const wave = phase < 10 ? phase : 20 - phase
        this.values.removeAt(0)
        this.values.push(25 + wave * 6)
    }

    public render(surface: ui.DrawSurface): void {
        surface.drawText("Signal", 8, 6, { color: 1 })
        surface.drawText("" + this.values[this.values.length - 1], 128, 6, {
            color: 7,
        })

        surface.drawRect(this.graphRect, 1)
        surface.drawLine(
            this.graphRect.x + 1,
            this.graphRect.y + Math.idiv(this.graphRect.height, 2),
            this.graphRect.x + this.graphRect.width - 2,
            this.graphRect.y + Math.idiv(this.graphRect.height, 2),
            13,
        )

        let previousX = 0
        let previousY = 0
        for (let i = 0; i < this.values.length; i++) {
            const x =
                this.graphRect.x +
                2 +
                Math.idiv(
                    i * (this.graphRect.width - 4),
                    this.values.length - 1,
                )
            const y =
                this.graphRect.y +
                this.graphRect.height -
                3 -
                Math.idiv(this.values[i] * (this.graphRect.height - 6), 100)

            if (i > 0) surface.drawLine(previousX, previousY, x, y, 7)
            previousX = x
            previousY = y
        }

        super.render(surface)
    }
}

const runtime = new ui.UiRuntime({
    display: new ui.DisplayShieldFrameAdapter(),
    clearColor: 0,
})
runtime.push(new StartScreen())
runtime.start()
