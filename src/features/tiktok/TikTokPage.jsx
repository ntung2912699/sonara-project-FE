import { useState } from 'react';
import { api } from '../../common/api/client.js';
import { formatDate } from '../../common/utils/appData.js';
import { messageOf } from '../../common/message/messages.js';
import { EmptyState } from '../../common/list/EmptyState.jsx';
import { Pagination } from '../../common/list/Pagination.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { Check, ExternalLink, LoaderCircle, Plus, RefreshCw, ShieldCheck } from '../../common/icons/index.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';
export function TikTokPage({ items, loading, token, showToast, onRefresh, meta, pageNumber, setPageNumber }) {
  const { t } = usePreferences();
  const [url, setUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await api.post('/tiktok-imports', { video_url: url, rights_confirmed: rightsConfirmed }, token);
      setUrl('');
      setRightsConfirmed(false);
      showToast(t('Request submitted for rights review.'));
      onRefresh();
    } catch (error) {
      setFormError(messageOf(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-content">
      <div className="section-heading collection-heading"><div className="collection-icon import-icon"><ExternalLink size={20} /></div><div><div className="eyebrow section-eyebrow">{t('RIGHTS REVIEW')}</div><h1>{t('TikTok requests')}</h1><p>{t('Submit a link for review when you have permission to use the audio.')}</p></div></div>
      <div className="rights-banner"><div className="rights-shield"><ShieldCheck size={22} /></div><div><strong>{t('Respect creators. Confirm your rights.')}</strong><p>{t('Submissions are queued for rights review. Sonora does not download, scrape, or extract audio from TikTok videos.')}</p></div></div>
      <form className="submission-card" onSubmit={submit}>
        <div className="form-card-title"><div className="eyebrow section-eyebrow">{t('NEW REQUEST')}</div><h2>{t('Submit a TikTok link')}</h2><p>{t('Only HTTPS links from TikTok are accepted.')}</p></div>
        <label className="field-label" htmlFor="tiktok-url">{t('Video URL')}</label><div className="input-wrap"><ExternalLink size={17} /><input id="tiktok-url" type="url" required maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.tiktok.com/@creator/video/…" /></div>
        <label className="rights-check"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} required /><span className="custom-check"><Check size={12} /></span><span>{t('I own or have permission to use this audio and authorize its review.')}</span></label>
        {formError && <InlineMessage className="inline-error">{formError}</InlineMessage>}
        <button className="button button-primary" type="submit" disabled={busy || !rightsConfirmed}>{busy ? <LoaderCircle size={16} className="spin" /> : <Plus size={16} />}{busy ? t('Submitting…') : t('Submit for review')}</button>
      </form>
      <section className="request-history"><div className="section-heading compact-heading"><div><div className="eyebrow section-eyebrow">{t('YOUR SUBMISSIONS')}</div><h2>{t('Request history')}</h2></div><button className="icon-button" onClick={onRefresh} aria-label={t('Refresh requests')}><RefreshCw size={16} /></button></div>
        {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22} />{t('Loading requests…')}</div>
          : !items.length ? <EmptyState icon={ExternalLink} title="No requests yet" text="Your rights-review requests will appear here." />
            : <div className="request-list">{items.map((item) => <div className="request-row" key={item.id}><div className="request-link-icon"><ExternalLink size={17} /></div><div className="request-copy"><strong>{item.track?.title || item.video_url}</strong><small>{item.track?.artist ? `${item.track.artist} · ` : ''}Submitted {formatDate(item.created_at)}</small>{item.review_note && <p>{item.review_note}</p>}</div><span className={`status-pill status-${(item.status || '').replaceAll('_', '-')}`}>{(item.status || 'pending').replaceAll('_', ' ')}</span></div>)}</div>}
      </section>
      <Pagination meta={meta} pageNumber={pageNumber} setPageNumber={setPageNumber} />
    </div>
  );
}
