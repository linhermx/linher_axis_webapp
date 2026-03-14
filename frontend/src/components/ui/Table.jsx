import { cn } from '../../lib/cn';

export const TableShell = ({ className, children, ...props }) => {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-ui-light-slate bg-ui-surface shadow-sm',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const Table = ({ className, children, ...props }) => {
  return (
    <table className={cn('w-full border-collapse', className)} {...props}>
      {children}
    </table>
  );
};

export const TableCaption = ({ className, children, ...props }) => {
  return (
    <caption className={cn('sr-only', className)} {...props}>
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
    <tr
      className={cn(
        'border-b border-ui-background last:border-b-0 hover:bg-red-50/40',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHeaderCell = ({ className, children, ...props }) => {
  return (
    <th
      className={cn(
        'bg-ui-background px-6 py-4 text-left text-xs font-bold uppercase tracking-wide text-ui-slate',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell = ({ className, children, ...props }) => {
  return (
    <td className={cn('px-6 py-4 text-sm text-ui-text-main', className)} {...props}>
      {children}
    </td>
  );
};

export const TableEmptyState = ({
  colSpan,
  children = 'Sin resultados',
  className,
  ...props
}) => {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn('py-14 text-center text-ui-text-secondary', className)}
        {...props}
      >
        {children}
      </TableCell>
    </TableRow>
  );
};
