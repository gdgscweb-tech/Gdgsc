import { resolveApiUrl } from "../services/api";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1542751371-adc38448a05e";
const FALLBACK_BANNER = "https://placehold.co/1200x400/11121a/ffd700?text=BANNER";

export const buildGamePreview = ({
  form,
  assets = [],
  pendingFiles = {},
  selectedGame = null,
  resolveUrl = resolveApiUrl,
}) => {
  const getAssetUrl = (asset) => {
    if (!asset) return null;
    if (asset.previewUrl) return resolveUrl(asset.previewUrl);
    if (asset.metadata?.publicUrl) return resolveUrl(asset.metadata.publicUrl);
    if (asset._id) return resolveUrl(`/api/assets/${asset._id}/content`);
    return null;
  };

  const getPendingPreview = (category) => {
    const files = pendingFiles[category] || [];
    if (files.length === 0) return null;
    return files[0].previewUrl;
  };

  const getAllScreenshots = () => {
    const screenshots = [];
    
    assets
      .filter((a) => a.category === "screenshot" && a.status === "ready")
      .forEach((asset) => {
        const url = getAssetUrl(asset);
        if (url) screenshots.push({ url, isVideo: false, asset });
      });

    const pendingScreenshots = pendingFiles.screenshot || [];
    pendingScreenshots.forEach((file, index) => {
      if (file.previewUrl) {
        screenshots.push({ url: file.previewUrl, isVideo: false, pending: true, index });
      }
    });

    return screenshots;
  };

  const getAllVideos = () => {
    const videos = [];
    
    assets
      .filter((a) => a.category === "trailer" && a.status === "ready")
      .forEach((asset) => {
        const url = getAssetUrl(asset);
        if (url) videos.push({ url, isVideo: true, asset });
      });

    const pendingTrailers = pendingFiles.trailer || [];
    pendingTrailers.forEach((file, index) => {
      if (file.previewUrl) {
        videos.push({ url: file.previewUrl, isVideo: true, pending: true, index });
      }
    });

    return videos;
  };

  const thumbnailAsset = assets.find((a) => a.category === "thumbnail" && a.status === "ready");
  const bannerAsset = assets.find((a) => a.category === "banner" && a.status === "ready");

  const thumbnailUrl = getPendingPreview("thumbnail") || getAssetUrl(thumbnailAsset);
  const bannerUrl = getPendingPreview("banner") || getAssetUrl(bannerAsset);

  const previewGame = {
    _id: selectedGame?._id || "preview",
    id: selectedGame?._id || "preview",
    title: form.title || "",
    name: form.title || "",
    slug: form.slug || "",
    description: form.description || "",
    fullStory: form.fullStory || "",
    genre: form.genre || "",
    developer: form.developer || "",
    image: thumbnailUrl || form.image || FALLBACK_IMAGE,
    banner: bannerUrl || FALLBACK_BANNER,
    screenshots: getAllScreenshots().map((s) => s.url),
    videos: getAllVideos().map((v) => v.url),
    gameLink: form.gameLink || "",
    platforms: form.platforms
      ? form.platforms.split(",").map((v) => v.trim()).filter(Boolean)
      : ["Windows"],
    info: {
      players: form.players || "1",
      year: form.year || new Date().getFullYear().toString(),
    },
    isFeatured: Boolean(form.isFeatured),
    isActive: form.isActive !== false,
    _preview: {
      thumbnailUrl,
      bannerUrl,
      screenshots: getAllScreenshots(),
      videos: getAllVideos(),
      hasPendingChanges: Object.values(pendingFiles).some((arr) => arr.length > 0),
      isNewGame: !selectedGame,
    },
  };

  return previewGame;
};

export const createFilePreview = (file) => {
  if (!file) return null;
  const previewUrl = URL.createObjectURL(file);
  // Keep the original File instance so it remains a Blob/File for FormData uploads.
  // Spreading {...file} loses the File/Blob prototype and causes FormData to send "[object Object]".
  try {
    file.previewUrl = previewUrl;
    file.isLocalPreview = true;
    file.rawFile = file;
    return file;
  } catch {
    return {
      rawFile: file,
      name: file.name,
      size: file.size,
      type: file.type,
      previewUrl,
      isLocalPreview: true,
    };
  }
};

export const revokeFilePreview = (file) => {
  if (file?.previewUrl) {
    URL.revokeObjectURL(file.previewUrl);
    file.previewUrl = null;
  }
};


export const revokeAllPreviews = (pendingFiles) => {
  Object.values(pendingFiles || {}).flat().forEach(revokeFilePreview);
};