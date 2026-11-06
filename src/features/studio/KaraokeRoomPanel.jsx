import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../common/api/client.js';
import { Copy, Headphones, LoaderCircle, Radio, Users, X } from '../../common/icons/index.js';
import { InlineMessage } from '../../common/message/Message.jsx';
import { messageOf } from '../../common/message/messages.js';
import { usePreferences } from '../../common/preferences/PreferencesContext.jsx';

async function waitForIceGathering(peer) {
  if (peer.iceGatheringState === 'complete') return;
  await new Promise((resolve) => {
    const finish = () => {
      if (peer.iceGatheringState !== 'complete') return;
      window.clearTimeout(timeout);
      peer.removeEventListener('icegatheringstatechange', finish);
      resolve();
    };
    const timeout = window.setTimeout(() => {
      peer.removeEventListener('icegatheringstatechange', finish);
      resolve();
    }, 8000);
    peer.addEventListener('icegatheringstatechange', finish);
  });
}

export function KaraokeRoomPanel({ token, selectedBeat, onAttachBeat, onSyncStart, onStreamsChange, recording }) {
  const { t } = usePreferences();
  const [room, setRoom] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [liveError, setLiveError] = useState('');
  const [copied, setCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionStarted, setConnectionStarted] = useState(false);
  const [remoteReady, setRemoteReady] = useState(false);
  const [peerVersion, setPeerVersion] = useState(0);
  const startRef = useRef(onSyncStart);
  const attachRef = useRef(onAttachBeat);
  const streamsChangeRef = useRef(onStreamsChange);
  const peer = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const remoteAudio = useRef(null);
  const connectionTimeout = useRef(null);
  const handledStart = useRef('');
  const handledOffer = useRef('');
  const handledAnswer = useRef('');

  startRef.current = onSyncStart;
  attachRef.current = onAttachBeat;
  streamsChangeRef.current = onStreamsChange;

  const closePeer = useCallback(() => {
    window.clearTimeout(connectionTimeout.current);
    connectionTimeout.current = null;
    peer.current?.close();
    peer.current = null;
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    remoteStream.current = null;
    if (remoteAudio.current) remoteAudio.current.srcObject = null;
    streamsChangeRef.current(null, null);
    setConnected(false);
    setConnectionStarted(false);
    setRemoteReady(false);
    setConnecting(false);
  }, []);

  useEffect(() => () => closePeer(), [closePeer]);

  useEffect(() => {
    if (!room?.code) return undefined;
    let active = true;
    const poll = async () => {
      try {
        const result = await api.get(`/karaoke/rooms/${encodeURIComponent(room.code)}`, token);
        if (active) setRoom(result.data);
      } catch (requestError) {
        if (active && requestError.status === 404) {
          closePeer();
          setRoom(null);
          setError(t('This duet room has expired or is no longer available.'));
        } else if (active && requestError.status !== 401) {
          setError(messageOf(requestError));
        }
      }
    };
    const timer = window.setInterval(poll, 1800);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [room?.code, token, t, closePeer]);

  useEffect(() => {
    const currentPeer = peer.current;
    if (!room || !currentPeer || !room.webrtc_offer) return;
    let active = true;
    async function applySignal() {
      if (room.is_host && room.webrtc_answer?.sdp && handledAnswer.current !== room.webrtc_answer.sdp) {
        await currentPeer.setRemoteDescription(room.webrtc_answer);
        handledAnswer.current = room.webrtc_answer.sdp;
        return;
      }
      if (!room.is_host && room.webrtc_offer?.sdp && handledOffer.current !== room.webrtc_offer.sdp) {
        await currentPeer.setRemoteDescription(room.webrtc_offer);
        handledOffer.current = room.webrtc_offer.sdp;
        const answer = await currentPeer.createAnswer();
        await currentPeer.setLocalDescription(answer);
        await waitForIceGathering(currentPeer);
        await api.post(`/karaoke/rooms/${encodeURIComponent(room.code)}/signal`, {
          answer: currentPeer.localDescription.toJSON(),
        }, token);
      }
    }
    applySignal().catch((signalError) => {
      if (active) {
        setLiveError(messageOf(signalError));
        setError(messageOf(signalError));
      }
    });
    return () => { active = false; };
  }, [room?.code, room?.is_host, room?.webrtc_offer?.sdp, room?.webrtc_answer?.sdp, token, peerVersion]);

  useEffect(() => {
    if (room?.status !== 'scheduled' || !room.starts_at || recording) return undefined;
    const startKey = `${room.code}:${room.starts_at}`;
    if (handledStart.current === startKey) return undefined;
    handledStart.current = startKey;
    const delay = Math.max(0, new Date(room.starts_at).getTime() - Date.now());
    const timer = window.setTimeout(() => startRef.current(), delay);
    return () => window.clearTimeout(timer);
  }, [room?.code, room?.status, room?.starts_at, recording]);

  async function createRoom() {
    if (!selectedBeat || selectedBeat.type === 'upload') return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post('/karaoke/rooms', {
        beat_type: selectedBeat.type,
        beat_id: selectedBeat.type === 'youtube' ? selectedBeat.videoId : String(selectedBeat.id),
        beat_title: selectedBeat.title,
        beat_artist: selectedBeat.artist || '',
      }, token);
      setRoom(result.data);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(event) {
    event.preventDefault();
    const code = roomCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post(`/karaoke/rooms/${encodeURIComponent(code)}/join`, {}, token);
      setRoom(result.data);
      attachRef.current(result.data.beat);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function startRoom() {
    if (!room) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.post(`/karaoke/rooms/${encodeURIComponent(room.code)}/start`, {}, token);
      setRoom(result.data);
    } catch (requestError) {
      setError(messageOf(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function connectVoices() {
    if (!room?.guest || peer.current) return;
    setConnecting(true);
    setError('');
    setLiveError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
        throw new Error(t('Live duet voice is not supported by this browser.'));
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      localStream.current = stream;
      streamsChangeRef.current(stream, remoteStream.current);

      const connection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      peer.current = connection;
      stream.getAudioTracks().forEach((track) => connection.addTrack(track, stream));
      connection.ontrack = (event) => {
        remoteStream.current = event.streams[0];
        setRemoteReady(true);
        streamsChangeRef.current(localStream.current, remoteStream.current);
      };
      connection.onconnectionstatechange = () => {
        setConnected(connection.connectionState === 'connected');
        if (connection.connectionState === 'connected') {
          window.clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
          setLiveError('');
        } else if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
          setLiveError(t('The live voice connection failed. Check your network or continue with the backing track.'));
        }
      };
      connectionTimeout.current = window.setTimeout(() => {
        if (connection.connectionState !== 'connected') {
          setLiveError(t('The live voice connection failed. Check your network or continue with the backing track.'));
        }
      }, 20000);
      setConnectionStarted(true);
      setPeerVersion((value) => value + 1);
      if (room.is_host) {
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await waitForIceGathering(connection);
        const result = await api.post(`/karaoke/rooms/${encodeURIComponent(room.code)}/signal`, {
          offer: connection.localDescription.toJSON(),
        }, token);
        setRoom(result.data);
      }
    } catch (connectionError) {
      closePeer();
      setLiveError(messageOf(connectionError));
      setError(messageOf(connectionError));
    } finally {
      setConnecting(false);
    }
  }

  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (clipboardError) {
      setError(messageOf(clipboardError));
    }
  }

  async function leaveRoom() {
    if (!room) return;
    setBusy(true);
    setError('');
    try {
      await api.post(`/karaoke/rooms/${encodeURIComponent(room.code)}/leave`, {}, token);
    } catch (requestError) {
      setError(messageOf(requestError));
      setBusy(false);
      return;
    }
    closePeer();
    setRoom(null);
    setRoomCode('');
    setError('');
    handledStart.current = '';
    setBusy(false);
  }

  return <section className="karaoke-room-card" aria-labelledby="karaoke-room-title">
    <div className="karaoke-room-heading">
      <span className="karaoke-room-icon"><Users size={19} /></span>
      <div><h2 id="karaoke-room-title">{t('Sing together')}</h2><p>{t('Create a duet room, invite someone with its code, and start on the same beat.')}</p></div>
    </div>
    {!room ? <>
      <div className="karaoke-room-actions">
        <button className="button button-secondary" type="button" onClick={createRoom} disabled={busy || !selectedBeat || selectedBeat.type === 'upload' || recording}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <Radio size={16} />}{t('Create a duet room')}
        </button>
        <span className="karaoke-room-divider">{t('or join a friend')}</span>
        <form className="karaoke-join-form" onSubmit={joinRoom}>
          <label className="visually-hidden" htmlFor="karaoke-room-code">{t('Room code')}</label>
          <input id="karaoke-room-code" className="text-input" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().slice(0, 8))} placeholder={t('Enter room code')} autoCapitalize="characters" />
          <button className="button button-primary" type="submit" disabled={busy || roomCode.trim().length < 6}>{t('Join room')}</button>
        </form>
      </div>
      {selectedBeat?.type === 'upload' && <p className="karaoke-room-hint">{t('Choose a Sonora catalog beat or YouTube beat to share it with your duet partner.')}</p>}
    </> : <div className="karaoke-room-active">
      <div className="karaoke-room-code"><div><small>{t('Share this room code')}</small><strong>{room.code}</strong></div><button className="button button-secondary" type="button" onClick={copyRoomCode}><Copy size={15} />{copied ? t('Copied') : t('Copy code')}</button></div>
      <div className="karaoke-room-details">
        <span><strong>{t('Beat')}</strong>{room.beat.title}</span>
        <span><strong>{t('Room members')}</strong>{room.host}{room.guest ? ` + ${room.guest}` : ` · ${t('Waiting for a singer')}`}</span>
        <span><strong>{t('Room status')}</strong>{t(room.status === 'scheduled' ? 'Starting together…' : 'Waiting for the host to start')}</span>
      </div>
      {room.status === 'waiting' && room.guest && <div className="karaoke-room-connection">
        <button className="button button-secondary" type="button" onClick={connectVoices} disabled={busy || connecting || connected || connectionStarted || recording}>
          {connecting ? <LoaderCircle size={15} className="spin" /> : <Headphones size={15} />}{connected ? t('Live voices connected') : connectionStarted ? t('Waiting for live connection…') : room.is_host ? t('Connect singers') : t('Connect my microphone')}
        </button>
        {remoteReady && <audio ref={(element) => {
          remoteAudio.current = element;
          if (element && remoteStream.current) element.srcObject = remoteStream.current;
        }} controls autoPlay playsInline aria-label={t('Hear your duet partner')} />}
      </div>}
      {room.is_host && room.status === 'waiting' && <button className="button button-primary" type="button" onClick={startRoom} disabled={busy || !room.guest || recording || (!connected && !liveError)}>
        {busy ? <LoaderCircle size={16} className="spin" /> : <Radio size={16} />}{connected ? t('Start duet together') : t('Start backing track only')}
      </button>}
      {room.status === 'scheduled' && <p className="karaoke-room-hint"><Radio size={14} />{t('Both singers will start recording when the countdown ends.')}</p>}
      {liveError && <p className="karaoke-room-hint">{liveError}</p>}
      <button className="karaoke-room-leave" type="button" onClick={leaveRoom} disabled={busy || recording}><X size={14} />{t('Leave room')}</button>
    </div>}
    {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
    <p className="karaoke-room-footnote">{t('Connect both singers for live voice and a shared recording mix. You can also start with the beat only if a network blocks the live connection.')}</p>
  </section>;
}
