import { ChevronLeft, ChevronRight } from '../icons/index.js';
import { usePreferences } from '../preferences/PreferencesContext.jsx';
export function Pagination({ meta, pageNumber, setPageNumber }) {
  const { t } = usePreferences();
  if (!meta || meta.last_page <= 1) return null;
  return <div className="pagination"><button className="icon-button" aria-label={t('Previous page')} disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}><ChevronLeft size={17} /></button><span>{t('Page')} <strong>{meta.current_page || pageNumber}</strong> {t('of')} {meta.last_page}</span><button className="icon-button" aria-label={t('Next page')} disabled={pageNumber >= meta.last_page} onClick={() => setPageNumber((value) => Math.min(meta.last_page, value + 1))}><ChevronRight size={17} /></button></div>;
}
