import { ArrowDownToLine, Flag, Heart, ListMusic, LockKeyhole, LoaderCircle, Music2, Play, ShieldCheck } from '../icons/index.js';
import { formatDuration } from '../utils/appData.js';
import { EmptyState } from './EmptyState.jsx';

export function TrackList({ items, loading, favoriteIds, onFavorite, onDownload, onPlay, onAddToPlaylist, onReport, emptyTitle, emptyText }) {
  if (loading) {
    return (
      <div className="track-list track-list-loading">
        <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>Loading your music…</span></div>
      </div>
    );
  }

  if (!items.length) return <EmptyState icon={Music2} title={emptyTitle} text={emptyText} />;

  return (
    <div className="track-list" role="list">
      {items.map((track, index) => (
        <article className="track-row" key={track.id ?? index} role="listitem">
          <div className="track-row-art" aria-hidden="true">
            <Music2 size={18} />
            {track.cover_image_url && (
              <img src={track.cover_image_url} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            )}
          </div>
          <div className="track-row-main">
            <h3 title={track.title}>{track.title || 'Untitled track'}</h3>
            <p title={track.artist}>{track.artist || 'Unknown artist'}</p>
          </div>
          <div className="track-row-meta">
            <span title={track.album || track.source || 'Sonora catalog'}>{track.album || track.source || 'Sonora catalog'}</span>
            {track.downloadable && <span className="licensed-mark"><ShieldCheck size={12} /> Downloadable</span>}
          </div>
          <span className="track-row-duration">{formatDuration(track.duration_seconds)}</span>
          <div className="track-row-actions">
            <button
              className={`track-row-action track-row-favorite ${favoriteIds.has(String(track.id)) ? 'is-favorite' : ''}`}
              aria-label={favoriteIds.has(String(track.id)) ? 'Remove from liked tracks' : 'Add to liked tracks'}
              title={favoriteIds.has(String(track.id)) ? 'Remove from liked tracks' : 'Add to liked tracks'}
              onClick={() => onFavorite(track)}
            >
              <Heart size={16} fill={favoriteIds.has(String(track.id)) ? 'currentColor' : 'none'} />
            </button>
            <button
              className="track-row-action track-row-play"
              disabled={!track.audio_path}
              aria-label={track.audio_path ? `Play ${track.title}` : 'Playback unavailable'}
              title={track.audio_path ? 'Play' : 'Playback unavailable'}
              onClick={() => onPlay(track)}
            >
              <Play size={15} />
            </button>
            <button
              className="track-row-action"
              aria-label={`Add ${track.title} to playlist`}
              title="Add to playlist"
              onClick={() => onAddToPlaylist(track)}
            >
              <ListMusic size={16} />
            </button>
            {onReport && (
              <button
                className="track-row-action"
                aria-label={`Report ${track.title}`}
                title="Report song"
                onClick={() => onReport(track)}
              >
                <Flag size={15} />
              </button>
            )}
            <button
              className="track-row-action track-row-download"
              disabled={!track.downloadable}
              aria-label={track.downloadable ? `Download ${track.title}` : 'Download unavailable'}
              title={track.downloadable ? 'Download' : 'Download unavailable'}
              onClick={() => onDownload(track)}
            >
              {track.downloadable ? <ArrowDownToLine size={16} /> : <LockKeyhole size={15} />}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
