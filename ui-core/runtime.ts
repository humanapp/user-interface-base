//% block="micro:bit apps UI" weight=100 color="#AA00AA" icon="\uf26c"
namespace ui {
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

    /**
     * Frame scheduling hook for integrations with an automatic frame pump.
     */
    export interface UiScheduler {
        /**
         * Requests that a frame handler run on a scheduled frame.
         */
        requestFrame(handler: () => void): void
    }

    /**
     * Runtime dependency bundle.
     */
    export interface UiRuntimeServices {
        /**
         * Required display adapter for frame rendering and commit.
         */
        display: UiDisplayAdapter

        /**
         * Bitmap and text resolver. Missing service uses an empty fallback resolver.
         */
        assets?: UiAssetResolver

        /**
         * Frame scheduler. Missing service requires manual `runFrame()` calls.
         */
        scheduler?: UiScheduler

        /**
         * Palette color used when a screen has no background color. Defaults to `0`.
         */
        clearColor?: number
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

    class UiManualScheduler implements UiScheduler {
        public requestFrame(handler: () => void): void {}
    }

    /**
     * Owns screen stack state, queued input, and frame execution.
     */
    export class UiRuntime {
        private display_: UiDisplayAdapter
        private assets_: UiAssetResolver
        private scheduler_: UiScheduler
        private clearColor_: number
        private stack_: UiScreenStack
        private inputQueue_: UiInputEvent[]

        constructor(options: UiRuntimeServices) {
            this.display_ = options.display
            this.assets_ = options.assets || new UiNoopAssetResolver()
            this.scheduler_ = options.scheduler || new UiManualScheduler()
            this.clearColor_ =
                options.clearColor !== undefined ? options.clearColor : 0
            this.inputQueue_ = []
            this.stack_ = new UiScreenStack(this)
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
         * Frame scheduling hook.
         */
        public get scheduler(): UiScheduler {
            return this.scheduler_
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
        }

        /**
         * Removes the active screen and reactivates the screen below it. Returns
         * `undefined` when the stack is empty.
         */
        public pop(): UiScreen | undefined {
            return this.stack_.pop()
        }

        /**
         * Replaces the active screen without reactivating the screen below it.
         * Returns `undefined` when the stack is empty.
         */
        public replace(screen: UiScreen): UiScreen | undefined {
            return this.stack_.replace(screen)
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
         * Delivers queued input, updates, renders, and commits the active screen.
         */
        public runFrame(): void {
            this.stack_.runFrame(
                this.inputQueue_,
                this.display_,
                this.clearColor_,
            )
        }
    }
}
