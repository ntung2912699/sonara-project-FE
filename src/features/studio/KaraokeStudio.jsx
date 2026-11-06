import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../common/api/client.js';
import { messageOf } from '../../common/message/messages.js';
import { deleteKaraokeDraft, readKaraokeDrafts, saveKaraokeDraft } from '../../common/utils/karaokeDrafts.js';
import { Check, Download, FileAudio2, LoaderCircle, Mic, Music2, Pause, Play, Search, Trash2, Upload, Volume2 } from '../../common/icons/index.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';
import { YouTubeBeatPlayer } from './YouTubeBeatPlayer.jsx';
import { KaraokeRoomPanel } from './KaraokeRoomPanel.jsx';

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
  const [youtubeMatches, setYoutubeMatches] = useState([]);
  const [youtubeSearchError, setYoutubeSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchComplete, setSearchComplete] = useState(false);
  const [selectedBeat, setSelectedBeat] = useState(null);
  const [title, setTitle] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [monitorVoice, setMonitorVoice] = useState(false);
  const [echoAmount, setEchoAmount] = useState(0.2);
  const [reverbAmount, setReverbAmount] = useState(0.12);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [duetStreams, setDuetStreams] = useState({ local: null, remote: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const beatAudio = useRef(null);
  const beatUpload = useRef(null);
  const recorder = useRef(null);
  const microphone = useRef(null);
  const audioContext = useRef(null);
  const beatSource = useRef(null);
  const beatSourceElement = useRef(null);
  const recordingDestination = useRef(null);
  const microphoneSource = useRef(null);
  const monitorGain = useRef(null);
  const echoGain = useRef(null);
  const reverbGain = useRef(null);
  const echoFeedback = useRef(null);
  const youtubePlayer = useRef(null);
  const chunks = useRef([]);
  const localBeatUrl = useRef(null);
  const duetStreamsRef = useRef(duetStreams);
  const remoteRecordingSource = useRef(null);
  duetStreamsRef.current = duetStreams;

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
      setYoutubeMatches([]);
      setYoutubeSearchError('');
      setSearchLoading(false);
      setSearchComplete(false);
      return undefined;
    }
    setMatches([]);
    setYoutubeMatches([]);
    setYoutubeSearchError('');
    setSearchLoading(true);
    setSearchComplete(false);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      Promise.allSettled([
        api.get(`/tracks?q=${encodeURIComponent(term)}&per_page=8`, token, { signal: controller.signal }),
        api.get(`/karaoke/youtube-search?q=${encodeURIComponent(term)}`, token, { signal: controller.signal }),
      ]).then(([catalogResult, youtubeResult]) => {
        if (controller.signal.aborted) return;
        if (catalogResult.status === 'fulfilled') {
          setMatches(Array.isArray(catalogResult.value.data) ? catalogResult.value.data : []);
        } else if (catalogResult.reason?.name !== 'AbortError') {
          setError(messageOf(catalogResult.reason));
        }
        if (youtubeResult.status === 'fulfilled') {
          setYoutubeMatches(Array.isArray(youtubeResult.value.data) ? youtubeResult.value.data : []);
          setYoutubeSearchError(false);
        } else if (youtubeResult.reason?.name !== 'AbortError') {
          setYoutubeMatches([]);
          setYoutubeSearchError(youtubeResult.reason?.status === 503
            ? t('YouTube search requires an API key configured by the service administrator.')
            : t('YouTube search could not be completed. Try again later.'));
        }
        setSearchLoading(false);
        setSearchComplete(true);
      });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, token, t]);

  useEffect(() => {
    if (monitorGain.current && audioContext.current) {
      monitorGain.current.gain.setTargetAtTime(monitorVoice ? 1 : 0, audioContext.current.currentTime, 0.02);
    }
  }, [monitorVoice]);

  useEffect(() => {
    if (echoGain.current && audioContext.current) {
      echoGain.current.gain.setTargetAtTime(echoAmount, audioContext.current.currentTime, 0.02);
    }
    if (echoFeedback.current && audioContext.current) {
      echoFeedback.current.gain.setTargetAtTime(echoAmount > 0 ? 0.24 : 0, audioContext.current.currentTime, 0.02);
    }
  }, [echoAmount]);

  useEffect(() => {
    if (reverbGain.current && audioContext.current) {
      reverbGain.current.gain.setTargetAtTime(reverbAmount, audioContext.current.currentTime, 0.02);
    }
  }, [reverbAmount]);

  useEffect(() => {
    const stream = duetStreams.remote;
    const context = audioContext.current;
    const destination = recordingDestination.current;
    if (!recording || !stream || !context || !destination) return undefined;
    remoteRecordingSource.current?.disconnect();
    const source = context.createMediaStreamSource(stream);
    source.connect(destination);
    remoteRecordingSource.current = source;
    return () => {
      source.disconnect();
      if (remoteRecordingSource.current === source) remoteRecordingSource.current = null;
    };
  }, [duetStreams.remote, recording]);

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
    let recordingNodes = [];
    try {
      const result = await api.get(`/tracks/${track.id}/play-url`, token);
      const url = new URL(
        result.data.url,
        api.baseUrl.startsWith('http') ? `${api.baseUrl}/` : window.location.origin,
      ).toString();
      beatAudio.current?.pause();
      youtubePlayer.current?.stopVideo();
      youtubePlayer.current = null;
      if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current);
      localBeatUrl.current = null;
      setSelectedBeat({ type: 'catalog', id: track.id, title: track.title, artist: track.artist, url });
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
    beatAudio.current?.pause();
    youtubePlayer.current?.stopVideo();
    youtubePlayer.current = null;
    localBeatUrl.current = URL.createObjectURL(file);
    setSelectedBeat({ type: 'upload', title: file.name, artist: t('Uploaded beat'), url: localBeatUrl.current });
    setRecordedBlob(null);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
    setError('');
  }

  function chooseYouTubeBeat(video) {
    if (recording || busy) return;
    beatAudio.current?.pause();
    youtubePlayer.current?.stopVideo();
    youtubePlayer.current = null;
    if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current);
    localBeatUrl.current = null;
    setSelectedBeat({
      type: 'youtube',
      videoId: video.video_id,
      title: video.title,
      artist: video.channel,
    });
    setMatches([]);
    setYoutubeMatches([]);
    setQuery('');
    setRecordedBlob(null);
    setTitle(`${video.title} - karaoke`);
    setError('');
  }

  function stopRecording() {
    const activeRecorder = recorder.current;
    if (activeRecorder?.state === 'recording') activeRecorder.stop();
    if (beatAudio.current) beatAudio.current.pause();
    youtubePlayer.current?.pauseVideo();
    if (microphone.current !== duetStreamsRef.current.local) {
      microphone.current?.getTracks().forEach((track) => track.stop());
    }
    setRecording(false);
  }

  async function startRecording() {
    if (!selectedBeat || (selectedBeat.type !== 'youtube' && !beatAudio.current)) {
      setError(t('Search for a beat or upload one before starting.'));
      return;
    }
    if (selectedBeat.type === 'youtube' && !youtubePlayer.current) {
      setError(t('The YouTube player is still loading. Try again in a moment.'));
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
      if (selectedBeat.type !== 'youtube' && beatSourceElement.current !== beatAudio.current) {
        beatSource.current?.disconnect();
        beatSource.current = context.createMediaElementSource(beatAudio.current);
        beatSource.current.connect(context.destination);
        beatSource.current.connect(destination);
        beatSourceElement.current = beatAudio.current;
      }

      const stream = duetStreamsRef.current.local || await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      microphone.current = stream;
      const source = context.createMediaStreamSource(stream);
      recordingNodes.push(source);
      microphoneSource.current = source;
      source.connect(destination);
      const monitor = context.createGain();
      monitor.gain.value = monitorVoice ? 1 : 0;
      source.connect(monitor);
      monitor.connect(context.destination);
      recordingNodes.push(monitor);
      monitorGain.current = monitor;

      const delay = context.createDelay(1);
      const feedback = context.createGain();
      const echo = context.createGain();
      delay.delayTime.value = 0.28;
      feedback.gain.value = echoAmount > 0 ? 0.24 : 0;
      echo.gain.value = echoAmount;
      source.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(echo);
      echo.connect(destination);
      echo.connect(monitor);
      recordingNodes.push(delay, feedback, echo);
      echoGain.current = echo;
      echoFeedback.current = feedback;

      const convolver = context.createConvolver();
      const impulseLength = Math.floor(context.sampleRate * 1.6);
      const impulse = context.createBuffer(2, impulseLength, context.sampleRate);
      for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
        const samples = impulse.getChannelData(channel);
        for (let index = 0; index < impulseLength; index += 1) {
          samples[index] = (Math.random() * 2 - 1) * (1 - index / impulseLength) ** 2;
        }
      }
      convolver.buffer = impulse;
      const reverb = context.createGain();
      reverb.gain.value = reverbAmount;
      source.connect(convolver);
      convolver.connect(reverb);
      reverb.connect(destination);
      reverb.connect(monitor);
      recordingNodes.push(convolver, reverb);
      reverbGain.current = reverb;

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
        recordingNodes.forEach((node) => node.disconnect());
        microphoneSource.current = null;
        monitorGain.current = null;
        echoGain.current = null;
        echoFeedback.current = null;
        reverbGain.current = null;
        if (microphone.current !== duetStreamsRef.current.local) {
          microphone.current?.getTracks().forEach((track) => track.stop());
        }
        microphone.current = null;
        remoteRecordingSource.current?.disconnect();
        remoteRecordingSource.current = null;
      };
      recorder.current = activeRecorder;
      setElapsed(0);
      setRecordedBlob(null);
      activeRecorder.start(250);
      if (selectedBeat.type === 'youtube') {
        youtubePlayer.current.playVideo();
      } else {
        await beatAudio.current.play();
      }
      setRecording(true);
    } catch (recordingError) {
      if (microphone.current !== duetStreamsRef.current.local) {
        microphone.current?.getTracks().forEach((track) => track.stop());
      }
      microphone.current = null;
      if (recorder.current?.state === 'recording') recorder.current.stop();
      else {
        recordingNodes.forEach((node) => node.disconnect());
        microphoneSource.current = null;
        monitorGain.current = null;
        echoGain.current = null;
        echoFeedback.current = null;
        reverbGain.current = null;
      }
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

  async function attachRoomBeat(beat) {
    if (beat.type === 'youtube') {
      chooseYouTubeBeat({ video_id: beat.id, title: beat.title, channel: beat.artist });
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await api.get(`/tracks/${beat.id}`, token);
      await chooseCatalogBeat(result.data);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  return <div className="page-content karaoke-page">
    <div className="section-heading collection-heading"><div className="collection-icon studio-icon"><Mic size={21} /></div><div><div className="eyebrow section-eyebrow">{t('KARAOKE STUDIO')}</div><h1>{t('Sing your song')}</h1><p>{t('Choose a beat, record your voice with it, then save a draft or publish your recording.')}</p></div></div>
    <div className="karaoke-notice"><Music2 size={17} /><span>{t('Lyrics are not included in this first version. Use headphones when monitoring your voice to prevent audio feedback.')} {t('Use headphones for live duet to prevent audio feedback.')} {t('Choose an instrumental Sonora track when you need a backing beat.')}</span></div>

    <section className="submission-card karaoke-card">
      <div className="karaoke-step-heading"><span>1</span><div><h2>{t('Choose a backing beat')}</h2><p>{t('Search Sonora or YouTube, or upload an audio file.')}</p></div></div>
      <div className="karaoke-search-wrap">
        <label className="field-label" htmlFor="karaoke-search">{t('Search beats')}</label>
        <div className="search-box karaoke-search"><Search size={16} /><input id="karaoke-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Search by song or artist')} disabled={busy || recording} />
          {query.trim().length >= 2 && (matches.length > 0 || youtubeMatches.length > 0 || youtubeSearchError || searchLoading || searchComplete) && <div className="karaoke-results">
            {searchLoading && <p className="karaoke-search-state"><LoaderCircle size={14} className="spin" />{t('Searching Sonora and YouTube…')}</p>}
            {matches.length > 0 && <><div className="karaoke-result-source">{t('SONORA CATALOG')}</div>{matches.map((track) => <button key={`sonora-${track.id}`} onClick={() => chooseCatalogBeat(track)} disabled={busy || recording}><FileAudio2 size={16} /><span><strong>{track.title}</strong><small>{track.artist} · {t('Sonora audio · confirm it is instrumental')}</small></span><Play size={14} /></button>)}</>}
            {youtubeMatches.length > 0 && <><div className="karaoke-result-source">{t('YOUTUBE VIDEOS')}</div>{youtubeMatches.map((video) => <button key={`youtube-${video.video_id}`} onClick={() => chooseYouTubeBeat(video)} disabled={busy || recording}>{video.thumbnail ? <img className="youtube-result-thumb" src={video.thumbnail} alt="" /> : <Music2 size={16} />}<span><strong>{video.title}</strong><small>{video.channel} · YouTube</small></span><Play size={14} /></button>)}</>}
            {youtubeSearchError && <p className="youtube-search-note">{youtubeSearchError}</p>}
            {!searchLoading && searchComplete && matches.length === 0 && youtubeMatches.length === 0 && !youtubeSearchError && <p className="karaoke-search-state">{t('No beats found. Try another search.')}</p>}
          </div>}
        </div>
        <div className="karaoke-or">{t('or')}</div>
        <input ref={beatUpload} className="visually-hidden" type="file" accept="audio/*" onChange={(event) => chooseUploadedBeat(event.target.files[0])} disabled={busy || recording} />
        <button className="button button-secondary" type="button" onClick={() => beatUpload.current?.click()} disabled={busy || recording}><Upload size={15} />{t('Upload a beat from your device')}</button>
      </div>

      <div className="karaoke-selected-beat" hidden={!selectedBeat}>
        <div className="karaoke-beat-icon"><Music2 size={18} /></div><div><strong>{selectedBeat?.title}</strong><small>{selectedBeat?.artist}</small></div>
        {selectedBeat?.type === 'youtube'
          ? <YouTubeBeatPlayer key={selectedBeat.videoId} videoId={selectedBeat.videoId} onReady={(player) => { youtubePlayer.current = player; }} onEnded={() => { if (recording) stopRecording(); }} onPaused={() => { if (recording) stopRecording(); }} onError={() => setError(t('This YouTube video cannot be played here.'))} />
          : <audio ref={beatAudio} crossOrigin="anonymous" src={selectedBeat?.url} controls={!recording} onEnded={() => { if (recording) stopRecording(); }} onError={() => setError(t('This beat could not be played.'))} />}
        <button type="button" className="icon-button" aria-label={t('Remove beat')} disabled={busy || recording} onClick={() => { beatAudio.current?.pause(); youtubePlayer.current?.stopVideo(); if (localBeatUrl.current) URL.revokeObjectURL(localBeatUrl.current); localBeatUrl.current = null; youtubePlayer.current = null; setSelectedBeat(null); setRecordedBlob(null); }}><Trash2 size={15} /></button>
      </div>

      <KaraokeRoomPanel token={token} selectedBeat={selectedBeat} onAttachBeat={attachRoomBeat} onSyncStart={startRecording}
        onStreamsChange={(local, remote) => setDuetStreams({ local, remote })} recording={recording} />

      <div className="karaoke-step-heading karaoke-step-record"><span>2</span><div><h2>{t('Record your performance')}</h2><p>{t('Use headphones, adjust your voice effects, then start singing.')}</p></div></div>
      <div className="karaoke-record-controls">
        <button className="button button-primary" type="button" onClick={recording ? stopRecording : startRecording} disabled={busy || (!selectedBeat && !recording)}>
          {busy ? <LoaderCircle className="spin" size={16} /> : recording ? <Pause size={16} /> : <Mic size={16} />}
          {busy ? t('Preparing…') : recording ? t('Stop recording') : t('Start singing')}
        </button>
        {recording && <span className="karaoke-recording-state"><span className="recording-dot" />{t('Recording')} · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>}
        <label className="karaoke-monitor"><input type="checkbox" checked={monitorVoice} onChange={(event) => setMonitorVoice(event.target.checked)} /><Volume2 size={15} />{t('Monitor my voice')}</label>
      </div>
      <div className="karaoke-effects">
        <strong>{t('Voice effects')}</strong>
        <label><span>{t('Echo')}</span><input type="range" min="0" max="0.7" step="0.01" value={echoAmount} onChange={(event) => setEchoAmount(Number(event.target.value))} /><output>{Math.round(echoAmount * 100)}%</output></label>
        <label><span>{t('Reverb')}</span><input type="range" min="0" max="0.7" step="0.01" value={reverbAmount} onChange={(event) => setReverbAmount(Number(event.target.value))} /><output>{Math.round(reverbAmount * 100)}%</output></label>
      </div>
      {selectedBeat?.type === 'youtube' && <p className="youtube-recording-note">{t('The official YouTube player provides the backing video. Your recording captures your microphone and voice effects only; YouTube audio is not recorded.')}</p>}

      {recordedBlob && <div className="karaoke-result">
        <label className="field-label" htmlFor="karaoke-title">{t('Recording title')}</label>
        <input id="karaoke-title" className="text-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} />
        <audio className="karaoke-preview" controls src={recordedUrl} />
        <div className="karaoke-rights"><label><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} /><span><Check size={12} /></span>{t(selectedBeat?.type === 'youtube' ? 'I own or have permission to distribute the vocals in this recording.' : 'I own or have permission to distribute this entire recording, including the backing audio.')}</label></div>
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
