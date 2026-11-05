import { ArrowDownToLine, Flag, Heart, ListMusic, LockKeyhole, LoaderCircle, Music2, Play, ShieldCheck } from '../icons/index.js';
import { formatDuration } from '../utils/appData.js';
import { EmptyState } from './EmptyState.jsx';
import { usePreferences } from '../preferences/PreferencesContext.jsx';

export function TrackList({ items, loading, favoriteIds, onFavorite, onDownload, onPlay, onAddToPlaylist, onReport, emptyTitle, emptyText }) {
  const { t } = usePreferences();
  if (loading) {
    return (
      <div className="track-list track-list-loading">
        <div className="loading-state"><LoaderCircle className="spin" size={24} /><span>{t('Loading your music…')}</span></div>
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
            <h3 title={track.title}>{track.title || t('Untitled track')}</h3>
            <p title={track.artist}>{track.artist || t('Unknown artist')}</p>
          </div>
          <div className="track-row-meta">
            <span title={track.album || track.source || 'Sonora catalog'}>{track.album || track.source || t('Sonora catalog')}</span>
            {track.downloadable && <span className="licensed-mark"><ShieldCheck size={12} /> {t('Downloadable')}</span>}
          </div>
          <span className="track-row-duration">{formatDuration(track.duration_seconds)}</span>
          <div className="track-row-actions">
            <button
              className={`track-row-action track-row-favorite ${favoriteIds.has(String(track.id)) ? 'is-favorite' : ''}`}
              aria-label={t(favoriteIds.has(String(track.id)) ? 'Remove from liked tracks' : 'Add to liked tracks')}
              title={t(favoriteIds.has(String(track.id)) ? 'Remove from liked tracks' : 'Add to liked tracks')}
              onClick={() => onFavorite(track)}
            >
              <Heart size={16} fill={favoriteIds.has(String(track.id)) ? 'currentColor' : 'none'} />
            </button>
            <button
              className="track-row-action track-row-play"
              disabled={!track.audio_path}
              aria-label={track.audio_path ? `${t('Play')} ${track.title}` : t('Playback unavailable')}
              title={track.audio_path ? t('Play') : t('Playback unavailable')}
              onClick={() => onPlay(track, items)}
            >
              <Play size={15} />
            </button>
            <button
              className="track-row-action"
              aria-label={`${t('Add to playlist')}: ${track.title}`}
              title={t('Add to playlist')}
              onClick={() => onAddToPlaylist(track)}
            >
              <ListMusic size={16} />
            </button>
            {onReport && (
              <button
                className="track-row-action"
                aria-label={`${t('Report song')}: ${track.title}`}
                title={t('Report song')}
                onClick={() => onReport(track)}
              >
                <Flag size={15} />
              </button>
            )}
            <button
              className="track-row-action track-row-download"
              disabled={!track.downloadable}
              aria-label={track.downloadable ? `${t('Download')} ${track.title}` : t('Download unavailable')}
              title={track.downloadable ? t('Download') : t('Download unavailable')}
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
