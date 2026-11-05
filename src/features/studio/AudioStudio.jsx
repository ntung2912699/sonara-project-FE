import { useRef, useState } from 'react';
import { api, downloadFile } from '../../common/api/client.js';
import { formatDate } from '../../common/utils/appData.js';
import { messageOf } from '../../common/message/messages.js';
import { EmptyState } from '../../common/list/EmptyState.jsx';
import { InlineMessage } from '../../common/message/Message.jsx';
import { AlertCircle, AudioLines, Check, CheckCircle2, Clock3, Download, FileAudio2, LoaderCircle, ShieldCheck, SlidersHorizontal, Upload } from '../../common/icons/index.js';
export function AudioStudio({ token, jobs, setJobs, showToast }) {
  const [file, setFile] = useState(null);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const activeCount = jobs.filter((job) => job.status === 'queued' || job.status === 'processing').length;

  async function submit(event) {
    event.preventDefault();
    if (!file || !rightsConfirmed) return;
    setBusy(true);
    setError('');
    const form = new FormData();
    form.append('audio', file);
    form.append('rights_confirmed', '1');
    try {
      const result = await api.upload('/audio-processing', form, token);
      setJobs((current) => [result.data, ...current.filter((job) => String(job.id) !== String(result.data.id))]);
      setFile(null);
      setRightsConfirmed(false);
      if (fileInput.current) fileInput.current.value = '';
      showToast('Your lossless master is in the processing queue.');
    } catch (uploadError) {
      setError(messageOf(uploadError));
    } finally {
      setBusy(false);
    }
  }

  async function downloadOutput(job, format) {
    try {
      await downloadFile(`/audio-processing/${job.id}/files/${format}`, token, `sonora-${job.id}-${format}`);
      showToast(`${format.toUpperCase()} download started.`);
    } catch (downloadError) {
      showToast(messageOf(downloadError), 'error');
    }
  }

  function chooseFile(nextFile) {
    if (!nextFile) return;
    const extension = nextFile.name.split('.').pop()?.toLowerCase();
    if (!['wav', 'flac', 'aiff', 'aif'].includes(extension)) {
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setError('Choose a WAV, AIFF, or FLAC audio file.');
      return;
    }
    if (nextFile.size > 200 * 1024 * 1024) {
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setError('Audio files must be 200 MB or smaller.');
      return;
    }
    setError('');
    setFile(nextFile);
  }

  return (
    <div className="page-content">
      <div className="section-heading collection-heading"><div className="collection-icon studio-icon"><AudioLines size={21} /></div><div><div className="eyebrow section-eyebrow">CREATOR TOOLS</div><h1>Audio studio</h1><p>Prepare lossless masters and get normalized AAC and MP3 exports.</p></div></div>
      <div className="studio-info-grid"><div className="studio-info"><span className="info-icon"><FileAudio2 size={18} /></span><div><strong>Lossless source</strong><small>WAV, AIFF, or FLAC</small></div></div><div className="studio-info"><span className="info-icon"><SlidersHorizontal size={18} /></span><div><strong>Balanced loudness</strong><small>Normalized to -14 LUFS</small></div></div><div className="studio-info"><span className="info-icon"><Clock3 size={18} /></span><div><strong>Up to 30 minutes</strong><small>Maximum file size 200 MB</small></div></div></div>
      <form className="submission-card audio-upload-card" onSubmit={submit}>
        <div className="form-card-title"><div className="eyebrow section-eyebrow">NEW MASTER</div><h2>Upload your audio</h2><p>Upload only audio you own or are authorized to process.</p></div>
        <div className={`drop-zone ${dragging ? 'drop-zone-active' : ''} ${file ? 'drop-zone-selected' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0]); }}
          onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.current?.click(); }}>
          <input ref={fileInput} type="file" accept=".wav,.flac,.aiff,.aif,audio/wav,audio/flac,audio/aiff" hidden onClick={(event) => event.stopPropagation()} onChange={(event) => chooseFile(event.target.files[0])} />
          <div className="drop-icon">{file ? <FileAudio2 size={23} /> : <Upload size={23} />}</div>
          {file ? <><strong>{file.name}</strong><span>{(file.size / (1024 * 1024)).toFixed(1)} MB · Ready to upload</span><button type="button" className="text-link" onClick={(event) => { event.stopPropagation(); setFile(null); if (fileInput.current) fileInput.current.value = ''; }}>Choose a different file</button></>
            : <><strong>Drop your audio file here</strong><span>or <em>browse files</em> from your device</span><small>WAV, AIFF, FLAC · up to 200 MB</small></>}
        </div>
        <label className="rights-check"><input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} required /><span className="custom-check"><Check size={12} /></span><span>I confirm that I own or have permission to process this audio.</span></label>
        {error && <InlineMessage className="inline-error">{error}</InlineMessage>}
        <button className="button button-primary" type="submit" disabled={busy || !file || !rightsConfirmed}>{busy ? <LoaderCircle size={16} className="spin" /> : <AudioLines size={16} />}{busy ? 'Uploading…' : 'Process audio'}</button>
        <p className="upload-disclaimer">Your original master is preserved. Processing may take a few minutes; you can safely leave this page.</p>
      </form>
      <section className="request-history processing-history"><div className="section-heading compact-heading"><div><div className="eyebrow section-eyebrow">PROCESSING QUEUE</div><h2>Your audio jobs {activeCount > 0 && <span className="active-count">{activeCount} active</span>}</h2></div><span className="auto-refresh-label"><span className="online-dot" /> Updates automatically</span></div>
        {!jobs.length ? <EmptyState icon={AudioLines} title="No audio jobs yet" text="Your processed masters and exports will show up here." />
          : <div className="job-list">{jobs.map((job) => <AudioJob key={job.id} job={job} onDownload={downloadOutput} />)}</div>}
      </section>
    </div>
  );
}

export function AudioJob({ job, onDownload }) {
  const status = (job.status || 'queued').toLowerCase();
  const complete = status === 'complete';
  const failed = status === 'failed';
  return <div className="job-card"><div className={`job-icon job-${status}`}><FileAudio2 size={19} /></div><div className="job-copy"><div className="job-title-row"><strong>Audio job #{job.id}</strong><span className={`status-pill status-${status}`}>{status === 'queued' || status === 'processing' ? <LoaderCircle className="spin" size={12} /> : complete ? <CheckCircle2 size={13} /> : failed ? <AlertCircle size={13} /> : null}{status}</span></div><small>{job.source_path?.split('/').pop() || 'Lossless master'}{job.created_at ? ` · Started ${formatDate(job.created_at)}` : ''}</small>{job.failure_code && <p className="job-error">{job.failure_code.replaceAll('_', ' ')}</p>}{job.poll_error && <p className="job-error">Could not refresh status: {job.poll_error}</p>}<div className="job-progress"><span className={complete ? 'progress-complete' : failed ? 'progress-failed' : ''} /></div></div>
    {complete && <div className="job-downloads"><button onClick={() => onDownload(job, 'master')}><Download size={14} /> Master</button><button onClick={() => onDownload(job, 'aac')}><Download size={14} /> AAC</button><button onClick={() => onDownload(job, 'mp3')}><Download size={14} /> MP3</button></div>}
  </div>;
}
