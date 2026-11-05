import { TrackList } from '../../common/list/TrackList.jsx';
import { Pagination } from '../../common/list/Pagination.jsx';
import { ShieldCheck } from '../../common/icons/index.js';
export function TrackCollection({ title, subtitle, icon: Icon, items, loading, favoriteIds, onFavorite, onDownload, onPlay, onAddToPlaylist, emptyTitle, emptyText, meta, pageNumber, setPageNumber }) {
  return (
    <div className="page-content">
      <div className="section-heading collection-heading"><div className="collection-icon"><Icon size={20} /></div><div><div className="eyebrow section-eyebrow">YOUR LIBRARY</div><h1>{title}</h1><p>{subtitle}</p></div></div>
      <div className="collection-toolbar"><span>{meta?.total ?? items.length} {items.length === 1 ? 'track' : 'tracks'}</span><span className="collection-note"><ShieldCheck size={15} /> Your collection, always in sync</span></div>
      <TrackList items={items} loading={loading} favoriteIds={favoriteIds} onFavorite={onFavorite} onDownload={onDownload} onPlay={onPlay} onAddToPlaylist={onAddToPlaylist} emptyTitle={emptyTitle} emptyText={emptyText} />
      <Pagination meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />
    </div>
  );
}
