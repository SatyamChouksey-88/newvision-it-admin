import {
  ColumnHeightOutlined,
  DownloadOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Button, Checkbox, Dropdown, Input, Segmented, Space, Table } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTableKeyboard } from '../../hooks/useTableKeyboard';
import { ResizableTitle } from './ResizableTitle';
import { exportToCsv } from './exportCsv';
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
  /** Quick-filter searches stringified row values client-side. */
  quickFilter?: boolean;
  quickFilterPlaceholder?: string;
  /** Custom export handler; if omitted, exports visible columns client-side. */
  onExport?: () => void;
  exportFilename?: string;
  /** Server-side: parent handles sort/filter; grid still manages column prefs. */
  serverSide?: boolean;
  pagination?: false | TableProps<T>['pagination'];
  scroll?: TableProps<T>['scroll'];
  expandable?: TableProps<T>['expandable'];
  onRow?: TableProps<T>['onRow'];
  rowClassName?: TableProps<T>['rowClassName'];
  /** Local search input id for `/` shortcut within this grid. */
  searchInputId?: string;
  toolbarExtra?: React.ReactNode;
  onChange?: TableProps<T>['onChange'];
}

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

export function DataGrid<T extends object>(props: DataGridProps<T>) {
  const {
    tableKey,
    columns: columnDefs,
    dataSource,
    rowKey,
    loading,
    density = 'Comfortable',
    onDensityChange,
    sticky = true,
    fixFirstColumn = false,
    rowSelection,
    bulkActions,
    quickFilter = true,
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
    onChange,
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

  const { order, widths, visible, setColumnWidth, toggleColumn, reorderColumn } = useColumnPrefs(
    tableKey,
    defaultKeys,
    defaultVisible,
  );

  const [quickQ, setQuickQ] = useState('');
  const [focusedRow, setFocusedRow] = useState(-1);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    if (serverSide || !quickQ.trim()) return dataSource;
    const q = quickQ.toLowerCase();
    return dataSource.filter((row) =>
      columnDefs.some((col) => cellText(col, row).toLowerCase().includes(q)),
    );
  }, [dataSource, quickQ, columnDefs, serverSide]);

  const orderedVisibleCols = useMemo(() => {
    const map = new Map(columnDefs.map((c) => [colKey(c), c]));
    return order
      .filter((k) => visible[k] !== false)
      .map((k) => map.get(k))
      .filter(Boolean) as GridColumn<T>[];
  }, [order, visible, columnDefs]);

  const antColumns: ColumnType<T>[] = useMemo(() => {
    return orderedVisibleCols.map((col, idx) => {
      const key = colKey(col);
      const width = widths[key] ?? col.defaultWidth ?? col.width ?? 140;
      return {
        ...col,
        width,
        fixed: fixFirstColumn && idx === 0 ? ('left' as const) : col.fixed,
        onHeaderCell: () => ({
          width,
          onResize: (w: number) => setColumnWidth(key, w),
          draggable: true,
          onDragStart: () => setDragKey(key),
          onDrop: () => {
            if (dragKey && dragKey !== key) reorderColumn(dragKey, key);
            setDragKey(null);
          },
        }),
      };
    });
  }, [orderedVisibleCols, widths, fixFirstColumn, setColumnWidth, dragKey, reorderColumn]);

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
  });

  const handleCopy = useCallback(
    (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'c') return;
      if (focusedRow < 0 || focusedRow >= filteredData.length) return;
      const record = filteredData[focusedRow];
      const text = orderedVisibleCols.map((c) => cellText(c, record)).join('\t');
      void navigator.clipboard.writeText(text);
    },
    [focusedRow, filteredData, orderedVisibleCols],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleCopy);
    return () => window.removeEventListener('keydown', handleCopy);
  }, [handleCopy]);

  const columnMenu = (
    <div style={{ padding: 8, maxHeight: 320, overflow: 'auto' }}>
      {defaultKeys.map((k) => {
        const col = columnDefs.find((c) => colKey(c) === k);
        return (
          <div key={k} style={{ marginBottom: 4 }}>
            <Checkbox
              checked={visible[k] !== false}
              onChange={(e) => toggleColumn(k, e.target.checked)}
            >
              {String(col?.title ?? k)}
            </Checkbox>
          </div>
        );
      })}
    </div>
  );

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }} ref={tableRef}>
      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          {quickFilter && (
            <Input.Search
              id={searchInputId}
              allowClear
              placeholder={quickFilterPlaceholder}
              aria-label={quickFilterPlaceholder}
              style={{ width: 240 }}
              value={quickQ}
              onChange={(e) => setQuickQ(e.target.value)}
            />
          )}
          {toolbarExtra}
          {bulkActions}
        </Space>
        <Space wrap>
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
          <Dropdown dropdownRender={() => columnMenu} trigger={['click']}>
            <Button size="small" icon={<SettingOutlined />} aria-label="Show or hide columns">
              Columns
            </Button>
          </Dropdown>
          <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>
            Export CSV
          </Button>
        </Space>
      </Space>

      <Table<T>
        components={components}
        columns={antColumns}
        dataSource={filteredData}
        rowKey={rowKey as never}
        loading={loading}
        size={density === 'Compact' ? 'small' : 'middle'}
        sticky={sticky}
        scroll={scroll ?? { x: 'max-content' }}
        pagination={pagination}
        rowSelection={rowSelection}
        expandable={expandable}
        onChange={onChange}
        rowClassName={(record, index) => {
          const base = index === focusedRow ? 'nv-row-focused' : '';
          const extra =
            typeof rowClassName === 'function' ? rowClassName(record, index, 0) : rowClassName ?? '';
          return [base, extra].filter(Boolean).join(' ');
        }}
        onRow={(record, index) => {
          const parent = onRow?.(record, index) ?? {};
          return {
            ...parent,
            tabIndex: index === focusedRow ? 0 : -1,
            onClick: (e) => {
              setFocusedRow(index ?? -1);
              parent.onClick?.(e as never);
            },
          };
        }}
      />
    </Space>
  );
}
