import { useId, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import Button from './Button';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('ellipsis-left');
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < total - 1) pages.push('ellipsis-right');

  pages.push(total);
  return pages;
};

const Pagination = ({
  page = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}) => {
  const pageSizeControlId = useId();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = clamp(page, 1, totalPages);

  const pages = useMemo(() => buildPages(currentPage, totalPages), [currentPage, totalPages]);
  const from = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = totalItems === 0 ? 0 : Math.min(totalItems, currentPage * pageSize);

  const goToPage = (nextPage) => {
    const safePage = clamp(nextPage, 1, totalPages);
    if (safePage === currentPage) return;
    onPageChange?.(safePage);
  };

  return (
    <div className={cn('ui-pagination', className)}>
      <div className="ui-pagination__left">
        <label htmlFor={pageSizeControlId}>Mostrar</label>
        <select
          id={pageSizeControlId}
          name="page_size"
          className="ui-select"
          value={pageSize}
          onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          aria-label="Cantidad de resultados por pagina"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>

      <div className="ui-pagination__pages">
        <span className="ui-pagination__range">{from}-{to} de {totalItems}</span>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Pagina anterior"
        >
          <ChevronLeft size={16} />
        </Button>

        {pages.map((item) => {
          if (typeof item === 'string') {
            return <span key={item} aria-hidden="true">...</span>;
          }

          return (
            <Button
              key={item}
              type="button"
              variant={item === currentPage ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => goToPage(item)}
              aria-label={`Ir a pagina ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
            >
              {item}
            </Button>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Pagina siguiente"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export default Pagination;
