import { useCallback, useEffect, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { AlertCircle, Check, FileAudio2, Flag, LoaderCircle, LockKeyhole, Plus, RefreshCw, ShieldCheck, Trash2, UnlockKeyhole, Users } from '../../common/icons/index.js';

const TABS = [
  { id: 'users', label: 'Accounts', icon: Users },
  { id: 'tracks', label: 'Songs', icon: FileAudio2 },
  { id: 'reports', label: 'Reports', icon: Flag },
];

export function AdminPanel({ token, currentUser, showToast, onAddSongs }) {
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
      setCounts({
        users: users.meta?.total ?? users.data.length,
        tracks: tracks.meta?.total ?? tracks.data.length,
        reports: reports.data.filter((report) => report.status === 'pending').length,
      });
      setRows(tab === 'users' ? users.data : tab === 'tracks' ? tracks.data : reports.data);
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
    <div className="section-heading collection-heading"><div className="collection-icon admin-icon"><ShieldCheck size={21} /></div><div><div className="eyebrow section-eyebrow">ADMINISTRATION</div><h1>Management</h1><p>Manage accounts, review songs, and keep the catalog healthy.</p></div><button className="button button-primary admin-add-song" onClick={onAddSongs}><Plus size={16} /> Add songs</button></div>
    <div className="admin-summary">
      <div><Users size={18} /><span><strong>{counts.users}</strong><small>Accounts</small></span></div>
      <div><FileAudio2 size={18} /><span><strong>{counts.tracks}</strong><small>Catalog songs</small></span></div>
      <div><Flag size={18} /><span><strong>{counts.reports}</strong><small>Reports to review</small></span></div>
    </div>
    <div className="admin-toolbar">
      <div className="admin-tabs" role="tablist" aria-label="Management sections">
        {TABS.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'admin-tab admin-tab-active' : 'admin-tab'} onClick={() => changeTab(id)}><Icon size={15} />{label}{id === 'reports' && counts.reports > 0 && <span className="admin-tab-count">{counts.reports}</span>}</button>)}
      </div>
      <div className="search-box admin-search"><input aria-label={`Search ${tab}`} placeholder={`Search ${tab}…`} value={query} onChange={(event) => setQuery(event.target.value)} /><button className="admin-refresh" aria-label="Refresh management data" onClick={() => setRefresh((value) => value + 1)}><RefreshCw size={15} /></button></div>
    </div>
    {error && <InlineMessage className="inline-error"><span>{error}</span><button className="text-link" onClick={() => setRefresh((value) => value + 1)}>Try again</button></InlineMessage>}
    {loading ? <div className="admin-loading"><LoaderCircle className="spin" size={22} /> Loading management data…</div>
      : filteredRows.length === 0 ? <div className="admin-empty"><Check size={18} />{query ? 'No matching results.' : tab === 'reports' ? 'No reports to review.' : `No ${tab} found.`}</div>
        : <div className="admin-record-list">
          {tab === 'users' && filteredRows.map((user) => <div className="admin-record" key={user.id}>
            <div className="admin-record-icon"><Users size={17} /></div><div className="admin-record-main"><strong>{user.name} {user.id === currentUser?.id && <small>(you)</small>}</strong><span>{user.email || user.phone || 'No email'} · {user.role}</span></div><span className={`admin-status ${user.is_active ? 'admin-status-active' : 'admin-status-inactive'}`}>{user.is_active ? 'Active' : 'Locked'}</span><button className="button button-secondary admin-row-action" disabled={busyId === `/admin/users/${user.id}` || user.id === currentUser?.id} onClick={() => updateRow(`/admin/users/${user.id}`, { is_active: !user.is_active }, user.is_active ? 'Account locked.' : 'Account unlocked.')}>{user.is_active ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}{user.is_active ? 'Lock' : 'Unlock'}</button>
          </div>)}
          {tab === 'tracks' && filteredRows.map((track) => <div className="admin-record admin-song-record" key={track.id}>
            <div className="admin-record-icon"><FileAudio2 size={17} /></div><div className="admin-record-main"><strong>{track.title}</strong><span>{track.artist} · {track.uploader?.name || track.source || 'Catalog'}</span><span>{track.license_name || 'License details not set'}</span></div><span className={`admin-status ${track.is_active ? 'admin-status-active' : 'admin-status-inactive'}`}>{track.is_active ? 'Active' : 'Inactive'}</span><button className="button button-secondary admin-row-action" disabled={busyId === `/admin/tracks/${track.id}`} onClick={() => updateRow(`/admin/tracks/${track.id}`, { is_active: !track.is_active }, track.is_active ? 'Song deactivated.' : 'Song activated.')}>{track.is_active ? 'Deactivate' : 'Activate'}</button><button className="icon-button admin-delete-button" aria-label={`Delete ${track.title}`} disabled={busyId === `delete-${track.id}`} onClick={() => deleteSong(track)}><Trash2 size={15} /></button>
          </div>)}
          {tab === 'reports' && filteredRows.map((report) => <div className="admin-record admin-report-record" key={report.id}>
            <div className="admin-record-icon report-record-icon"><Flag size={17} /></div><div className="admin-record-main"><strong>{report.track?.title || 'Song removed'} · {report.reason.replaceAll('_', ' ')}</strong><span>Reported by {report.reporter?.name || 'Unknown'} ({report.reporter?.email || 'no email'}) · {new Date(report.created_at).toLocaleDateString()}</span>{report.details && <p>{report.details}</p>}{report.reviewer && <span>Reviewed by {report.reviewer.name}</span>}</div><span className={`admin-status admin-status-${report.status}`}>{report.status}</span>{report.status === 'pending' ? <div className="admin-report-actions"><button className="button button-primary" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'resolved' }, 'Report marked resolved.')}>Resolve</button><button className="button button-secondary" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'dismissed' }, 'Report dismissed.')}>Dismiss</button></div> : <button className="button button-secondary admin-row-action" disabled={busyId === `/admin/reports/${report.id}`} onClick={() => updateRow(`/admin/reports/${report.id}`, { status: 'pending' }, 'Report reopened.')}>Reopen</button>}
          </div>)}
        </div>}
  </div>;
}
