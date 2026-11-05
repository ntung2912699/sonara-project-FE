import { useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { Modal } from '../../common/modal/Modal.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { ListMusic, Music2, X } from '../../common/icons/index.js';
export function PlaylistModal({ modal, setModal, token, playlists, setRefresh, showToast }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => setModal(null);
  const playlist = modal.playlist;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      if (modal.type === 'create-playlist') {
        await api.post('/playlists', { name: values.name, description: values.description, is_public: values.is_public === 'on' }, token);
        showToast('Playlist created.');
        setRefresh((current) => current + 1);
        close();
      } else if (modal.type === 'edit-playlist') {
        await api.put(`/playlists/${playlist.id}`, { name: values.name, description: values.description, is_public: values.is_public === 'on' }, token);
        showToast('Playlist updated.');
        setRefresh((current) => current + 1);
        close();
      } else if (modal.type === 'add-track') {
        if (!values.playlist_id) throw new Error('Choose a playlist first.');
        await api.post(`/playlists/${values.playlist_id}/tracks/${modal.track.id}`, {}, token);
        showToast(`Added to ${playlists.find((item) => String(item.id) === values.playlist_id)?.name || 'your playlist'}.`);
        setRefresh((current) => current + 1);
        close();
      } else if (modal.type === 'delete-playlist') {
        await api.delete(`/playlists/${playlist.id}`, token);
        showToast('Playlist deleted.');
        setRefresh((current) => current + 1);
        close();
      }
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  const title = { 'create-playlist': 'Create a playlist', 'edit-playlist': 'Edit playlist', 'add-track': 'Add to playlist', 'delete-playlist': 'Delete playlist' }[modal.type];
  return <Modal titleId="modal-title" onClose={close}>
      <div className="modal-header"><div><div className="eyebrow section-eyebrow">YOUR LIBRARY</div><h2 id="modal-title">{title}</h2></div><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={18} /></button></div>
      {modal.type === 'delete-playlist' ? <form onSubmit={submit}><p className="modal-description">Are you sure you want to delete <strong>{playlist.name}</strong>? This won’t delete any of the tracks from your library.</p>{error && <InlineMessage className="inline-error">{error}</InlineMessage>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={close}>Cancel</button><button className="button button-danger" disabled={busy}>{busy ? 'Deleting…' : 'Delete playlist'}</button></div></form>
        : modal.type === 'add-track' ? <form onSubmit={submit}><div className="modal-track-summary"><div className="mini-cover"><Music2 size={16} /></div><span><strong>{modal.track.title}</strong><small>{modal.track.artist || 'Unknown artist'}</small></span></div>{playlists.length ? <><label className="field-label" htmlFor="playlist-choice">Choose a playlist</label><select className="select-input" id="playlist-choice" name="playlist_id" defaultValue="" required><option value="" disabled>Select playlist…</option>{playlists.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></> : <div className="modal-empty"><ListMusic size={20} /><span>You don’t have a playlist yet.</span><button type="button" className="text-link" onClick={() => { close(); setTimeout(() => setModal({ type: 'create-playlist' }), 0); }}>Create one now</button></div>}{error && <InlineMessage className="inline-error">{error}</InlineMessage>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy || !playlists.length}>{busy ? 'Adding…' : 'Add track'}</button></div></form>
          : <form onSubmit={submit}><label className="field-label" htmlFor="playlist-name">Playlist name</label><input id="playlist-name" name="name" className="text-input" defaultValue={playlist?.name || ''} placeholder="e.g. Sunday morning" maxLength={120} required autoFocus /><label className="field-label" htmlFor="playlist-description">Description <span className="optional-label">Optional</span></label><textarea id="playlist-description" name="description" className="text-input textarea-input" defaultValue={playlist?.description || ''} placeholder="What’s this playlist for?" maxLength={1000} rows={3} /><label className="toggle-row"><input type="checkbox" name="is_public" defaultChecked={playlist?.is_public || false} /><span className="toggle-ui" /><span><strong>Make playlist public</strong><small>Others can discover this playlist.</small></span></label>{error && <InlineMessage className="inline-error">{error}</InlineMessage>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={close}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : modal.type === 'edit-playlist' ? 'Save changes' : 'Create playlist'}</button></div></form>}
  </Modal>;
}
