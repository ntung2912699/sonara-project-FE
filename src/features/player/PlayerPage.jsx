import { useState } from 'react';
import { ChevronLeft, ListMusic, Music2, Pause, Play, Repeat, Shuffle, SkipBack, SkipForward, Volume2, X } from '../../common/icons/index.js';
import { formatDuration } from '../../common/utils/appData.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';

function clock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function PlayerActions({
  track,
  playing,
  loading,
  currentTime,
  duration,
  volume,
  shuffle,
  repeatMode,
  onPlayPause,
  onPrevious,
  onNext,
  onSeek,
  onVolume,
  onShuffle,
  onRepeat,
  compact = false,
}) {
  const { t } = usePreferences();
  return <>
    <div className="player-transport">
      <button className={`player-mode-button ${shuffle ? 'player-mode-active' : ''}`} type="button" aria-label={t('Shuffle')} aria-pressed={shuffle} title={t('Shuffle')} onClick={onShuffle}><Shuffle size={compact ? 15 : 18} /></button>
      <button className="player-transport-button" type="button" aria-label={t('Previous track')} title={t('Previous track')} onClick={onPrevious}><SkipBack size={compact ? 17 : 20} fill="currentColor" /></button>
      <button className={`player-play-button ${compact ? 'player-play-small' : ''}`} type="button" aria-label={playing ? t('Pause') : t('Play')} disabled={loading || !track} onClick={onPlayPause}>
        {loading ? <span className="player-loading-dot" /> : playing ? <Pause size={compact ? 17 : 21} fill="currentColor" /> : <Play size={compact ? 17 : 21} fill="currentColor" />}
      </button>
      <button className="player-transport-button" type="button" aria-label={t('Next track')} title={t('Next track')} onClick={onNext}><SkipForward size={compact ? 17 : 20} fill="currentColor" /></button>
      <button className={`player-mode-button ${repeatMode !== 'off' ? 'player-mode-active' : ''}`} type="button" aria-label={`${t('Repeat')}: ${t(repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'List' : 'Off')}`} aria-pressed={repeatMode !== 'off'} title={`${t('Repeat')}: ${t(repeatMode === 'one' ? 'One' : repeatMode === 'all' ? 'List' : 'Off')}`} onClick={onRepeat}>
        <Repeat size={compact ? 15 : 18} />{repeatMode === 'one' && <span className="repeat-one-badge">1</span>}
      </button>
    </div>
    <div className={`player-timeline ${compact ? 'player-timeline-compact' : ''}`}>
      <span>{clock(currentTime)}</span>
      <input aria-label={t('Track position')} type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={Math.min(currentTime, duration || 0)} onChange={(event) => onSeek(Number(event.target.value))} disabled={!track || !duration} />
      <span>{clock(duration)}</span>
    </div>
    {!compact && <label className="player-volume" aria-label={t('Volume')}>
      <Volume2 size={17} /><input type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => onVolume(Number(event.target.value))} />
    </label>}
  </>;
}

export function MiniAudioPlayer(props) {
  const { track, onOpen, onClose } = props;
  const { t } = usePreferences();
  return <section className="global-audio-player" aria-label={t('Music player')}>
    <button className="audio-player-track" type="button" onClick={onOpen} aria-label={t('Open full player')}>
      <span className="audio-player-art"><Music2 size={17} />{track?.cover_image_url && <img src={track.cover_image_url} alt="" />}</span>
      <span><strong>{track?.title || t('Nothing playing')}</strong><small>{track?.artist || t('Choose a track to start')}</small></span>
    </button>
    <div className="mini-player-controls"><PlayerActions {...props} compact /></div>
    <button className="icon-button mini-player-open" type="button" title={t('Open full player')} aria-label={t('Open full player')} onClick={onOpen}><ListMusic size={17} /></button>
    <button className="icon-button mini-player-close" type="button" title={t('Close player')} aria-label={t('Close player')} onClick={onClose}><X size={16} /></button>
  </section>;
}

export function PlayerPage(props) {
  const { track, queue, queueIndex, onBack, onSelectQueueTrack } = props;
  const { t } = usePreferences();
  const [showQueue, setShowQueue] = useState(false);

  return <section className="full-player-page">
    <div className="full-player-toolbar">
      <button className="button button-secondary" type="button" onClick={onBack}><ChevronLeft size={15} />{t('Back to Sonora')}</button>
      <span>{t('NOW PLAYING')}</span>
      <button className="icon-button" type="button" aria-label={t('Toggle queue')} title={t('Toggle queue')} onClick={() => setShowQueue((value) => !value)}><ListMusic size={18} /></button>
    </div>
    <div className={`full-player-layout ${showQueue ? 'full-player-with-queue' : ''}`}>
      <div className="full-player-main">
        <div className="full-player-art">
          {track?.cover_image_url ? <img src={track.cover_image_url} alt="" /> : <Music2 size={74} />}
          <div className="full-player-art-glow" />
        </div>
        <div className="full-player-track-copy">
          <span className="eyebrow section-eyebrow">{t('SONORA PLAYER')}</span>
          <h1>{track?.title || t('Nothing playing')}</h1>
          <p>{track?.artist || t('Choose a track to start')}</p>
        </div>
        <div className="full-player-controls"><PlayerActions {...props} /></div>
      </div>
      {showQueue && <aside className="player-queue">
        <div className="player-queue-heading"><div><span className="eyebrow section-eyebrow">{t('UP NEXT')}</span><h2>{t('Playing queue')}</h2></div><span>{queue.length} {t('tracks')}</span></div>
        {queue.map((item, index) => <button key={`${item.id}-${index}`} type="button" className={`player-queue-item ${index === queueIndex ? 'player-queue-current' : ''}`} onClick={() => onSelectQueueTrack(index)}>
          <span className="player-queue-index">{index === queueIndex ? <Play size={13} fill="currentColor" /> : String(index + 1).padStart(2, '0')}</span>
          <span className="player-queue-copy"><strong>{item.title || t('Untitled track')}</strong><small>{item.artist || t('Unknown artist')}</small></span>
          <small>{formatDuration(item.duration_seconds)}</small>
        </button>)}
      </aside>}
    </div>
  </section>;
}
