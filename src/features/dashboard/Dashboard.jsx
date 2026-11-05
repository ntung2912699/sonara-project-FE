import { useCallback, useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../../common/api/client.js';
import { AUDIO_KEY, USER_KEY, readAudioJobs } from '../../common/utils/appData.js';
import { messageOf } from '../../common/message/messages.js';
import { navigation } from '../../common/config/navigation.js';
import { Sidebar } from '../../components/layout/Sidebar.jsx';
import { Avatar } from '../../common/avatar/Avatar.jsx';
import { DiscoverPage } from '../catalog/DiscoverPage.jsx';
import { TrackCollection } from '../library/TrackCollection.jsx';
import { PlaylistsPage } from '../playlists/PlaylistsPage.jsx';
import { TikTokPage } from '../tiktok/TikTokPage.jsx';
import { AudioStudio } from '../studio/AudioStudio.jsx';
import { ProfilePage } from '../profile/ProfilePage.jsx';
import { PlaylistModal } from '../playlists/PlaylistModal.jsx';
import { SongUploadModal } from '../catalog/SongUploadModal.jsx';
import { SongReportModal } from '../catalog/SongReportModal.jsx';
import { AdminPanel } from '../admin/AdminPanel.jsx';
import { Toast } from '../../common/message/Message.jsx';
import { AlertCircle, ChevronDown, ChevronRight, Download, Heart, Menu, Music2, Search, X } from '../../common/icons/index.js';
export function Dashboard({ token, user: initialUser, setUser, onLogout }) {
  const [page, setPage] = useState(initialUser?.role === 'admin' ? 'admin' : 'discover');
  const [profile, setProfile] = useState(initialUser);
  const [items, setItems] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [meta, setMeta] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [toast, setToast] = useState(null);
  const [currentPlayback, setCurrentPlayback] = useState(null);
  const [modal, setModal] = useState(null);
  const [playlistCache, setPlaylistCache] = useState([]);
  const audioStorageKey = `${AUDIO_KEY}:${profile?.id ?? 'current'}`;
  const [audioJobs, setAudioJobs] = useState(() => readAudioJobs(audioStorageKey));
  const [mobileNav, setMobileNav] = useState(false);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    setDashboardSearch(query);
  }, [query]);

  useEffect(() => {
    api.get('/profile', token).then((result) => {
      setProfile(result.data);
      setUser(result.data);
      localStorage.setItem(USER_KEY, JSON.stringify(result.data));
      if (result.data.role === 'admin') setPage('admin');
    }).catch((error) => {
      if (error.status === 401) onLogout();
      else setLoadError(messageOf(error));
    });
    api.get('/me/favorites?per_page=100', token).then((result) => {
      setFavoriteIds(new Set((result.data || []).map((track) => String(track.id))));
    }).catch((error) => {
      if (error.status !== 401) showToast(messageOf(error), 'error');
    });
  }, [token, onLogout, setUser, showToast]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function loadPage() {
      setLoading(true);
      setLoadError('');
      setMeta(null);
      try {
        let result;
        if (page === 'discover') {
          const params = new URLSearchParams({ page: String(pageNumber), per_page: '24' });
          if (query.trim()) params.set('q', query.trim());
          result = await api.get(`/tracks?${params}`, token, { signal: controller.signal });
          if (active) { setItems(result.data || []); setMeta(result.meta); }
        } else if (page === 'favorites') {
          result = await api.get(`/me/favorites?page=${pageNumber}`, token, { signal: controller.signal });
          if (active) { setItems(result.data || []); setMeta(result.meta); }
        } else if (page === 'playlists') {
          result = await api.get(`/playlists?page=${pageNumber}`, token, { signal: controller.signal });
          if (active) { setItems(result.data || []); setMeta(result.meta); setPlaylistCache(result.data || []); }
        } else if (page === 'downloads') {
          result = await api.get(`/me/downloads?page=${pageNumber}`, token, { signal: controller.signal });
          if (active) {
            setItems((result.data || []).filter((download) => download.track).map((download) => ({
              ...download.track,
              downloaded_at: download.downloaded_at,
              download_id: download.id,
            })));
            setMeta(result.meta);
          }
        } else if (page === 'imports') {
          result = await api.get(`/me/tiktok-imports?page=${pageNumber}`, token, { signal: controller.signal });
          if (active) { setItems(result.data || []); setMeta(result.meta); }
        } else if (page === 'profile') {
          result = await api.get('/profile', token, { signal: controller.signal });
          if (active) { setProfile(result.data); setUser(result.data); }
        } else if (active) {
          setItems([]);
        }
      } catch (error) {
        if (error.name !== 'AbortError' && active) {
          setLoadError(messageOf(error));
          if (error.status === 401) onLogout();
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadPage();
    return () => { active = false; controller.abort(); };
  }, [page, token, query, pageNumber, refresh, setUser, onLogout]);

  useEffect(() => {
    localStorage.setItem(audioStorageKey, JSON.stringify(audioJobs));
  }, [audioJobs, audioStorageKey]);

  useEffect(() => {
    const activeJobs = audioJobs.filter((job) => job.status === 'queued' || job.status === 'processing');
    if (!activeJobs.length) return undefined;
    let cancelled = false;
    const poll = async () => {
      const updates = await Promise.all(activeJobs.map(async (job) => {
        try {
          const result = await api.get(`/audio-processing/${job.id}`, token);
          return { ...result.data, id: job.id, poll_error: '' };
        } catch (error) {
          if (error.status === 401) onLogout();
          return { ...job, poll_error: messageOf(error) };
        }
      }));
      if (!cancelled) setAudioJobs((current) => current.map((job) => updates.find((update) => String(update.id) === String(job.id)) || job));
    };
    const timer = window.setInterval(poll, 8000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [audioJobs, token, onLogout]);

  function navigate(nextPage) {
    setPage(nextPage);
    setPageNumber(1);
    setMobileNav(false);
  }

  function searchCatalog(event) {
    event.preventDefault();
    setQuery(dashboardSearch.trim());
    navigate('discover');
  }

  async function toggleFavorite(track) {
    const id = String(track.id);
    const wasFavorite = favoriteIds.has(id);
    try {
      if (wasFavorite) await api.delete(`/tracks/${track.id}/favorite`, token);
      else await api.post(`/tracks/${track.id}/favorite`, {}, token);
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (wasFavorite) next.delete(id);
        else next.add(id);
        return next;
      });
      showToast(wasFavorite ? 'Removed from your liked tracks.' : 'Added to your liked tracks.');
      if (page === 'favorites') setRefresh((value) => value + 1);
    } catch (error) {
      showToast(messageOf(error), 'error');
    }
  }

  async function handleDownload(track) {
    try {
      await downloadFile(`/tracks/${track.id}/download`, token, `${track.title || 'track'}.mp3`);
      showToast('Your download has started.');
      if (page === 'downloads') setRefresh((value) => value + 1);
    } catch (error) {
      showToast(messageOf(error), 'error');
    }
  }

  async function handlePlay(track) {
    try {
      const result = await api.get(`/tracks/${track.id}/play-url`, token);
      setCurrentPlayback({
        title: track.title || 'Untitled track',
        artist: track.artist || 'Unknown artist',
        url: new URL(
          result.data.url,
          api.baseUrl.startsWith('http') ? `${api.baseUrl}/` : window.location.origin,
        ).toString(),
      });
    } catch (error) {
      showToast(messageOf(error), 'error');
    }
  }

  async function openAddToPlaylist(track) {
    try {
      const result = await api.get('/playlists?per_page=100', token);
      setPlaylistCache(result.data || []);
      setModal({ type: 'add-track', track });
    } catch (error) {
      showToast(messageOf(error), 'error');
    }
  }

  async function logout() {
    try {
      await api.post('/logout', {}, token);
      onLogout();
    } catch (error) {
      showToast(messageOf(error), 'error');
    }
  }

  const currentTitle = navigation.find((item) => item.id === page)?.label || (page === 'profile' ? 'Your profile' : 'Audio studio');
  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} profile={profile} onLogout={logout} mobileOpen={mobileNav} closeMobile={() => setMobileNav(false)} />
      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>SONORA</span><ChevronRight size={14} /><strong>{currentTitle}</strong></div>
          <form className="dashboard-search search-box" onSubmit={searchCatalog} role="search">
            <Search size={16} aria-hidden="true" />
            <input
              aria-label="Search Sonora's licensed music catalog"
              value={dashboardSearch}
              onChange={(event) => setDashboardSearch(event.target.value)}
              placeholder="Search songs and artists"
            />
            <button type="submit" className="dashboard-search-submit">Search</button>
          </form>
          <div className="topbar-actions">
            <div className="topbar-status"><span className="status-pulse" /> Your music, in one place</div>
            <button className="profile-chip" onClick={() => navigate('profile')} aria-label="Open profile">
              <Avatar user={profile} size="small" /><span>{profile?.name || 'Your account'}</span><ChevronDown size={14} />
            </button>
          </div>
        </header>
        <div className="content-area">
          {loadError && <div className="global-error"><AlertCircle size={17} /><span>{loadError}</span><button onClick={() => setRefresh((value) => value + 1)}>Try again</button></div>}
          {page === 'discover' && <DiscoverPage
            items={items} loading={loading} query={query} setQuery={(value) => { setQuery(value); setPageNumber(1); }}
            favoriteIds={favoriteIds} onFavorite={toggleFavorite} onDownload={handleDownload} onPlay={handlePlay}
            onAddToPlaylist={openAddToPlaylist} meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber}
            onCreatePlaylist={() => setModal({ type: 'create-playlist' })}
            onAddSongs={() => setModal({ type: 'upload-songs' })}
            onReport={(track) => setModal({ type: 'report-song', track })}
          />}
          {page === 'admin' && profile?.role === 'admin' && <AdminPanel
            token={token}
            currentUser={profile}
            showToast={showToast}
            onAddSongs={() => setModal({ type: 'upload-songs' })}
          />}
          {page === 'favorites' && <TrackCollection title="Your liked tracks" subtitle="All the songs you’ve saved, together in one place." icon={Heart}
            items={items} loading={loading} favoriteIds={favoriteIds} onFavorite={toggleFavorite} onDownload={handleDownload} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist}
            emptyTitle="A little love goes a long way" emptyText="Tap the heart on any track to keep it close." meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {page === 'downloads' && <TrackCollection title="Your downloads" subtitle="Rights-cleared tracks you’ve saved for offline listening." icon={Download}
            items={items} loading={loading} favoriteIds={favoriteIds} onFavorite={toggleFavorite} onDownload={handleDownload} onPlay={handlePlay} onAddToPlaylist={openAddToPlaylist}
            emptyTitle="Your offline library is waiting" emptyText="Download an available track and it’ll show up here." meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {page === 'playlists' && <PlaylistsPage items={items} loading={loading} onCreate={() => setModal({ type: 'create-playlist' })} onBrowse={() => navigate('discover')}
            onEdit={(playlist) => setModal({ type: 'edit-playlist', playlist })} onDelete={(playlist) => setModal({ type: 'delete-playlist', playlist })}
            onRemoveTrack={async (playlist, track) => {
              try {
                await api.delete(`/playlists/${playlist.id}/tracks/${track.id}`, token);
                showToast('Track removed from playlist.');
                setRefresh((value) => value + 1);
              } catch (error) { showToast(messageOf(error), 'error'); }
            }} onDownload={handleDownload} onPlay={handlePlay} favoriteIds={favoriteIds} onFavorite={toggleFavorite} />}
          {page === 'imports' && <TikTokPage items={items} loading={loading} token={token} showToast={showToast} onRefresh={() => setRefresh((value) => value + 1)} meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />}
          {page === 'studio' && <AudioStudio token={token} jobs={audioJobs} setJobs={setAudioJobs} showToast={showToast} />}
          {page === 'profile' && <ProfilePage profile={profile} token={token} onSaved={(nextProfile) => {
            setProfile(nextProfile);
            setUser(nextProfile);
            localStorage.setItem(USER_KEY, JSON.stringify(nextProfile));
            showToast('Your profile has been updated.');
          }} />}
        </div>
      </main>
      {modal && ['create-playlist', 'edit-playlist', 'add-track', 'delete-playlist'].includes(modal.type) && <PlaylistModal modal={modal} setModal={setModal} token={token} playlists={playlistCache} setRefresh={setRefresh} showToast={showToast} />}
      {modal?.type === 'upload-songs' && <SongUploadModal setModal={setModal} token={token} setRefresh={setRefresh} showToast={showToast} />}
      {modal?.type === 'report-song' && <SongReportModal track={modal.track} setModal={setModal} token={token} showToast={showToast} />}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
      {currentPlayback && <div className="global-audio-player">
        <div className="audio-player-track"><Music2 size={17} /><span><strong>{currentPlayback.title}</strong><small>{currentPlayback.artist}</small></span></div>
        <audio controls autoPlay src={currentPlayback.url} onError={() => showToast('This licensed track could not be played.', 'error')} />
        <button className="icon-button" aria-label="Close audio player" onClick={() => setCurrentPlayback(null)}><X size={16} /></button>
      </div>}
    </div>
  );
}
