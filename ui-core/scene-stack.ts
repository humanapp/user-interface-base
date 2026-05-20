namespace ui {
    interface UiSceneInput {
        runtime: UiRuntime
        disposed: boolean
    }

    interface UiSceneRecord {
        screen: UiScreen
        input: UiSceneInput
    }

    function createSceneInput(runtime: UiRuntime): UiSceneInput {
        return {
            runtime,
            disposed: false,
        }
    }

    function disposeSceneInput(input: UiSceneInput): void {
        input.disposed = true
    }

    function dispatchSceneInput(
        input: UiSceneInput,
        action: UiInputAction,
        source?: UiInputSource,
        phase?: UiInputPhase,
    ): void {
        if (input.disposed) return
        input.runtime.dispatchInput({ action, source, phase })
    }

    /**
     * Stack that owns screen lifecycle and input routing.
     */
    export class UiSceneStack {
        private runtime_: UiRuntime
        private scenes_: UiSceneRecord[]

        constructor(runtime: UiRuntime) {
            this.runtime_ = runtime
            this.scenes_ = []
        }

        /**
         * Pushes a screen and makes it active.
         */
        public push(screen: UiScreen): void {
            this.runtime_.clearInputQueue()

            const current = this.topRecord()
            if (current) current.screen.deactivate()

            context.pushEventContext()
            const input = createSceneInput(this.runtime_)
            this.bindDefaultControllerActions(input)

            const record: UiSceneRecord = { screen, input }
            this.scenes_.push(record)

            screen.enter(this.runtime_)
            screen.activate()
        }

        /**
         * Removes the active screen and reactivates the screen below it. Returns
         * `undefined` when the stack is empty.
         */
        public pop(): UiScreen | undefined {
            this.runtime_.clearInputQueue()

            const record = this.scenes_.pop()
            if (!record) return undefined

            record.screen.deactivate()
            record.screen.exit()
            disposeSceneInput(record.input)
            context.popEventContext()

            const current = this.topRecord()
            if (current) current.screen.activate()

            return record.screen
        }

        /**
         * Replaces the active screen without reactivating the screen below it.
         * Returns `undefined` when the stack is empty.
         */
        public replace(screen: UiScreen): UiScreen | undefined {
            this.runtime_.clearInputQueue()

            const replaced = this.scenes_.pop()
            if (replaced) {
                replaced.screen.deactivate()
                replaced.screen.exit()
                disposeSceneInput(replaced.input)
                context.popEventContext()
            }

            context.pushEventContext()
            const input = createSceneInput(this.runtime_)
            this.bindDefaultControllerActions(input)

            const record: UiSceneRecord = { screen, input }
            this.scenes_.push(record)

            screen.enter(this.runtime_)
            screen.activate()

            return replaced ? replaced.screen : undefined
        }

        /**
         * Returns the active screen, or `undefined` when the stack is empty.
         */
        public top(): UiScreen | undefined {
            const record = this.topRecord()
            return record ? record.screen : undefined
        }

        /**
         * Returns the number of screens in the stack.
         */
        public depth(): number {
            return this.scenes_.length
        }

        /**
         * Delivers queued input, updates, renders, and commits the active screen.
         */
        public runFrame(
            queue: UiInputEvent[],
            display: UiDisplayAdapter,
            clearColor: number,
        ): void {
            if (!this.topRecord()) {
                this.clearInputQueue(queue)
                return
            }

            this.deliverQueuedInput(queue)

            const active = this.topRecord()
            if (!active) {
                this.clearInputQueue(queue)
                return
            }

            active.screen.update()

            const color =
                active.screen.backgroundColor !== undefined
                    ? active.screen.backgroundColor
                    : clearColor
            display.surface.clear(color)
            active.screen.render(display.surface)
            display.commit()
        }

        private deliverQueuedInput(queue: UiInputEvent[]): void {
            const record = this.topRecord()
            if (!record) {
                this.clearInputQueue(queue)
                return
            }

            let index = 0
            while (index < queue.length && this.topRecord() == record) {
                const event = queue[index++]
                record.screen.handleInput(event)
            }

            this.clearInputQueue(queue)
        }

        private topRecord(): UiSceneRecord | undefined {
            if (!this.scenes_.length) return undefined
            return this.scenes_[this.scenes_.length - 1]
        }

        private clearInputQueue(queue: UiInputEvent[]): void {
            while (queue.length) queue.pop()
        }

        private bindDefaultControllerActions(input: UiSceneInput): void {
            this.bindDefaultControllerAction(input, controller.up.id, "up")
            this.bindDefaultControllerAction(input, controller.down.id, "down")
            this.bindDefaultControllerAction(input, controller.left.id, "left")
            this.bindDefaultControllerAction(
                input,
                controller.right.id,
                "right",
            )
            this.bindDefaultControllerAction(input, controller.A.id, "activate")
            this.bindDefaultControllerAction(input, controller.B.id, "cancel")
            this.bindDefaultControllerAction(input, controller.menu.id, "menu")
        }

        private bindDefaultControllerAction(
            input: UiSceneInput,
            buttonId: number,
            action: UiInputAction,
        ): void {
            context.onEvent(ControllerButtonEvent.Pressed, buttonId, () => {
                dispatchSceneInput(
                    input,
                    action,
                    "displayShieldController",
                    "pressed",
                )
            })
            context.onEvent(ControllerButtonEvent.Released, buttonId, () => {
                dispatchSceneInput(
                    input,
                    action,
                    "displayShieldController",
                    "released",
                )
            })
            context.onEvent(ControllerButtonEvent.Repeated, buttonId, () => {
                dispatchSceneInput(
                    input,
                    action,
                    "displayShieldController",
                    "repeated",
                )
            })
        }
    }
}
