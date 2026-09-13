import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { getApiErrorMessage } from './adminHelpers';

export default function ManualGameUploadPanel({ game, assets, onRegistered }) {
  const [category, setCategory] = useState('build');
  const [filename, setFilename] = useState('game.zip');
  const [version, setVersion] = useState('v1.0.0');
  const [replacesAssetId, setReplacement] = useState('');
  const [plan, setPlan] = useState(null);
  const [fileId, setFileId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setPlan(null); setFileId(''); setReplacement(''); setMessage(''); setError(''); }, [game._id]);
  const pending = assets.filter(a => a.metadata?.manualRegistration && ['pending', 'failed'].includes(a.status));
  const ready = assets.filter(a => a.category === category && a.status === 'ready');
  const perform = async fn => {
    setBusy(true); setError(''); setMessage('');
    try { await fn(); } catch (e) { setError(getApiErrorMessage(e, 'Manual registration failed.')); }
    finally { setBusy(false); }
  };
  const prepare = () => perform(async () => {
    const response = await api.post(`/api/games/${game._id}/assets/manual-instructions`, {
      category, filename, version, replacesAssetId: replacesAssetId || undefined,
    });
    setPlan(response.data.data); setFileId('');
  });
  const resume = id => perform(async () => {
    const response = await api.get(`/api/games/${game._id}/assets/manual/${id}`);
    setPlan(response.data.data); setFileId('');
  });
  const register = () => perform(async () => {
    const response = await api.post(`/api/games/${game._id}/assets/manual/${plan.assetId}/register`, { driveFileId: fileId.trim() });
    setMessage(response.data.data.message);
    setPlan(null); setFileId('');
    await onRegistered();
  });
  const downloadJson = () => perform(async () => {
    const response = await api.get(`/api/games/${game._id}/game-data/download`, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a'); link.href = objectUrl; link.download = 'gameData.json';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  });
  return <section className="admin-editor-form" aria-label="Manual Game Build Upload">
    <h3>Manual Game Build Upload</h3>
    <p>Upload with your own Google Drive account, then register the file here. The backend service account verifies it. No MongoDB editing is needed.</p>
    <div className="admin-form-grid">
      <label className="form-group">Asset category<select className="form-input" value={category} onChange={e => { setCategory(e.target.value); setReplacement(''); setPlan(null); }}>
        <option value="build">Game build</option><option value="thumbnail">Thumbnail</option><option value="banner">Banner</option>
        <option value="screenshot">Screenshot</option><option value="trailer">Video / trailer</option>
      </select></label>
      <label className="form-group">Source filename (with extension)<input className="form-input" value={filename} onChange={e => { setFilename(e.target.value); setPlan(null); }} placeholder="game.zip" /></label>
      {category === 'build' && <label className="form-group">Version<input className="form-input" value={version} onChange={e => { setVersion(e.target.value); setPlan(null); }} placeholder="v1.0.0" /></label>}
      <label className="form-group">Replacement<select className="form-input" value={replacesAssetId} onChange={e => { setReplacement(e.target.value); setPlan(null); const old = ready.find(a => a._id === e.target.value); if (old?.version) setVersion(old.version); }}>
        <option value="">New asset / version</option>{ready.map(a => <option key={a._id} value={a._id}>{a.originalFilename} {a.version || ''}</option>)}
      </select></label>
    </div>
    <button type="button" className="btn btn-primary" disabled={busy} onClick={prepare}>Generate exact upload instructions</button>
    {pending.length > 0 && <details><summary>Resume a pending registration</summary>{pending.map(a => <p key={a._id}>
      <button type="button" disabled={busy} onClick={() => resume(a._id)}>{a.metadata.expectedDriveFilename} ({a.category}, {a.version || a.status})</button>
    </p>)}</details>}
    {error && <p role="alert" className="message message-error">{error}</p>}
    {message && <p role="status" className="message message-success">{message}</p>}
    {plan && <div aria-live="polite">
      <h4>Instructions for {plan.game.title}</h4>
      <dl>
        <dt>Game ID / slug</dt><dd>{plan.game.id} / {plan.game.slug}</dd>
        <dt>Environment</dt><dd><strong>{plan.environment}</strong></dd>
        <dt>Drive root</dt><dd>{plan.root.name} ({plan.rootVariable})</dd>
        <dt>Physical upload folder</dt><dd>{plan.physicalFolder} — {plan.subfolder}</dd>
        <dt>Exact filename to use in Drive</dt><dd><code>{plan.expectedFilename}</code></dd>
        <dt>Version</dt><dd>{plan.version || 'Not used for presentation media'}</dd>
        <dt>Category / type</dt><dd>{plan.category} / {plan.type}</dd>
        <dt>Accepted MIME types (verified from Drive)</dt><dd>{plan.expectedMimeTypes.join(', ')}</dd>
        <dt>Maximum size</dt><dd>{Math.round(plan.maxSize / (1024 * 1024))} MiB</dd>
        <dt>Application visibility</dt><dd>{plan.applicationVisibility}; public access still requires a published game</dd>
        <dt>Logical storage key (not a folder to create)</dt><dd><code>{plan.logicalStorageKey}</code></dd>
      </dl>
      <ol>
        <li><a href={plan.root.url} target="_blank" rel="noreferrer">Open this exact {plan.environment} Drive root</a>. Confirm the root name above.</li>
        <li>Upload the file directly into that root. Do not create a games/files/version subfolder for this binary.</li>
        <li>Rename the uploaded file to <code>{plan.expectedFilename}</code>. This name binds the upload to this registration plan.</li>
        <li>{plan.drivePermission} Account: <code>{plan.serviceAccountEmail || 'the configured service account'}</code>.</li>
        <li>Copy the file link. In <code>drive.google.com/file/d/FILE_ID/view</code>, copy only <code>FILE_ID</code>.</li>
        <li>Enter that ID below. Registration reads the real filename, MIME type, size and parent folder from Drive.</li>
      </ol>
      <label className="form-group">Drive File ID<input className="form-input" value={fileId} onChange={e => setFileId(e.target.value)} autoComplete="off" /></label>
      <button type="button" className="btn btn-primary" disabled={busy || !fileId.trim()} onClick={register}>{busy ? 'Verifying…' : `Register existing Drive ${plan.category === 'build' ? 'build' : 'asset'}`}</button>
      <p>Wrong-root, filename, MIME, version or duplicate-file errors will leave the current game reference intact. Uploading to Drive alone never registers a file.</p>
      <details><summary>Optional legacy gameData.json mirror setup</summary>
        <p>{plan.gameData.note}</p>
        <ol><li>Download generated JSON below. Do not edit it.</li><li>In the same root, create/open <code>{plan.gameData.path}</code>'s parent folders. Upload the downloaded <code>gameData.json</code> there once, as your own Drive account.</li><li>Keep one exactly named manifest, share it with the service account as Editor, then use Retry JSON synchronization. Subsequent changes regenerate it on the backend.</li></ol>
        <button type="button" disabled={busy} onClick={downloadJson}>Download generated gameData.json</button>
      </details>
    </div>}
    {!plan && <details><summary>Legacy JSON mirror</summary><p>Current status: {game.gameDataSync?.status || 'Not generated'}. {game.gameDataSync?.message || ''}</p><p>Download generated JSON for one-time human-owned setup in <code>games/{game.gameFolder || game._id}/gameData.json</code> under the environment root. The public UI reads MongoDB and does not depend on this file.</p><button type="button" disabled={busy} onClick={downloadJson}>Download generated gameData.json</button></details>}
  </section>;
}
