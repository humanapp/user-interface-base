namespace ui {
  /**
   * Display-shield adapter that draws directly into the current screen bitmap.
   */
  export class DisplayShieldFrameAdapter {
    private surface_: PhysicalBitmapDrawSurface

    constructor(options?: PhysicalDrawSurfaceOptions) {
      this.surface_ = new PhysicalBitmapDrawSurface(screen(), options)
    }

    /**
     * Logical draw surface backed by the current physical screen bitmap.
     */
    public get surface(): PhysicalBitmapDrawSurface {
      return this.surface_
    }

    /**
     * Updates the physical screen through the existing display-shield path.
     */
    public commit(): Bitmap {
      const frame = this.surface_.bitmap
      shieldhelpers.updateScreen(frame)
      return frame
    }
  }
}
