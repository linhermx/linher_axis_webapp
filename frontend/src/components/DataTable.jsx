import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import {
  Button,
  InputField,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableEmptyState,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableShell,
} from './ui';

const DataTable = ({ columns, data, onRowClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    const list = [...data];

    return list.sort((a, b) => {
      if (!sortConfig.key) return 0;

      const valA = String(a[sortConfig.key] ?? '').toLowerCase();
      const valB = String(b[sortConfig.key] ?? '').toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const filteredData = useMemo(
    () =>
      sortedData.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [searchTerm, sortedData]
  );

  const isRowInteractive = typeof onRowClick === 'function';

  const getAriaSort = (key) => {
    if (sortConfig.key !== key) return 'none';
    return sortConfig.direction === 'asc' ? 'ascending' : 'descending';
  };

  const handleRowKeyDown = (event, row) => {
    if (!isRowInteractive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <section className="mt-6">
      <TableShell>
        <div className="border-b border-ui-light-slate p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ui-light-slate bg-ui-surface-subtle px-4 py-3">
            <div className="w-full max-w-[340px]">
              <InputField
                id="employee-table-search"
                name="employee_table_search"
                label="Buscar en la tabla"
                srOnlyLabel
                type="search"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                containerClassName="space-y-0"
                leftIcon={<Search size={18} />}
              />
            </div>

            <Button type="button" variant="secondary">
              <Filter size={18} />
              <span>Filtros</span>
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Listado de empleados con búsqueda y ordenamiento</TableCaption>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableHeaderCell key={col.key} scope="col" aria-sort={getAriaSort(col.key)}>
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                    >
                      <span>{col.label}</span>
                      {sortConfig.key === col.key &&
                        (sortConfig.direction === 'asc' ? (
                          <ChevronUp size={14} aria-hidden="true" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" />
                        ))}
                    </button>
                  </TableHeaderCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((row, idx) => (
                  <TableRow
                    key={row.id ?? idx}
                    className={isRowInteractive ? 'cursor-pointer' : ''}
                    onClick={isRowInteractive ? () => onRowClick(row) : undefined}
                    onKeyDown={(event) => handleRowKeyDown(event, row)}
                    tabIndex={isRowInteractive ? 0 : undefined}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key}>{row[col.key] ?? '-'}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableEmptyState colSpan={columns.length}>
                  No se encontraron resultados
                </TableEmptyState>
              )}
            </TableBody>
          </Table>
        </div>
      </TableShell>
    </section>
  );
};

export default DataTable;
