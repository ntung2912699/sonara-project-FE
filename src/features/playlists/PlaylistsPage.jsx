import { useEffect, useState } from 'react';
import { EmptyState } from '../../common/list/EmptyState.jsx';
import { DataTable } from '../../common/table/DataTable.jsx';
import { PlaylistArtwork } from './PlaylistArtwork.jsx';
import { ChevronRight, Heart, ListMusic, Music2, Plus, Pencil, Trash2, X, ArrowDownToLine, LoaderCircle } from '../../common/icons/index.js';
export function PlaylistsPage({ items, loading, onCreate, onBrowse, onEdit, onDelete, onRemoveTrack, onDownload, onPlay, favoriteIds, onFavorite }) {
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (selected) setSelected(items.find((playlist) => String(playlist.id) === String(selected.id)) || null);
  }, [items, selected?.id]);

  return (
    <div className="page-content">
      <div className="section-heading playlist-heading"><div><div className="eyebrow section-eyebrow">YOUR COLLECTION</div><h1>Playlists</h1><p>Make a place for every mood, memory, or moment.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={16} /> Create playlist</button></div>
      {loading ? <div className="loading-state playlist-loading"><LoaderCircle className="spin" size={24} /><span>Loading playlists…</span></div>
        : !items.length ? <EmptyState icon={ListMusic} title="Your first playlist starts here" text="Collect tracks into a playlist for any occasion." action={<button className="button button-primary" onClick={onCreate}><Plus size={16} /> Create a playlist</button>} />
          : <div className="playlist-layout">
            <div className="playlist-grid">{items.map((playlist, index) => (
              <button key={playlist.id} className={`playlist-card ${String(selected?.id) === String(playlist.id) ? 'playlist-selected' : ''}`} onClick={() => setSelected(playlist)}>
                <PlaylistArtwork index={index} tracks={playlist.tracks} />
                <span className="playlist-card-copy"><strong>{playlist.name}</strong><small>{playlist.tracks?.length || 0} tracks · {playlist.is_public ? 'Public' : 'Private'}</small></span>
                <ChevronRight size={16} />
              </button>
            ))}</div>
            {selected && <section className="playlist-detail">
              <div className="playlist-detail-head"><PlaylistArtwork index={items.indexOf(selected)} tracks={selected.tracks} large /><div className="playlist-detail-title"><div className="eyebrow section-eyebrow">{selected.is_public ? 'PUBLIC PLAYLIST' : 'PRIVATE PLAYLIST'}</div><h2>{selected.name}</h2><p>{selected.description || 'A collection of your favorite sounds.'}</p><span>{selected.tracks?.length || 0} tracks</span></div>
                <div className="playlist-detail-actions"><button className="icon-button" title="Edit playlist" onClick={() => onEdit(selected)}><Pencil size={16} /></button><button className="icon-button danger-icon" title="Delete playlist" onClick={() => onDelete(selected)}><Trash2 size={16} /></button><button className="button button-secondary" onClick={onBrowse}><Plus size={15} /> Find tracks</button></div>
              </div>
              {selected.tracks?.length ? <PlaylistTrackTable tracks={selected.tracks} playlist={selected} favoriteIds={favoriteIds} onFavorite={onFavorite} onDownload={onDownload} onPlay={onPlay} onRemoveTrack={onRemoveTrack} />
                : <div className="playlist-empty"><ListMusic size={20} /><span>No tracks yet. Add a track from Discover to get started.</span></div>}
            </section>}
          </div>}
    </div>
  );
}

function PlaylistTrackTable({ tracks, playlist, favoriteIds, onFavorite, onDownload, onPlay, onRemoveTrack }) {
  const columns = [
    { key: 'index', label: '#', className: 'row-index', render: (_, index) => String(index + 1).padStart(2, '0') },
    { key: 'track', label: 'Track', className: 'playlist-track-main', render: (track) => <><span className="mini-cover"><Music2 size={15} /></span><span className="playlist-track-copy"><strong>{track.title}</strong><small>{track.artist || 'Unknown artist'}</small></span></> },
    { key: 'duration', label: 'Duration', className: 'row-duration', render: (track) => {
      const seconds = Number(track.duration_seconds);
      return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '--:--';
    } },
    { key: 'favorite', label: 'Like', className: 'table-action-cell', render: (track) => <button className={`icon-button row-heart ${favoriteIds.has(String(track.id)) ? 'is-favorite' : ''}`} aria-label="Toggle liked track" onClick={() => onFavorite(track)}><Heart size={15} fill={favoriteIds.has(String(track.id)) ? 'currentColor' : 'none'} /></button> },
    { key: 'play', label: 'Play', className: 'table-action-cell', render: (track) => <button className="icon-button" title="Play track" aria-label={`Play ${track.title}`} disabled={!track.audio_path} onClick={() => onPlay(track)}><Music2 size={15} /></button> },
    { key: 'download', label: 'Download', className: 'table-action-cell', render: (track) => <button className="icon-button" title="Download" disabled={!track.downloadable} onClick={() => onDownload(track)}><ArrowDownToLine size={15} /></button> },
    { key: 'remove', label: 'Remove', className: 'table-action-cell', render: (track) => <button className="icon-button danger-icon" title="Remove from playlist" onClick={() => onRemoveTrack(playlist, track)}><X size={16} /></button> },
  ];
  return <DataTable className="playlist-track-list" rowClassName="playlist-track-row" columns={columns} rows={tracks} rowKey="id" />;
}
