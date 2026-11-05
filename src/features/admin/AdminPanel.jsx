import { useCallback, useEffect, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { AlertCircle, Check, FileAudio2, Flag, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, Trash2, UnlockKeyhole, Users } from '../../common/icons/index.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';

const TABS = [
  { id: 'users', label: 'Accounts', icon: Users },
  { id: 'tracks', label: 'Songs', icon: FileAudio2 },
  { id: 'reports', label: 'Reports', icon: Flag },
];

function reportReason(reason) {
  return typeof reason === 'string' && reason.trim()
    ? reason.replaceAll('_', ' ')
    : 'Unspecified reason';
}

function reportDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Date unavailable';
}

export function AdminPanel({ token, currentUser, showToast, onAddSongs }) {
  const { t } = usePreferences();
  const [tab, setTab] = useState('users');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ users: 0, tracks: 0, reports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [refresh, setRefresh] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [users, tracks, reports] = await Promise.all([
        api.get('/admin/users?per_page=100', token),
        api.get('/admin/tracks?per_page=100', token),
        api.get('/admin/reports?per_page=100', token),
      ]);
      const userRows = Array.isArray(users.data) ? users.data : [];
      const trackRows = Array.isArray(tracks.data) ? tracks.data : [];
      const reportRows = Array.isArray(reports.data) ? reports.data : [];
      setCounts({
        users: users.meta?.total ?? userRows.length,
        tracks: tracks.meta?.total ?? trackRows.length,
        reports: reportRows.filter((report) => report?.status === 'pending').length,
      });
      setRows(tab === 'users' ? userRows : tab === 'tracks' ? trackRows : reportRows);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setLoading(false);
    }
  }, [tab, token, refresh]);

  useEffect(() => { loadData(); }, [loadData]);

  function changeTab(nextTab) {
    setTab(nextTab);
    setQuery('');
  }

  async function updateRow(url, body, successMessage) {
    setBusyId(url);
    setError('');
    try {
      await api.request(url, { method: 'PATCH', body, token });
      showToast(successMessage);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteSong(track) {
    if (!window.confirm(`Permanently remove "${track.title}" and its audio file?`)) return;
    setBusyId(`delete-${track.id}`);
    setError('');
    try {
      await api.delete(`/admin/tracks/${track.id}`, token);
      showToast('Song removed from the catalog.');
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusyId(null);
    }
  }

  const filteredRows = rows.filter((row) => {
    const value = tab === 'users'
      ? `${row.name} ${row.email || ''}`
      : tab === 'tracks'
        ? `${row.title} ${row.artist} ${row.uploader?.name || ''}`
        : `${row.track?.title || ''} ${row.reporter?.name || ''} ${row.reason}`;
    return value.toLowerCase().includes(query.trim().toLowerCase());
  });

  return <div className="page-content admin-page">
    <div className="section-heading collection-heading"><div className="collection-icon admin-icon"><ShieldCheck size={21} /></div><div><div className="eyebrow section-eyebrow">{t('ADMINISTRATION')}</div><h1>{t('Management')}</h1><p>{t('Manage accounts, review songs, and keep the catalog healthy.')}</p></div><button className="button button-primary admin-add-song" onClick={onAddSongs}><Plus size={16} /> {t('Add songs')}</button></div>
    <div className="admin-summary">
      <div><Users size={18} /><span><strong>{counts.users}</strong><small>{t('Accounts')}</small></span></div>
      <div><FileAudio2 size={18} /><span><strong>{counts.tracks}</strong><small>{t('Catalog songs')}</small></span></div>
      <div><Flag size={18} /><span><strong>{counts.reports}</strong><small>{t('Reports to review')}</small></span></div>
    </div>
    <div className="admin-toolbar">
      <div className="admin-tabs" role="tablist" aria-label="Management sections">
        {TABS.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'admin-tab admin-tab-active' : 'admin-tab'} onClick={() => changeTab(id)}><Icon size={15} />{t(label)}{id === 'reports' && counts.reports > 0 && <span className="admin-tab-count">{counts.reports}</span>}</button>)}
      </div>
      <div className="search-box admin-search"><input aria-label={`${t('Search')} ${t(TABS.find((item) => item.id === tab)?.label || '')}`} placeholder={`${t('Search')} ${t(TABS.find((item) => item.id === tab)?.label || '')}…`} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-refresh" aria-label={t('Refresh management data')} onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15} /></button></div>
    </div>
    {error && <InlineMessage className="inline-error"><span>{error}</span><button className="text-link" onClick={() => setRefresh((value) => value + 1)}>{t('Try again')}</button></InlineMessage>}
    {loading ? <div className="admin-loading"><LoaderCircle className="spin" size={22} /> {t('Loading management data…')}</div>
      : filteredRows.length === 0 ? <div className="admin-empty"><Check size={18} />{query ? t('No matching results.') : tab === 'reports' ? t('No reports to review.') : `${t('No')} ${t(TABS.find((item) => item.id === tab)?.label || '')} ${t('found.')}`}</div>
        : <div className="admin-record-list">
          {tab === 'users' && filteredRows.map((user) => <div className="admin-record" key={user.id}>
            <div className="admin-record-icon"><Users size={17} /></div><div className="admin-record-main"><strong>{user.name} {user.id === currentUser?.id && <small>(you)</small>}</strong><span>{user.email || user.phone || 'No email'} · {user.role}</span></div><span className={`admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}`}>{user.is_active ? 'Active' : 'Locked'}</span><button className="button button-secondary admin-row-action" disabled={busyId === `/admin/users/${user.id}` || user.id === currentUser?.id} onClick={() => updateRow(`/admin/users/${user.id}`, { is_active: !user.is_active }, user.is_active ? 'Account locked.' : 'Account unlocked.')}>{user.is_active ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}{user.is_active ? 'Lock' : 'Unlock'}</button>
          </div>)}
          {tab === 'tracks' && filteredRows.map((track) => <div className="admin-record admin-song-record" key={track.id}>
            <div className="admin-record-icon"><FileAudio2 size={17} /></div><div className="admin-record-main"><strong>{track.title}</strong><span>{track.artist} · {track.uploader?.name || track.source || 'Catalog'}</span><span>{track.license_name || 'License details not set'}</span></div><span className={`admin-status ${track.is_active ? 'admin-status-active' : 'admin-status-inactive'}`}>{track.is_active ? 'Active' : 'Inactive'}</span><button className="button button-secondary admin-row-action" disabled={busyId === `/admin/tracks/${track.id}`} onClick={() => updateRow(`/admin/tracks/${track.id}`, { is_active: !track.is_active }, track.is_active ? 'Song deactivated.' : 'Song activated.')}>{track.is_active ? 'Deactivate' : 'Activate'}</button><button className="icon-button admin-delete-button" aria-label={`Delete ${track.title}`} disabled={busyId === `delete-${track.id}`} onClick={() => deleteSong(track)}><Trash2 size={15} /></button>
          </div>)}
          {tab === 'reports' && filteredRows.map((report) => <div className="admin-record admin-report-record" key={report.id}>
            <div className="admin-record-icon report-record-icon"><Flag size={17} /></div><div className="admin-record-main"><strong>{report.track?.title || t('Song removed')} · {t(reportReason(report.reason))}</strong><span>{t('Reported by')} {report.reporter?.name || t('Unknown')} ({report.reporter?.email || t('no email')}) · {t(reportDate(report.created_at))}</span>{report.details && <p>{report.details}</p>}{report.reviewer && <span>{t('Reviewed by')} {report.reviewer.name || t('Unknown')}</span>}</div><span className={`admin-status admin-status-${report.status || 'unknown'}`}>{t(report.status || 'Unknown')}</span>{report.status === 'pending' ? <div className="admin-report-actions"><button className="button button-primary" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'resolved' }, t('Report marked resolved.'))}>{t('Resolve')}</button><button className="button button-secondary" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'dismissed' }, t('Report dismissed.'))}>{t('Dismiss')}</button></div> : <button className="button button-secondary admin-row-action" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'pending' }, t('Report reopened.'))}>{t('Reopen')}</button>}
          </div>)}
        </div>}
  </div>;
}
