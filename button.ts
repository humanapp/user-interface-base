namespace user_interface_base {
  export class Borders {
    constructor(
      public top: number,
      public bottom: number,
      public left: number,
      public right: number
    ) { }
  }

  export class ButtonStyle {
    constructor(
      public fill: number,
      public borders: Borders,
      public shadow: boolean
    ) { }
  }


  /**
  * Parameters for a Button constructor, which controls the:
  * background behind the bitmap in the button; whether or not it has a shadow effect;
  * and the style of the borders around the button.
  */
  export namespace ButtonStyles {
    export const ShadowedWhite = new ButtonStyle(
      1,
      new Borders(1, 12, 1, 1),
      true
    )
    export const LightShadowedWhite = new ButtonStyle(
      1,
      new Borders(1, 11, 1, 1),
      true
    )
    export const FlatWhite = new ButtonStyle(
      1,
      new Borders(1, 1, 1, 1),
      false
    )
    /*
    export const RectangleWhite = new ButtonStyle(
        1,
        new Borders(0, 0, 0, 0),
        false
    )
    */
    export const BorderedPurple = new ButtonStyle(
      11,
      new Borders(12, 12, 12, 12),
      false
    )
    export const RedBorderedWhite = new ButtonStyle(
      1,
      new Borders(2, 2, 2, 2),
      false
    )
    export const GreenBorderedWhite = new ButtonStyle(
      1,
      new Borders(7, 7, 7, 7),
      false
    )
    export const Transparent = new ButtonStyle(
      0,
      new Borders(0, 0, 0, 0),
      false
    )
  }

  export function borderLeft(style: ButtonStyle) {
    return style.borders.left ? 1 : 0
  }

  export function borderTop(style: ButtonStyle) {
    return style.borders.top ? 1 : 0
  }

  export function borderRight(style: ButtonStyle) {
    return style.borders.right ? 1 : 0
  }

  export function borderBottom(style: ButtonStyle) {
    return style.borders.bottom ? 1 : 0
  }

  export function borderWidth(style: ButtonStyle) {
    return borderLeft(style) + borderRight(style)
  }

  export function borderHeight(style: ButtonStyle) {
    return borderTop(style) + borderBottom(style)
  }


  /**
  * This is currently only extended by Button.
  * Some navigators and pickers choose to operate on this instead of buttons for generality.
  * See the Button class below.
  */
  export class ButtonBase implements IComponent, ISizable, IPlaceable {
    public icon: Sprite
    private xfrm_: Affine
    private style: ButtonStyle

    constructor(x: number, y: number, style: ButtonStyle, parent: Affine) {
      this.xfrm_ = new Affine()
      this.xfrm.localPos.x = x
      this.xfrm.localPos.y = y
      this.style = style
      this.xfrm.parent = parent
    }

    public get xfrm() {
      return this.xfrm_
    }
    public get width() {
      return this.bounds.width
    }
    public get height() {
      return this.bounds.height
    }

    public get bounds() {
      // Returns bounds in local space
      return Bounds.GrowXY(
        this.icon.bounds,
        borderLeft(this.style),
        borderTop(this.style)
      )
    }

    public get rootXfrm(): Affine {
      let xfrm = this.xfrm
      while (xfrm.parent) {
        xfrm = xfrm.parent
      }
      return xfrm
    }

    public buildSprite(img: Bitmap) {
      this.icon = new Sprite({
        parent: this,
        img,
      })
      this.icon.xfrm.parent = this.xfrm
    }

    public getImage() {
      return this.icon.image
    }

    public occlusions(bounds: Bounds) {
      return this.icon.occlusions(bounds)
    }

    public setVisible(visible: boolean) {
      this.icon.invisible = !visible
      if (!visible) {
        this.hover(false)
      }
    }

    public visible() {
      return !this.icon.invisible
    }

    public hover(hov: boolean) { }
    public update() { }

    isOffScreenX(): boolean {
      return this.icon.isOffScreenX()
    }

    draw() {
      this.drawStyle()
      this.drawIcon()
    }

    private drawIcon() {
      this.icon.draw()
    }

    private drawStyle() {
      if (this.style.fill)
        Screen.fillBoundsXfrm(
          this.xfrm,
          this.icon.bounds,
          this.style.fill
        )
      if (this.style.borders)
        Screen.outlineBoundsXfrm4(
          this.xfrm,
          this.icon.bounds,
          1,
          this.style.borders
        )
      if (this.style.shadow) {
        Screen.setPixelXfrm(
          this.xfrm,
          this.icon.bounds.left - 1,
          this.icon.bounds.bottom,
          this.style.borders.bottom
        )
        Screen.setPixelXfrm(
          this.xfrm,
          this.icon.bounds.right + 1,
          this.icon.bounds.bottom,
          this.style.borders.bottom
        )
      }
    }
  }


  /**
  * GUI Button with a bitmap sprite, border colour, bitmap background colour,
  * text can be optoinally displayed below the button.
  * These buttons are typically used by navigators,
  * which map physical button presses over a row or grid of these buttons.
  *
  * ALL arguments for the Button constructor are optional and have defaults.
  */
  export class Button extends ButtonBase {
    /** The bitmap to be displayed by the button, if it is a string it will be looked up; see coreAssets.ts */
    private iconId: string | number | Bitmap
    /** The text to be displayed below the button, formerly used as a lookup for the text to be displayed. */
    private _ariaId: string
    /**
    * The action the button should take, typically used to transition between scenes.
    * The button parameter is optional. It may be useful if you want to change the boundaryColor, or state, when pressed.
    */
    public onClick?: (button: Button) => void
    /**
    * Used by draw to change boundary colour to .boundaryColor when this is true, and .dynamicBoundaryColorsOn
    */
    public selected: boolean
    /**
    * Do you want the buttons boundary to change to .boundaryColor when pressed?
    */
    private dynamicBoundaryColorsOn: boolean

    /**
    * used by .dynamicBoundaryColorsOn and .selected, see .draw()
    */
    private boundaryColor: number

    /**
    * Seldom used, you can store arbitrary data here.
    * This might be useful when you choose to pass button with onClick().
    */
    public state: any[]
    /**
    * Used to disable a button.
    */
    public pressable: boolean

    public get ariaId(): string {
      return this._ariaId
    }

    public set ariaId(value: string) {
      this._ariaId = value
    }


    get getLocalX() { return this.xfrm.localPos.x }
    get getLocalY() { return this.xfrm.localPos.y }

    set setLocalX(x: number) { this.xfrm.localPos.x = x }
    set setLocalY(y: number) { this.xfrm.localPos.y = y }


    reportAria(force = false) {
      // const msg: accessibility.TileAccessibilityMessage = {
      //   type: "tile",
      //   value: this.ariaId,
      //   force,
      // }
      // accessibility.setLiveContent(msg)
    }

    constructor(opts: {
      parent?: IPlaceable
      style?: ButtonStyle
      icon?: string | number | Bitmap
      ariaId?: string
      x?: number
      y?: number
      onClick?: (button: Button) => void,
      dynamicBoundaryColorsOn?: boolean
      boundaryColor?: number,
      flipIcon?: boolean,
      state?: any[]
    }) {
      super(
        (opts.x != null) ? opts.x : 0,
        (opts.y != null) ? opts.y : 0,
        opts.style || ButtonStyles.Transparent,
        opts.parent && opts.parent.xfrm
      )
      this.iconId = opts.icon
      this._ariaId = (opts.ariaId != null) ? opts.ariaId : ""
      this.onClick = opts.onClick
      this.buildSprite(this.image_())

      if (opts.flipIcon) {
        this.icon.image = this.icon.image.clone()
        this.icon.image.flipY()
      }

      this.selected = false
      this.pressable = true

      // Setup dynamic boundary colours.
      // This is used by .draw()
      // If the button is hovered it is blue, it it is selected (A pressed once) it is green, other button boundaries are red.
      // This remains the case even if you are no longer hovering over the button.
      // This means that all buttons with dynamicBoundaryColorsOn will have boundaries.
      // MicroData/sensorSelect.ts uses this to select multiple buttons.

      if (opts.dynamicBoundaryColorsOn == null) {
        opts.dynamicBoundaryColorsOn = false
      }
      else {
        this.dynamicBoundaryColorsOn = opts.dynamicBoundaryColorsOn
        this.boundaryColor = 2 // Red
      }

      if (opts.boundaryColor != null) {
        this.dynamicBoundaryColorsOn = true
        this.boundaryColor = opts.boundaryColor
      }
      
      // This is null if not passed in.
      this.state = opts.state
    }

    public getIcon() {
      return this.iconId
    }

    public toggleDynamicBoundaryColors() {
      this.dynamicBoundaryColorsOn = !this.dynamicBoundaryColorsOn
    }

    public toggleSelected(): void {
      this.selected = !this.selected
    }

    private image_() {
      return typeof this.iconId == "string" || typeof this.iconId == "number"
        ? getIcon(this.iconId, false)
        : this.iconId
    }

    public setIcon(iconId: string | number, img?: Bitmap) {
      this.iconId = iconId
      if (img) this.icon.setImage(img)
      else this.buildSprite(this.image_())
    }

    /**
    * Is it visible and pressable?
    */
    public clickable() {
      return this.visible() && this.pressable
    }

    /**
    * invokes .onClick(), but only if it is clickable and non-null.
    */
    public click() {
      if (!this.clickable()) {
        return
      }
      if (this.onClick && this.onClick != null) {
        this.onClick(this)
      }
    }

    public draw() {
      super.draw()
      
      // Draw a boundary colour if requested, this allows you to change a buttons border color based upon whether or not it has been clicked.
      if (this.dynamicBoundaryColorsOn) {
        const boundaryColour = (this.selected && this.pressable) ? 7 : this.boundaryColor // 7 = green
    
        // Draw the outline multiple times for a thicker border.
        // TODO: optimise this, and the underlying outlineBoundsXfrm, outlineBoundsXfrm invokes drawLine between 4 and 8 times each!
        for (let dist = 1; dist <= 3; dist++) {
          Screen.outlineBoundsXfrm(
            this.xfrm,
            this.icon.bounds,
            dist,
            boundaryColour
          )
        }
      }
    }
  }
}
