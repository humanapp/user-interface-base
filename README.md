# user-interface-base

`user-interface-base` provides a small UI core for MakeCode projects that need
structured screens, layout, input, focus, and rendering on constrained devices.
It is designed around immediate-mode drawing into a display adapter and keeps
the app-facing UI model independent from the physical display resolution.

The core pieces are:

- `UiRuntime`: owns the screen stack, input queue, frame lifecycle, and display
  adapter.
- `UiScreen`: the app-owned screen contract for lifecycle, input, update, and
  render callbacks.
- `DrawSurface`: the drawing API used by screens and controls.
- `PhysicalDrawSurface`: a draw surface backed by a physical bitmap and display
  profile.
- Layout nodes such as rows, columns, grids, padding, alignment, stacks,
  absolute positioning, and scroll viewports.
- Focus and input helpers for controller, pointer, and wheel-driven UI.

## Coordinate Systems

The library intentionally separates the coordinates your UI code uses from the
pixels that eventually appear on a device.

### UI Units

UI units are the coordinates used by app code. Screens, layout, focus targets,
input events, and draw calls all use UI units.

For example, these values are UI units:

```ts
surface.fillRect(new ui.Rect(0, 0, 80, 20), 2)
surface.drawText("Hello", 6, 6)
runtime.dispatchInput({ action: "pointerClick", source: "pointer", x: 24, y: 12 })
```

The default UI coordinate space is `160x120`. A display adapter can choose a
different UI coordinate size with `designWidth` and `designHeight` options. The
options define the UI coordinate space.

```ts
const display = new ui.DisplayShieldFrameAdapter({
  scaleMode: "cover",
  displayProfile: ui.UiDisplayProfileId.HighDensity,
  designWidth: ui.HIGH_DENSITY_DISPLAY_WIDTH,
  designHeight: ui.HIGH_DENSITY_DISPLAY_HEIGHT
})
```

With that adapter, app code uses `320x240` UI units. With omitted design
dimensions, app code uses the default `160x120` UI units even when the active
display profile is high density.

### Logical Display Pixels

Logical display pixels are the resolution promised by the active display
profile. They describe the target display profile before it is mapped onto a
physical bitmap.

Built-in profiles are:

- `UiDisplayProfileId.Standard`: `160x120`
- `UiDisplayProfileId.HighDensity`: `320x240`

The resolved `UiDisplayProfile` reports:

- `logicalWidth` and `logicalHeight`
- `aspectRatio`
- `designToLogicalScaleX` and `designToLogicalScaleY`

The `designToLogicalScale*` fields report the multiplier from UI units to
logical display pixels. For example, a high-density profile with the default
`160x120` UI coordinate space has a scale of `2`. A high-density profile with a
`320x240` UI coordinate space has a scale of `1`.

### Physical Bitmap Pixels

Physical bitmap pixels are the pixels in the bitmap that receives rendering.
`PhysicalBitmapDrawSurface` maps UI units through the display profile and scale
mode into that bitmap.

Most app code should not work in physical bitmap pixels directly. They matter
when writing a display adapter or when testing exact raster output.

### Displayed Pixels

Some hardware stretches or presents a bitmap at a different displayed size.
`displayedWidth` and `displayedHeight` describe that final presentation size
when it differs from the bitmap size. They are used by rendering code that needs
to account for non-square visual pixels.

## Scale Modes

Display adapters use a scale mode to map the active logical display profile onto
the physical bitmap.

- `cover`: fills the physical bitmap. Some logical display content may be
  clipped if the aspect ratios do not match.
- `fit`: fits the whole logical display inside the physical bitmap. Pixels
  outside the mapped viewport use the configured background color.

`cover` is useful when the physical target is the whole screen and clipping is
acceptable. `fit` is useful when preserving the full logical display is more
important than filling the whole bitmap.

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
measurement. It clips drawing to the active UI coordinate space before mapping
to physical pixels.

## Runtime And Screens

`UiRuntime` owns screen lifecycle and frame execution:

```ts
const runtime = new ui.UiRuntime({
  display: new ui.DisplayShieldFrameAdapter({ scaleMode: "cover" })
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
adapters should keep display profile, scale mode, and UI coordinate dimensions
fixed for the lifetime of the adapter.

## Testing

Unit test suite in test.ts

