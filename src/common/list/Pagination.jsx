import { ChevronLeft, ChevronRight } from '../icons/index.js';
export function Pagination({ meta, pageNumber, setPageNumber }) {
  if (!meta || meta.last_page <= 1) return null;
  return <div className="pagination"><button className="icon-button" disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><span>Page <strong>{meta.current_page || pageNumber}</strong> of {meta.last_page}</span><button className="icon-button" disabled={pageNumber >= meta.last_page} onClick={() => setPageNumber((value) => Math.min(meta.last_page, value + 1))}><ChevronRight size={17} /></button></div>;
}
