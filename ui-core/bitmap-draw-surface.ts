namespace ui {
  /**
   * DrawSurface implementation that maps logical drawing into a physical Bitmap.
   */
  export class PhysicalBitmapDrawSurface implements DrawSurface {
    private bitmap_: Bitmap
    private scaleMode_: ViewportScaleMode
    private backgroundColor_: number
    // Reused output slots for line clipping to avoid per-line object allocation.
    private scratchLineX0_: number
    private scratchLineY0_: number
    private scratchLineX1_: number
    private scratchLineY1_: number

    constructor(bitmap: Bitmap, options?: PhysicalDrawSurfaceOptions) {
      this.bitmap_ = bitmap
      this.scaleMode_ = options && options.scaleMode ? options.scaleMode : "cover"
      this.backgroundColor_ =
        options && options.backgroundColor !== undefined ? options.backgroundColor : 0
      this.scratchLineX0_ = 0
      this.scratchLineY0_ = 0
      this.scratchLineX1_ = 0
      this.scratchLineY1_ = 0
    }

    /**
     * Physical bitmap that receives all drawing operations.
     */
    public get bitmap(): Bitmap {
      return this.bitmap_
    }

    /**
     * Current logical-to-physical scaling policy.
     */
    public get scaleMode(): ViewportScaleMode {
      return this.scaleMode_
    }

    /**
     * Updates the logical-to-physical scaling policy.
     */
    public setScaleMode(scaleMode: ViewportScaleMode): void {
      this.scaleMode_ = scaleMode
    }

    /**
     * Fills the mapped logical viewport with a palette color.
     */
    public clear(color: number): void {
      if (this.scaleMode_ == "fit") {
        this.bitmap_.fill(this.backgroundColor_)
      }
      this.fillLogicalRect(0, 0, LOGICAL_VIEWPORT_WIDTH, LOGICAL_VIEWPORT_HEIGHT, color)
    }

    /**
     * Fills a clipped logical rectangle with a palette color.
     */
    public fillRect(rect: Rect, color: number): void {
      this.fillLogicalRect(rect.x, rect.y, rect.width, rect.height, color)
    }

    /**
     * Draws a clipped logical rectangle outline with a palette color.
     */
    public drawRect(rect: Rect, color: number): void {
      const x = this.roundPixel(rect.x)
      const y = this.roundPixel(rect.y)
      const width = this.roundPixel(rect.width)
      const height = this.roundPixel(rect.height)
      if (width <= 0 || height <= 0) return

      this.drawLine(x, y, x + width - 1, y, color)
      this.drawLine(x, y, x, y + height - 1, color)
      this.drawLine(x + width - 1, y, x + width - 1, y + height - 1, color)
      this.drawLine(x, y + height - 1, x + width - 1, y + height - 1, color)
    }

    /**
     * Draws a clipped logical line with a palette color.
     */
    public drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void {
      if (!this.clipLine(
        this.roundPixel(x0),
        this.roundPixel(y0),
        this.roundPixel(x1),
        this.roundPixel(y1)
      )) return

      this.bitmap_.drawLine(
        this.physicalPixelXFromLogical(this.scratchLineX0_),
        this.physicalPixelYFromLogical(this.scratchLineY0_),
        this.physicalPixelXFromLogical(this.scratchLineX1_),
        this.physicalPixelYFromLogical(this.scratchLineY1_),
        color
      )
    }

    /**
     * Draws a clipped logical circle outline with a palette color.
     */
    public drawCircle(cx: number, cy: number, radius: number, color: number): void {
      const physicalRadius = this.physicalLengthFromLogical(radius)
      if (physicalRadius <= 0) return

      this.drawPhysicalCircle(
        this.physicalPixelXFromLogical(cx),
        this.physicalPixelYFromLogical(cy),
        physicalRadius,
        color,
        false
      )
    }

    /**
     * Fills a clipped logical circle with a palette color.
     */
    public fillCircle(cx: number, cy: number, radius: number, color: number): void {
      const physicalRadius = this.physicalLengthFromLogical(radius)
      if (physicalRadius <= 0) return

      this.drawPhysicalCircle(
        this.physicalPixelXFromLogical(cx),
        this.physicalPixelYFromLogical(cy),
        physicalRadius,
        color,
        true
      )
    }

    /**
     * Draws a bitmap using nearest-neighbor logical-to-physical mapping.
     */
    public drawBitmap(bitmap: Bitmap, x: number, y: number, options?: DrawBitmapOptions): void {
      const destX = this.roundPixel(x)
      const destY = this.roundPixel(y)
      const scale = this.logicalBitmapScale(options) * this.bitmapViewportLogicalScale(options)
      const transparent = !options || options.transparent !== false
      const logicalWidth = bitmap.width * scale
      const logicalHeight = bitmap.height * scale
      const left = Math.max(0, destX)
      const top = Math.max(0, destY)
      const right = Math.min(LOGICAL_VIEWPORT_WIDTH, destX + logicalWidth)
      const bottom = Math.min(LOGICAL_VIEWPORT_HEIGHT, destY + logicalHeight)
      if (left >= right || top >= bottom) return

      const physicalLeft = Math.max(this.viewportLeft(), this.physicalEdgeXFromLogical(left))
      const physicalTop = Math.max(this.viewportTop(), this.physicalEdgeYFromLogical(top))
      const physicalRight = Math.min(this.viewportRight(), this.physicalEdgeXFromLogical(right))
      const physicalBottom = Math.min(this.viewportBottom(), this.physicalEdgeYFromLogical(bottom))
      if (physicalLeft >= physicalRight || physicalTop >= physicalBottom) return

      for (let py = physicalTop; py < physicalBottom; py++) {
        const logicalY = this.logicalSampleYFromPhysical(py)
        const sourceY = Math.floor((logicalY - destY) / scale)
        for (let px = physicalLeft; px < physicalRight; px++) {
          const logicalX = this.logicalSampleXFromPhysical(px)
          const sourceX = Math.floor((logicalX - destX) / scale)
          if (sourceX < 0 || sourceX >= bitmap.width || sourceY < 0 || sourceY >= bitmap.height) continue

          const color = bitmap.getPixel(sourceX, sourceY)
          if (!transparent || color != 0) {
            this.bitmap_.setPixel(px, py, color)
          }
        }
      }
    }

    /**
     * Draws text using the selected bitmap font.
     */
    public drawText(text: string, x: number, y: number, options?: DrawTextOptions): void {
      const font = this.textFont(text, options ? options.font : undefined)
      const color = options && options.color !== undefined ? options.color : 15
      const glyphScale = this.textLogicalScale(options)
      const startX = this.roundPixel(x)
      let cursorX = startX
      let cursorY = this.roundPixel(y)
      let cp = 0
      const mult = font.multiplier ? font.multiplier : 1
      const dataWidth = Math.idiv(font.charWidth, mult)
      const dataHeight = Math.idiv(font.charHeight, mult)
      const byteHeight = (dataHeight + 7) >> 3
      const charSize = byteHeight * dataWidth
      const dataSize = 2 + charSize
      const fontData = font.data
      const lastChar = Math.idiv(fontData.length, dataSize) - 1

      while (cp < text.length) {
        const ch = text.charCodeAt(cp++)
        if (ch == 10) {
          cursorY += (font.charHeight + 2) * glyphScale
          cursorX = startX
          continue
        }
        if (ch < 32) continue

        let offset = this.findGlyphOffset(fontData, dataSize, lastChar, ch) + 2
        for (let gx = 0; gx < dataWidth; gx++) {
          let gy = 0
          let mask = 0x01
          let column = fontData[offset++]
          while (gy < dataHeight) {
            if (mask == 0x100) {
              column = fontData[offset++]
              mask = 0x01
            }

            let run = 0
            while (column & mask) {
              run++
              mask <<= 1
            }
            if (run) {
              this.fillLogicalRect(
                cursorX,
                cursorY + gy * mult * glyphScale,
                mult * glyphScale,
                mult * run * glyphScale,
                color
              )
              gy += run
            } else {
              mask <<= 1
              gy++
            }
          }
          cursorX += mult * glyphScale
        }
      }
    }

    /**
     * Measures text in logical pixels for the selected font.
     */
    public measureText(text: string, font?: TextFont, options?: DrawTextOptions): Size {
      const selectedFont = this.textFont(text, font || (options ? options.font : undefined))
      const glyphScale = this.textLogicalScale(options)
      let currentWidth = 0
      let maxWidth = 0
      let lineCount = 1

      for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) == 10) {
          maxWidth = Math.max(maxWidth, currentWidth)
          currentWidth = 0
          lineCount++
        } else {
          currentWidth += selectedFont.charWidth * glyphScale
        }
      }

      maxWidth = Math.max(maxWidth, currentWidth)
      return new Size(
        maxWidth,
        (lineCount * selectedFont.charHeight + (lineCount - 1) * 2) * glyphScale
      )
    }

    private fillLogicalRect(x: number, y: number, width: number, height: number, color: number): void {
      const x0 = Math.max(0, this.roundPixel(x))
      const y0 = Math.max(0, this.roundPixel(y))
      const x1 = Math.min(LOGICAL_VIEWPORT_WIDTH, this.roundPixel(x + width))
      const y1 = Math.min(LOGICAL_VIEWPORT_HEIGHT, this.roundPixel(y + height))
      if (x0 >= x1 || y0 >= y1) return

      const left = Math.max(this.viewportLeft(), this.physicalEdgeXFromLogical(x0))
      const top = Math.max(this.viewportTop(), this.physicalEdgeYFromLogical(y0))
      const right = Math.min(this.viewportRight(), this.physicalEdgeXFromLogical(x1))
      const bottom = Math.min(this.viewportBottom(), this.physicalEdgeYFromLogical(y1))
      if (left >= right || top >= bottom) return

      this.bitmap_.fillRect(left, top, right - left, bottom - top, color)
    }

    private drawPhysicalCircle(cx: number, cy: number, radius: number, color: number, fill: boolean): void {
      const radiusSq = radius * radius
      const inner = Math.max(0, radius - 1)
      const innerSq = inner * inner
      const left = Math.max(this.viewportLeft(), cx - radius)
      const top = Math.max(this.viewportTop(), cy - radius)
      const right = Math.min(this.viewportRight() - 1, cx + radius)
      const bottom = Math.min(this.viewportBottom() - 1, cy + radius)

      for (let y = top; y <= bottom; y++) {
        const dy = y - cy
        for (let x = left; x <= right; x++) {
          const dx = x - cx
          const distSq = dx * dx + dy * dy
          if (fill) {
            if (distSq <= radiusSq) this.bitmap_.setPixel(x, y, color)
          } else if (distSq <= radiusSq && distSq >= innerSq) {
            this.bitmap_.setPixel(x, y, color)
          }
        }
      }
    }

    private clipLine(x0: number, y0: number, x1: number, y1: number): boolean {
      let out0 = this.lineOutCode(x0, y0)
      let out1 = this.lineOutCode(x1, y1)

      while (true) {
        if (!(out0 | out1)) {
          this.scratchLineX0_ = x0
          this.scratchLineY0_ = y0
          this.scratchLineX1_ = x1
          this.scratchLineY1_ = y1
          return true
        }
        if (out0 & out1) return false

        const out = out0 ? out0 : out1
        let x = 0
        let y = 0

        if (out & 8) {
          x = x0 + ((x1 - x0) * (LOGICAL_VIEWPORT_HEIGHT - 1 - y0)) / (y1 - y0)
          y = LOGICAL_VIEWPORT_HEIGHT - 1
        } else if (out & 4) {
          x = x0 + ((x1 - x0) * -y0) / (y1 - y0)
          y = 0
        } else if (out & 2) {
          y = y0 + ((y1 - y0) * (LOGICAL_VIEWPORT_WIDTH - 1 - x0)) / (x1 - x0)
          x = LOGICAL_VIEWPORT_WIDTH - 1
        } else {
          y = y0 + ((y1 - y0) * -x0) / (x1 - x0)
          x = 0
        }

        if (out == out0) {
          x0 = this.roundPixel(x)
          y0 = this.roundPixel(y)
          out0 = this.lineOutCode(x0, y0)
        } else {
          x1 = this.roundPixel(x)
          y1 = this.roundPixel(y)
          out1 = this.lineOutCode(x1, y1)
        }
      }
    }

    private lineOutCode(x: number, y: number): number {
      let code = 0
      if (x < 0) code |= 1
      else if (x > LOGICAL_VIEWPORT_WIDTH - 1) code |= 2
      if (y < 0) code |= 4
      else if (y > LOGICAL_VIEWPORT_HEIGHT - 1) code |= 8
      return code
    }

    private viewportLeft(): number {
      return Math.max(0, this.physicalEdgeXFromLogical(0))
    }

    private viewportTop(): number {
      return Math.max(0, this.physicalEdgeYFromLogical(0))
    }

    private viewportRight(): number {
      return Math.min(this.bitmap_.width, this.physicalEdgeXFromLogical(LOGICAL_VIEWPORT_WIDTH))
    }

    private viewportBottom(): number {
      return Math.min(this.bitmap_.height, this.physicalEdgeYFromLogical(LOGICAL_VIEWPORT_HEIGHT))
    }

    private physicalPixelXFromLogical(logicalX: number): number {
      return this.clampPhysicalX(Math.floor(this.offsetX() + logicalX * this.scale()))
    }

    private physicalPixelYFromLogical(logicalY: number): number {
      return this.clampPhysicalY(Math.floor(this.offsetY() + logicalY * this.scale()))
    }

    private physicalEdgeXFromLogical(logicalX: number): number {
      return this.roundPixel(this.offsetX() + logicalX * this.scale())
    }

    private physicalEdgeYFromLogical(logicalY: number): number {
      return this.roundPixel(this.offsetY() + logicalY * this.scale())
    }

    private clampPhysicalX(physicalX: number): number {
      return Math.max(0, Math.min(this.bitmap_.width - 1, physicalX))
    }

    private clampPhysicalY(physicalY: number): number {
      return Math.max(0, Math.min(this.bitmap_.height - 1, physicalY))
    }

    private physicalLengthFromLogical(logicalLength: number): number {
      const length = this.roundPixel(logicalLength * this.scale())
      return Math.max(0, length)
    }

    private logicalSampleXFromPhysical(physicalX: number): number {
      return (physicalX + 0.5 - this.offsetX()) / this.scale()
    }

    private logicalSampleYFromPhysical(physicalY: number): number {
      return (physicalY + 0.5 - this.offsetY()) / this.scale()
    }

    private scale(): number {
      return physicalViewportScale(this.bitmap_.width, this.bitmap_.height, this.scaleMode_)
    }

    private offsetX(): number {
      return physicalViewportOffsetX(this.bitmap_.width, this.bitmap_.height, this.scaleMode_)
    }

    private offsetY(): number {
      return physicalViewportOffsetY(this.bitmap_.width, this.bitmap_.height, this.scaleMode_)
    }

    private logicalBitmapScale(options?: DrawBitmapOptions): number {
      if (!options || options.scale === undefined) return 1

      const scale = options.scale | 0
      if (scale <= 0 || scale != options.scale) return 1
      return scale
    }

    private bitmapViewportLogicalScale(options?: DrawBitmapOptions): number {
      return this.viewportLogicalScale(
        !!(options && options.allowDownscale),
        !options || options.allowUpscale !== false
      )
    }

    private textLogicalScale(options?: DrawTextOptions): number {
      return this.viewportLogicalScale(
        !!(options && options.allowDownscale),
        !options || options.allowUpscale !== false
      )
    }

    private viewportLogicalScale(allowDownscale: boolean, allowUpscale: boolean): number {
      const scale = this.scale()
      let logicalScale = 1
      if (!allowDownscale && scale < 1) {
        logicalScale = Math.ceil(1 / scale)
      }
      if (!allowUpscale && logicalScale * scale > 1) {
        logicalScale = 1 / scale
      }
      return logicalScale
    }

    private textFont(text: string, font?: TextFont): TextFont {
      if (font) return font
      return bitmaps.getFontForText(text)
    }

    private findGlyphOffset(fontData: Buffer, dataSize: number, lastChar: number, charCode: number): number {
      let left = 0
      let right = lastChar
      let offset = 0
      const guess = (charCode - 32) * dataSize

      if (guess >= 0 && guess < fontData.length && fontData.getNumber(NumberFormat.UInt16LE, guess) == charCode) {
        return guess
      }

      while (left <= right) {
        const middle = left + ((right - left) >> 1)
        const value = fontData.getNumber(NumberFormat.UInt16LE, middle * dataSize)
        if (value == charCode) {
          offset = middle * dataSize
          break
        }
        if (value < charCode) {
          left = middle + 1
        } else {
          right = middle - 1
        }
      }

      return offset
    }

    private roundPixel(value: number): number {
      return Math.round(value)
    }
  }
}
