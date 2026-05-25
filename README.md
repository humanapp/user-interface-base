# micro:bit apps UI (user-interface-base)

**micro:bit apps UI** is a small UI toolkit for building [micro:bit apps](https://microbit-apps.org/): apps that run on the [BBC micro:bit](https://microbit.org/) + [Display Shield](https://microbit-apps.org/getting-started/display-shields/).

## The Short Version

micro:bit apps UI gives an app a small screen runtime:

- Draw in a fixed `160x120` pixel coordinate space.
- Put each app page in a `UiScreen`.
- Push screens onto one `UiRuntime`.
- Queue semantic input events such as `up`, `down`, `activate`, and `cancel`.
- Start the runtime to deliver input, update the active screen, render it, and
  commit frames to the Display Shield.

You can draw directly in a screen, add screen-owned focusable views, or open
modal UI such as the built-in numeric keypad.

## 1. Think In Display Pixels

The Display Shield is `160x120` pixels. micro:bit apps UI uses that same
coordinate space, with `(0, 0)` at the top-left corner.

```ts
class HelloScreen extends ui.UiScreen {
    public render(surface: ui.DrawSurface): void {
        surface.drawText("Hello", 19, 11, { color: 3 })
        surface.drawRect(new ui.Rect(4, 4, 60, 22), 7)
        super.render(surface)
    }
}
```

All drawing methods use palette color indices. The default palette matches
[MakeCode Arcade's default palette](https://arcade.makecode.com/reference/scene/background-color).
Text, bitmaps, rectangles, lines, and circles are drawn through the `DrawSurface`
passed to `render()`.

## 2. Start A Runtime

A typical app creates one runtime, pushes the first screen, and starts the
runtime.

```ts
const runtime = new ui.UiRuntime({
    display: new ui.DisplayShieldFrameAdapter(),
    clearColor: 1,
})

runtime.push(new HelloScreen())
runtime.start()
```

`start()` hooks a Display Shield frame callback that drives micro:bit apps UI. It
updates controller repeat, delivers queued input to the active screen, calls the
screen's `update()`, calls `render()`, and commits the frame. Call `stop()` when
the app should stop drawing UI frames.

## 3. Make A Screen Own App State

Screens are the normal place to keep page state and respond to input. Use
`handleScreenInput()` when the screen wants first chance at an event.

```ts
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
```

Returning `true` means the screen handled the event. Returning `undefined` lets
micro:bit apps UI try the screen's modal and focus routing.

## 4. Input

The runtime works with semantic actions, not specific buttons.

## 4. micro:bit Input Events

The runtime works with semantic actions, not specific buttons. Your app maps
hardware input into actions.

```ts
input.onButtonPressed(Button.A, function () {
    runtime.dispatchInput({
        action: "activate",
        source: "microbitButton",
    })
})

input.onButtonPressed(Button.B, function () {
    runtime.dispatchInput({
        action: "cancel",
        source: "microbitButton",
    })
})
```

The action names are `up`, `down`, `left`, `right`, `activate`, `cancel`, and
`menu`. Directional actions are useful when a screen has focusable controls.

## 5. Draw Buttons When You Need Button UI

`UiButtonView` draws button frames, labels, icons, and focus treatment. It is a
renderer, so a screen can use it directly for simple button-looking UI.

```ts
class StartScreen extends ui.UiScreen {
    private buttonView: ui.UiButtonView
    private buttonRect: ui.Rect

    constructor() {
        super()
        this.buttonView = new ui.UiButtonView({
            style: ui.UiButtonStyles.LightShadowedWhite,
        })
        this.buttonRect = new ui.Rect(48, 48, 64, 24)
    }

    public render(surface: ui.DrawSurface): void {
        this.buttonView.render(surface, this.buttonRect, { text: "Start" })
        this.buttonView.renderFocus(surface, this.buttonRect, { text: "Start" })
        super.render(surface)
    }
}
```

For reusable app controls, implement a `UiFocusableView` and add it to a screen
with `add()` or `addCentered()`. The screen will arrange it, register its focus
targets, route input to it, and render it each frame.

## 6. Open A Numeric Keypad

micro:bit apps UI includes a modal keypad for number entry. Open it from a
screen, then handle the result in `onResult`.

```ts
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
```

While a modal is open, the screen routes input to the modal first. The numeric
keypad uses the same semantic input actions as the rest of the runtime. OK emits
a `completed` result and closes the modal automatically. If a screen overrides
`render()`, call `super.render(surface)` after drawing the screen background and
content. The base render method draws screen-owned views and the active modal on
top of the screen.

## 7. Use Assets When UI Refers To App-Owned Bitmaps Or Text

Controls can refer to bitmaps and labels by id. Provide an asset resolver when
the runtime is created.

```ts
class AppAssets implements ui.UiAssetResolver {
    public getBitmap(
        id: string | number,
        nullIfMissing?: boolean,
    ): Bitmap | undefined {
        if (id == "start") {
            return bmp`
                . 7 .
                7 7 7
                . 7 .
            `
        }

        if (nullIfMissing) return undefined
        return bmp`.`
    }

    public getText(id: string): string {
        if (id == "startLabel") return "Start"
        return ""
    }
}

const runtime = new ui.UiRuntime({
    display: new ui.DisplayShieldFrameAdapter(),
    assets: new AppAssets(),
})
```

Screens can also keep bitmaps and strings as fields. Asset resolvers are most
useful when reusable controls need stable ids instead of direct values.

## A Few Working Rules

- Keep layout, focus, and drawing coordinates in pixels.
- Prefer semantic input events inside screens instead of checking physical
  buttons in every screen.
- Keep one runtime for the app and push, pop, or replace screens as the user
  moves through the app.
- Reuse `Rect`, `Size`, and `UiMeasuredSize` objects in frame code when practical.
- Use screen modals for short blocking tasks such as number entry.

## Getting Started

micro:bit apps UI is a MakeCode extension. The public package name is
`user-interface-base`, and the TypeScript namespace is `ui`.

There are two normal ways to use it:

- Work in the MakeCode Editor when you want the browser-based project workflow.
- Work in VS Code when you want files on disk, source control, and command-line
  builds.

Both workflows use MakeCode's extension system.

### Workflow 1: MakeCode Editor

Use this workflow when you want to build in the browser and let MakeCode manage
the project.

You need:

- The [MakeCode editor for micro:bit](https://makecode.microbit.org).
- A [BBC micro:bit](https://microbit.org/) and [Display Shield](https://microbit-apps.org/getting-started/display-shields/) when you want to run on hardware.

To add micro:bit apps UI:

1. Open `https://makecode.microbit.org` and create or open a project.
2. Open the Extensions window from the toolbox.
3. Paste this repository URL into the extension search box:

    ```text
    https://github.com/microbit-apps/user-interface-base
    ```

4. Select the extension when MakeCode finds it.
5. Switch to JavaScript view and use the `ui` namespace.
6. The extension's toolbox category will be labeled `micro:bit apps UI`.

### Workflow 2: VS Code

Use this workflow when you want a local project folder that can be edited in
VS Code and built from the command line.

You need:

- VS Code.
- Node.js and npm.
- The
  [Microsoft MakeCode Arcade VS Code extension](https://marketplace.visualstudio.com/items?itemName=ms-edu.pxt-vscode-web).
  Despite the name, it also works for micro:bit projects and is especially
  useful for running the MakeCode simulator from VS Code.
- The MakeCode command-line tool:

    ```sh
    npm install -g makecode
    ```

- A BBC micro:bit and Display Shield when you want to run on hardware.

To create a new local micro:bit project:

```sh
mkc init microbit
mkc add https://github.com/microbit-apps/user-interface-base user-interface-base
mkc build
```

Then open the folder in VS Code. Use the MakeCode icon in the activity bar to
open the MakeCode Action Palette. From there you can start the MakeCode simulator, install project
dependencies, add extensions by GitHub URL, and
build for hardware.

To add micro:bit apps UI to an existing local project, run this from the project
folder:

```sh
mkc add https://github.com/microbit-apps/user-interface-base user-interface-base
mkc build
```

If you add the extension from VS Code instead, use the MakeCode Extension's
Add an Extension command and paste:

```text
https://github.com/microbit-apps/user-interface-base
```

You can also edit the app's `pxt.json` directly:

```json
{
    "dependencies": {
        "user-interface-base": "github:microbit-apps/user-interface-base#v0.0.35"
    }
}
```

After editing `pxt.json` by hand, download dependencies and build:

```sh
mkc install
mkc build
```

## More Examples

These examples show small patterns you can copy into an app. They start with
reusable controls, then move into custom drawing for app-specific screens.

### Confirmation Dialog

Use `UiPicker` for simple modal choices. It owns modal focus, button layout,
directional navigation, rendering, activation, and cancel handling.

```ts
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
```

### Animated Data Graph

For custom visualization, keep the data in the screen, update it over time, and
draw directly to the `DrawSurface`.

```ts
class DataGraphScreen extends ui.UiScreen {
    private values: number[]
    private tick: number
    private graphRect: ui.Rect

    constructor() {
        super()
        this.backgroundColor = 0
        this.tick = 0
        this.graphRect = new ui.Rect(8, 22, 144, 70)
        this.values = [
            24, 28, 35, 40, 46, 52, 58, 63, 68, 72, 70, 66, 60, 54, 48, 42, 36,
            31, 27, 25,
        ]
    }

    public update(): void {
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
```

## Existing Projects

These micro:bit apps projects use user-interface-base and are useful references
when you want to see the library in action:

- [microcode-v2](https://github.com/microbit-apps/microcode-v2)
- [microdata](https://github.com/microbit-apps/microdata)
- [microgui](https://github.com/microbit-apps/microgui)
