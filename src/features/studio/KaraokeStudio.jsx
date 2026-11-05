import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { deleteKaraokeDraft, readKaraokeDrafts, saveKaraokeDraft } from '../../common/utils/karaokeDrafts.js';
import { Check, Download, FileAudio2, LoaderCircle, Mic, Music2, Pause, Play, Search, Trash2, Upload, Volume2 } from '../../common/icons/index.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const RECORDING_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];

function recordingType() {
  return RECORDING_TYPES.find((type) => window.MediaRecorder?.isTypeSupported(type)) || '';
}

function recordingExtension(type) {
  if (type.includes('ogg')) return 'ogg';
  if (type.includes('mp4')) return 'm4a';
  return 'webm';
}

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function KaraokeStudio({ token, onPublished, showToast }) {
  const { t } = usePreferences();
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [title, setTitle] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [monitorVoice, setMonitorVoice] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const beatAudio = useRef(null);
  const beatUpload = useRef(null);
  const recorder = useRef(null);
  const microphone = useRef(null);
  const audioContext = useRef(null);
  const beatSource = useRef(null);
  const recordingDestination = useRef(null);
  const microphoneSource = useRef(null);
  const monitorGain = useRef(null);
  const chunks = useRef([]);
  const localBeatUrl = useRef(null);

  const recordedUrl = useMemo(() => recordedBlob ? URL.createObjectURL(recordedBlob) : null, [recordedBlob]);

  useEffect(() => {
    let active = true;
    readKaraokeDrafts()
      .then((items) => { if (active) setDrafts(items.sort((a, b) => b.createdAt - a.createdAt)); })
      .catch((storageError) => { if (active) setError(messageOf(storageError)); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setMatches([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api.get(`/tracks?q=${encodeURIComponent(term)}&per_page=8`, token, { signal: controller.signal })
        .then((result) => setMatches(result.data || []))
        .catch((searchError) => {
          if (searchError.name !== 'AbortError') setError(messageOf(searchError));
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, token]);

  useEffect(() => {
    if (monitorGain.current && audioContext.current) {
      monitorGain.current.gain.setTargetAtTime(monitorVoice ? 1 : 0, audioContext.current.currentTime, 0.02);
    }
  }, [monitorVoice]);

  useEffect(() => {
    const timer = recording ? window.setInterval(() => setElapsed((value) => value + 1), 1000) : null;
    return () => { if (timer) window.clearInterval(timer); };
  }, [recording]);

  useEffect(() => () => {
    recorder.current?.state === 'recording' && recorder.current.stop();
    microphone.current?.getTracks().forEach((track) => track.stop());
    audioContext.current?.close();
    if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current);
  }, []);

  useEffect(() => () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
  }, [recordedUrl]);

  async function chooseCatalogBeat(track) {
    if (recording || busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.get(`/tracks/${track.id}/play-url`, token);
      const url = new URL(result.data.url, window.location.origin).toString();
      beatAudio.current?.pause();
      if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current);
      localBeatUrl.current = null;
      setSelectedBeat({ id: track.id, title: track.title, artist: track.artist, url });
      setMatches([]);
      setQuery('');
      setRecordedBlob(null);
      setTitle(`${track.title} - karaoke`);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  function chooseUploadedBeat(file) {
    if (!file || recording || busy) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!file.type.startsWith('audio/') && !['mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac', 'flac'].includes(extension)) {
      setError(t('Choose an audio file for your backing track.'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(t('Audio files must be 200 MB or smaller.'));
      return;
    }
    if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current);
    localBeatUrl.current = URL.createObjectURL(file);
    setSelectedBeat({ title: file.name, artist: t('Uploaded beat'), url: localBeatUrl.current });
    setRecordedBlob(null);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setError('');
  }

  function stopRecording() {
    const activeRecorder = recorder.current;
    if (activeRecorder?.state === 'recording') activeRecorder.stop();
    if (beatAudio.current) beatAudio.current.pause();
    microphone.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function startRecording() {
    if (!selectedBeat || !beatAudio.current) {
      setError(t('Search for a beat or upload one before starting.'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(t('Microphone recording is not supported by this browser.'));
      return;
    }
    if (!recordingType()) {
      setError(t('This browser does not support audio recording.'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      const context = audioContext.current || new window.AudioContext();
      audioContext.current = context;
      await context.resume();
      const destination = recordingDestination.current || context.createMediaStreamDestination();
      recordingDestination.current = destination;
      if (!beatSource.current) {
        beatSource.current = context.createMediaElementSource(beatAudio.current);
        beatSource.current.connect(context.destination);
        beatSource.current.connect(destination);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      microphone.current = stream;
      const source = context.createMediaStreamSource(stream);
      microphoneSource.current = source;
      source.connect(destination);
      const monitor = context.createGain();
      monitor.gain.value = monitorVoice ? 1 : 0;
      source.connect(monitor);
      monitor.connect(context.destination);
      monitorGain.current = monitor;

      const type = recordingType();
      const activeRecorder = new MediaRecorder(destination.stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      activeRecorder.onstop = () => {
        if (chunks.current.length) {
          setRecordedBlob(new Blob(chunks.current, { type: activeRecorder.mimeType || type || 'audio/webm' }));
        }
        source.disconnect();
        monitor.disconnect();
        microphoneSource.current = null;
        monitorGain.current = null;
        microphone.current?.getTracks().forEach((track) => track.stop());
        microphone.current = null;
      };
      recorder.current = activeRecorder;
      setElapsed(0);
      setRecordedBlob(null);
      activeRecorder.start(250);
      await beatAudio.current.play();
      setRecording(true);
    } catch (recordingError) {
      microphone.current?.getTracks().forEach((track) => track.stop());
      microphone.current = null;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      setRecording(false);
      setError(messageOf(recordingError));
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!recordedBlob) return;
    const draft = {
      id: newId(),
      title: title.trim() || t('Untitled karaoke recording'),
      blob: recordedBlob,
      mimeType: recordedBlob.type,
      createdAt: Date.now(),
    };
    setBusy(true);
    setError('');
    try {
      await saveKaraokeDraft(draft);
      setDrafts((current) => [draft, ...current]);
      showToast(t('Draft saved on this device.'));
    } catch (storageError) {
      setError(messageOf(storageError));
    } finally {
      setBusy(false);
    }
  }

  function downloadRecording(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${name || 'sonora-karaoke'}.${recordingExtension(blob.type)}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function publishRecording() {
    if (!recordedBlob || !rightsConfirmed || !title.trim()) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('audio', recordedBlob, `sonora-karaoke.${recordingExtension(recordedBlob.type)}`);
    form.append('title', title.trim());
    form.append('rights_confirmed', '1');
    try {
      const result = await api.upload('/karaoke/recordings', form, token);
      showToast(t('Your karaoke recording was published.'));
      setRecordedBlob(null);
      setRightsConfirmed(false);
      onPublished();
      return result.data;
    } catch (requestError) {
      setError(messageOf(requestError));
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function removeDraft(id) {
    setError('');
    try {
      await deleteKaraokeDraft(id);
      setDrafts((current) => current.filter((draft) => draft.id !== id));
    } catch (storageError) {
      setError(messageOf(storageError));
    }
  }

  function loadDraft(draft) {
    setRecordedBlob(draft.blob);
    setTitle(draft.title);
    setRightsConfirmed(false);
  }

  return <div className="page-content karaoke-page">
    <div className="section-heading collection-heading"><div className="collection-icon studio-icon"><Mic size={21} /></div><div><div className="eyebrow section-eyebrow">{t('KARAOKE STUDIO')}</div><h1>{t('Sing your song')}</h1><p>{t('Choose a beat, record your voice with it, then save a draft or publish your recording.')}</p></div></div>
    <div className="karaoke-notice"><Music2 size={17} /><span>{t('Lyrics are not included in this first version. Use headphones when monitoring your voice to prevent audio feedback.')}</span></div>

    <section className="submission-card karaoke-card">
      <div className="karaoke-search-wrap">
        <label className="field-label" htmlFor="karaoke-search">{t('Search catalog beats')}</label>
        <div className="search-box karaoke-search"><Search size={16} /><input id="karaoke-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by song or artist')} disabled={busy || recording} />
          {matches.length > 0 && <div className="karaoke-results">{matches.map((track) => <button key={track.id} onClick={() => chooseCatalogBeat(track)} disabled={busy || recording}><FileAudio2 size={16} /><span><strong>{track.title}</strong><small>{track.artist}</small></span><Play size={14} /></button>)}</div>}
        </div>
        <div className="karaoke-or">{t('or')}</div>
        <input ref={beatUpload} className="visually-hidden" type="file" accept="audio/*" onChange={(event) => chooseUploadedBeat(event.target.files[0])} disabled={busy || recording} />
        <button className="button button-secondary" type="button" onClick={() => beatUpload.current?.click()} disabled={busy || recording}><Upload size={15} />{t('Upload a beat from your device')}</button>
      </div>

      <div className="karaoke-selected-beat" hidden={!selectedBeat}>
        <div className="karaoke-beat-icon"><Music2 size={18} /></div><div><strong>{selectedBeat?.title}</strong><small>{selectedBeat?.artist}</small></div>
        <audio ref={beatAudio} src={selectedBeat?.url} controls={!recording} onEnded={() => { if (recording) stopRecording(); }} onError={() => setError(t('This beat could not be played.'))} />
        <button type="button" className="icon-button" aria-label={t('Remove beat')} disabled={busy || recording} onClick={() => { if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current); localBeatUrl.current = null; setSelectedBeat(null); setRecordedBlob(null); }}><Trash2 size={15} /></button>
      </div>

      <div className="karaoke-record-controls">
        <button className="button button-primary" type="button" onClick={recording ? stopRecording : startRecording} disabled={busy || (!selectedBeat && !recording)}>
          {busy ? <LoaderCircle className="spin" size={16} /> : recording ? <Pause size={16} /> : <Mic size={16} />}
          {busy ? t('Preparing…') : recording ? t('Stop recording') : t('Start singing')}
        </button>
        {recording && <span className="karaoke-recording-state"><span className="recording-dot" />{t('Recording')} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}
        <label className="karaoke-monitor"><input type="checkbox" checked={monitorVoice} onChange={(event) => setMonitorVoice(event.target.checked)} /><Volume2 size={15} />{t('Monitor my voice')}</label>
      </div>

      {recordedBlob && <div className="karaoke-result">
        <label className="field-label" htmlFor="karaoke-title">{t('Recording title')}</label>
        <input id="karaoke-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} />
        <audio className="karaoke-preview" controls src={recordedUrl} />
        <div className="karaoke-rights"><label><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span><Check size={12} /></span>{t('I own or have permission to distribute this entire recording, including the backing audio.')}</label></div>
        <div className="karaoke-result-actions">
          <button type="button" className="button button-secondary" onClick={saveDraft} disabled={busy}><Check size={15} />{t('Save draft')}</button>
          <button type="button" className="button button-secondary" onClick={() => downloadRecording(recordedBlob, title)}><Download size={15} />{t('Export recording')}</button>
          <button type="button" className="button button-primary" onClick={publishRecording} disabled={busy || !rightsConfirmed || !title.trim()}>{busy ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}{t('Publish to catalog')}</button>
        </div>
      </div>}
      {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
    </section>

    <section className="request-history karaoke-drafts">
      <div className="section-heading compact-heading"><div><div className="eyebrow section-eyebrow">{t('THIS DEVICE')}</div><h2>{t('Saved drafts')}</h2></div><span className="auto-refresh-label">{t('Stored in this browser only')}</span></div>
      {!drafts.length ? <p className="karaoke-empty">{t('Your saved recordings will appear here.')}</p> : drafts.map((draft) => <div className="karaoke-draft-row" key={draft.id}>
        <div className="karaoke-beat-icon"><FileAudio2 size={17} /></div><div className="karaoke-draft-info"><strong>{draft.title}</strong><small>{new Date(draft.createdAt).toLocaleString()}</small></div>
        <button className="button button-secondary" type="button" onClick={() => loadDraft(draft)}>{t('Load draft')}</button>
        <button className="icon-button" type="button" aria-label={t('Export draft')} onClick={() => downloadRecording(draft.blob, draft.title)}><Download size={15} /></button>
        <button className="icon-button" type="button" aria-label={t('Delete draft')} onClick={() => removeDraft(draft.id)}><Trash2 size={15} /></button>
      </div>)}
    </section>
  </div>;
}
