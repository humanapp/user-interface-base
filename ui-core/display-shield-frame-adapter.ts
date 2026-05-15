namespace ui {
  /**
   * Adapter for display-shield's physical bitmap update path.
   */
  export class DisplayShieldFrameAdapter implements UiDisplayAdapter {
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
     * Sends the current physical bitmap to display-shield and returns it.
     */
    public commit(): Bitmap {
      const frame = this.surface_.bitmap
      shieldhelpers.updateScreen(frame)
      return frame
    }
  }
}
