namespace ui {
    /**
     * Construction options for a scroll viewport layout node.
     */
    export interface UiScrollViewportLayoutOptions {
        /**
         * Sizing request for the scroll viewport.
         */
        layoutSpec: UiLayoutSpec

        /**
         * Optional scrollable child arranged inside the content rectangle.
         */
        child?: UiLayoutNode

        /**
         * Insets between the assigned final rectangle and visible viewport.
         */
        padding?: number | UiLayoutEdgeInsets

        /**
         * Initial horizontal content offset in UI units.
         */
        contentOffsetX?: number

        /**
         * Initial vertical content offset in UI units.
         */
        contentOffsetY?: number

        /**
         * Whether horizontal scrolling is enabled. Defaults to `false`.
         */
        scrollX?: boolean

        /**
         * Whether vertical scrolling is enabled. Defaults to `true`.
         */
        scrollY?: boolean
    }

    /**
     * Arranges one optional child inside a retained scroll viewport.
     */
    export class UiScrollViewportLayout implements UiLayoutNode {
        public readonly layoutSpec: UiLayoutSpec
        public readonly finalRect: Rect
        public layoutDirty: boolean
        private child_: UiLayoutNode | undefined
        private padding_: UiLayoutEdgeInsets
        private contentOffsetX_: number
        private contentOffsetY_: number
        private scrollX_: boolean
        private scrollY_: boolean
        private viewportRect_: Rect
        private contentRect_: Rect
        private visibleContentRect_: Rect
        private constraintsScratch_: UiLayoutConstraints
        private measureScratch_: UiMeasuredSize
        private measuredContentWidth_: number
        private measuredContentHeight_: number

        constructor(options: UiScrollViewportLayoutOptions) {
            this.layoutSpec = options.layoutSpec
            this.finalRect = new Rect()
            this.layoutDirty = true
            this.child_ = options.child
            this.padding_ = { top: 0, right: 0, bottom: 0, left: 0 }
            this.contentOffsetX_ = _uiLayout.sanitizeCoordinate(
                options.contentOffsetX,
            )
            this.contentOffsetY_ = _uiLayout.sanitizeCoordinate(
                options.contentOffsetY,
            )
            this.scrollX_ = options.scrollX || false
            this.scrollY_ =
                options.scrollY === undefined ? true : options.scrollY
            this.viewportRect_ = new Rect()
            this.contentRect_ = new Rect()
            this.visibleContentRect_ = new Rect()
            this.constraintsScratch_ = { maxWidth: 0, maxHeight: 0 }
            this.measureScratch_ = new UiMeasuredSize()
            this.measuredContentWidth_ = 0
            this.measuredContentHeight_ = 0
            _uiLayout.copyEdgeInsets(this.padding_, options.padding)
        }

        /**
         * Current scrollable child, or `undefined` when empty.
         */
        public get child(): UiLayoutNode | undefined {
            return this.child_
        }

        /**
         * Retained horizontal content offset in UI units.
         */
        public get contentOffsetX(): number {
            return this.contentOffsetX_
        }

        /**
         * Retained vertical content offset in UI units.
         */
        public get contentOffsetY(): number {
            return this.contentOffsetY_
        }

        /**
         * Whether horizontal scrolling is enabled.
         */
        public get scrollX(): boolean {
            return this.scrollX_
        }

        /**
         * Whether vertical scrolling is enabled.
         */
        public get scrollY(): boolean {
            return this.scrollY_
        }

        /**
         * Replaces the current scrollable child.
         */
        public setChild(child: UiLayoutNode): void {
            if (this.child_ == child) return
            this.child_ = child
            this.invalidateLayout()
        }

        /**
         * Removes the current scrollable child.
         */
        public clearChild(): void {
            if (!this.child_) return
            this.child_ = undefined
            this.invalidateLayout()
        }

        /**
         * Stores the requested content offset for the next arrangement.
         */
        public setContentOffset(x: number, y: number): void {
            const nextX = _uiLayout.sanitizeCoordinate(x)
            const nextY = _uiLayout.sanitizeCoordinate(y)
            if (this.contentOffsetX_ == nextX && this.contentOffsetY_ == nextY)
                return
            this.contentOffsetX_ = nextX
            this.contentOffsetY_ = nextY
            this.invalidateLayout()
        }

        /**
         * Updates which axes may scroll during arrangement.
         */
        public setScrollAxes(scrollX: boolean, scrollY: boolean): void {
            if (this.scrollX_ == scrollX && this.scrollY_ == scrollY) return
            this.scrollX_ = scrollX
            this.scrollY_ = scrollY
            this.invalidateLayout()
        }

        /**
         * Updates the edge insets around the visible viewport.
         */
        public setPadding(padding: number | UiLayoutEdgeInsets): void {
            const previousTop = this.padding_.top
            const previousRight = this.padding_.right
            const previousBottom = this.padding_.bottom
            const previousLeft = this.padding_.left
            _uiLayout.copyEdgeInsets(this.padding_, padding)
            if (
                this.padding_.top == previousTop &&
                this.padding_.right == previousRight &&
                this.padding_.bottom == previousBottom &&
                this.padding_.left == previousLeft
            ) {
                return
            }
            this.invalidateLayout()
        }

        /**
         * Copies the current padding into `output`.
         */
        public getPadding(output: UiLayoutEdgeInsets): void {
            output.top = this.padding_.top
            output.right = this.padding_.right
            output.bottom = this.padding_.bottom
            output.left = this.padding_.left
        }

        /**
         * Copies the last retained visible viewport rectangle into `output`.
         */
        public getViewportRect(output: Rect): void {
            output.copyFrom(this.viewportRect_)
        }

        /**
         * Copies the last retained arranged content rectangle into `output`.
         */
        public getContentRect(output: Rect): void {
            output.copyFrom(this.contentRect_)
        }

        /**
         * Copies the last retained intersection of viewport and content into `output`.
         */
        public getVisibleContentRect(output: Rect): void {
            output.copyFrom(this.visibleContentRect_)
        }

        /**
         * Computes the content offset needed to bring `target` into view.
         *
         * The target rectangle is expressed in content coordinates before scroll
         * offset is applied. This query writes into `output` and leaves retained
         * scroll state unchanged.
         */
        public getContentOffsetForRect(target: Rect, output: Point): void {
            let nextX = this.contentOffsetX_
            let nextY = this.contentOffsetY_
            const targetX = _uiLayout.sanitizeCoordinate(target.x)
            const targetY = _uiLayout.sanitizeCoordinate(target.y)
            const targetWidth = _uiLayout.sanitizeDimension(target.width)
            const targetHeight = _uiLayout.sanitizeDimension(target.height)

            if (this.scrollX_) {
                nextX = this.scrollAxisIntoView(
                    this.contentOffsetX_,
                    this.viewportRect_.width,
                    this.measuredContentWidth_,
                    targetX,
                    targetWidth,
                )
            }

            if (this.scrollY_) {
                nextY = this.scrollAxisIntoView(
                    this.contentOffsetY_,
                    this.viewportRect_.height,
                    this.measuredContentHeight_,
                    targetY,
                    targetHeight,
                )
            }

            output.set(nextX, nextY)
        }

        /**
         * Updates the stored offset with the smallest movement needed for `target`.
         *
         * The target rectangle is expressed in content coordinates before scroll
         * offset is applied.
         */
        public scrollContentRectIntoView(target: Rect): void {
            const targetX = _uiLayout.sanitizeCoordinate(target.x)
            const targetY = _uiLayout.sanitizeCoordinate(target.y)
            const targetWidth = _uiLayout.sanitizeDimension(target.width)
            const targetHeight = _uiLayout.sanitizeDimension(target.height)

            if (this.scrollX_) {
                this.contentOffsetX_ = this.scrollAxisIntoView(
                    this.contentOffsetX_,
                    this.viewportRect_.width,
                    this.measuredContentWidth_,
                    targetX,
                    targetWidth,
                )
            }

            if (this.scrollY_) {
                this.contentOffsetY_ = this.scrollAxisIntoView(
                    this.contentOffsetY_,
                    this.viewportRect_.height,
                    this.measuredContentHeight_,
                    targetY,
                    targetHeight,
                )
            }

            this.invalidateLayout()
        }

        public measure(
            constraints: UiLayoutConstraints,
            output: UiMeasuredSize,
        ): void {
            const horizontalPadding = this.padding_.left + this.padding_.right
            const verticalPadding = this.padding_.top + this.padding_.bottom
            const viewportWidth = _uiLayout.sanitizeDimension(
                constraints.maxWidth - horizontalPadding,
            )
            const viewportHeight = _uiLayout.sanitizeDimension(
                constraints.maxHeight - verticalPadding,
            )
            let minWidth = horizontalPadding
            let minHeight = verticalPadding
            let preferredWidth = horizontalPadding
            let preferredHeight = verticalPadding

            if (this.child_) {
                this.setChildConstraints(viewportWidth, viewportHeight)
                this.child_.measure(
                    this.constraintsScratch_,
                    this.measureScratch_,
                )
                minWidth += this.measureScratch_.minWidth
                minHeight += this.measureScratch_.minHeight
                preferredWidth += this.measureScratch_.preferredWidth
                preferredHeight += this.measureScratch_.preferredHeight
            }

            measureLayoutSpec(
                this.layoutSpec,
                constraints,
                minWidth,
                minHeight,
                preferredWidth,
                preferredHeight,
                output,
            )
            this.clearLayoutInvalidation()
        }

        public arrange(rect: Rect): void {
            copyArrangedLayoutRect(this.finalRect, rect)
            this.updateViewportRect()
            this.measureContentForViewport()
            this.contentOffsetX_ = this.clampAxisOffset(
                this.scrollX_,
                this.contentOffsetX_,
                this.measuredContentWidth_,
                this.viewportRect_.width,
            )
            this.contentOffsetY_ = this.clampAxisOffset(
                this.scrollY_,
                this.contentOffsetY_,
                this.measuredContentHeight_,
                this.viewportRect_.height,
            )
            this.contentRect_.set(
                this.viewportRect_.x - this.contentOffsetX_,
                this.viewportRect_.y - this.contentOffsetY_,
                this.measuredContentWidth_,
                this.measuredContentHeight_,
            )

            if (this.child_) {
                this.child_.arrange(this.contentRect_)
            }

            this.updateVisibleContentRect()
            this.clearLayoutInvalidation()

        }

        public invalidateLayout(): void {
            this.layoutDirty = true
        }

        public clearLayoutInvalidation(): void {
            this.layoutDirty = false
        }

        private setChildConstraints(
            viewportWidth: number,
            viewportHeight: number,
        ): void {
            this.constraintsScratch_.maxWidth = this.scrollX_
                ? SCROLL_VIEWPORT_MAX_CONTENT_EXTENT
                : viewportWidth
            this.constraintsScratch_.maxHeight = this.scrollY_
                ? SCROLL_VIEWPORT_MAX_CONTENT_EXTENT
                : viewportHeight
        }

        private updateViewportRect(): void {
            this.viewportRect_.set(
                this.finalRect.x + this.padding_.left,
                this.finalRect.y + this.padding_.top,
                _uiLayout.sanitizeDimension(
                    this.finalRect.width -
                        this.padding_.left -
                        this.padding_.right,
                ),
                _uiLayout.sanitizeDimension(
                    this.finalRect.height -
                        this.padding_.top -
                        this.padding_.bottom,
                ),
            )
        }

        private measureContentForViewport(): void {
            this.measuredContentWidth_ = 0
            this.measuredContentHeight_ = 0

            if (this.child_) {
                this.setChildConstraints(
                    this.viewportRect_.width,
                    this.viewportRect_.height,
                )
                this.child_.measure(
                    this.constraintsScratch_,
                    this.measureScratch_,
                )
                this.measuredContentWidth_ = _uiLayout.sanitizeDimension(
                    this.measureScratch_.preferredWidth,
                )
                this.measuredContentHeight_ = _uiLayout.sanitizeDimension(
                    this.measureScratch_.preferredHeight,
                )
            }
        }

        private updateVisibleContentRect(): void {
            const x = Math.max(this.viewportRect_.x, this.contentRect_.x)
            const y = Math.max(this.viewportRect_.y, this.contentRect_.y)
            const right = Math.min(
                this.viewportRect_.right,
                this.contentRect_.right,
            )
            const bottom = Math.min(
                this.viewportRect_.bottom,
                this.contentRect_.bottom,
            )
            this.visibleContentRect_.set(
                x,
                y,
                _uiLayout.sanitizeDimension(right - x),
                _uiLayout.sanitizeDimension(bottom - y),
            )
        }

        private scrollAxisIntoView(
            offset: number,
            viewportSize: number,
            contentSize: number,
            targetStart: number,
            targetSize: number,
        ): number {
            let nextOffset = offset
            const targetEnd = targetStart + targetSize

            if (targetSize > viewportSize) {
                nextOffset = targetStart
            } else if (targetStart < offset) {
                nextOffset = targetStart
            } else if (targetEnd > offset + viewportSize) {
                nextOffset = targetEnd - viewportSize
            }

            return this.clampAxisOffset(
                true,
                nextOffset,
                contentSize,
                viewportSize,
            )
        }

        private clampAxisOffset(
            scrollEnabled: boolean,
            offset: number,
            contentSize: number,
            viewportSize: number,
        ): number {
            if (!scrollEnabled) return 0
            const maxOffset = _uiLayout.sanitizeDimension(
                contentSize - viewportSize,
            )
            return Math.min(
                Math.max(_uiLayout.sanitizeCoordinate(offset), 0),
                maxOffset,
            )
        }

    }

    const SCROLL_VIEWPORT_MAX_CONTENT_EXTENT = 32767
}
