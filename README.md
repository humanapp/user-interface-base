# user-interface-base

`user-interface-base` provides a small UI core for MakeCode projects that need
structured screens, layout, input, focus, and rendering on constrained devices.
It is designed around immediate-mode drawing into a display adapter.

The core pieces are:

- `UiRuntime`: owns the screen stack, input queue, frame lifecycle, and display
  adapter.
- `UiScreen`: the app-owned screen contract for lifecycle, input, update, and
  render callbacks.
- `DrawSurface`: the drawing API used by screens and controls.
- `PhysicalDrawSurface`: a draw surface backed by a physical bitmap.
- Layout nodes such as rows, columns, grids, padding, alignment, stacks,
  absolute positioning, and scroll viewports.
- Focus and input helpers for controller, pointer, and wheel-driven UI.

## Coordinate Systems

The library uses a fixed `160x120` coordinate space for rendering, layout,
focus targets, and input.

### UI Units

UI units are the coordinates used by app code. Screens, layout, focus targets,
input events, and draw calls all use UI units.

For example, these values are UI units:

```ts
surface.fillRect(new ui.Rect(0, 0, 80, 20), 2)
surface.drawText("Hello", 6, 6)
runtime.dispatchInput({ action: "pointerClick", source: "pointer", x: 24, y: 12 })
```

The UI coordinate space is `160x120`.

```ts
const display = new ui.DisplayShieldFrameAdapter()
```

### Physical Bitmap Pixels

Physical bitmap pixels are the pixels in the bitmap that receives rendering.
`PhysicalBitmapDrawSurface` draws UI units directly into the physical bitmap.

Most app code should not work in physical bitmap pixels directly. They matter
when writing a display adapter or when testing exact raster output.

## Rendering

Screens render through a `DrawSurface`. Draw calls use UI units:

```ts
class HomeScreen implements ui.UiScreen {
  render(surface: ui.DrawSurface): void {
    surface.clear(0)
    surface.drawText("Home", 6, 6, { color: 15 })
    surface.drawRect(new ui.Rect(4, 4, 72, 24), 1)
  }
}
```

`DrawSurface` supports rectangles, lines, circles, bitmaps, text, and text
measurement. Draw calls use the fixed UI coordinate space directly.

## Runtime And Screens

`UiRuntime` owns screen lifecycle and frame execution:

```ts
const runtime = new ui.UiRuntime({
  display: new ui.DisplayShieldFrameAdapter()
})

runtime.push(new HomeScreen())
runtime.runFrame()
```

A screen can implement:

- `enter(runtime, input)`: register input handlers and initialize screen state.
- `exit()`: release screen-owned state.
- `activate()` and `deactivate()`: react to stack visibility changes.
- `handleInput(event)`: handle unconsumed input.
- `update()`: update state before rendering.
- `render(surface)`: draw the current frame.

Input delivered through `UiRuntime.dispatchInput()` is normalized into UI units
before it reaches screen handlers.

## Layout

Layout is measured and arranged in UI units. A layout node receives measurement
constraints, reports measured sizes, and then receives a final rectangle.

Useful layout containers include:

- `UiRowLayout` and `UiColumnLayout`
- `UiGridLayout` and `UiRaggedGridLayout`
- `UiPaddingLayout`
- `UiAlignLayout`
- `UiStackLayout`
- `UiAbsoluteLayout`
- `UiScrollViewportLayout`

`UiLayoutOwner` retains the root layout rectangle and handles repeated
measure-arrange passes when the layout becomes dirty.

## Focus And Input

Focus state is separate from rendering. `UiFocusState` stores scopes, targets,
and the active target. Focus targets use rectangles in UI coordinates.

`UiFocusInputController` connects semantic input actions to focus behavior. It
can handle:

- directional movement
- activation
- cancellation
- pointer hit testing
- wheel scrolling

The runtime binds display-shield controller events to semantic actions such as
`up`, `down`, `left`, `right`, `activate`, `cancel`, and `menu`.

## Display Adapters

A display adapter provides a `PhysicalDrawSurface` and commits the physical
bitmap:

```ts
export interface UiDisplayAdapter {
  surface: ui.PhysicalDrawSurface
  commit(): Bitmap
}
```

`DisplayShieldFrameAdapter` is the built-in adapter for display-shield. Custom
adapters should keep the UI coordinate dimensions fixed for the lifetime of the
adapter.

## Testing

Unit test suite in test.ts
