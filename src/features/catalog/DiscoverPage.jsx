import { TrackList } from '../../common/list/TrackList.jsx';
import { Pagination } from '../../common/list/Pagination.jsx';
import { AudioLines, ChevronRight, Disc3, Music2, Plus, Search, ShieldCheck, SlidersHorizontal } from '../../common/icons/index.js';
export function DiscoverPage({ items, loading, query, setQuery, favoriteIds, onFavorite, onDownload, onPlay, onAddToPlaylist, onReport, meta, pageNumber, setPageNumber, onCreatePlaylist, onAddSongs }) {
  return (
    <div className="page-content">
      <section className="welcome-banner">
        <div className="welcome-copy">
          <div className="eyebrow eyebrow-dark"><span className="welcome-dot" /> THE SONORA CATALOG</div>
          <h1>Find the sound<br />that <em>feels like you.</em></h1>
          <p>Thoughtful music for every mood, moment, and making.</p>
          <button className="button button-light" onClick={() => document.getElementById('catalog-search')?.focus()}>Explore tracks <ChevronRight size={16} /></button>
        </div>
        <div className="welcome-visual" aria-hidden="true">
          <div className="welcome-ring ring-one" /><div className="welcome-ring ring-two" /><div className="welcome-ring ring-three" />
          <div className="welcome-record"><div className="record-center"><AudioLines size={24} /></div></div>
          <div className="welcome-floating floating-a"><Music2 size={18} /></div><div className="welcome-floating floating-b"><Disc3 size={20} /></div>
          <span className="visual-word">SONORA<br /><small>DISCOVER YOUR SOUND</small></span>
        </div>
        <div className="banner-sparkle sparkle-a">✦</div><div className="banner-sparkle sparkle-b">✳</div>
      </section>
      <div className="section-heading catalog-heading">
        <div><div className="eyebrow section-eyebrow">AUDIO LIBRARY</div><h2>Explore the catalog</h2><p>Licensed tracks, ready for your next idea.</p></div>
        <div className="catalog-tools"><label className="search-box" htmlFor="catalog-search"><Search size={17} /><input id="catalog-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tracks, artists, albums…" /></label><button className="button button-primary add-songs-button" aria-label="Add songs" onClick={onAddSongs}><Plus size={16} /> Add songs</button><button className="button button-secondary create-playlist-button" aria-label="Create a playlist" onClick={onCreatePlaylist}><Plus size={16} /> New playlist</button></div>
      </div>
      <div className="catalog-meta"><span><span className="online-dot" /> {meta?.total ?? items.length} tracks</span><span className="filter-button"><SlidersHorizontal size={15} /> Licensed music</span></div>
      <TrackList items={items} loading={loading} favoriteIds={favoriteIds} onFavorite={onFavorite} onDownload={onDownload} onPlay={onPlay} onAddToPlaylist={onAddToPlaylist} onReport={onReport} emptyTitle={query ? 'No tracks found' : 'The catalog is getting ready'} emptyText={query ? 'Try another artist, title, or album.' : 'Check back soon for new music.'} />
      <Pagination meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />
      <div className="service-note"><ShieldCheck size={16} /><span>Every track is listed with its source and license. Always review the license before using a track in a project.</span></div>
    </div>
  );
}
