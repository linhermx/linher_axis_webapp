import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';
import {
  Button,
  InputField,
  Pagination,
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

const DEFAULT_PAGE_SIZE = 8;

const DataTable = ({ columns, data, onRowClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    setPage(1);
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

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

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
    <section className="data-table">
      <TableShell>
        <div className="data-table__toolbar">
          <div className="data-table__toolbar-wrap">
            <div className="data-table__search">
              <InputField
                id="employee-table-search"
                name="employee_table_search"
                label="Buscar en la tabla"
                srOnlyLabel
                type="search"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                leftIcon={<Search size={18} />}
              />
            </div>

            <Button type="button" variant="secondary">
              <Filter size={18} />
              <span>Filtros</span>
            </Button>
          </div>
        </div>

        <Table>
          <TableCaption>Listado de empleados con búsqueda, ordenamiento y paginación</TableCaption>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableHeaderCell key={col.key} scope="col" aria-sort={getAriaSort(col.key)}>
                  <button type="button" onClick={() => handleSort(col.key)} className="data-table__sort-button">
                    <span>{col.label}</span>
                    {sortConfig.key === col.key
                      ? (sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)
                      : null}
                  </button>
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <TableRow
                  key={row.id ?? idx}
                  className={isRowInteractive ? 'data-table__row--interactive' : ''}
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
              <TableEmptyState colSpan={columns.length}>No se encontraron resultados</TableEmptyState>
            )}
          </TableBody>
        </Table>

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredData.length}
          onPageChange={setPage}
          onPageSizeChange={(nextSize) => {
            setPageSize(nextSize);
            setPage(1);
          }}
        />
      </TableShell>
    </section>
  );
};

export default DataTable;
