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
}

ui.renderLogicalViewportSmokeTest()
