namespace ui {
    /**
     * Adapter for display-shield's physical bitmap update path.
     */
    export class DisplayShieldFrameAdapter implements UiDisplayAdapter {
        private surface_: PhysicalBitmapDrawSurface

        constructor() {
            this.surface_ = new PhysicalBitmapDrawSurface(screen())
        }

        /**
         * Draw surface backed by the current physical screen bitmap.
         */
        public get surface(): PhysicalBitmapDrawSurface {
            return this.surface_
        }

        /**
         * Sends the current physical bitmap to display-shield and returns it.
         */
        public commit(): Bitmap {
            const frame = this.surface_.bitmap
            control.__screen.stop()
            control.__screen.update()
            return frame
        }
    }
}
