namespace ui {
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
        disabled?: boolean

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
         * `rect` remains the viewport-space rectangle used for navigation geometry.
         * `scrollRect` is expressed in the scroll owner's content coordinates.
         */
        scrollRect?: Rect
    }

    /**
     * Ordered target record for row and column focus movement.
     *
     * The `targets` array defines movement order. Disabled and hidden targets in
     * that array are skipped as destinations.
     */
    export interface UiFocusLinearMoveInput {
        /**
         * Scope that owns the targets.
         */
        scopeId: UiFocusScopeId

        /**
         * Active target id before movement. Missing or ineligible ids return a
         * `missingActive` result.
         */
        currentTargetId?: UiFocusId

        /**
         * Requested movement direction.
         */
        direction: UiFocusDirection

        /**
         * Whether movement may wrap inside this target order. Defaults to `false`.
         */
        wrap?: boolean

        /**
         * Targets in caller-defined movement order.
         */
        targets: UiFocusNavigationTarget[]
    }

    /**
     * Positioned target entry for grid focus movement.
     */
    export interface UiFocusGridNavigationCell {
        /**
         * Non-negative integer row coordinate.
         */
        row: number

        /**
         * Non-negative integer column coordinate.
         */
        column: number

        /**
         * Target stored at this grid coordinate.
         */
        target: UiFocusNavigationTarget
    }

    /**
     * Grid target record for directional focus movement.
     *
     * The `cells` array supplies sparse row and column coordinates. Disabled and
     * hidden targets are skipped as destinations.
     */
    export interface UiFocusGridMoveInput {
        /**
         * Scope that owns the targets.
         */
        scopeId: UiFocusScopeId

        /**
         * Active target id before movement. Missing or ineligible ids return a
         * `missingActive` result.
         */
        currentTargetId?: UiFocusId

        /**
         * Requested movement direction.
         */
        direction: UiFocusDirection

        /**
         * Whether movement may wrap within the current row or column. Defaults to
         * `false`.
         */
        wrap?: boolean

        /**
         * Target cells in caller-defined coordinate order.
         */
        cells: UiFocusGridNavigationCell[]
    }

    /**
     * Ragged row record for directional focus movement.
     *
     * Each nested array is one row in movement order. Disabled and hidden targets
     * are skipped as destinations.
     */
    export interface UiFocusRaggedGridMoveInput {
        /**
         * Scope that owns the targets.
         */
        scopeId: UiFocusScopeId

        /**
         * Active target id before movement. Missing or ineligible ids return a
         * `missingActive` result.
         */
        currentTargetId?: UiFocusId

        /**
         * Requested movement direction.
         */
        direction: UiFocusDirection

        /**
         * Whether movement may wrap inside this row set. Defaults to `false`.
         */
        wrap?: boolean

        /**
         * Rows in caller-defined movement order.
         */
        rows: UiFocusNavigationTarget[][]

        /**
         * Preferred column for vertical movement. When omitted, vertical movement
         * uses the current target's column index.
         */
        columnIntent?: number
    }

    interface UiResolvedGridCell {
        row: number
        column: number
        target: UiFocusNavigationTarget
    }

    interface UiResolvedRaggedCell {
        row: number
        column: number
        target: UiFocusNavigationTarget
    }

    /**
     * Returns the focus movement result for a horizontal row.
     *
     * Left and right requests move through `targets` order. Up and down requests
     * return a boundary result. Callers apply moved results to focus state.
     */
    export function moveFocusInRow(
        input: UiFocusLinearMoveInput,
    ): UiFocusMoveResult {
        return moveFocusInLinearOrder(
            input,
            input.direction == "left",
            input.direction == "right",
        )
    }

    /**
     * Returns the focus movement result for a vertical column.
     *
     * Up and down requests move through `targets` order. Left and right requests
     * return a boundary result. Callers apply moved results to focus state.
     */
    export function moveFocusInColumn(
        input: UiFocusLinearMoveInput,
    ): UiFocusMoveResult {
        return moveFocusInLinearOrder(
            input,
            input.direction == "up",
            input.direction == "down",
        )
    }

    /**
     * Returns the focus movement result for a sparse coordinate grid.
     *
     * Movement scans in the requested direction from the current cell. Missing,
     * disabled, and hidden cells are skipped. Callers apply moved results to
     * focus state.
     */
    export function moveFocusInGrid(
        input: UiFocusGridMoveInput,
    ): UiFocusMoveResult {
        const current = currentGridCell(input)

        if (!hasEligibleGridTarget(input.cells))
            return emptyMoveResult(input.scopeId)
        if (!current)
            return missingActiveMoveResult(input.scopeId, input.currentTargetId)

        let destination: UiResolvedGridCell | undefined = undefined
        if (input.direction == "left" || input.direction == "right") {
            destination = scanGridRow(input, current)
        } else {
            destination = scanGridColumn(input, current)
        }

        if (destination)
            return movedResult(
                input.scopeId,
                current.target,
                destination.target,
            )
        if (input.wrap)
            return boundaryMoveResult(input.scopeId, input.currentTargetId)
        return exitedMoveResult(
            input.scopeId,
            input.currentTargetId,
            input.direction,
        )
    }

    /**
     * Returns the focus movement result for a ragged grid.
     *
     * Horizontal movement follows the current row order. Vertical movement uses
     * `columnIntent` when present, then falls back to the nearest horizontal
     * center in each candidate row. Callers apply moved results to focus state.
     */
    export function moveFocusInRaggedGrid(
        input: UiFocusRaggedGridMoveInput,
    ): UiFocusMoveResult {
        const current = currentRaggedCell(input)

        if (!hasEligibleRaggedTarget(input.rows))
            return emptyMoveResult(input.scopeId)
        if (!current)
            return missingActiveMoveResult(input.scopeId, input.currentTargetId)

        let destination: UiResolvedRaggedCell | undefined = undefined
        if (input.direction == "left" || input.direction == "right") {
            destination = scanRaggedRow(input, current)
        } else {
            destination = scanRaggedRows(input, current)
        }

        if (destination)
            return movedResult(
                input.scopeId,
                current.target,
                destination.target,
            )
        if (input.wrap)
            return boundaryMoveResult(input.scopeId, input.currentTargetId)
        return exitedMoveResult(
            input.scopeId,
            input.currentTargetId,
            input.direction,
        )
    }

    function moveFocusInLinearOrder(
        input: UiFocusLinearMoveInput,
        ownsBackward: boolean,
        ownsForward: boolean,
    ): UiFocusMoveResult {
        const currentIndex = findEligibleTargetIndex(
            input.targets,
            input.currentTargetId,
        )

        if (!hasEligibleTarget(input.targets))
            return emptyMoveResult(input.scopeId)
        if (currentIndex < 0)
            return missingActiveMoveResult(input.scopeId, input.currentTargetId)
        if (!ownsBackward && !ownsForward)
            return boundaryMoveResult(input.scopeId, input.currentTargetId)

        const step = ownsBackward ? -1 : 1
        let destinationIndex = findNextLinearTargetIndex(
            input.targets,
            currentIndex,
            step,
            false,
        )

        if (destinationIndex < 0 && input.wrap) {
            destinationIndex = findNextLinearTargetIndex(
                input.targets,
                currentIndex,
                step,
                true,
            )
        }

        if (destinationIndex >= 0 && destinationIndex != currentIndex) {
            return movedResult(
                input.scopeId,
                input.targets[currentIndex],
                input.targets[destinationIndex],
            )
        }

        if (input.wrap)
            return boundaryMoveResult(input.scopeId, input.currentTargetId)
        return exitedMoveResult(
            input.scopeId,
            input.currentTargetId,
            input.direction,
        )
    }

    function findNextLinearTargetIndex(
        targets: UiFocusNavigationTarget[],
        currentIndex: number,
        step: number,
        wrap: boolean,
    ): number {
        let index = wrap
            ? step < 0
                ? targets.length - 1
                : 0
            : currentIndex + step
        const end = wrap ? currentIndex : step < 0 ? -1 : targets.length

        while (index != end) {
            if (isEligibleNavigationTarget(targets[index])) return index
            index += step
        }

        return -1
    }

    function scanGridRow(
        input: UiFocusGridMoveInput,
        current: UiResolvedGridCell,
    ): UiResolvedGridCell | undefined {
        const step = input.direction == "left" ? -1 : 1
        const min = minGridColumn(input.cells, current.row)
        const max = maxGridColumn(input.cells, current.row)
        let found = scanGridRowRange(
            input.cells,
            current.row,
            current.column + step,
            step < 0 ? min - 1 : max + 1,
            step,
        )

        if (!found && input.wrap) {
            const start = step < 0 ? max : min
            const end = current.column
            found = scanGridRowRange(input.cells, current.row, start, end, step)
        }

        return found
    }

    function scanGridColumn(
        input: UiFocusGridMoveInput,
        current: UiResolvedGridCell,
    ): UiResolvedGridCell | undefined {
        const step = input.direction == "up" ? -1 : 1
        const min = minGridRow(input.cells, current.column)
        const max = maxGridRow(input.cells, current.column)
        let found = scanGridColumnRange(
            input.cells,
            current.column,
            current.row + step,
            step < 0 ? min - 1 : max + 1,
            step,
        )

        if (!found && input.wrap) {
            const start = step < 0 ? max : min
            const end = current.row
            found = scanGridColumnRange(
                input.cells,
                current.column,
                start,
                end,
                step,
            )
        }

        return found
    }

    function scanGridRowRange(
        cells: UiFocusGridNavigationCell[],
        row: number,
        start: number,
        end: number,
        step: number,
    ): UiResolvedGridCell | undefined {
        for (let column = start; column != end; column += step) {
            const cell = firstEligibleGridCellAt(cells, row, column)
            if (cell) return cell
        }

        return undefined
    }

    function scanGridColumnRange(
        cells: UiFocusGridNavigationCell[],
        column: number,
        start: number,
        end: number,
        step: number,
    ): UiResolvedGridCell | undefined {
        for (let row = start; row != end; row += step) {
            const cell = firstEligibleGridCellAt(cells, row, column)
            if (cell) return cell
        }

        return undefined
    }

    function currentGridCell(
        input: UiFocusGridMoveInput,
    ): UiResolvedGridCell | undefined {
        for (let i = 0; i < input.cells.length; i++) {
            const cell = input.cells[i]
            if (
                isValidGridCoordinate(cell.row) &&
                isValidGridCoordinate(cell.column) &&
                cell.target.id == input.currentTargetId &&
                isEligibleNavigationTarget(cell.target)
            ) {
                return {
                    row: cell.row,
                    column: cell.column,
                    target: cell.target,
                }
            }
        }

        return undefined
    }

    function firstEligibleGridCellAt(
        cells: UiFocusGridNavigationCell[],
        row: number,
        column: number,
    ): UiResolvedGridCell | undefined {
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                cell.row == row &&
                cell.column == column &&
                isValidGridCoordinate(cell.row) &&
                isValidGridCoordinate(cell.column) &&
                isEligibleNavigationTarget(cell.target)
            ) {
                return { row, column, target: cell.target }
            }
        }

        return undefined
    }

    function minGridColumn(
        cells: UiFocusGridNavigationCell[],
        row: number,
    ): number {
        let value = -1
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                cell.row == row &&
                isValidGridCoordinate(cell.column) &&
                (value < 0 || cell.column < value)
            ) {
                value = cell.column
            }
        }
        return value
    }

    function maxGridColumn(
        cells: UiFocusGridNavigationCell[],
        row: number,
    ): number {
        let value = -1
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                cell.row == row &&
                isValidGridCoordinate(cell.column) &&
                cell.column > value
            )
                value = cell.column
        }
        return value
    }

    function minGridRow(
        cells: UiFocusGridNavigationCell[],
        column: number,
    ): number {
        let value = -1
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                cell.column == column &&
                isValidGridCoordinate(cell.row) &&
                (value < 0 || cell.row < value)
            ) {
                value = cell.row
            }
        }
        return value
    }

    function maxGridRow(
        cells: UiFocusGridNavigationCell[],
        column: number,
    ): number {
        let value = -1
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                cell.column == column &&
                isValidGridCoordinate(cell.row) &&
                cell.row > value
            )
                value = cell.row
        }
        return value
    }

    function scanRaggedRow(
        input: UiFocusRaggedGridMoveInput,
        current: UiResolvedRaggedCell,
    ): UiResolvedRaggedCell | undefined {
        const step = input.direction == "left" ? -1 : 1
        const row = input.rows[current.row]
        let found = scanRaggedRowRange(
            row,
            current.row,
            current.column + step,
            step < 0 ? -1 : row.length,
            step,
        )

        if (!found && input.wrap) {
            const start = step < 0 ? row.length - 1 : 0
            const end = current.column
            found = scanRaggedRowRange(row, current.row, start, end, step)
        }

        return found
    }

    function scanRaggedRowRange(
        row: UiFocusNavigationTarget[],
        rowIndex: number,
        start: number,
        end: number,
        step: number,
    ): UiResolvedRaggedCell | undefined {
        for (let column = start; column != end; column += step) {
            if (isEligibleNavigationTarget(row[column]))
                return { row: rowIndex, column, target: row[column] }
        }

        return undefined
    }

    function scanRaggedRows(
        input: UiFocusRaggedGridMoveInput,
        current: UiResolvedRaggedCell,
    ): UiResolvedRaggedCell | undefined {
        const step = input.direction == "up" ? -1 : 1
        let found = scanRaggedRowSet(
            input,
            current,
            current.row + step,
            step < 0 ? -1 : input.rows.length,
            step,
        )

        if (!found && input.wrap) {
            const start = step < 0 ? input.rows.length - 1 : 0
            const end = current.row
            found = scanRaggedRowSet(input, current, start, end, step)
        }

        return found
    }

    function scanRaggedRowSet(
        input: UiFocusRaggedGridMoveInput,
        current: UiResolvedRaggedCell,
        start: number,
        end: number,
        step: number,
    ): UiResolvedRaggedCell | undefined {
        const columnIntent =
            input.columnIntent === undefined
                ? current.column
                : input.columnIntent
        const sourceCenterX =
            current.target.rect.x + current.target.rect.width / 2

        for (let rowIndex = start; rowIndex != end; rowIndex += step) {
            const row = input.rows[rowIndex]
            if (!row) continue
            if (
                columnIntent >= 0 &&
                columnIntent < row.length &&
                isEligibleNavigationTarget(row[columnIntent])
            ) {
                return {
                    row: rowIndex,
                    column: columnIntent,
                    target: row[columnIntent],
                }
            }

            const nearest = nearestEligibleTargetInRow(
                row,
                rowIndex,
                sourceCenterX,
            )
            if (nearest) return nearest
        }

        return undefined
    }

    function currentRaggedCell(
        input: UiFocusRaggedGridMoveInput,
    ): UiResolvedRaggedCell | undefined {
        for (let rowIndex = 0; rowIndex < input.rows.length; rowIndex++) {
            const row = input.rows[rowIndex]
            for (let column = 0; column < row.length; column++) {
                const target = row[column]
                if (
                    target.id == input.currentTargetId &&
                    isEligibleNavigationTarget(target)
                ) {
                    return { row: rowIndex, column, target }
                }
            }
        }

        return undefined
    }

    function nearestEligibleTargetInRow(
        row: UiFocusNavigationTarget[],
        rowIndex: number,
        sourceCenterX: number,
    ): UiResolvedRaggedCell | undefined {
        let best: UiResolvedRaggedCell | undefined = undefined
        let bestDistance = 0

        for (let column = 0; column < row.length; column++) {
            const target = row[column]
            if (!isEligibleNavigationTarget(target)) continue

            const distance = Math.abs(
                target.rect.x + target.rect.width / 2 - sourceCenterX,
            )
            if (!best || distance < bestDistance) {
                best = { row: rowIndex, column, target }
                bestDistance = distance
            }
        }

        return best
    }

    function hasEligibleTarget(targets: UiFocusNavigationTarget[]): boolean {
        for (let i = 0; i < targets.length; i++) {
            if (isEligibleNavigationTarget(targets[i])) return true
        }
        return false
    }

    function hasEligibleGridTarget(
        cells: UiFocusGridNavigationCell[],
    ): boolean {
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i]
            if (
                isValidGridCoordinate(cell.row) &&
                isValidGridCoordinate(cell.column) &&
                isEligibleNavigationTarget(cell.target)
            ) {
                return true
            }
        }
        return false
    }

    function hasEligibleRaggedTarget(
        rows: UiFocusNavigationTarget[][],
    ): boolean {
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            if (hasEligibleTarget(rows[rowIndex])) return true
        }
        return false
    }

    function findEligibleTargetIndex(
        targets: UiFocusNavigationTarget[],
        targetId: UiFocusId | undefined,
    ): number {
        if (targetId === undefined) return -1
        for (let i = 0; i < targets.length; i++) {
            const target = targets[i]
            if (target.id == targetId && isEligibleNavigationTarget(target))
                return i
        }
        return -1
    }

    function isEligibleNavigationTarget(
        target: UiFocusNavigationTarget,
    ): boolean {
        return !!target && !target.disabled && !target.hidden
    }

    function isValidGridCoordinate(value: number): boolean {
        return value >= 0 && Math.floor(value) == value
    }

    function emptyMoveResult(scopeId: UiFocusScopeId): UiFocusMoveResult {
        return { kind: "stayed", scopeId, reason: "empty" }
    }

    function missingActiveMoveResult(
        scopeId: UiFocusScopeId,
        targetId: UiFocusId | undefined,
    ): UiFocusMoveResult {
        return { kind: "stayed", scopeId, targetId, reason: "missingActive" }
    }

    function boundaryMoveResult(
        scopeId: UiFocusScopeId,
        targetId: UiFocusId | undefined,
    ): UiFocusMoveResult {
        return { kind: "stayed", scopeId, targetId, reason: "boundary" }
    }

    function exitedMoveResult(
        scopeId: UiFocusScopeId,
        targetId: UiFocusId | undefined,
        direction: UiFocusDirection,
    ): UiFocusMoveResult {
        return { kind: "exited", scopeId, targetId, direction }
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

        if (toTarget.scrollOwnerId !== undefined) {
            result.scrollRequest = {
                scopeId,
                targetId: toTarget.id,
                scrollOwnerId: toTarget.scrollOwnerId,
                targetRect: (toTarget.scrollRect || toTarget.rect).clone(),
                reason: "focus",
            }
        }

        return result
    }
}
