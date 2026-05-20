namespace ui {
    /**
     * Strategy used to choose vertical focus destinations.
     *
     * - `"column"` first tries the current column, then falls back to the
     *   nearest target in the destination row.
     * - `"nearest"` chooses the nearest target in the destination row.
     * - `"exact"` only accepts a target in the current column.
     */
    export type UiFocusVerticalStrategy = "column" | "nearest" | "exact"

    /**
     * Focus target entry used by directional navigation.
     */
    export interface UiFocusNavigationTarget {
        /**
         * Stable focus target id.
         */
        id: UiFocusId

        /**
         * Final target rectangle in UI coordinates.
         */
        rect: Rect

        /**
         * Whether movement skips this target as a destination.
         */
        hidden?: boolean

        /**
         * Scrollable area to request when movement lands on this target.
         */
        scrollOwnerId?: UiFocusScrollOwnerId

        /**
         * Optional rectangle used for scroll requests.
         *
         * When present, the rectangle is in the scroll owner's content coordinates.
         * The `rect` field remains the viewport-space rectangle used for navigation
         * geometry.
         */
        scrollRect?: Rect
    }

    /**
     * Ragged row record for directional focus movement.
     */
    export interface UiFocusRaggedGridMoveInput {
        /**
         * Scope that owns the focus targets.
         */
        scopeId: UiFocusScopeId

        /**
         * Active target id before movement.
         */
        currentTargetId?: UiFocusId

        /**
         * Requested movement direction.
         */
        direction: UiFocusDirection

        /**
         * Whether left/right movement may wrap within the current row.
         */
        horizontalWrap?: boolean

        /**
         * Rows in movement order.
         */
        rows: UiFocusNavigationTarget[][]

        /**
         * Strategy used when moving up or down.
         */
        verticalStrategy?: UiFocusVerticalStrategy
    }

    interface UiFocusGridCell {
        row: number
        column: number
        target: UiFocusNavigationTarget
    }

    /**
     * Returns the focus movement result for a ragged grid.
     *
     * Horizontal movement follows the current row. Vertical movement scans rows
     * in the requested direction using `verticalStrategy`. Callers apply moved
     * results to focus state.
     */
    export function moveFocusInRaggedGrid(
        input: UiFocusRaggedGridMoveInput,
    ): UiFocusMoveResult {
        const current = currentGridCell(input.rows, input.currentTargetId)
        if (!current)
            return {
                kind: "stayed",
                scopeId: input.scopeId,
                targetId: input.currentTargetId,
                reason: "missingActive",
            }
        const horizontal =
            input.direction == "left" || input.direction == "right"
        const destination = horizontal
            ? horizontalDestination(input, current)
            : verticalDestination(input, current)
        if (destination)
            return movedResult(
                input.scopeId,
                current.target,
                destination.target,
            )
        if (horizontal && input.horizontalWrap)
            return {
                kind: "stayed",
                scopeId: input.scopeId,
                targetId: input.currentTargetId,
                reason: "boundary",
            }
        return {
            kind: "exited",
            scopeId: input.scopeId,
            targetId: input.currentTargetId,
            direction: input.direction,
        }
    }

    function currentGridCell(
        rows: UiFocusNavigationTarget[][],
        targetId: UiFocusId,
    ): UiFocusGridCell {
        for (let row = 0; row < rows.length; row++) {
            const targets = rows[row]
            for (let column = 0; column < targets.length; column++) {
                const target = targets[column]
                if (target.id == targetId && !target.hidden)
                    return { row, column, target }
            }
        }
        return undefined
    }

    function horizontalDestination(
        input: UiFocusRaggedGridMoveInput,
        current: UiFocusGridCell,
    ): UiFocusGridCell {
        const row = input.rows[current.row]
        const step = input.direction == "left" ? -1 : 1
        let column = current.column + step
        while (column >= 0 && column < row.length) {
            if (!row[column].hidden)
                return { row: current.row, column, target: row[column] }
            column += step
        }
        if (!input.horizontalWrap) return undefined
        column = step < 0 ? row.length - 1 : 0
        while (column != current.column) {
            if (!row[column].hidden)
                return { row: current.row, column, target: row[column] }
            column += step
        }
        return undefined
    }

    function verticalDestination(
        input: UiFocusRaggedGridMoveInput,
        current: UiFocusGridCell,
    ): UiFocusGridCell {
        const step = input.direction == "up" ? -1 : 1
        let rowIndex = current.row + step
        const end = step < 0 ? -1 : input.rows.length
        while (rowIndex != end) {
            const found = verticalDestinationInRow(input, current, rowIndex)
            if (found) return found
            rowIndex += step
        }
        return undefined
    }

    function verticalDestinationInRow(
        input: UiFocusRaggedGridMoveInput,
        current: UiFocusGridCell,
        rowIndex: number,
    ): UiFocusGridCell {
        const row = input.rows[rowIndex]
        if (!row) return undefined
        const exact = row[current.column]
        if (exact && !exact.hidden)
            return { row: rowIndex, column: current.column, target: exact }
        if (input.verticalStrategy == "exact") return undefined

        let best: UiFocusGridCell = undefined
        let bestDistance = 0
        const sourceX =
            current.target.rect.x + Math.idiv(current.target.rect.width, 2)
        for (let column = 0; column < row.length; column++) {
            const target = row[column]
            if (target.hidden) continue
            const dx = Math.abs(
                target.rect.x + Math.idiv(target.rect.width, 2) - sourceX,
            )
            if (!best || dx < bestDistance) {
                best = { row: rowIndex, column, target }
                bestDistance = dx
            }
        }
        return best
    }

    function movedResult(
        scopeId: UiFocusScopeId,
        fromTarget: UiFocusNavigationTarget,
        toTarget: UiFocusNavigationTarget,
    ): UiFocusMoveResult {
        const result: UiFocusMoveResult = {
            kind: "moved",
            fromScopeId: scopeId,
            fromTargetId: fromTarget.id,
            toScopeId: scopeId,
            toTargetId: toTarget.id,
        }
        if (toTarget.scrollOwnerId !== undefined)
            result.scrollRequest = {
                scopeId,
                targetId: toTarget.id,
                scrollOwnerId: toTarget.scrollOwnerId,
                targetRect: (toTarget.scrollRect || toTarget.rect).clone(),
                reason: "focus",
            }
        return result
    }
}
