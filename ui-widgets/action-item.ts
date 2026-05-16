namespace ui {
  /**
   * Palette colors used when an item does not provide a custom `draw` callback.
   */
  export interface UiActionItemPalette {
    /**
     * Fill color for an ordinary item background.
     */
    backgroundColor?: number

    /**
     * Text and bitmap color used by callers that draw monochrome assets.
     */
    foregroundColor?: number

    /**
     * Fill color for selected items.
     */
    selectedColor?: number

    /**
     * Fill color for toggled items.
     */
    toggledColor?: number

    /**
     * Fill color for disabled items.
     */
    disabledColor?: number

    /**
     * Outline color for the focused item.
     */
    focusColor?: number
  }

  /**
   * Draws one action item inside its arranged rectangle.
   */
  export interface UiActionItemDraw<T> {
    /**
     * Renders the complete visual contents of `rect`.
     */
    (
      surface: DrawSurface,
      item: UiActionItem<T>,
      rect: Rect,
      focused: boolean,
      selected: boolean,
      toggled: boolean,
      disabled: boolean
    ): void
  }

  /**
   * Caller-owned item record consumed by action, modal, and toggle widgets.
   */
  export interface UiActionItem<T> {
    /**
     * Stable caller id for this item.
     */
    id: string

    /**
     * Typed value returned when this item is activated.
     */
    value: T

    /**
     * Visible label text. Takes precedence over `textId`.
     */
    text?: string

    /**
     * Resolver-backed label id used when `text` is omitted.
     */
    textId?: string

    /**
     * Bitmap drawn for this item when `draw` is omitted. Takes precedence over
     * `bitmapId`.
     */
    bitmap?: Bitmap

    /**
     * Resolver-backed bitmap id used when `bitmap` is omitted.
     */
    bitmapId?: string | number

    /**
     * When true, missing resolver-backed bitmaps are not drawn.
     */
    omitMissingBitmap?: boolean

    /**
     * Optional colors used when `draw` is omitted.
     */
    palette?: UiActionItemPalette

    /**
     * Whether this item participates in layout, rendering, focus, and hit
     * testing. Omitted values are treated as `true`.
     */
    visible?: boolean

    /**
     * Whether this item is visible but cannot be focused or activated.
     */
    disabled?: boolean

    /**
     * Whether built-in item drawing should show selected state.
     */
    selected?: boolean

    /**
     * Whether built-in item drawing should show toggled state.
     */
    toggled?: boolean

    /**
     * Optional callback that draws the complete item rectangle.
     */
    draw?: UiActionItemDraw<T>
  }
}

namespace _uiWidgets {
  export function targetId(scopeId: string, itemId: string): string {
    return scopeId + "/" + itemId
  }

  export function itemIdFromTargetId(scopeId: string, targetId: string): string | undefined {
    const prefix = scopeId + "/"
    if (targetId.substr(0, prefix.length) != prefix) return undefined
    return targetId.substr(prefix.length)
  }

  export function isVisible<T>(item: ui.UiActionItem<T>): boolean {
    return item.visible !== false
  }

  export function isDisabled<T>(item: ui.UiActionItem<T>): boolean {
    return item.disabled || false
  }

  export function isSelected<T>(item: ui.UiActionItem<T>): boolean {
    return item.selected || false
  }

  export function isToggled<T>(item: ui.UiActionItem<T>): boolean {
    return item.toggled || false
  }

  export function containsString(values: string[], value: string): boolean {
    for (let i = 0; i < values.length; i++) {
      if (values[i] == value) return true
    }
    return false
  }

  export function defaultLayoutSpec(): ui.UiLayoutSpec {
    return {
      width: { mode: "content" },
      height: { mode: "content" }
    }
  }

  export function fixedLayoutSpec(width: number, height: number): ui.UiLayoutSpec {
    return {
      width: { mode: "fixed", value: width },
      height: { mode: "fixed", value: height }
    }
  }

  export function itemWidth(value: number | undefined): number {
    return sanitizeDimension(value, 24)
  }

  export function itemHeight(value: number | undefined): number {
    return sanitizeDimension(value, 20)
  }

  export function gap(value: number | undefined): number {
    return sanitizeDimension(value, 2)
  }

  export function sanitizeDimension(value: number | undefined, defaultValue: number): number {
    if (value === undefined || value != value) return defaultValue
    value = Math.round(value)
    return value < 0 ? 0 : value
  }

  export function itemText<T>(item: ui.UiActionItem<T>, assets: ui.UiAssetResolver): string {
    if (item.text !== undefined) return item.text
    if (item.textId !== undefined) return assets.getText(item.textId)
    return ""
  }

  export function itemBitmap<T>(item: ui.UiActionItem<T>, assets: ui.UiAssetResolver): Bitmap | undefined {
    if (item.bitmap) return item.bitmap
    if (item.bitmapId !== undefined) return assets.getBitmap(item.bitmapId, item.omitMissingBitmap || false)
    return undefined
  }

  export function findItemById<T>(items: ui.UiActionItem<T>[], itemId: string | undefined): ui.UiActionItem<T> {
    if (itemId === undefined) return undefined
    for (let i = 0; i < items.length; i++) {
      if (items[i].id == itemId) return items[i]
    }
    return undefined
  }

  export function findItemByTargetId<T>(
    scopeId: string,
    items: ui.UiActionItem<T>[],
    targetId: string | undefined
  ): ui.UiActionItem<T> {
    return findItemById(items, itemIdFromTargetId(scopeId, targetId))
  }

  export function preferredItemId<T>(
    scopeId: string,
    items: ui.UiActionItem<T>[],
    defaultItemId: string | undefined
  ): string | undefined {
    const explicit = findItemById(items, defaultItemId)
    if (explicit && isVisible(explicit) && !isDisabled(explicit)) return targetId(scopeId, explicit.id)

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (isVisible(item) && !isDisabled(item) && isSelected(item)) return targetId(scopeId, item.id)
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (isVisible(item) && !isDisabled(item)) return targetId(scopeId, item.id)
    }

    return undefined
  }

  export function renderActionItem<T>(
    surface: ui.DrawSurface,
    assets: ui.UiAssetResolver,
    item: ui.UiActionItem<T>,
    rect: ui.Rect,
    focused: boolean
  ): void {
    const selected = isSelected(item)
    const toggled = isToggled(item)
    const disabled = isDisabled(item)
    if (item.draw) {
      item.draw(surface, item, rect, focused, selected, toggled, disabled)
      return
    }

    const palette = item.palette || {}
    let background = palette.backgroundColor
    if (disabled && palette.disabledColor !== undefined) background = palette.disabledColor
    else if (toggled && palette.toggledColor !== undefined) background = palette.toggledColor
    else if (selected && palette.selectedColor !== undefined) background = palette.selectedColor
    if (background === undefined) background = disabled ? 1 : toggled ? 6 : selected ? 5 : 0

    const foreground = palette.foregroundColor !== undefined ? palette.foregroundColor : disabled ? 8 : 15
    surface.fillRect(rect, background)

    const bitmap = itemBitmap(item, assets)
    const text = itemText(item, assets)
    let textX = rect.x + 3
    if (bitmap) {
      surface.drawBitmap(bitmap, rect.x + 2, rect.y + Math.max(0, Math.round((rect.height - bitmap.height) / 2)))
      textX = rect.x + bitmap.width + 5
    }
    if (text.length > 0) {
      surface.drawText(text, textX, rect.y + 4, { color: foreground, transparent: true, allowDownscale: true })
    }
    if (focused) {
      const focusColor = palette.focusColor !== undefined ? palette.focusColor : 15
      surface.drawRect(rect, focusColor)
    }
  }

  export function copyRect(target: ui.Rect, source: ui.Rect): void {
    ui.copyArrangedLayoutRect(target, source)
  }
}
