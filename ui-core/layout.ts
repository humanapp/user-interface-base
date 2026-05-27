namespace ui {
    /**
     * Layout sizing mode for one axis.
     */
    export type UiLayoutSizeMode = "content" | "fixed" | "fill"

    /**
     * Child placement behavior used by layout containers.
     */
    export type UiLayoutAlignment = "start" | "center" | "end" | "stretch"

    /**
     * Size request for one layout axis in pixels.
     */
    export interface UiLayoutAxisSpec {
        /**
         * Sizing behavior for this axis.
         */
        mode: UiLayoutSizeMode

        /**
         * Requested size for `fixed` axes. Omitted and invalid values are `0`.
         */
        value?: number

        /**
         * Smallest accepted size for this axis. Omitted values are `0`.
         */
        min?: number

        /**
         * Largest accepted size for this axis. Omitted values have no axis-local
         * maximum.
         */
        max?: number
    }

    /**
     * Width and height sizing requests for a layout node.
     */
    export interface UiLayoutSpec {
        /**
         * Width sizing request in pixels.
         */
        width: UiLayoutAxisSpec

        /**
         * Height sizing request in pixels.
         */
        height: UiLayoutAxisSpec
    }

    /**
     * Parent-supplied measurement limits in pixels.
     */
    export interface UiLayoutConstraints {
        /**
         * Largest width the parent can offer.
         */
        maxWidth: number

        /**
         * Largest height the parent can offer.
         */
        maxHeight: number
    }

    /**
     * Insets in pixels.
     */
    export interface UiLayoutEdgeInsets {
        /**
         * Inset from the top edge.
         */
        top: number

        /**
         * Inset from the right edge.
         */
        right: number

        /**
         * Inset from the bottom edge.
         */
        bottom: number

        /**
         * Inset from the left edge.
         */
        left: number
    }

    /**
     * Construction options for a retained layout pass owner.
     */
    export interface UiLayoutOwnerOptions {
        /**
         * Root node measured and arranged by `runLayout()`.
         */
        root: UiLayoutNode

        /**
         * Measurement limits used for root layout passes.
         */
        constraints: UiLayoutConstraints

        /**
         * Final rectangle assigned to the root during layout passes.
         */
        rect: Rect
    }

    /**
     * Reusable output object for node measurement.
     */
    export class UiMeasuredSize {
        /**
         * Smallest measured width in pixels.
         */
        public minWidth: number

        /**
         * Smallest measured height in pixels.
         */
        public minHeight: number

        /**
         * Preferred measured width in pixels.
         */
        public preferredWidth: number

        /**
         * Preferred measured height in pixels.
         */
        public preferredHeight: number

        constructor(
            minWidth = 0,
            minHeight = 0,
            preferredWidth = 0,
            preferredHeight = 0,
        ) {
            this.minWidth = 0
            this.minHeight = 0
            this.preferredWidth = 0
            this.preferredHeight = 0
            this.set(minWidth, minHeight, preferredWidth, preferredHeight)
        }

        /**
         * Updates all measured values and returns this object for reuse.
         */
        public set(
            minWidth: number,
            minHeight: number,
            preferredWidth: number,
            preferredHeight: number,
        ): UiMeasuredSize {
            this.minWidth = _uiLayout.sanitizeDimension(minWidth)
            this.minHeight = _uiLayout.sanitizeDimension(minHeight)
            this.preferredWidth = Math.max(
                this.minWidth,
                _uiLayout.sanitizeDimension(preferredWidth),
            )
            this.preferredHeight = Math.max(
                this.minHeight,
                _uiLayout.sanitizeDimension(preferredHeight),
            )
            return this
        }
    }

    /**
     * Measured layout node with a retained final rectangle.
     */
    export interface UiLayoutNode {
        /**
         * Sizing requests used when measuring this node.
         */
        readonly layoutSpec: UiLayoutSpec

        /**
         * Last arranged rectangle in pixel coordinates.
         */
        readonly finalRect: Rect

        /**
         * Whether this node needs measurement or arrangement work.
         */
        readonly layoutDirty: boolean

        /**
         * Measures this node under parent constraints and writes into `output`.
         */
        measure(constraints: UiLayoutConstraints, output: UiMeasuredSize): void

        /**
         * Accepts the parent-assigned rectangle for this layout pass.
         *
         * Implementations copy the rectangle into `finalRect` and arrange any
         * children inside that concrete space.
         */
        arrange(rect: Rect): void

        /**
         * Marks this node as needing layout work.
         */
        invalidateLayout(): void

        /**
         * Clears this node's local invalidation flag.
         */
        clearLayoutInvalidation(): void
    }

    /**
     * Applies the standard sizing contract for a node implementation.
     */
    export function measureLayoutSpec(
        spec: UiLayoutSpec,
        constraints: UiLayoutConstraints,
        contentMinWidth: number,
        contentMinHeight: number,
        contentPreferredWidth: number,
        contentPreferredHeight: number,
        output: UiMeasuredSize,
    ): void {
        let widthSpec = layoutContentAxisSpec
        let heightSpec = layoutContentAxisSpec

        if (spec) {
            const specWidth = spec.width
            const specHeight = spec.height

            if (specWidth) widthSpec = specWidth
            if (specHeight) heightSpec = specHeight
        }

        measureLayoutAxis(
            widthSpec,
            contentMinWidth,
            contentPreferredWidth,
            constraints.maxWidth,
            layoutWidthScratch,
        )
        measureLayoutAxis(
            heightSpec,
            contentMinHeight,
            contentPreferredHeight,
            constraints.maxHeight,
            layoutHeightScratch,
        )
        output.set(
            layoutWidthScratch.min,
            layoutHeightScratch.min,
            layoutWidthScratch.preferred,
            layoutHeightScratch.preferred,
        )
    }

    /**
     * Copies an arranged rectangle into retained node storage.
     */
    export function copyArrangedLayoutRect(target: Rect, rect: Rect): Rect {
        return target.set(
            _uiLayout.sanitizeCoordinate(rect.x),
            _uiLayout.sanitizeCoordinate(rect.y),
            _uiLayout.sanitizeDimension(rect.width),
            _uiLayout.sanitizeDimension(rect.height),
        )
    }

    /**
     * Retains the root, bounds, and dirty state for explicit layout passes.
     */
    export class UiLayoutOwner {
        private root_: UiLayoutNode
        private constraints_: UiLayoutConstraints
        private rect_: Rect
        private measured_: UiMeasuredSize
        private layoutDirty_: boolean

        constructor(options: UiLayoutOwnerOptions) {
            this.root_ = options.root
            this.constraints_ = { maxWidth: 0, maxHeight: 0 }
            this.rect_ = new Rect()
            this.measured_ = new UiMeasuredSize()
            this.layoutDirty_ = true
            this.copyConstraints(options.constraints)
            copyArrangedLayoutRect(this.rect_, options.rect)
        }

        /**
         * Root node used by `runLayout()`.
         */
        public get root(): UiLayoutNode {
            return this.root_
        }

        /**
         * Whether another root layout pass is needed.
         */
        public get layoutDirty(): boolean {
            return this.layoutDirty_
        }

        /**
         * Replaces the root node and marks the owner dirty.
         */
        public setRoot(root: UiLayoutNode): void {
            this.root_ = root
            this.invalidateLayout()
        }

        /**
         * Copies new root measurement constraints and marks the owner dirty.
         */
        public setConstraints(constraints: UiLayoutConstraints): void {
            this.copyConstraints(constraints)
            this.invalidateLayout()
        }

        /**
         * Copies a new root arrangement rectangle and marks the owner dirty.
         */
        public setRect(rect: Rect): void {
            copyArrangedLayoutRect(this.rect_, rect)
            this.invalidateLayout()
        }

        /**
         * Marks the owner as needing a root layout pass.
         */
        public invalidateLayout(): void {
            this.layoutDirty_ = true
        }

        /**
         * Measures and arranges the root when the owner or root is dirty.
         */
        public runLayout(): void {
            if (!this.layoutDirty_ && !this.root_.layoutDirty) return
            this.root_.measure(this.constraints_, this.measured_)
            this.root_.arrange(this.rect_)
            this.layoutDirty_ = false
        }

        private copyConstraints(constraints: UiLayoutConstraints): void {
            this.constraints_.maxWidth = _uiLayout.sanitizeDimension(
                constraints.maxWidth,
            )
            this.constraints_.maxHeight = _uiLayout.sanitizeDimension(
                constraints.maxHeight,
            )
        }
    }

    class UiMeasuredAxis {
        public min: number
        public preferred: number

        constructor() {
            this.min = 0
            this.preferred = 0
        }
    }

    const layoutWidthScratch = new UiMeasuredAxis()
    const layoutHeightScratch = new UiMeasuredAxis()
    const layoutContentAxisSpec: UiLayoutAxisSpec = { mode: "content" }

    function measureLayoutAxis(
        spec: UiLayoutAxisSpec,
        contentMin: number,
        contentPreferred: number,
        parentMax: number,
        output: UiMeasuredAxis,
    ): void {
        const parentLimit = _uiLayout.sanitizeDimension(parentMax)
        const axisMin = _uiLayout.sanitizeDimension(spec.min)
        let axisMax = parentLimit

        if (spec.max !== undefined) {
            axisMax = _uiLayout.sanitizeDimension(spec.max)
            if (axisMax < axisMin) axisMax = axisMin
            axisMax = Math.min(axisMax, parentLimit)
        }

        let measuredMin = _uiLayout.sanitizeDimension(contentMin)
        let measuredPreferred = Math.max(
            measuredMin,
            _uiLayout.sanitizeDimension(contentPreferred),
        )

        if (spec.mode == "fixed") {
            measuredPreferred = _uiLayout.sanitizeDimension(spec.value)
            measuredMin = measuredPreferred
        }

        measuredMin = clampLayoutSize(measuredMin, axisMin, axisMax)
        measuredPreferred = clampLayoutSize(measuredPreferred, axisMin, axisMax)
        if (measuredPreferred < measuredMin) measuredPreferred = measuredMin

        output.min = Math.min(measuredMin, parentLimit)
        output.preferred = Math.min(measuredPreferred, parentLimit)
        if (output.preferred < output.min) {
            output.preferred = output.min
        }
    }

    function clampLayoutSize(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max)
    }
}

namespace _uiLayout {
    export function sanitizeCoordinate(value: number | undefined): number {
        if (value === undefined || value != value) return 0
        return Math.round(value)
    }

    export function sanitizeDimension(value: number | undefined): number {
        value = sanitizeCoordinate(value)
        return value < 0 ? 0 : value
    }

    export function alignedSize(
        containerSize: number,
        preferredSize: number,
        alignment: ui.UiLayoutAlignment,
    ): number {
        if (alignment == "stretch") return containerSize
        return preferredSize
    }

    export function alignedOffset(
        containerStart: number,
        containerSize: number,
        childSize: number,
        alignment: ui.UiLayoutAlignment,
    ): number {
        if (alignment == "center")
            return containerStart + Math.round((containerSize - childSize) / 2)
        if (alignment == "end")
            return containerStart + containerSize - childSize
        return containerStart
    }

    export function rectCenterX(rect: ui.Rect): number {
        return rect.x + Math.idiv(rect.width, 2)
    }
}
