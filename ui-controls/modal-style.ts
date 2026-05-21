namespace ui {
    /**
     * Visual style and spacing used by modal panels.
     */
    export interface UiModalStyle {
        /**
         * Fill color for the modal panel.
         */
        panelColor?: number

        /**
         * Text color for the modal title.
         */
        titleColor?: number

        /**
         * Inset between the modal outline and modal content.
         */
        contentMargin?: number

        /**
         * Extra vertical space between the title band and modal content.
         */
        titleGap?: number

        /**
         * Whether an empty modal reserves title-band space.
         */
        showTitleBar?: boolean
    }

    /**
     * Creates a modal style by copying defined fields from each style in order.
     */
    export function modalStyle(
        style0?: UiModalStyle,
        style1?: UiModalStyle,
        style2?: UiModalStyle,
        style3?: UiModalStyle,
        style4?: UiModalStyle,
    ): UiModalStyle {
        const result: UiModalStyle = {}
        copyModalStyle(result, style0)
        copyModalStyle(result, style1)
        copyModalStyle(result, style2)
        copyModalStyle(result, style3)
        copyModalStyle(result, style4)
        return result
    }

    export namespace UiModalStyles {
        /**
         * Default rounded modal panel style.
         */
        export const Default: UiModalStyle = {
            panelColor: 1,
            titleColor: 15,
            contentMargin: 4,
            titleGap: 0,
            showTitleBar: true,
        }

        /**
         * Omits title-band space when no title is present.
         */
        export const Titleless: UiModalStyle = {
            showTitleBar: false,
        }
    }

    function copyModalStyle(target: UiModalStyle, source?: UiModalStyle): void {
        if (!source) return
        if (source.panelColor !== undefined)
            target.panelColor = source.panelColor
        if (source.titleColor !== undefined)
            target.titleColor = source.titleColor
        if (source.contentMargin !== undefined)
            target.contentMargin = source.contentMargin
        if (source.titleGap !== undefined) target.titleGap = source.titleGap
        if (source.showTitleBar !== undefined)
            target.showTitleBar = source.showTitleBar
    }
}
