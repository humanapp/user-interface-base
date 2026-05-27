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
         * Final target rectangle in pixel coordinates.
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
         * Preferred column used before nearest-target fallback on vertical moves.
         */
        columnIntent?: number

        /**
         * Rows in movement order.
         */
        rows: UiFocusNavigationTarget[][]

        /**
         * Strategy used when moving up or down.
         */
        verticalStrategy?: UiFocusVerticalStrategy
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
        let currentRow = -1
        let currentColumn = -1
        for (let row = 0; row < input.rows.length && currentRow < 0; row++) {
            const targets = input.rows[row]
            for (let column = 0; column < targets.length; column++) {
                const target = targets[column]
                if (target.id == input.currentTargetId && !target.hidden) {
                    currentRow = row
                    currentColumn = column
                    break
                }
            }
        }
        if (currentRow < 0 || currentColumn < 0)
            return {
                kind: "stayed",
                scopeId: input.scopeId,
                targetId: input.currentTargetId,
                reason: "missingActive",
            }
        const horizontal =
            input.direction == "left" || input.direction == "right"
        let destinationRow = -1
        let destinationColumn = -1
        if (horizontal) {
            destinationRow = currentRow
            destinationColumn = horizontalDestinationColumn(
                input,
                currentRow,
                currentColumn,
            )
        } else {
            const step = input.direction == "up" ? -1 : 1
            let row = currentRow + step
            const end = step < 0 ? -1 : input.rows.length
            while (row != end && destinationColumn < 0) {
                destinationColumn = verticalDestinationColumn(
                    input,
                    currentRow,
                    currentColumn,
                    input.columnIntent !== undefined
                        ? input.columnIntent
                        : currentColumn,
                    row,
                )
                if (destinationColumn >= 0) destinationRow = row
                row += step
            }
        }
        if (destinationRow >= 0 && destinationColumn >= 0)
            return movedResult(
                input.scopeId,
                input.rows[currentRow][currentColumn],
                input.rows[destinationRow][destinationColumn],
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

    function horizontalDestinationColumn(
        input: UiFocusRaggedGridMoveInput,
        currentRow: number,
        currentColumn: number,
    ): number {
        const row = input.rows[currentRow]
        const step = input.direction == "left" ? -1 : 1
        let column = currentColumn + step
        while (column >= 0 && column < row.length) {
            if (!row[column].hidden) return column
            column += step
        }
        if (!input.horizontalWrap) return -1
        column = step < 0 ? row.length - 1 : 0
        while (column != currentColumn) {
            if (!row[column].hidden) return column
            column += step
        }
        return -1
    }

    function verticalDestinationColumn(
        input: UiFocusRaggedGridMoveInput,
        currentRow: number,
        currentColumn: number,
        targetColumn: number,
        rowIndex: number,
    ): number {
        const row = input.rows[rowIndex]
        if (!row) return -1
        targetColumn = _uiLayout.sanitizeCoordinate(targetColumn)
        const exact = row[targetColumn]
        if (exact && !exact.hidden) return targetColumn
        if (input.verticalStrategy == "exact") return -1

        let bestColumn = -1
        let bestDistance = 0
        const current = input.rows[currentRow][currentColumn]
        const sourceX = _uiLayout.rectCenterX(current.rect)
        for (let column = 0; column < row.length; column++) {
            const target = row[column]
            if (target.hidden) continue
            const dx = Math.abs(_uiLayout.rectCenterX(target.rect) - sourceX)
            if (bestColumn < 0 || dx < bestDistance) {
                bestColumn = column
                bestDistance = dx
            }
        }
        return bestColumn
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
