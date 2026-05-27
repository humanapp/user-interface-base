namespace ui {
    const UI_CONTROLLER_REPEAT_DELAY_MS = 250
    const UI_CONTROLLER_REPEAT_INTERVAL_MS = 30
    const UI_RUNTIME_FRAME_PRIORITY = 30

    /**
     * Display target that exposes a draw surface and presents frames.
     */
    export interface UiDisplayAdapter {
        /**
         * Physical display surface for the next committed frame.
         */
        surface: DrawSurface

        /**
         * Presents the current frame and returns the physical bitmap that was sent.
         */
        commit(): Bitmap
    }

    /**
     * Resolves optional bitmap and text assets by id.
     */
    export interface UiAssetResolver {
        /**
         * Looks up a bitmap by asset id.
         *
         * Missing ids return a resolver-owned fallback bitmap by default. When
         * `nullIfMissing` is `true`, missing ids may return `undefined`; callers
         * must handle both bitmap and `undefined` results.
         */
        getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined

        /**
         * Returns display text for an asset id. Missing text returns the empty
         * string.
         */
        getText(id: string): string
    }

    class UiNoopAssetResolver implements UiAssetResolver {
        private emptyBitmap_: Bitmap

        constructor() {
            this.emptyBitmap_ = bmp`.`
        }

        public getBitmap(
            id: string | number,
            nullIfMissing?: boolean,
        ): Bitmap | undefined {
            if (nullIfMissing) return undefined
            return this.emptyBitmap_
        }

        public getText(id: string): string {
            return ""
        }
    }

    /**
     * Owns screen stack state, queued input, and frame execution.
     */
    export class UiRuntime {
        private display_: UiDisplayAdapter
        private assets_: UiAssetResolver
        private clearColor_: number
        private stack_: UiScreenStack
        private inputQueue_: UiInputEvent[]
        private running_: boolean
        private frameContext_: context.EventContext
        private frameCallback_: context.FrameCallback

        constructor(
            display: UiDisplayAdapter,
            assets?: UiAssetResolver,
            clearColor?: number,
        ) {
            this.display_ = display
            this.assets_ = assets || new UiNoopAssetResolver()
            this.clearColor_ = clearColor !== undefined ? clearColor : 0
            this.inputQueue_ = []
            this.stack_ = new UiScreenStack(this)
            this.running_ = false
            controller.setRepeatDefault(
                UI_CONTROLLER_REPEAT_DELAY_MS,
                UI_CONTROLLER_REPEAT_INTERVAL_MS,
            )
        }

        /**
         * Display target used for rendering and frame commit.
         */
        public get display(): UiDisplayAdapter {
            return this.display_
        }

        /**
         * Asset resolver for screens and controls.
         */
        public get assets(): UiAssetResolver {
            return this.assets_
        }

        /**
         * Stack that controls active screen lifecycle.
         */
        public get screenStack(): UiScreenStack {
            return this.stack_
        }

        /**
         * Pushes a screen and makes it active.
         */
        public push(screen: UiScreen): void {
            this.stack_.push(screen)
            this.bindFrameHandler()
        }

        /**
         * Removes the active screen and reactivates the screen below it. Returns
         * `undefined` when the stack is empty.
         */
        public pop(): UiScreen | undefined {
            const screen = this.stack_.pop()
            this.bindFrameHandler()
            return screen
        }

        /**
         * Replaces the active screen without reactivating the screen below it.
         * Returns `undefined` when the stack is empty.
         */
        public replace(screen: UiScreen): UiScreen | undefined {
            const replaced = this.stack_.replace(screen)
            this.bindFrameHandler()
            return replaced
        }

        /**
         * Returns the active screen, or `undefined` when the stack is empty.
         */
        public top(): UiScreen | undefined {
            return this.stack_.top()
        }

        /**
         * Returns the number of screens in the stack.
         */
        public depth(): number {
            return this.stack_.depth()
        }

        /**
         * Queues an input event for the next frame.
         */
        public dispatchInput(event: UiInputEvent): void {
            this.inputQueue_.push(event)
        }

        /**
         * Drops all queued input events.
         */
        public clearInputQueue(): void {
            while (this.inputQueue_.length) this.inputQueue_.pop()
        }

        /**
         * Runs the UI from the current event context's frame callback.
         */
        public start(): void {
            this.running_ = true
            this.bindFrameHandler()
        }

        /**
         * Stops the runtime-owned frame callback.
         */
        public stop(): void {
            this.running_ = false
            this.unbindFrameHandler()
        }

        /**
         * Updates controller repeat, delivers queued input, updates, renders, and
         * commits the active screen.
         */
        public runFrame(): void {
            this.updateControllerButtons()
            this.stack_.runFrame(
                this.inputQueue_,
                this.display_,
                this.clearColor_,
            )
        }

        private updateControllerButtons(): void {
            const dtms = (context.eventContext().deltaTime * 1000) | 0
            controller.left.__update(dtms)
            controller.right.__update(dtms)
            controller.up.__update(dtms)
            controller.down.__update(dtms)
        }

        private bindFrameHandler(): void {
            if (!this.running_) return
            const eventContext = context.eventContext()
            if (!eventContext || !this.top()) {
                this.unbindFrameHandler()
                return
            }

            if (
                this.frameContext_ == eventContext &&
                this.frameCallback_ !== undefined
            )
                return

            this.unbindFrameHandler()
            this.frameContext_ = eventContext
            this.frameCallback_ = eventContext.registerFrameHandler(
                UI_RUNTIME_FRAME_PRIORITY,
                () => this.runFrame(),
            )
        }

        private unbindFrameHandler(): void {
            if (this.frameContext_ && this.frameCallback_) {
                this.frameContext_.unregisterFrameHandler(this.frameCallback_)
            }
            this.frameContext_ = undefined
            this.frameCallback_ = undefined
        }
    }
}
