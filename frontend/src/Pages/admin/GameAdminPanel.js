import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import api, { resolveApiUrl } from "../../services/api";
import { formatAdminDate, getApiErrorMessage } from "./adminHelpers";
import "./GameAdminUX.css";
import ManualGameUploadPanel from "./ManualGameUploadPanel";
import GameCardPreview from "../../Components/GameCardPreview";
import GameDetailPreview from "../../Components/GameDetailPreview";
import { buildGamePreview, createFilePreview, revokeFilePreview, revokeAllPreviews } from "../../utils/gamePreviewAdapter";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542751371-adc38448a05e";

const emptyGame = {
  title: "",
  slug: "",
  description: "",
  fullStory: "",
  genre: "",
  developer: "",
  image: "",
  banner: "",
  screenshots: "",
  videos: "",
  gameFile: "",
  gameFolder: "",
  gameLink: "",
  platforms: "Windows",
  players: "1",
  year: String(new Date().getFullYear()),
  isFeatured: false,
  isActive: false,
};

const emptyPendingFiles = { thumbnail: [], banner: [], screenshot: [], trailer: [], build: [] };

const formFromGame = (game) => ({
  title: game.title || game.name || "",
  slug: game.slug || "",
  description: game.description || "",
  fullStory: game.fullStory || "",
  genre: game.genre || "",
  developer: game.developer || "",
  image: game.image || "",
  banner: game.banner || "",
  screenshots: (game.screenshots || []).join("\n"),
  videos: (game.videos || []).join("\n"),
  gameFile: game.gameFile || "",
  gameFolder: game.gameFolder || "",
  gameLink: game.gameLink || "",
  platforms: (game.platforms || []).join(", "),
  players: game.info?.players || "1",
  year: game.info?.year || "",
  isFeatured: Boolean(game.isFeatured),
  isActive: game.isActive !== false,
});

const assetContentUrl = (asset) =>
  resolveApiUrl(asset.previewUrl || asset.metadata?.publicUrl || `/api/assets/${asset._id}/content`);

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

// ─── Asset preview card ───────────────────────────────────────────────────────
const AssetPreview = ({ asset, onOpen, onRemove, onReplace, extraControls }) => {
  const isVideo = asset.type === "video";
  return (
    <div className="game-asset-item">
      {isVideo ? (
        <video className="game-asset-preview game-asset-video" src={assetContentUrl(asset)} controls preload="metadata" />
      ) : (
        <img className="game-asset-preview" src={assetContentUrl(asset)} alt={asset.originalFilename} loading="lazy" />
      )}
      <div className="game-asset-info">
        <strong>{asset.originalFilename}</strong>
        <span>
          {asset.status}
          {asset.version ? ` · ${asset.version}` : ""}
          {asset.fileSize ? ` · ${formatBytes(asset.fileSize)}` : ""}
        </span>
      </div>
      <div className="admin-record-actions" style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {extraControls}
        {onReplace && <label>Replace<input type="file" onChange={e => { if (e.target.files[0]) onReplace(asset, e.target.files[0]); e.target.value = ''; }} /></label>}
        {onOpen && <button className="btn btn-secondary" type="button" onClick={() => onOpen(asset)}>Open</button>}
        <button className="btn btn-danger" type="button" onClick={() => onRemove(asset)}>Remove</button>
      </div>
    </div>
  );
};

// ─── Build asset row ──────────────────────────────────────────────────────────
const BuildAssetRow = ({ asset, onOpen, onRemove, onReplace, onSelect, current }) => (
  <div className="game-build-row">
    <div>{current ? "Current build" : ""}</div>
    <div className="game-build-icon">📦</div>
    <div className="game-asset-info" style={{ flex: 1 }}>
      <strong>{asset.originalFilename}</strong>
      <span>
        {asset.version ? `${asset.version} · ` : ""}
        {formatBytes(asset.fileSize)}
        {" · "}
        <span className={`asset-status-badge asset-status-${asset.status}`}>{asset.status}</span>
      </span>
    </div>
    <div className="admin-record-actions">
      <label>Replace<input type="file" onChange={e => { if (e.target.files[0]) onReplace(asset, e.target.files[0]); e.target.value = ''; }} /></label>
      {asset.status === 'ready' && !current && <button type="button" onClick={() => onSelect(asset)}>Use this build</button>}
      <button className="btn btn-secondary" type="button" onClick={() => onOpen(asset)}>Open</button>
      <button className="btn btn-danger" type="button" onClick={() => onRemove(asset)}>Delete</button>
    </div>
  </div>
);

// ─── Pending file pill ────────────────────────────────────────────────────────
const PendingFile = ({ file, onRemove }) => (
  <div className="game-pending-item">
    {(file.type || "").startsWith("video/") ? (
      <span className="game-pending-icon">VIDEO</span>
    ) : (file.type || "").startsWith("image/") ? (
      <img src={file.previewUrl} alt="" />
    ) : (
      <span className="game-pending-icon">FILE</span>
    )}
    <span title={file.name}>{file.name}</span>
    <button className="btn btn-secondary" type="button" onClick={onRemove}>Remove</button>
  </div>
);

// ─── Upload progress bar ──────────────────────────────────────────────────────
const UploadProgress = ({ role, uploadingRole, uploadProgress }) => {
  if (uploadingRole !== role) return null;
  return (
    <div className="game-upload-progress">
      <div className="game-upload-bar" style={{ width: `${uploadProgress}%` }} />
      <span>{uploadProgress}%</span>
    </div>
  );
};

// =============================================================================
// Main Panel
// =============================================================================
const GameAdminPanel = () => {
  const [editorSection, setEditorSection] = useState("library");
  const [gameSearch, setGameSearch] = useState("");
  const [validation, setValidation] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [games, setGames] = useState([]);
  const [form, setForm] = useState(emptyGame);
  const [selectedGame, setSelectedGame] = useState(null);
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]);
  const [pendingFiles, setPendingFiles] = useState(emptyPendingFiles);
  const [buildVersion, setBuildVersion] = useState("v1.0.0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingRole, setUploadingRole] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const fileInputRefs = useRef({});

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadGames = async () => {
    setLoading(true);
    setError("");
    try {
      const [gamesResponse, categoriesResponse] = await Promise.all([
        // isActive=all → returns ALL games regardless of live/unpublished/disabled state
        api.get("/api/games/admin?envelope=true&isActive=all&limit=100"),
        api.get("/api/games/categories"),
      ]);
      const allGames = [...(gamesResponse.data?.data || [])];
      for (let page = 2; page <= (gamesResponse.data?.meta?.pages || 1); page++) {
        const next = await api.get(`/api/games/admin?isActive=all&limit=100&page=${page}`);
        allGames.push(...(next.data?.data || []));
      }
      setGames(allGames);
      setCategories(
        Array.isArray(categoriesResponse.data)
          ? categoriesResponse.data
          : categoriesResponse.data?.data || [],
      );
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load games."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGames(); }, []);

  const loadAssets = useCallback(async (game) => {
    if (!game?._id) return;
    setSelectedGame(game);
    setError("");
    try {
      const freshResponse = await api.get(`/api/games/admin/${game._id}`);
      const fresh = freshResponse.data.data;
      setSelectedGame(fresh); setForm(formFromGame(fresh));
      const response = await api.get(`/api/games/${game._id}/assets?status=all`);
      const items = await Promise.all((response.data?.data?.assets || []).filter(a => a.status !== 'deleted').map(async asset => {
        if (asset.status !== 'ready') return asset;
        try { const url = await api.get(`/api/assets/${asset._id}/url`); return { ...asset, previewUrl: url.data.data.url }; }
        catch { return asset; }
      }));
      setAssets(items);
      const check = await api.get(`/api/games/${game._id}/publication`);
      setValidation(check.data.data);
    } catch (requestError) {
      setAssets([]);
      setError(getApiErrorMessage(requestError, "Unable to load game assets."));
    }
  }, []);

  // ── Form helpers ────────────────────────────────────────────────────────────
  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const editGame = async (game) => {
    setEditorSection("details");
    revokeAllPreviews(pendingFiles); setPendingFiles(emptyPendingFiles);
    setForm(formFromGame(game));
    setNotice("");
    setError("");
    setBuildVersion("v1.0.0");
    await loadAssets(game);
  };

  const resetForm = () => {
    setEditorSection("details");
    revokeAllPreviews(pendingFiles);
    setSelectedGame(null);
    setForm(emptyGame);
    setAssets([]);
    setPendingFiles(emptyPendingFiles);
    setBuildVersion("v1.0.0");
  };

  // ── Save game metadata ──────────────────────────────────────────────────────
  const submitGame = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const payload = {
      title: form.title,
      slug: form.slug || undefined,
      description: form.description,
      fullStory: form.fullStory,
      genre: form.genre,
      developer: form.developer,
      image: form.image,
      banner: form.banner,
      screenshots: form.screenshots.split('\n').map(v => v.trim()).filter(Boolean),
      videos: form.videos.split('\n').map(v => v.trim()).filter(Boolean),
      gameFile: form.gameFile,
      ...(selectedGame ? {} : { gameFolder: form.gameFolder || undefined }),
      gameLink: form.gameLink,
      platforms: form.platforms.split(",").map((v) => v.trim()).filter(Boolean),
      info: { players: form.players, year: form.year },
      isFeatured: form.isFeatured,

    };
    try {
      const response = selectedGame
        ? await api.patch(`/api/games/${selectedGame._id}`, payload)
        : await api.post("/api/games", payload);
      const savedGame = response.data?.data || response.data;
      setNotice(`Game "${savedGame?.title || form.title}" saved. Manage assets below.`);
      setForm(formFromGame(savedGame));
      setSelectedGame(savedGame);
      await loadGames();
      await loadAssets(savedGame);
    } catch (requestError) {
      await loadGames();
      const createdId = requestError.response?.data?.error?.details?.gameId;
      if (createdId) await loadAssets({ _id: createdId });
      setError(getApiErrorMessage(requestError, "Unable to save game."));
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle live/unpublished ─────────────────────────────────────────────────
  const toggleLive = async (game) => {
    setError("");
    setNotice("");
    setPublishing(true);
    try {
      await api.post(`/api/games/${game._id}/publication`, { action: game.isActive ? "unpublish" : "publish" });
      setNotice(`${game.title} is now ${game.isActive ? "unpublished" : "live"}.`);
      await loadGames();
      if (selectedGame?._id === game._id) await loadAssets(game);
    } catch (requestError) {
      await loadGames();
      if (selectedGame?._id === game._id) await loadAssets(game);
      setError(getApiErrorMessage(requestError, "Unable to change game visibility."));
    } finally { setPublishing(false); }
  };

  // ── Delete game ─────────────────────────────────────────────────────────────
  const deleteGame = async (game) => {
    if (!window.confirm(`Delete "${game.title}"? This removes the game from the site. Drive files are retained for recovery.`)) return;
    setDeletingId(game._id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/api/games/${game._id}`);
      setNotice(`Game "${game.title}" deleted.`);
      if (selectedGame?._id === game._id) resetForm();
      await loadGames();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to delete game."));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Pending file helpers ────────────────────────────────────────────────────
  const addPendingFiles = useCallback((category, fileList, multiple) => {
    const selected = Array.from(fileList || []);
    const filesWithPreviews = selected.map(createFilePreview);
    setPendingFiles((current) => ({
      ...current,
      [category]: multiple ? [...current[category], ...filesWithPreviews] : filesWithPreviews.slice(-1),
    }));
  }, []);

  const removePendingFile = useCallback((category, index) => {
    setPendingFiles((current) => {
      const file = current[category]?.[index];
      if (file) revokeFilePreview(file);
      return {
        ...current,
        [category]: current[category].filter((_, i) => i !== index),
      };
    });
  }, []);

  // ── Upload assets ───────────────────────────────────────────────────────────
  const uploadRole = async (category) => {
    if (!selectedGame || !pendingFiles[category]?.length || uploadingRole) return;
    setUploadingRole(category);
    setUploadProgress(0);
    setError("");
    setNotice("");
    try {
      // For single-slot assets (thumbnail/banner), replace existing
      const existing =
        category === "thumbnail" || category === "banner"
          ? assets.find((a) => a.category === category && a.status === "ready")
          : null;

      for (const file of pendingFiles[category]) {
        const actualFile = file.rawFile || file;
        const body = new FormData();
        body.append("file", actualFile, actualFile.name || file.name || "upload");
        body.append("category", category);
        if (existing) body.append("replacesAssetId", existing._id);
        body.append("visibility", category === "build" ? "private" : "public");
        if (category === "build" && buildVersion) {
          body.append("version", buildVersion);
        }

        const response = await api.post(
          `/api/games/${selectedGame._id}/assets/upload-file`,
          body,
          {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
              }
            },
            // Long timeout for large game build files (5 GB max)
            timeout: category === "build" ? 7200000 : 120000,
          },
        );

        const uploaded = response.data?.data?.asset;
        if (uploaded) setAssets((current) => [...current, uploaded]);
      }

      pendingFiles[category].forEach(revokeFilePreview);
      setPendingFiles((current) => ({ ...current, [category]: [] }));

      const label =
        category === "screenshot" ? "Gallery images" :
        category === "trailer" ? "Videos" :
        category === "build" ? "Game build" :
        category;
      setNotice(`${label} uploaded successfully.`);
      await loadAssets(selectedGame);
      await loadGames();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, `Unable to upload ${category}.`));
    } finally {
      setUploadingRole("");
    }
  };

  // ── Delete asset ────────────────────────────────────────────────────────────
  const deleteAsset = async (asset) => {
    if (!window.confirm(`Delete "${asset.originalFilename}"? This detaches the file from the game. Drive storage is retained.`)) return;
    setError("");
    setNotice("");
    try {
      await api.delete(`/api/assets/${asset._id}`);
      setNotice(`"${asset.originalFilename}" removed from the game.`);
      await loadAssets(selectedGame);
      await loadGames();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to remove asset."));
    }
  };

  // ── Open asset in new tab ───────────────────────────────────────────────────
  const openAsset = async (asset) => {
    try {
      const response = await api.get(`/api/assets/${asset._id}/url`);
      const url = response.data?.data?.url;
      if (url) window.open(resolveApiUrl(url), "_blank", "noopener,noreferrer");
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to open asset."));
    }
  };

  // ── Reorder screenshot / video ──────────────────────────────────────────────
  const moveAsset = async (category, index, direction) => {
    if (reordering) return;
    const key = category === "screenshot" ? "screenshot" : "trailer";
    const currentList = assetsByCategory[key];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentList.length) return;

    // Optimistically update local state
    const reordered = [...currentList];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];

    setAssets((prev) => {
      const others = prev.filter((a) => a.category !== key || a.status !== "ready");
      return [...others, ...reordered];
    });

    setReordering(true);
    setError("");
    try {
      await api.patch(`/api/games/${selectedGame._id}/assets/reorder`, {
        category,
        order: reordered.map((a) => a._id),
      });
      await loadAssets(selectedGame); await loadGames();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to save reorder."));
      // Roll back — reload from server
      await loadAssets(selectedGame);
    } finally {
      setReordering(false);
    }
  };

  const replaceAsset = async (asset, file) => {
    if (uploadingRole) return;
    setUploadingRole(asset.category); setError('');
    try {
      const body = new FormData(); body.append('file', file); body.append('category', asset.category);
      body.append('replacesAssetId', asset._id); body.append('visibility', asset.visibility);
      if (asset.version) body.append('version', asset.version);
      await api.post(`/api/games/${selectedGame._id}/assets/upload-file`, body, { timeout: 7200000 });
      await loadAssets(selectedGame); await loadGames();
    } catch (e) { setError(getApiErrorMessage(e, 'Replacement failed; previous references were preserved.')); }
    finally { setUploadingRole(''); }
  };
  const selectBuild = async (asset) => {
    try {
      await api.patch(`/api/games/${selectedGame._id}`, { gameLink: `/api/assets/${asset._id}/content?download=true`, gameFile: asset.originalFilename });
      await loadAssets(selectedGame); await loadGames();
    } catch (e) { setError(getApiErrorMessage(e, 'Unable to select build')); }
  };
  const changeDisabled = async game => {
    try {
      await api.post(`/api/games/${game._id}/publication`, { action: game.isDisabled ? 'enable' : 'disable' });
      await loadGames(); if (selectedGame?._id === game._id) await loadAssets(game);
    } catch (e) { setError(getApiErrorMessage(e, 'Unable to change state')); }
  };
  const isReferenced = a => {
    const url = `/api/assets/${a._id}/content`;
    return [selectedGame?.image, selectedGame?.banner, ...(selectedGame?.screenshots || []), ...(selectedGame?.videos || [])].includes(url);
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const assetsByCategory = useMemo(() => ({
    build: assets.filter((a) => a.category === "build" && a.status !== "deleted"),
    thumbnail: assets.filter((a) => a.category === "thumbnail" && a.status === "ready" && isReferenced(a)),
    banner: assets.filter((a) => a.category === "banner" && a.status === "ready" && isReferenced(a)),
    screenshot: assets.filter((a) => a.category === "screenshot" && a.status === "ready" && isReferenced(a)),
    trailer: assets.filter((a) => a.category === "trailer" && a.status === "ready" && isReferenced(a)),
  }), [assets, selectedGame]);

  const previewGame = useMemo(
    () =>
      buildGamePreview({
        form,
        assets,
        pendingFiles,
        selectedGame,
        resolveUrl: resolveApiUrl,
      }),
    [form, assets, pendingFiles, selectedGame],
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  /** Single-slot asset section (thumbnail, banner) */
  const renderSingleRole = (category, title, description, accept) => {
    const current = assetsByCategory[category];
    const pending = pendingFiles[category];
    const inputId = `file-input-${category}`;
    return (
      <div className="game-asset-role">
        <div className="game-asset-role-heading">
          <div>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
          <span className="game-asset-role-badge">Single</span>
        </div>
        <div className="game-asset-existing">
          {current.length
            ? current.map((asset) => (
                <AssetPreview key={asset._id} asset={asset} onOpen={openAsset} onRemove={deleteAsset} onReplace={replaceAsset} />
              ))
            : <p className="admin-state">No {title.toLowerCase()} uploaded yet.</p>}
        </div>
        <div className="game-asset-picker">
          <input
            ref={(el) => { fileInputRefs.current[category] = el; }}
            id={inputId}
            className="form-input"
            type="file"
            accept={accept}
            onChange={(e) => { addPendingFiles(category, e.target.files, false); e.target.value = ""; }}
          />
          <label htmlFor={inputId} className="file-input-label">
            {current.length ? "Choose replacement file" : "Choose file"}
          </label>
        </div>
        {pending.length > 0 && (
          <div className="game-pending-list">
            <strong>Waiting to upload</strong>
            {pending.map((file, index) => (
              <PendingFile key={`${file.name}-${index}`} file={file} onRemove={() => removePendingFile(category, index)} />
            ))}
            <UploadProgress role={category} uploadingRole={uploadingRole} uploadProgress={uploadProgress} />
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => uploadRole(category)}
              disabled={Boolean(uploadingRole)}
            >
              {uploadingRole === category ? `Uploading ${uploadProgress}%` : "Upload file"}
            </button>
          </div>
        )}
      </div>
    );
  };

  /** Multi-item reorderable gallery (screenshots, videos) */
  const renderGalleryRole = (category, title, description, accept) => {
    const current = assetsByCategory[category];
    const pending = pendingFiles[category];
    const inputId = `file-input-${category}`;
    const isVideo = category === "trailer";

    return (
      <div className="game-asset-role">
        <div className="game-asset-role-heading">
          <div>
            <h4>{title}</h4>
            <p>{description}</p>
          </div>
          <span className="game-asset-role-badge">Multiple · Ordered</span>
        </div>
        <div className="game-asset-existing">
          {current.length ? (
            current.map((asset, index) => (
              <AssetPreview
                key={asset._id}
                asset={asset}
                onOpen={openAsset}
                onRemove={deleteAsset} onReplace={replaceAsset}
                extraControls={
                  <>
                    <button
                      className="btn btn-secondary game-asset-reorder-btn"
                      type="button"
                      title="Move left"
                      disabled={index === 0 || reordering}
                      onClick={() => moveAsset(category, index, -1)}
                    >
                      ←
                    </button>
                    <button
                      className="btn btn-secondary game-asset-reorder-btn"
                      type="button"
                      title="Move right"
                      disabled={index === current.length - 1 || reordering}
                      onClick={() => moveAsset(category, index, 1)}
                    >
                      →
                    </button>
                    <span className="game-asset-index-badge">{index + 1}</span>
                  </>
                }
              />
            ))
          ) : (
            <p className="admin-state">No {title.toLowerCase()} uploaded yet.</p>
          )}
        </div>
        <div className="game-asset-picker">
          <input
            ref={(el) => { fileInputRefs.current[category] = el; }}
            id={inputId}
            className="form-input"
            type="file"
            accept={accept}
            multiple
            onChange={(e) => { addPendingFiles(category, e.target.files, true); e.target.value = ""; }}
          />
          <label htmlFor={inputId} className="file-input-label">
            Add {isVideo ? "video" : "image"}{current.length ? " (appends to end)" : ""}
          </label>
        </div>
        {pending.length > 0 && (
          <div className="game-pending-list">
            <strong>New files waiting to upload</strong>
            {pending.map((file, index) => (
              <PendingFile key={`${file.name}-${index}`} file={file} onRemove={() => removePendingFile(category, index)} />
            ))}
            <UploadProgress role={category} uploadingRole={uploadingRole} uploadProgress={uploadProgress} />
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => uploadRole(category)}
              disabled={Boolean(uploadingRole)}
            >
              {uploadingRole === category ? `Uploading ${uploadProgress}%` : `Upload ${pending.length} file${pending.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}
      </div>
    );
  };

  /** Game Build section */
  const renderBuildSection = () => {
    const builds = assetsByCategory.build;
    const pending = pendingFiles.build;
    const inputId = "file-input-build";

    return (
      <section className="game-build-section">
        <div className="admin-panel-heading">
          <div>
            <h3>🗂 Game Build</h3>
            <p>Upload the actual game file (.zip, .exe, installer, etc.). Uploads go through the backend to storage — credentials are never exposed to the browser.</p>
          </div>
        </div>

        {/* Existing build files */}
        {builds.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
            {builds.map((asset) => (
              <BuildAssetRow onSelect={selectBuild} current={selectedGame.gameLink?.includes(`/api/assets/${asset._id}/content`)} key={asset._id} asset={asset} onOpen={openAsset} onRemove={deleteAsset} onReplace={replaceAsset} />
            ))}
          </div>
        ) : (
          <p className="admin-state">No game build uploaded yet.</p>
        )}

        {/* Upload new build */}
        <div className="game-build-upload-area">
          <div className="game-asset-picker" style={{ marginBottom: "0.75rem" }}>
            <label className="form-label" style={{ marginBottom: "0.35rem" }}>Version tag</label>
            <input
              className="form-input game-asset-version-input"
              type="text"
              placeholder="e.g. v1.0.0"
              value={buildVersion}
              onChange={(e) => setBuildVersion(e.target.value)}
              style={{ maxWidth: "180px" }}
            />
          </div>
          <div className="game-asset-picker">
            <input
              ref={(el) => { fileInputRefs.current.build = el; }}
              id={inputId}
              className="form-input"
              type="file"
              accept=".zip,.rar,.7z,.tar,.gz,.exe,.dmg,.pkg,.apk,.iso,.bin"
              onChange={(e) => { addPendingFiles("build", e.target.files, false); e.target.value = ""; }}
            />
            <label htmlFor={inputId} className="file-input-label">
              Choose game file
            </label>
          </div>
          {pending.length > 0 && (
            <div className="game-pending-list" style={{ marginTop: "0.75rem" }}>
              <strong>Game file ready to upload</strong>
              {pending.map((file, index) => (
                <PendingFile key={`${file.name}-${index}`} file={file} onRemove={() => removePendingFile("build", index)} />
              ))}
              <UploadProgress role="build" uploadingRole={uploadingRole} uploadProgress={uploadProgress} />
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => uploadRole("build")}
                disabled={Boolean(uploadingRole)}
              >
                {uploadingRole === "build" ? `Uploading ${uploadProgress}%` : "Upload game build"}
              </button>
            </div>
          )}
        </div>
      </section>
    );
  };

  const togglePreview = () => setPreviewExpanded((prev) => !prev);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="admin-feature-panel game-admin-workspace">
      <div className="admin-panel-heading">
        <div>
          <h2>Game Management</h2>
          <p>All games — live, unpublished, and disabled — are listed here. Edit any game and manage its assets.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={togglePreview}
            style={{ padding: "0.5rem 1rem" }}
          >
            {previewExpanded ? "Hide Preview" : "Show Preview"}
          </button>
          <button className="btn btn-primary" type="button" onClick={resetForm}>+ New game</button>
        </div>
      </div>

      {(error || notice) && (
        <div className={`message ${error ? "message-error" : "message-success"}`}>{error || notice}</div>
      )}

      <nav className="game-editor-nav" aria-label="Game editor sections">
        {[["library", "All games"], ["details", "Game details"], ["media", "Images & videos"], ["builds", "Builds & Drive"], ["publish", "Publish"]].map(([key, label]) => (
          <button type="button" key={key} aria-current={editorSection === key ? "page" : undefined}
            disabled={!selectedGame && !["library", "details"].includes(key)} onClick={() => setEditorSection(key)}>{label}</button>
        ))}
      </nav>
      {editorSection !== 'library' && <div className="game-editor-context"><strong>{selectedGame?.title || 'New game'}</strong><span>{selectedGame ? (selectedGame.isDisabled ? 'Disabled' : selectedGame.isActive ? 'Live' : 'Unpublished') : 'Save game details to unlock assets and publishing'}</span></div>}
      <div className="admin-content-stack">
        <div className="admin-form-column">

          {/* ─── GAME DETAILS ─────────────────────────────────────────── */}
          <form hidden={editorSection !== "details"} className="admin-editor-form" onSubmit={submitGame}>
            <h3>{selectedGame ? `Edit: ${selectedGame.title}` : "Create game"}</h3>
            {selectedGame && !selectedGame.isActive && (
              <div className="game-status-banner game-status-unpublished">
                ⚠️ This game is currently <strong>{selectedGame.isDisabled ? "disabled" : "unpublished"}</strong>. All fields are fully editable.
              </div>
            )}
            <div className="admin-form-grid">
              <label className="form-group">
                <span className="form-label">Title *</span>
                <input className="form-input" name="title" value={form.title} onChange={updateField} required />
              </label>
              <label className="form-group">
                <span className="form-label">Slug</span>
                <input className="form-input" name="slug" value={form.slug} onChange={updateField} placeholder="Generated when empty" />
              </label>
              <label className="form-group">
                <span className="form-label">Genre *</span>
                <input className="form-input" list="game-genres" name="genre" value={form.genre} onChange={updateField} required />
                <datalist id="game-genres">
                  {categories.map((cat) => <option key={cat._id || cat.name} value={cat.name} />)}
                </datalist>
              </label>
              <label className="form-group">
                <span className="form-label">Developer *</span>
                <input className="form-input" name="developer" value={form.developer} onChange={updateField} required />
              </label>
              <label className="form-group">
                <span className="form-label">Cover URL (fallback)</span>
                <input className="form-input" name="image" value={form.image} onChange={updateField} placeholder="Optional image URL" />
              </label>
              <label className="form-group">
                <span className="form-label">Game link</span>
                <input className="form-input" name="gameLink" value={form.gameLink} onChange={updateField} />
              </label>
              <label className="form-group">
                <span className="form-label">Platforms</span>
                <input className="form-input" name="platforms" value={form.platforms} onChange={updateField} placeholder="Windows, Web" />
              </label>
              <label className="form-group">
                <span className="form-label">Players</span>
                <input className="form-input" name="players" value={form.players} onChange={updateField} />
              </label>
              <label className="form-group">
                <span className="form-label">Release year</span>
                <input className="form-input" name="year" value={form.year} onChange={updateField} />
              </label>
            </div>
            <details className="game-advanced"><summary>Advanced asset URLs and storage fields</summary>
            <label className="form-group">Banner URL<input className="form-input" name="banner" value={form.banner} onChange={updateField} /></label>
            <label className="form-group">Screenshot URLs (one per line, in display order)<textarea className="form-textarea" name="screenshots" value={form.screenshots} onChange={updateField} /></label>
            <label className="form-group">Video URLs (one per line, in display order)<textarea className="form-textarea" name="videos" value={form.videos} onChange={updateField} /></label>
            <label className="form-group">Build filename<input className="form-input" name="gameFile" value={form.gameFile} onChange={updateField} /></label>
            <label className="form-group">Drive game folder (fixed after creation)<input className="form-input" name="gameFolder" value={form.gameFolder} onChange={updateField} disabled={Boolean(selectedGame)} /></label>
            </details>
            <label className="form-group">
              <span className="form-label">Description *</span>
              <textarea className="form-textarea" name="description" value={form.description} onChange={updateField} required />
            </label>
            <label className="form-group">
              <span className="form-label">Full story</span>
              <textarea className="form-textarea" name="fullStory" value={form.fullStory} onChange={updateField} />
            </label>
            <div className="admin-inline-fields">
              <label className="form-checkbox">
                <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={updateField} />
                {" "}Featured
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving || Boolean(uploadingRole) || publishing}>
              {saving ? "Saving…" : selectedGame ? "Save changes" : "Create game"}
            </button>
          </form>

          {/* ─── ASSET SECTIONS (only when a game is selected) ─────────── */}
          {selectedGame && (
            <>
              <section hidden={editorSection !== "publish"} className="admin-editor-form game-publication" aria-live="polite">
                <h3>Publish your game</h3><p>Save your details first. These checks use the saved version of your game.</p>
                <p>{validation?.publishable ? 'Ready to publish' : 'Cannot publish yet'}</p>
                <ul>{validation?.missing?.map(item => <li key={item}>{item}</li>)}</ul>
                <p>Drive JSON: {selectedGame.gameDataSync?.status || 'Not generated'}</p>
                <button className="btn btn-primary" type="button" disabled={publishing || Boolean(uploadingRole) || (!selectedGame.isActive && !validation?.publishable)} onClick={() => toggleLive(selectedGame)}>{selectedGame.isActive ? 'Unpublish' : 'Publish saved game'}</button>
                <details className="game-advanced"><summary>Advanced: Drive JSON synchronization</summary><button className="btn btn-secondary" type="button" onClick={async () => { try { await api.post(`/api/games/${selectedGame._id}/game-data/sync`); await loadAssets(selectedGame); } catch (e) { setError(getApiErrorMessage(e, 'Sync failed')); } }}>Retry JSON synchronization</button>
                <button type="button" onClick={async () => { try { await api.post(`/api/games/${selectedGame._id}/game-data/recover`); await loadAssets(selectedGame); } catch (e) { setError(getApiErrorMessage(e, 'Recovery requires an interrupted operation idle for at least two minutes.')); } }}>Recover interrupted synchronization</button></details>
              </section>
              <div hidden={editorSection !== "builds"}>
              <ManualGameUploadPanel game={selectedGame} assets={assets} onRegistered={async () => { await loadAssets(selectedGame); await loadGames(); }} />
              {/* GAME BUILD */}
              {renderBuildSection()}
              </div>

              {/* GAME ASSETS */}
              <section hidden={editorSection !== "media"} className="admin-assets-section">
                <div className="admin-panel-heading">
                  <div>
                    <h3>🖼 Game Assets</h3>
                    <p>Uploads go through the backend — credentials are never sent to the browser. Order changes for gallery &amp; videos are persisted immediately.</p>
                  </div>
                </div>
                {renderSingleRole("thumbnail", "Thumbnail / Card image", "Used in game cards, lists, and the detail sidebar.", "image/png,image/jpeg,image/webp")}
                {renderSingleRole("banner", "Banner / Hero image", "The large media shown first on the game detail page.", "image/png,image/jpeg,image/webp")}
                {renderGalleryRole("screenshot", "Screenshots / Gallery", "Ordered images shown in the detail carousel. Use ← → to reorder.", "image/png,image/jpeg,image/webp")}
                {renderGalleryRole("trailer", "Videos", "Ordered videos shown after screenshots. Use ← → to reorder.", "video/mp4,video/webm,video/quicktime")}
              </section>
            </>
          )}

          {/* ─── GAMES LIST ────────────────────────────────────────────── */}
          <div hidden={editorSection !== "library"} className="admin-list-section">
            <label className="form-group">Find a game<input className="form-input" type="search" placeholder="Search by title, genre or developer" value={gameSearch} onChange={e => setGameSearch(e.target.value)} /></label>
            <div className="admin-panel-heading">
              <div>
                <h3>Games</h3>
                <p>{games.length} game{games.length === 1 ? "" : "s"} total (including unpublished &amp; disabled).</p>
              </div>
            </div>
            {loading && <p className="admin-state">Loading games…</p>}
            {!loading && !games.length && <p className="admin-state">No games found.</p>}
            {!loading && games.length > 0 && !games.some(game => [game.title,game.name,game.genre,game.developer].some(value => value?.toLowerCase().includes(gameSearch.trim().toLowerCase()))) && <p className="admin-state">No matching games. Try another search.</p>}
            {!loading && games.filter(game => [game.title,game.name,game.genre,game.developer].some(value => value?.toLowerCase().includes(gameSearch.trim().toLowerCase()))).map((game) => (
              <article
                className={`admin-record ${game.isActive ? "" : "admin-record-muted"}`}
                key={game._id}
              >
                <img
                  className="admin-record-thumb"
                  src={resolveApiUrl(game.image || FALLBACK_IMAGE)}
                  alt=""
                  onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                />
                <div className="admin-record-copy">
                  <h4>{game.title || game.name}</h4>
                  <p>{game.slug || "No slug"} · {game.genre} · {game.developer}</p>
                  <p className="admin-muted">
                    <span className={`game-status-pill ${game.isActive ? "game-status-live" : "game-status-draft"}`}>
                      {game.isDisabled ? "Disabled" : game.isActive ? "Live" : "Unpublished"}
                    </span>
                    {game.isFeatured && <span className="game-status-pill game-status-featured">Featured</span>}
                    {" "}&nbsp;Updated {formatAdminDate(game.updatedAt)}
                  </p>
                </div>
                <div className="admin-record-actions">
                  <button className="btn btn-secondary" type="button" onClick={() => editGame(game)}>Edit</button>
                  <button className="btn btn-secondary" type="button" onClick={() => changeDisabled(game)}>{game.isDisabled ? "Enable as draft" : "Disable"}</button>
                  <button
                    className={`btn ${game.isActive ? "btn-secondary" : "btn-success"}`}
                    type="button"
                    disabled={publishing || game.isDisabled}
                    onClick={async () => { if (game.isActive) await toggleLive(game); else { await editGame(game); setEditorSection("publish"); } }}
                  >
                    {game.isActive ? "Unpublish" : "Review publication"}
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => deleteGame(game)}
                    disabled={deletingId === game._id}
                  >
                    {deletingId === game._id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* ─── LIVE PREVIEW ──────────────────────────────────────────────── */}
        {previewExpanded && (
          <section className="admin-preview-section">
            <div className="admin-preview-panel">
              <div className="admin-preview-header">
                <h3>Live Preview</h3>
                <span className="preview-mode-badge">DRAFT</span>
              </div>

              <div className="preview-grid">
                <div className="preview-section">
                  <h4>Game Card</h4>
                  <GameCardPreview game={previewGame} isPreview={true} />
                </div>
                <div className="preview-section preview-detail-section">
                  <h4>Game Detail Page</h4>
                  <GameDetailPreview game={previewGame} isPreview={true} />
                </div>
              </div>

              {previewGame._preview?.hasPendingChanges && (
                <div className="preview-changes-indicator">
                  <span className="changes-dot" />
                  <span>You have unsaved local files. Click "Upload" in the asset section to persist them.</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GameAdminPanel;