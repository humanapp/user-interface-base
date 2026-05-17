namespace ui {
  /**
   * Draw surface that maps UI coordinates into a physical bitmap.
   */
  export class PhysicalBitmapDrawSurface implements PhysicalDrawSurface {
    private bitmap_: Bitmap
    private displayProfile_: UiDisplayProfile
    private scaleMode_: ViewportScaleMode
    private backgroundColor_: number
    private displayedWidth_: number
    private displayedHeight_: number
    private uiWidth_: number
    private uiHeight_: number
    private profileToPhysicalScale_: number
    private offsetX_: number
    private offsetY_: number
    private viewportLeft_: number
    private viewportTop_: number
    private viewportRight_: number
    private viewportBottom_: number
    private uiToPhysicalScaleX_: number
    private uiToPhysicalScaleY_: number
    private physicalToUiScaleX_: number
    private physicalToUiScaleY_: number
    private logicalToUiScaleX_: number
    private logicalToUiScaleY_: number
    private minUiToPhysicalScale_: number
    private minPhysicalToUiScale_: number
    private visualPixelAspectRatio_: number
    // Reused output slots for line clipping to avoid per-line object allocation.
    private scratchLineX0_: number
    private scratchLineY0_: number
    private scratchLineX1_: number
    private scratchLineY1_: number

    constructor(bitmap: Bitmap, options?: PhysicalDrawSurfaceOptions) {
      this.bitmap_ = bitmap
      this.displayProfile_ = _uiDisplay.resolveDisplayProfile(
        options ? options.displayProfile : undefined,
        _uiDisplay.validateUiDimension(
          options ? options.designWidth : undefined,
          _uiDisplay.DEFAULT_UI_WIDTH
        ),
        _uiDisplay.validateUiDimension(
          options ? options.designHeight : undefined,
          _uiDisplay.DEFAULT_UI_HEIGHT
        )
      )
      this.scaleMode_ = options && options.scaleMode ? options.scaleMode : "cover"
      this.backgroundColor_ =
        options && options.backgroundColor !== undefined ? options.backgroundColor : 0
      this.displayedWidth_ =
        options && options.displayedWidth !== undefined ? options.displayedWidth : 0
      this.displayedHeight_ =
        options && options.displayedHeight !== undefined ? options.displayedHeight : 0
      this.logicalToUiScaleX_ = 1 / this.displayProfile_.designToLogicalScaleX
      this.logicalToUiScaleY_ = 1 / this.displayProfile_.designToLogicalScaleY
      this.scratchLineX0_ = 0
      this.scratchLineY0_ = 0
      this.scratchLineX1_ = 0
      this.scratchLineY1_ = 0
      this.updateMapping()
    }

    /**
     * Physical bitmap that receives mapped drawing operations.
     */
    public get bitmap(): Bitmap {
      return this.bitmap_
    }

    /**
     * Active-profile scaling policy for draw calls.
     */
    public get scaleMode(): ViewportScaleMode {
      return this.scaleMode_
    }

    /**
     * Active display profile used to map UI coordinates to the bitmap.
     */
    public get displayProfile(): UiDisplayProfile {
      return _uiDisplay.cloneDisplayProfile(this.displayProfile_)
    }

    /**
     * Maps a physical bitmap point to UI coordinates.
     */
    public uiPointFromPhysical(physicalX: number, physicalY: number, output: Point): boolean {
      if (
        physicalX < this.viewportLeft_ ||
        physicalX >= this.viewportRight_ ||
        physicalY < this.viewportTop_ ||
        physicalY >= this.viewportBottom_
      ) return false

      const logicalX = (physicalX - this.offsetX_) / this.profileToPhysicalScale_
      const logicalY = (physicalY - this.offsetY_) / this.profileToPhysicalScale_
      const uiX = Math.floor(logicalX * this.logicalToUiScaleX_)
      const uiY = Math.floor(logicalY * this.logicalToUiScaleY_)
      if (uiX < 0 || uiX >= this.uiWidth_ || uiY < 0 || uiY >= this.uiHeight_) {
        return false
      }

      output.set(uiX, uiY)
      return true
    }

    /**
     * Fills the mapped area. In `fit` mode, bars use the configured background
     * color.
     */
    public clear(color: number): void {
      if (this.scaleMode_ == "fit") {
        this.bitmap_.fill(this.backgroundColor_)
      }
      this.fillUiRect(0, 0, this.uiWidth_, this.uiHeight_, color)
    }

    /**
     * Fills a rectangle after clipping it to the drawable area.
     */
    public fillRect(rect: Rect, color: number): void {
      this.fillUiRect(rect.x, rect.y, rect.width, rect.height, color)
    }

    /**
     * Draws a rectangle outline after clipping it to the drawable area.
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
     * Draws a line after clipping it to the drawable area.
     */
    public drawLine(x0: number, y0: number, x1: number, y1: number, color: number): void {
      if (!this.clipLine(
        this.roundPixel(x0),
        this.roundPixel(y0),
        this.roundPixel(x1),
        this.roundPixel(y1)
      )) return

      this.drawUiLine(
        this.scratchLineX0_,
        this.scratchLineY0_,
        this.scratchLineX1_,
        this.scratchLineY1_,
        color
      )
    }

    /**
     * Draws a circle outline after clipping it to the drawable area.
     */
    public drawCircle(cx: number, cy: number, radius: number, color: number): void {
      const physicalRadius = this.physicalLengthFromUi(radius)
      if (physicalRadius <= 0) return

      this.drawPhysicalVisualCircle(
        this.physicalPixelXFromUi(cx),
        this.physicalPixelYFromUi(cy),
        physicalRadius,
        color,
        false
      )
    }

    /**
     * Fills a circle after clipping it to the drawable area.
     */
    public fillCircle(cx: number, cy: number, radius: number, color: number): void {
      const physicalRadius = this.physicalLengthFromUi(radius)
      if (physicalRadius <= 0) return

      this.drawPhysicalVisualCircle(
        this.physicalPixelXFromUi(cx),
        this.physicalPixelYFromUi(cy),
        physicalRadius,
        color,
        true
      )
    }

    /**
     * Draws a bitmap with nearest-neighbor sampling.
     */
    public drawBitmap(bitmap: Bitmap, x: number, y: number, options?: DrawBitmapOptions): void {
      const destX = this.roundPixel(x)
      const destY = this.roundPixel(y)
      const scale = this.bitmapScale(options) * this.bitmapViewportUiScale(options)
      const transparent = !options || options.transparent !== false
      const logicalWidth = bitmap.width * scale
      const logicalHeight = bitmap.height * scale
      const left = Math.max(0, destX)
      const top = Math.max(0, destY)
      const right = Math.min(this.uiWidth_, destX + logicalWidth)
      const bottom = Math.min(this.uiHeight_, destY + logicalHeight)
      if (left >= right || top >= bottom) return

      const physicalLeft = Math.max(this.viewportLeft_, this.physicalEdgeXFromUi(left))
      const physicalTop = Math.max(this.viewportTop_, this.physicalEdgeYFromUi(top))
      const physicalRight = Math.min(this.viewportRight_, this.physicalEdgeXFromUi(right))
      const physicalBottom = Math.min(this.viewportBottom_, this.physicalEdgeYFromUi(bottom))
      if (physicalLeft >= physicalRight || physicalTop >= physicalBottom) return

      for (let py = physicalTop; py < physicalBottom; py++) {
        const uiY = this.uiSampleYFromPhysical(py)
        const sourceY = Math.floor((uiY - destY) / scale)
        for (let px = physicalLeft; px < physicalRight; px++) {
          const uiX = this.uiSampleXFromPhysical(px)
          const sourceX = Math.floor((uiX - destX) / scale)
          if (sourceX < 0 || sourceX >= bitmap.width || sourceY < 0 || sourceY >= bitmap.height) continue

          const color = bitmap.getPixel(sourceX, sourceY)
          if (!transparent || color != 0) {
            this.bitmap_.setPixel(px, py, color)
          }
        }
      }
    }

    /**
     * Draws text at the logical position using a bitmap font.
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
              this.fillUiRect(
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
     * Measures text in UI units for the selected font.
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

    private fillUiRect(x: number, y: number, width: number, height: number, color: number): void {
      const x0 = Math.max(0, this.roundPixel(x))
      const y0 = Math.max(0, this.roundPixel(y))
      const x1 = Math.min(this.uiWidth_, this.roundPixel(x + width))
      const y1 = Math.min(this.uiHeight_, this.roundPixel(y + height))
      if (x0 >= x1 || y0 >= y1) return

      const left = Math.max(this.viewportLeft_, this.physicalFillLeftFromUi(x0))
      const top = Math.max(this.viewportTop_, this.physicalFillTopFromUi(y0))
      const right = Math.min(this.viewportRight_, this.physicalFillRightFromUi(x1))
      const bottom = Math.min(this.viewportBottom_, this.physicalFillBottomFromUi(y1))
      if (left >= right || top >= bottom) return

      this.bitmap_.fillRect(left, top, right - left, bottom - top, color)
    }

    private drawUiLine(x0: number, y0: number, x1: number, y1: number, color: number): void {
      if (x0 == x1) {
        const top = Math.min(y0, y1)
        this.fillUiRect(x0, top, 1, Math.abs(y1 - y0) + 1, color)
        return
      }
      if (y0 == y1) {
        const left = Math.min(x0, x1)
        this.fillUiRect(left, y0, Math.abs(x1 - x0) + 1, 1, color)
        return
      }

      const dx = Math.abs(x1 - x0)
      const sx = x0 < x1 ? 1 : -1
      const dy = -Math.abs(y1 - y0)
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy

      while (true) {
        this.fillUiRect(x0, y0, 1, 1, color)
        if (x0 == x1 && y0 == y1) return
        const e2 = err * 2
        if (e2 >= dy) {
          err += dy
          x0 += sx
        }
        if (e2 <= dx) {
          err += dx
          y0 += sy
        }
      }
    }

    private drawPhysicalVisualCircle(cx: number, cy: number, radius: number, color: number, fill: boolean): void {
      const pixelAspect = this.visualPixelAspectRatio_
      if (pixelAspect <= 0) return

      const radiusSq = radius * radius
      const inner = Math.max(0, radius - 1)
      const innerSq = inner * inner
      const horizontalRadius = Math.ceil(radius / pixelAspect)
      const left = Math.max(this.viewportLeft_, cx - horizontalRadius)
      const top = Math.max(this.viewportTop_, cy - radius)
      const right = Math.min(this.viewportRight_ - 1, cx + horizontalRadius)
      const bottom = Math.min(this.viewportBottom_ - 1, cy + radius)

      for (let y = top; y <= bottom; y++) {
        const dy = y - cy
        for (let x = left; x <= right; x++) {
          const dx = (x - cx) * pixelAspect
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
          x = x0 + ((x1 - x0) * (this.uiHeight_ - 1 - y0)) / (y1 - y0)
          y = this.uiHeight_ - 1
        } else if (out & 4) {
          x = x0 + ((x1 - x0) * -y0) / (y1 - y0)
          y = 0
        } else if (out & 2) {
          y = y0 + ((y1 - y0) * (this.uiWidth_ - 1 - x0)) / (x1 - x0)
          x = this.uiWidth_ - 1
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
      else if (x > this.uiWidth_ - 1) code |= 2
      if (y < 0) code |= 4
      else if (y > this.uiHeight_ - 1) code |= 8
      return code
    }

    private physicalPixelXFromUi(uiX: number): number {
      return this.clampPhysicalX(Math.floor(this.offsetX_ + uiX * this.uiToPhysicalScaleX_))
    }

    private physicalPixelYFromUi(uiY: number): number {
      return this.clampPhysicalY(Math.floor(this.offsetY_ + uiY * this.uiToPhysicalScaleY_))
    }

    private physicalEdgeXFromUi(uiX: number): number {
      return this.roundPixel(this.offsetX_ + uiX * this.uiToPhysicalScaleX_)
    }

    private physicalEdgeYFromUi(uiY: number): number {
      return this.roundPixel(this.offsetY_ + uiY * this.uiToPhysicalScaleY_)
    }

    private physicalFillLeftFromUi(uiX: number): number {
      return Math.floor(this.offsetX_ + uiX * this.uiToPhysicalScaleX_)
    }

    private physicalFillTopFromUi(uiY: number): number {
      return Math.floor(this.offsetY_ + uiY * this.uiToPhysicalScaleY_)
    }

    private physicalFillRightFromUi(uiX: number): number {
      return Math.ceil(this.offsetX_ + uiX * this.uiToPhysicalScaleX_)
    }

    private physicalFillBottomFromUi(uiY: number): number {
      return Math.ceil(this.offsetY_ + uiY * this.uiToPhysicalScaleY_)
    }

    private clampPhysicalX(physicalX: number): number {
      return Math.max(0, Math.min(this.bitmap_.width - 1, physicalX))
    }

    private clampPhysicalY(physicalY: number): number {
      return Math.max(0, Math.min(this.bitmap_.height - 1, physicalY))
    }

    private physicalLengthFromUi(uiLength: number): number {
      const length = this.roundPixel(uiLength * this.minUiToPhysicalScale_)
      return Math.max(0, length)
    }

    private uiSampleXFromPhysical(physicalX: number): number {
      return (physicalX + 0.5 - this.offsetX_) * this.physicalToUiScaleX_
    }

    private uiSampleYFromPhysical(physicalY: number): number {
      return (physicalY + 0.5 - this.offsetY_) * this.physicalToUiScaleY_
    }

    private bitmapScale(options?: DrawBitmapOptions): number {
      if (!options || options.scale === undefined) return 1

      const scale = options.scale | 0
      if (scale <= 0 || scale != options.scale) return 1
      return scale
    }

    private bitmapViewportUiScale(options?: DrawBitmapOptions): number {
      return this.viewportUiScale(
        !!(options && options.allowDownscale),
        !options || options.allowUpscale !== false
      )
    }

    private textLogicalScale(options?: DrawTextOptions): number {
      return this.viewportUiScale(
        !!(options && options.allowDownscale),
        !options || options.allowUpscale !== false
      )
    }

    private viewportUiScale(allowDownscale: boolean, allowUpscale: boolean): number {
      let logicalScale = 1
      if (!allowDownscale && this.minUiToPhysicalScale_ < 1) {
        logicalScale = Math.ceil(this.minPhysicalToUiScale_)
      }
      if (!allowUpscale && logicalScale * this.minUiToPhysicalScale_ > 1) {
        logicalScale = this.minPhysicalToUiScale_
      }
      return logicalScale
    }

    private updateMapping(): void {
      this.uiWidth_ = this.displayProfile_.logicalWidth * this.logicalToUiScaleX_
      this.uiHeight_ = this.displayProfile_.logicalHeight * this.logicalToUiScaleY_
      this.profileToPhysicalScale_ = _uiDisplay.physicalDisplayScale(
        this.bitmap_.width,
        this.bitmap_.height,
        this.displayProfile_,
        this.scaleMode_
      )
      this.offsetX_ = (
        this.bitmap_.width -
        this.displayProfile_.logicalWidth * this.profileToPhysicalScale_
      ) / 2
      this.offsetY_ = (
        this.bitmap_.height -
        this.displayProfile_.logicalHeight * this.profileToPhysicalScale_
      ) / 2
      this.viewportLeft_ = Math.max(0, this.roundPixel(this.offsetX_))
      this.viewportTop_ = Math.max(0, this.roundPixel(this.offsetY_))
      this.viewportRight_ = Math.min(
        this.bitmap_.width,
        this.roundPixel(this.offsetX_ + this.displayProfile_.logicalWidth * this.profileToPhysicalScale_)
      )
      this.viewportBottom_ = Math.min(
        this.bitmap_.height,
        this.roundPixel(this.offsetY_ + this.displayProfile_.logicalHeight * this.profileToPhysicalScale_)
      )
      this.uiToPhysicalScaleX_ =
        this.displayProfile_.designToLogicalScaleX * this.profileToPhysicalScale_
      this.uiToPhysicalScaleY_ =
        this.displayProfile_.designToLogicalScaleY * this.profileToPhysicalScale_
      this.physicalToUiScaleX_ = 1 / this.uiToPhysicalScaleX_
      this.physicalToUiScaleY_ = 1 / this.uiToPhysicalScaleY_
      this.minUiToPhysicalScale_ = Math.min(
        this.uiToPhysicalScaleX_,
        this.uiToPhysicalScaleY_
      )
      this.minPhysicalToUiScale_ = 1 / this.minUiToPhysicalScale_
      this.visualPixelAspectRatio_ = this.resolveVisualPixelAspectRatio()
    }

    private resolveVisualPixelAspectRatio(): number {
      if (
        this.bitmap_.width <= 0 ||
        this.bitmap_.height <= 0 ||
        this.displayedWidth_ <= 0 ||
        this.displayedHeight_ <= 0
      ) return 1

      return (this.displayedWidth_ / this.bitmap_.width) / (this.displayedHeight_ / this.bitmap_.height)
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
