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
    private countLabel: ui.UiLabel

    constructor() {
        super()
        this.count = 0
        this.backgroundColor = 0
        this.add(new ui.UiLabel("Count:", 1), { x: 8, y: 8 })
        this.countLabel = new ui.UiLabel("0", 7)
        this.add(this.countLabel, { x: 8, y: 24 })
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.phase == "released") return undefined

        if (event.action == "activate") {
            this.count += 1
        } else if (event.action == "cancel") {
            this.count = 0
        } else {
            return undefined
        }

        this.countLabel.setText("" + this.count)
        return true
    }
}

class StartScreen extends ui.UiScreen {
    private status: "Ready" | "Started" | "Stopped"
    private statusLabel: ui.UiLabel
    private toggleButton: ui.UiButton

    constructor() {
        super()
        this.status = "Ready"
        this.statusLabel = new ui.UiLabel(this.status, 1)
        this.toggleButton = new ui.UiButton("start", "Start", () => {
            this.status = this.status == "Started" ? "Stopped" : "Started"
            this.statusLabel.setText(this.status)
            this.toggleButton.setText(
                this.status == "Started" ? "Stop" : "Start",
            )
        })
        this.add(this.statusLabel, { x: 8, y: 8 })
        this.add(this.toggleButton, { centerX: 80, centerY: 60 })
    }
}

class SettingsScreen extends ui.UiScreen {
    private speed: number
    private speedLabel: ui.UiLabel

    constructor() {
        super()
        this.speed = 5
        this.backgroundColor = 8
        this.add(new ui.UiLabel("Speed", 1), { x: 8, y: 8 })
        this.speedLabel = new ui.UiLabel("" + this.speed, 7)
        this.add(this.speedLabel, { x: 8, y: 24 })
        this.add(new ui.UiLabel("Press A to Edit", 1), {
            centerX: 80,
            y: 108,
        })
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.action == "activate" && event.phase != "released") {
            this.openSpeedEditor()
            return true
        }

        return undefined
    }

    private openSpeedEditor(): void {
        this.openModal(
            new ui.UiNumericEntryModal("speed-editor", this.speed, value => {
                this.speed = value
                this.speedLabel.setText("" + value)
            }),
        )
    }
}

class SaveScreen extends ui.UiScreen {
    private status: string
    private statusLabel: ui.UiLabel

    constructor() {
        super()
        this.status = "Not saved"
        this.backgroundColor = 8
        this.statusLabel = new ui.UiLabel(`Status: ${this.status}`, 7)
        this.add(this.statusLabel, { x: 8, y: 8 })
        this.add(new ui.UiLabel("Press A to save", 1), { x: 8, y: 18 })
    }

    public handleScreenInput(event: ui.UiInputEvent): boolean | undefined {
        if (event.action == "activate" && event.phase != "released") {
            this.openConfirmDialog()
            return true
        }

        return undefined
    }

    private openConfirmDialog(): void {
        const modal = new ui.UiPicker(
            "save-dialog",
            "Save changes?",
            ["Cancel", "OK"],
            choice => {
                this.status = choice == "OK" ? "Saved" : "Cancelled"
                this.statusLabel.setText(`Status: ${this.status}`)
            },
            () => {
                this.status = "Cancelled"
                this.statusLabel.setText(`Status: ${this.status}`)
            },
        )

        this.openModal(modal)
    }
}

class DataGraphScreen extends ui.UiScreen {
    private values: number[]
    private tick: number
    private graphRect: ui.Rect
    private valueLabel: ui.UiLabel
    private toggleButton: ui.UiButton
    private running: boolean

    constructor() {
        super()
        this.backgroundColor = 0
        this.tick = 0
        this.running = true
        this.graphRect = new ui.Rect(8, 22, 144, 70)
        this.add(new ui.UiLabel("Signal", 1), { x: 8, y: 6 })
        this.toggleButton = new ui.UiButton("toggle", "Stop", () => {
            this.running = !this.running
            this.toggleButton.setText(this.running ? "Stop" : "Start")
        })
        this.values = [
            24, 28, 35, 40, 46, 52, 58, 63, 68, 72, 70, 66, 60, 54, 48, 42, 36,
            31, 27, 25,
        ]
        this.valueLabel = new ui.UiLabel(
            "" + this.values[this.values.length - 1],
            7,
        )
        this.add(this.valueLabel, { x: 128, y: 6 })
        this.add(this.toggleButton, { centerX: 80, centerY: 107 })
    }

    public update(): void {
        if (!this.running) return

        this.tick += 1
        if (this.tick % 6 != 0) return

        const phase = Math.idiv(this.tick, 6) % 20
        const wave = phase < 10 ? phase : 20 - phase
        this.values.removeAt(0)
        this.values.push(25 + wave * 6)
        this.valueLabel.setText("" + this.values[this.values.length - 1])
    }

    public render(surface: ui.DrawSurface): void {
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
//runtime.push(new HelloScreen())
//runtime.push(new CounterScreen())
runtime.push(new SettingsScreen())
//runtime.push(new SaveScreen())
//runtime.push(new StartScreen())
//runtime.push(new DataGraphScreen())
runtime.start()
