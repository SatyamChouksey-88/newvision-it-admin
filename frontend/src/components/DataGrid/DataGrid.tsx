import {
  ColumnHeightOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Checkbox, Dropdown, Input, Segmented, Space, Table, Tooltip } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTableKeyboard } from '../../hooks/useTableKeyboard';
import { exportToCsv } from './exportCsv';
import { ResizableTitle } from './ResizableTitle';
import { useColumnPrefs } from './useColumnPrefs';

export type GridColumn<T> = ColumnType<T> & {
  /** Stable key for column prefs / export (defaults to dataIndex string). */
  gridKey?: string;
  /** Default width for resize (px). */
  defaultWidth?: number;
  /** Include in CSV export (default true). */
  exportable?: boolean;
  /** Default visible (default true). */
  defaultVisible?: boolean;
  /** Plain-text value for cell copy / export. */
  getExportValue?: (record: T) => string;
};

export type TableDensity = 'Compact' | 'Comfortable';

export interface DataGridProps<T extends object> {
  tableKey: string;
  columns: GridColumn<T>[];
  dataSource: readonly T[];
  rowKey: keyof T | ((record: T) => string | number);
  loading?: boolean;
  density?: TableDensity;
  onDensityChange?: (d: TableDensity) => void;
  /** Sticky header row (default true). */
  sticky?: boolean;
  /** Pin first data column on horizontal scroll. */
  fixFirstColumn?: boolean;
  rowSelection?: TableProps<T>['rowSelection'];
  bulkActions?: React.ReactNode;
  /** Quick-filter searches stringified row values client-side (always on the loaded rows). */
  quickFilter?: boolean;
  quickFilterPlaceholder?: string;
  /** Custom export handler; if omitted, exports visible columns client-side. */
  onExport?: () => void;
  exportFilename?: string;
  /** Server-side: parent handles sort/filter/pagination; the quick filter narrows the loaded page. */
  serverSide?: boolean;
  pagination?: false | TableProps<T>['pagination'];
  scroll?: TableProps<T>['scroll'];
  expandable?: TableProps<T>['expandable'];
  onRow?: TableProps<T>['onRow'];
  rowClassName?: TableProps<T>['rowClassName'];
  /** Local search input id for `/` shortcut within this grid. */
  searchInputId?: string;
  toolbarExtra?: React.ReactNode;
  /** Search / filters on the left of the tools row (same centreline as Columns / Export). */
  toolbarLead?: React.ReactNode;
  /** Hide the built-in visible-columns CSV button when the page already exports. */
  hideClientExport?: boolean;
  onChange?: TableProps<T>['onChange'];
  onOpenRow?: (record: T) => void;
  onAssignToMe?: (record: T) => void;
  enableQueueKeys?: boolean;
}

const MIN_COL_WIDTH = 60;
const MAX_AUTOFIT_WIDTH = 640;

function colKey<T>(col: GridColumn<T>): string {
  if (col.gridKey) return col.gridKey;
  if (typeof col.dataIndex === 'string') return col.dataIndex;
  if (Array.isArray(col.dataIndex)) return col.dataIndex.map(String).join('.');
  return String(col.key ?? col.title ?? 'col');
}

function cellText<T>(col: GridColumn<T>, record: T): string {
  if (col.getExportValue) return col.getExportValue(record);
  const di = col.dataIndex;
  if (!di) return '';
  if (typeof di === 'string') return String((record as Record<string, unknown>)[di] ?? '');
  if (Array.isArray(di)) {
    let v: unknown = record;
    for (const k of di) {
      v = (v as Record<string, unknown>)?.[String(k)];
    }
    return String(v ?? '');
  }
  return '';
}

/** Full-text tooltip for a truncated cell so no data is hidden behind an ellipsis. */
/** antd's RenderedCell shape (`{ children, props }`) — distinct from a React element, which has `type`. */
function isRenderedCell(v: unknown): boolean {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    'props' in (v as object) &&
    !('type' in (v as object)) &&
    !('$$typeof' in (v as object))
  );
}

/** Plain cell wrapper — no ResizeObserver (that froze the grid on large pages). */
function OverflowCell({
  text,
  children,
  wrap,
}: {
  text: string;
  children: React.ReactNode;
  wrap: boolean;
}) {
  const inner = (
    <span
      className="nv-cell-ellipsis"
      title={!wrap && text ? text : undefined}
      style={
        wrap
          ? { display: 'block', whiteSpace: 'normal', wordBreak: 'break-word' }
          : {
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }
      }
    >
      {children}
    </span>
  );
  return inner;
}

export function DataGrid<T extends object>(props: DataGridProps<T>) {
  const {
    tableKey,
    columns: columnDefs,
    dataSource,
    rowKey,
    loading,
    density = 'Comfortable',
    onDensityChange,
    sticky = false,
    fixFirstColumn = false,
    rowSelection,
    bulkActions,
    quickFilter = false,
    quickFilterPlaceholder = 'Filter rows…',
    onExport,
    exportFilename = `${tableKey}-export.csv`,
    serverSide = false,
    pagination = false,
    scroll,
    expandable,
    onRow,
    rowClassName,
    searchInputId,
    toolbarExtra,
    toolbarLead,
    hideClientExport = false,
    onChange,
    onOpenRow,
    onAssignToMe,
    enableQueueKeys = false,
  } = props;

  const defaultKeys = useMemo(() => columnDefs.map(colKey), [columnDefs]);
  const defaultVisible = useMemo(() => {
    const v: Record<string, boolean> = {};
    for (const c of columnDefs) {
      const k = colKey(c);
      v[k] = c.defaultVisible !== false;
    }
    return v;
  }, [columnDefs]);

  const {
    order,
    widths,
    visible,
    wrapText,
    setColumnWidth,
    toggleColumn,
    reorderColumn,
    setWrapText,
    resetPrefs,
    isCustomised,
  } = useColumnPrefs(tableKey, defaultKeys, defaultVisible);

  const [quickQ, setQuickQ] = useState('');
  const [focusedRow, setFocusedRow] = useState(-1);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Row focus is positional; reset it whenever the underlying rows change so it never
  // points at a row that has scrolled away (page change, refetch, filter).
  // biome-ignore lint/correctness/useExhaustiveDependencies: dataSource identity is the trigger
  useEffect(() => {
    setFocusedRow(-1);
  }, [dataSource]);

  const filteredData = useMemo(() => {
    if (!quickQ.trim()) return dataSource;
    const q = quickQ.toLowerCase();
    return dataSource.filter((row) =>
      columnDefs.some((col) => cellText(col, row).toLowerCase().includes(q)),
    );
  }, [dataSource, quickQ, columnDefs]);

  const orderedVisibleCols = useMemo(() => {
    const map = new Map(columnDefs.map((c) => [colKey(c), c]));
    return order
      .filter((k) => visible[k] !== false)
      .map((k) => map.get(k))
      .filter(Boolean) as GridColumn<T>[];
  }, [order, visible, columnDefs]);

  /** Excel-style "auto fit": size the column to its longest visible value. */
  const autoFitColumn = useCallback(
    (key: string) => {
      const col = columnDefs.find((c) => colKey(c) === key);
      if (!col) return;
      const measure = document.createElement('span');
      measure.style.cssText =
        'position:absolute;visibility:hidden;white-space:nowrap;font-size:13px;font-family:inherit';
      document.body.appendChild(measure);
      let max = 0;
      measure.textContent = String(col.title ?? key);
      max = measure.offsetWidth + 40; // sorter / filter icons
      for (const row of filteredData) {
        measure.textContent = cellText(col, row);
        max = Math.max(max, measure.offsetWidth + 32);
      }
      document.body.removeChild(measure);
      setColumnWidth(key, Math.min(Math.max(max, MIN_COL_WIDTH), MAX_AUTOFIT_WIDTH));
    },
    [columnDefs, filteredData, setColumnWidth],
  );

  const antColumns: ColumnType<T>[] = useMemo(() => {
    return orderedVisibleCols.map((col, idx) => {
      const key = colKey(col);
      const width = widths[key] ?? col.defaultWidth ?? col.width ?? 140;
      const { ellipsis: _ellipsis, render, ...rest } = col;
      // Server-side grids must not double-filter the page client-side; the parent sends the
      // filter to the API through `onChange`.
      const onFilter = serverSide ? undefined : col.onFilter;
      return {
        ...rest,
        onFilter,
        width,
        ellipsis: false,
        fixed: fixFirstColumn && idx === 0 ? ('left' as const) : col.fixed,
        showSorterTooltip: col.sorter ? { title: 'Click to sort' } : false,
        render: (value: unknown, record: T, index: number) => {
          const content: unknown = render ? render(value as never, record, index) : value;
          // antd `render` may return a RenderedCell ({ children, props }) for row/col spans; leave those alone.
          if (isRenderedCell(content)) return content as React.ReactNode;
          const node = content as React.ReactNode;
          const text = cellText(col, record) || (typeof node === 'string' ? node : '');
          return (
            <OverflowCell text={text} wrap={wrapText}>
              {node}
            </OverflowCell>
          );
        },
        onHeaderCell: () => ({
          width,
          onResize: (w: number) => setColumnWidth(key, Math.max(w, MIN_COL_WIDTH)),
          onAutoFit: () => autoFitColumn(key),
          draggable: true,
          onDragStart: () => setDragKey(key),
          onDrop: () => {
            if (dragKey && dragKey !== key) reorderColumn(dragKey, key);
            setDragKey(null);
          },
        }),
      };
    });
  }, [
    orderedVisibleCols,
    widths,
    wrapText,
    serverSide,
    fixFirstColumn,
    setColumnWidth,
    autoFitColumn,
    dragKey,
    reorderColumn,
  ]);

  const components = useMemo(
    () => ({
      header: {
        cell: ResizableTitle as never,
      },
    }),
    [],
  );

  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
      return;
    }
    const exportCols = orderedVisibleCols
      .filter((c) => c.exportable !== false)
      .map((c) => ({
        title: String(c.title ?? colKey(c)),
        key: colKey(c),
      }));
    const rows = filteredData.map((record) => {
      const row: Record<string, unknown> = {};
      for (const c of orderedVisibleCols) {
        if (c.exportable === false) continue;
        row[colKey(c)] = cellText(c, record);
      }
      return row;
    });
    exportToCsv(exportFilename, exportCols, rows);
  }, [onExport, orderedVisibleCols, filteredData, exportFilename]);

  useTableKeyboard({
    searchSelector: searchInputId ? `#${searchInputId}` : '#global-search-input',
    onEscape: () => setFocusedRow(-1),
    rowCount: filteredData.length,
    focusedRow,
    onFocusRow: setFocusedRow,
    enableQueueKeys,
    onOpenFocused: () => {
      if (focusedRow < 0 || focusedRow >= filteredData.length) return;
      onOpenRow?.(filteredData[focusedRow]);
    },
    onAssignFocused: () => {
      if (focusedRow < 0 || focusedRow >= filteredData.length) return;
      onAssignToMe?.(filteredData[focusedRow]);
    },
  });

  const handleCopy = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
      // Never hijack copy while the user has text selected or is typing in a field.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (window.getSelection()?.toString()) return;
      if (focusedRow < 0 || focusedRow >= filteredData.length) return;
      const record = filteredData[focusedRow];
      const text = orderedVisibleCols
        .filter((c) => c.exportable !== false)
        .map((c) => cellText(c, record))
        .join('\t');
      void navigator.clipboard.writeText(text).catch(() => undefined);
    },
    [focusedRow, filteredData, orderedVisibleCols],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleCopy);
    return () => window.removeEventListener('keydown', handleCopy);
  }, [handleCopy]);

  const columnMenu = (
    <div
      style={{
        padding: 8,
        maxHeight: 360,
        overflow: 'auto',
        background: '#fff',
        borderRadius: 8,
        boxShadow: '0 6px 16px rgba(15, 23, 42, 0.12)',
        minWidth: 200,
      }}
    >
      {defaultKeys.map((k) => {
        const col = columnDefs.find((c) => colKey(c) === k);
        return (
          <div key={k} style={{ marginBottom: 4 }}>
            <Checkbox
              checked={visible[k] !== false}
              onChange={(e) => toggleColumn(k, e.target.checked)}
            >
              {String(col?.title ?? k) || k}
            </Checkbox>
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid #e9edf2', marginTop: 8, paddingTop: 8 }}>
        <Checkbox checked={wrapText} onChange={(e) => setWrapText(e.target.checked)}>
          Wrap long text
        </Checkbox>
      </div>
      <div style={{ marginTop: 8 }}>
        <Button
          size="small"
          icon={<ReloadOutlined />}
          disabled={!isCustomised}
          onClick={resetPrefs}
          block
        >
          Reset layout
        </Button>
      </div>
    </div>
  );

  const rowsShown = filteredData.length;
  const rowsTotal = dataSource.length;

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }} ref={tableRef}>
      <div className="nv-grid-toolbar" title="Select a row and press Ctrl+C to copy it for Excel">
        <div className="nv-grid-toolbar__left">
          {toolbarLead}
          {quickFilter && (
            <Input.Search
              id={searchInputId}
              allowClear
              placeholder={quickFilterPlaceholder}
              aria-label={quickFilterPlaceholder}
              value={quickQ}
              onChange={(e) => setQuickQ(e.target.value)}
            />
          )}
          {quickQ.trim() ? (
            <span className="nv-grid-toolbar__hint" aria-live="polite">
              {rowsShown} of {rowsTotal} loaded row{rowsTotal === 1 ? '' : 's'}
              {serverSide ? ' on this page' : ''}
            </span>
          ) : null}
          {bulkActions}
        </div>
        <div className="nv-grid-toolbar__right">
          {toolbarExtra}
          {onDensityChange && (
            <Segmented
              size="small"
              value={density}
              onChange={(v) => onDensityChange(v as TableDensity)}
              options={[
                { label: 'Compact', value: 'Compact', icon: <ColumnHeightOutlined /> },
                { label: 'Comfortable', value: 'Comfortable' },
              ]}
            />
          )}
          <Tooltip title="Select a row and press Ctrl+C to copy it for Excel">
            <span>
              <Dropdown popupRender={() => columnMenu} trigger={['click']}>
                <Button size="small" icon={<SettingOutlined />} aria-label="Show or hide columns">
                  Columns
                </Button>
              </Dropdown>
            </span>
          </Tooltip>
          {hideClientExport ? null : (
            <Tooltip title="Export visible columns as CSV. Select a row and press Ctrl+C to copy it.">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                aria-label="Export CSV"
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      <Table<T>
        className={wrapText ? 'nv-grid nv-grid--wrap' : 'nv-grid'}
        components={components}
        columns={antColumns}
        dataSource={filteredData as T[]}
        rowKey={rowKey as never}
        loading={loading}
        size={density === 'Compact' ? 'small' : 'middle'}
        sticky={sticky}
        scroll={filteredData.length === 0 ? undefined : (scroll ?? { x: 1400 })}
        pagination={pagination}
        rowSelection={
          rowSelection
            ? {
                columnWidth: 48,
                ...rowSelection,
                getCheckboxProps: (record: T) => {
                  const extra = rowSelection.getCheckboxProps?.(record) ?? {};
                  const key =
                    typeof rowKey === 'function'
                      ? rowKey(record)
                      : (record[rowKey] as string | number);
                  return {
                    ...extra,
                    name: extra.name ?? `select-row-${String(key)}`,
                    'aria-label': `Select row ${String(key)}`,
                  } as typeof extra;
                },
                // A string here replaces the checkbox with wrapped visible text.
                columnTitle:
                  typeof rowSelection.columnTitle === 'string'
                    ? (checkbox: ReactNode) => (
                        <span title={rowSelection.columnTitle as string}>{checkbox}</span>
                      )
                    : rowSelection.columnTitle,
              }
            : undefined
        }
        expandable={expandable}
        onChange={onChange}
        rowClassName={(record, index) => {
          const base = index === focusedRow ? 'nv-row-focused' : '';
          const extra =
            typeof rowClassName === 'function'
              ? rowClassName(record, index, 0)
              : (rowClassName ?? '');
          return [base, extra].filter(Boolean).join(' ');
        }}
        onRow={(record, index) => {
          const parent = onRow?.(record, index) ?? {};
          return {
            ...parent,
            tabIndex: index === focusedRow || (focusedRow < 0 && index === 0) ? 0 : -1,
            onClick: (e) => {
              setFocusedRow(index ?? -1);
              parent.onClick?.(e as never);
            },
            onKeyDown: (e) => {
              // Enter on a focused row triggers its click action (open detail) for keyboard users.
              if (e.key === 'Enter' && parent.onClick) {
                parent.onClick(e as never);
              }
              parent.onKeyDown?.(e as never);
            },
          };
        }}
      />
    </Space>
  );
}
