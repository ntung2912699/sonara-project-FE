import { useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { Modal } from '../../common/modal/Modal.jsx';
import { Flag, LoaderCircle, X } from '../../common/icons/index.js';

export function SongReportModal({ track, setModal, token, showToast }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    try {
      await api.post(`/tracks/${track.id}/reports`, {
        reason: formData.get('reason'),
        details: formData.get('details'),
      }, token);
      showToast('Thanks. Your song report was submitted for review.');
      setModal(null);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <Modal titleId="report-song-title" onClose={() => !busy && setModal(null)}>
    <div className="modal-header"><div><div className="eyebrow section-eyebrow">CATALOG SAFETY</div><h2 id="report-song-title">Report this song</h2></div><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={() => setModal(null)}><X size={18} /></button></div>
    <p className="modal-description"><strong>{track.title}</strong> by {track.artist || 'Unknown artist'}</p>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="song-report-reason">Reason</label>
      <select className="select-input" id="song-report-reason" name="reason" defaultValue="copyright" required>
        <option value="copyright">Copyright or rights concern</option>
        <option value="inappropriate">Inappropriate content</option>
        <option value="duplicate">Duplicate song</option>
        <option value="other">Other</option>
      </select>
      <label className="field-label" htmlFor="song-report-details">Details <span className="optional-label">Optional</span></label>
      <textarea className="text-input textarea-input" id="song-report-details" name="details" rows={3} maxLength={2000} placeholder="Share helpful details for the review team." />
      {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setModal(null)}>Cancel</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Flag size={15} />}{busy ? 'Submitting…' : 'Submit report'}</button></div>
    </form>
  </Modal>;
}
