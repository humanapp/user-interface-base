namespace ui {
    /**
     * Visual style and spacing used by modal panel bodies.
     */
    export interface UiModalPanelStyle {
        /**
         * Fill color for the modal panel background.
         */
        backgroundColor?: number

        /**
         * Inset between the modal outline and modal content.
         */
        contentMargin?: number
    }

    /**
     * Visual style and spacing used by titled modal panels.
     */
    export interface UiModalStyle extends UiModalPanelStyle {
        /**
         * Text color for the modal title.
         */
        color?: number

        /**
         * Extra vertical space between the title band and modal content.
         */
        titleGap?: number
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
            backgroundColor: 12,
            color: 1,
            contentMargin: 4,
            titleGap: 0,
        }
    }

    function copyModalStyle(target: UiModalStyle, source?: UiModalStyle): void {
        if (!source) return
        if (source.backgroundColor !== undefined)
            target.backgroundColor = source.backgroundColor
        if (source.color !== undefined) target.color = source.color
        if (source.contentMargin !== undefined)
            target.contentMargin = source.contentMargin
        if (source.titleGap !== undefined) target.titleGap = source.titleGap
    }
}
