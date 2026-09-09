import type { ReactNode } from 'react';
import { Resizable } from 'react-resizable';
import 'react-resizable/css/styles.css';

interface Props extends React.HTMLAttributes<HTMLTableCellElement> {
  width?: number;
  onResize?: (width: number) => void;
  /** Double-click on the resize handle → size column to its content (Excel behaviour). */
  onAutoFit?: () => void;
  children?: ReactNode;
  draggable?: boolean;
  onDragStart?: () => void;
  onDrop?: () => void;
}

export function ResizableTitle(props: Props) {
  const {
    width = 0,
    onResize,
    onAutoFit,
    children,
    draggable,
    onDragStart,
    onDrop,
    ...rest
  } = props;

  if (!width || !onResize) {
    return <th {...rest}>{children}</th>;
  }

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="react-resizable-handle"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onAutoFit?.();
          }}
          title="Drag to resize · double-click to auto-fit"
          aria-hidden
        />
      }
      onResize={(_e, { size }) => onResize(size.width)}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th
        {...rest}
        style={{ ...(rest.style ?? {}), width, position: 'relative' }}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        {children}
      </th>
    </Resizable>
  );
}
