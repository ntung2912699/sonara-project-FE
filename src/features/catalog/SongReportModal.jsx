import { useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { Modal } from '../../common/modal/Modal.jsx';
import { Flag, LoaderCircle, X } from '../../common/icons/index.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';

export function SongReportModal({ track, setModal, token, showToast }) {
  const { t } = usePreferences();
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
      showToast(t('Thanks. Your song report was submitted for review.'));
      setModal(null);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <Modal titleId="report-song-title" onClose={() => !busy && setModal(null)}>
    <div className="modal-header"><div><div className="eyebrow section-eyebrow">{t('CATALOG SAFETY')}</div><h2 id="report-song-title">{t('Report this song')}</h2></div><button className="icon-button" aria-label={t('Close dialog')} disabled={busy} onClick={() => setModal(null)}><X size={18} /></button></div>
    <p className="modal-description"><strong>{track.title}</strong> {t('by')} {track.artist || t('Unknown artist')}</p>
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="song-report-reason">{t('Reason')}</label>
      <select className="select-input" id="song-report-reason" name="reason" defaultValue="copyright" required>
        <option value="copyright">{t('Copyright or rights concern')}</option>
        <option value="inappropriate">{t('Inappropriate content')}</option>
        <option value="duplicate">{t('Duplicate song')}</option>
        <option value="other">{t('Other')}</option>
      </select>
      <label className="field-label" htmlFor="song-report-details">{t('Details')} <span className="optional-label">{t('Optional')}</span></label>
      <textarea className="text-input textarea-input" id="song-report-details" name="details" rows={3} maxLength={2000} placeholder={t('Share helpful details for the review team.')} />
      {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
      <div className="modal-actions"><button type="button" className="button button-secondary" disabled={busy} onClick={() => setModal(null)}>{t('Cancel')}</button><button type="submit" className="button button-primary" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin" /> : <Flag size={15} />}{busy ? t('Submitting…') : t('Submit report')}</button></div>
    </form>
  </Modal>;
}
