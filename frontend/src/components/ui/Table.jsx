import { cn } from '../../lib/cn';

export const TableShell = ({ className, children, ...props }) => {
  return (
    <div className={cn('ui-table-shell', className)} {...props}>
      {children}
    </div>
  );
};

export const Table = ({ className, children, ...props }) => {
  return (
    <div className="ui-table-scroll">
      <table className={cn('ui-table', className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableCaption = ({ className, children, ...props }) => {
  return (
    <caption className={cn('ui-visually-hidden', className)} {...props}>
      {children}
    </caption>
  );
};

export const TableHead = ({ className, children, ...props }) => {
  return (
    <thead className={cn(className)} {...props}>
      {children}
    </thead>
  );
};

export const TableBody = ({ className, children, ...props }) => {
  return (
    <tbody className={cn(className)} {...props}>
      {children}
    </tbody>
  );
};

export const TableRow = ({ className, children, ...props }) => {
  return (
    <tr className={cn(className)} {...props}>
      {children}
    </tr>
  );
};

export const TableHeaderCell = ({ className, children, ...props }) => {
  return (
    <th className={cn(className)} {...props}>
      {children}
    </th>
  );
};

export const TableCell = ({ className, children, ...props }) => {
  return (
    <td className={cn(className)} {...props}>
      {children}
    </td>
  );
};

export const TableEmptyState = ({ colSpan, children = 'Sin resultados', className, ...props }) => {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('ui-table__empty', className)} {...props}>
        {children}
      </td>
    </tr>
  );
};
