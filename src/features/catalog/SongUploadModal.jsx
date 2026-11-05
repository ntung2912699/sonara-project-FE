import { useEffect, useRef, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { Modal } from '../../common/modal/Modal.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { Check, FileAudio2, LoaderCircle, Plus, Trash2, Upload, X } from '../../common/icons/index.js';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

function songTitle(file) {
  return file.name.replace(/\.mp3$/i, '').trim();
}

export function SongUploadModal({ setModal, token, setRefresh, showToast }) {
  const [songs, setSongs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemovalId, setConfirmRemovalId] = useState(null);
  const fileInput = useRef(null);
  const close = () => {
    if (!busy) setModal(null);
  };

  useEffect(() => {
    let active = true;
    api.get('/me/tracks?per_page=100', token)
      .then((result) => {
        if (active) setUploads(result.data || []);
      })
      .catch((requestError) => {
        if (active) setError(messageOf(requestError));
      });
    return () => { active = false; };
  }, [token]);

  function addFiles(fileList) {
    if (busy) return;
    const selected = Array.from(fileList || []);
    const additions = [];
    const errors = [];

    for (const file of selected) {
      if (!file.name.toLowerCase().endsWith('.mp3')) {
        errors.push(`${file.name}: choose an MP3 file.`);
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: files must be 200 MB or smaller.`);
      } else {
        additions.push(file);
      }
    }

    const next = [...songs];
    for (const file of additions) {
      const duplicate = next.some((song) => song.file.name === file.name
        && song.file.size === file.size
        && song.file.lastModified === file.lastModified);
      if (duplicate) continue;
      if (next.length >= MAX_FILES) {
        errors.push(`You can upload up to ${MAX_FILES} songs at a time.`);
        break;
      }
      next.push({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
        file,
        title: songTitle(file),
        status: 'ready',
        error: '',
      });
    }
    setSongs(next);

    setError(errors.join(' '));
    if (fileInput.current) fileInput.current.value = '';
  }

  function updateSong(id, changes) {
    setSongs((current) => current.map((song) => song.id === id ? { ...song, ...changes } : song));
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || !rightsConfirmed || songs.length === 0) return;

    const readySongs = songs;
    if (readySongs.some((song) => !song.title.trim())) {
      setError('Give every song a title before uploading.');
      return;
    }

    setBusy(true);
    setError('');
    let uploadedCount = 0;

    for (const song of readySongs) {
      updateSong(song.id, { status: 'uploading', error: '' });
      const form = new FormData();
      form.append('audio', song.file);
      form.append('title', song.title.trim());
      form.append('rights_confirmed', '1');

      try {
        const result = await api.upload('/tracks', form, token);
        setUploads((current) => [result.data, ...current.filter((track) => track.id !== result.data.id)]);
        setSongs((current) => current.filter((item) => item.id !== song.id));
        uploadedCount += 1;
      } catch (requestError) {
        updateSong(song.id, { status: 'error', error: messageOf(requestError) });
      }
    }

    if (uploadedCount > 0) {
      setRefresh((current) => current + 1);
      showToast(`${uploadedCount} song${uploadedCount === 1 ? '' : 's'} added to the catalog.`);
    }
    setBusy(false);
  }

  async function removeUpload(track) {
    setRemovingId(track.id);
    setError('');
    try {
      await api.delete(`/tracks/${track.id}`, token);
      setUploads((current) => current.filter((item) => item.id !== track.id));
      setRefresh((current) => current + 1);
      setConfirmRemovalId(null);
      showToast('Your song was removed from the catalog.');
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setRemovingId(null);
    }
  }

  const readyCount = songs.length;

  return (
    <Modal titleId="song-upload-title" onClose={close} className="song-upload-modal">
      <div className="modal-header">
        <div><div className="eyebrow section-eyebrow">SHARE YOUR MUSIC</div><h2 id="song-upload-title">Add songs to the catalog</h2></div>
        <button className="icon-button" onClick={close} aria-label="Close dialog" disabled={busy}><X size={18} /></button>
      </div>
      <p className="modal-description">Choose up to {MAX_FILES} MP3 songs. Rename any song before uploading; its filename is used by default.</p>
      <form onSubmit={submit}>
        <div
          className={`song-drop-zone ${dragging ? 'song-drop-zone-active' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}
        >
          <input
            ref={fileInput}
            type="file"
            accept=".mp3,audio/mpeg"
            multiple
            hidden
            onChange={(event) => addFiles(event.target.files)}
            disabled={busy}
          />
          <span className="song-drop-icon"><Upload size={19} /></span>
          <strong>Drop MP3 songs here</strong>
          <span>or <button type="button" className="text-link" onClick={() => fileInput.current?.click()} disabled={busy}>browse files</button></span>
          <small>Up to {MAX_FILES} songs · 200 MB per file</small>
        </div>

        {songs.length > 0 && <div className="song-queue">
          <div className="song-queue-heading"><strong>Selected songs</strong><span>{songs.length}/{MAX_FILES}</span></div>
          {songs.map((song) => <div className="song-queue-row" key={song.id}>
            <FileAudio2 size={17} />
            <div className="song-queue-info">
              <div className="song-title-label"><label htmlFor={`song-title-${song.id}`}>Song title</label><button type="button" className="text-link" onClick={() => updateSong(song.id, { title: songTitle(song.file) })} disabled={busy || song.status === 'uploaded'}>Use file name</button></div>
              <input
                id={`song-title-${song.id}`}
                className="text-input"
                value={song.title}
                maxLength={255}
                onChange={(event) => updateSong(song.id, { title: event.target.value })}
                disabled={busy}
              />
              <small>{song.file.name} · {(song.file.size / (1024 * 1024)).toFixed(1)} MB</small>
              {song.error && <small className="song-upload-error">{song.error}</small>}
            </div>
            <div className="song-queue-status">
              {song.status === 'uploading' ? <LoaderCircle className="spin" size={16} aria-label="Uploading" />
                : <button
                    className="icon-button"
                    type="button"
                    aria-label={`Remove ${song.title} from selection`}
                    onClick={() => setSongs((current) => current.filter((item) => item.id !== song.id))}
                    disabled={busy}
                  ><X size={16} /></button>}
            </div>
          </div>)}
        </div>}

        <label className="rights-check">
          <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} required disabled={busy} />
          <span className="custom-check"><Check size={12} /></span>
          <span>I own or have permission to publish and distribute every song I submit.</span>
        </label>
        {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
        <div className="modal-actions">
          <button className="button button-secondary" type="button" onClick={close} disabled={busy}>Close</button>
          <button className="button button-primary" type="submit" disabled={busy || !readyCount || !rightsConfirmed}>
            {busy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}
            {busy ? 'Uploading…' : `Upload ${readyCount || ''} song${readyCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </form>

      <section className="my-uploads">
        <div className="song-queue-heading"><strong>Your submitted songs</strong><span>{uploads.length}</span></div>
        {uploads.length === 0 ? <p className="my-uploads-empty">Songs you submit will appear here. You can remove them from the catalog at any time.</p>
          : <div className="my-uploads-list">{uploads.map((track) => <div className="my-upload-row" key={track.id}>
            <FileAudio2 size={16} />
            <span title={track.title}>{track.title}</span>
            {confirmRemovalId === track.id
              ? <><button type="button" className="text-link danger-link" onClick={() => removeUpload(track)} disabled={removingId === track.id}>{removingId === track.id ? 'Removing…' : 'Confirm remove'}</button><button type="button" className="text-link" onClick={() => setConfirmRemovalId(null)} disabled={removingId === track.id}>Cancel</button></>
              : <button type="button" className="icon-button danger-icon-button" aria-label={`Remove ${track.title} from catalog`} onClick={() => setConfirmRemovalId(track.id)}><Trash2 size={15} /></button>}
          </div>)}</div>}
      </section>
    </Modal>
  );
}
