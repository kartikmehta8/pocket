import { Table, TableFrame, TBody, TD, TH, THead } from '@/components/ui/table';

/** Props for {@link ChartTable}. */
export interface ChartTableProps {
  /** Column headings; every column after the first is right-aligned. */
  columns: readonly string[];
  /** Row cells, already formatted for display. */
  rows: ReadonlyArray<{ key: string; cells: readonly string[] }>;
}

/**
 * The WCAG-clean twin of a chart. Every chart in the dashboard renders one of
 * these behind its Table view, so no value is reachable only by hovering.
 */
export function ChartTable({ columns, rows }: ChartTableProps) {
  return (
    <TableFrame>
      <Table>
        <THead>
          {columns.map((column, index) => (
            <TH key={column} numeric={index > 0}>
              {column}
            </TH>
          ))}
        </THead>
        <TBody>
          {rows.map((row) => (
            <tr key={row.key} className="border-divider border-b last:border-0">
              {row.cells.map((cell, index) => (
                <TD key={columns[index] ?? String(index)} numeric={index > 0}>
                  {cell}
                </TD>
              ))}
            </tr>
          ))}
        </TBody>
      </Table>
    </TableFrame>
  );
}
