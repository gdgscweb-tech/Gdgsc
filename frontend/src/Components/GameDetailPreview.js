import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon, Film, Download, ExternalLink, Sparkles, Monitor, Smartphone, Globe, Gamepad2, Layers, Calendar, Users, ShieldCheck, FileCode } from "lucide-react";
import { resolveApiUrl, isDownloadUrl } from "../services/api";
import "./GameDetailPreview.css";

const getPlatformIcon = (platform) => {
  switch (platform) {
    case "Windows":
    case "macOS":
    case "Linux":
      return <Monitor size={14} />;
    case "Android":
    case "iOS":
      return <Smartphone size={14} />;
    case "Web":
      return <Globe size={14} />;
    default:
      return <Gamepad2 size={14} />;
  }
};

const DetailCarousel = ({ screenshots = [], gameTitle = "Game", mediaItems = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const videoRef = useRef(null);

  const items = useMemo(() => {
    if (mediaItems && mediaItems.length > 0) return mediaItems.filter(Boolean);
    return (screenshots || [])
      .filter(Boolean)
      .map((url) => {
        const isVid =
          typeof url === "string" &&
          (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".ogg"));
        return { url, isVideo: isVid };
      });
  }, [mediaItems, screenshots]);

  useEffect(() => {
    if (currentSlide >= items.length && items.length > 0) {
      setCurrentSlide(0);
    }
  }, [items.length, currentSlide]);

  useEffect(() => {
    if (items.length <= 1) return;
    const activeItem = items[currentSlide % items.length];
    if (activeItem?.isVideo) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [items.length, currentSlide, items]);

  const goToPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % items.length);
  }, [items.length]);

  if (items.length === 0) return null;

  const safeSlide =
    items.length > 0
      ? (currentSlide % items.length + items.length) % items.length
      : 0;
  const current = items[safeSlide];
  if (!current) return null;

  return (
    <div className="store-media-showcase preview-showcase">
      <div className="media-master-stage">
        {current.isVideo ? (
          <div className="master-video-wrapper">
            <video
              ref={videoRef}
              src={current.url}
              className="master-media-player"
              key={`video-${currentSlide}`}
              controls
              autoPlay
              muted
              playsInline
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="master-image-wrapper">
            <img
              src={current.url}
              alt={`${gameTitle} screenshot ${currentSlide + 1}`}
              className="master-media-img"
              key={`img-${currentSlide}`}
              decoding="async"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://placehold.co/1200x675/11121a/ffd700?text=SCREENSHOT+UNAVAILABLE";
              }}
            />
          </div>
        )}

        {items.length > 1 && (
          <>
            <button className="media-nav-arrow media-nav-arrow--left" onClick={goToPrev} aria-label="Previous media">
              <ChevronLeft size={24} />
            </button>
            <button className="media-nav-arrow media-nav-arrow--right" onClick={goToNext} aria-label="Next media">
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {items.length > 1 && (
          <div className="media-counter-badge">
            {current.isVideo ? <Film size={12} /> : <ImageIcon size={12} />}
            <span>{currentSlide + 1} / {items.length}</span>
          </div>
        )}
      </div>

      {items.length > 1 && (
        <div className="media-thumbnail-filmstrip">
          {items.map((item, index) => {
            const isActive = currentSlide === index;
            return (
              <button
                key={index}
                className={`media-thumb-btn ${isActive ? "is-active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`View media ${index + 1}`}
              >
                {item.isVideo ? (
                  <div className="thumb-video-placeholder">
                    <video src={item.url} muted preload="metadata" />
                    <div className="thumb-video-icon-overlay">
                      <Play size={14} fill="#ffd700" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://placehold.co/200x120/11121a/ffffff?text=IMG";
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const GameDetailPreview = ({ game, isPreview = false }) => {
  const screenshots = useMemo(() => {
    if (!game) return [];
    const gallery = [game.banner, ...(game.screenshots || [])].filter(Boolean);
    if (gallery.length > 0) return gallery.map(resolveApiUrl);
    if (game.image) return [resolveApiUrl(game.image)];
    return [];
  }, [game]);

  const mediaItems = useMemo(
    () => [
      ...screenshots.map((url) => ({ url, isVideo: false })),
      ...(Array.isArray(game.videos) ? game.videos : [])
        .filter(Boolean)
        .map((url) => ({ url: resolveApiUrl(url), isVideo: true })),
    ],
    [game.videos, screenshots],
  );

  const resolvedGameLink = resolveApiUrl(game.gameLink);
  const isDownloadLink =
    Boolean(resolvedGameLink) &&
    (resolvedGameLink.startsWith("/api/games/assets") ||
      resolvedGameLink.includes("/api/assets/") ||
      resolvedGameLink.includes("drive.google.com/uc") ||
      resolvedGameLink.includes("drive.google.com/file") ||
      /\.(7z|apk|dmg|exe|rar|zip)(?:[?#]|$)/i.test(resolvedGameLink));
  const isPlaceholderLink = !game.gameLink || game.gameLink === "#" || game.gameLink === "";

  const handleActionClick = () => {
    if (isPlaceholderLink) return;
    if (isDownloadLink) {
      const link = document.createElement("a");
      link.href = resolvedGameLink;
      link.setAttribute("download", game.gameFile || `${game.title}.rar`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      window.open(game.gameLink, "_blank", "noopener,noreferrer");
    }
  };

  if (!game) return null;

  return (
    <div className={`store-detail-page-container preview-detail ${isPreview ? "is-preview" : ""}`}>
      <div className="detail-top-nav">
        <span className="preview-nav-label">
          <Sparkles size={14} /> GAME PAGE PREVIEW
        </span>
      </div>

      <div className="detail-header-hero">
        <div className="detail-header-meta">
          <span className="detail-genre-pill">{game.genre || "Genre"}</span>
          {game.isFeatured && (
            <span className="detail-featured-badge">
              <Sparkles size={12} /> Featured Guild Title
            </span>
          )}
          {game.info?.year && (
            <span className="detail-year-badge">{game.info.year}</span>
          )}
        </div>

        <h1 className="detail-main-title">{game.title || "Untitled Game"}</h1>

        <div className="detail-developer-row">
          <span className="detail-dev-label">Developed by:</span>
          <strong className="detail-dev-name">
            {game.developer || "GDGSC Game Guild"}
          </strong>
        </div>
      </div>

      <div className="detail-layout-grid">
        <div className="detail-main-column">
          <DetailCarousel
            screenshots={screenshots}
            mediaItems={mediaItems}
            gameTitle={game.title}
          />

          <div className="detail-narrative-box">
            <div className="narrative-heading-row">
              <Layers size={20} className="narrative-icon" />
              <h2>About The Game</h2>
            </div>

            <div className="narrative-text-body">
              {game.fullStory ? (
                game.fullStory
                  .split("\n")
                  .filter((p) => p.trim().length > 0)
                  .map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
              ) : (
                <p>
                  {game.description || "Experience this student-developed masterpiece from the GDGSC Game Development Guild."}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="detail-sidebar-column">
          <div className="detail-action-card">
            <div className="action-card-cover-wrapper">
              <img
                src={resolveApiUrl(game.image)}
                alt={game.title}
                className="action-card-cover-img"
                decoding="async"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e";
                }}
              />
              <div className="action-card-cover-overlay">
                <span className="action-status-chip">
                  {isPlaceholderLink ? "COMING SOON" : "READY TO PLAY"}
                </span>
              </div>
            </div>

            <div className="action-button-wrapper">
              <button
                className={`store-primary-action-btn ${isPlaceholderLink ? "is-disabled" : ""}`}
                onClick={handleActionClick}
                disabled={isPlaceholderLink || isPreview}
              >
                {isPlaceholderLink ? (
                  <>
                    <Sparkles size={18} />
                    <span>COMING SOON</span>
                  </>
                ) : isDownloadLink ? (
                  <>
                    <Download size={18} />
                    <span>DOWNLOAD GAME</span>
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    <span>PLAY NOW</span>
                  </>
                )}
              </button>

              {isDownloadLink && game.gameFile && (
                <div className="download-file-note">
                  <FileCode size={13} />
                  <span>Package: {game.gameFile}</span>
                </div>
              )}
            </div>

            {game.platforms && game.platforms.length > 0 && (
              <div className="sidebar-platforms-box">
                <span className="sidebar-box-label">SUPPORTED PLATFORMS</span>
                <div className="sidebar-platform-chips">
                  {game.platforms.map((p) => (
                    <span key={p} className="sidebar-platform-chip">
                      {getPlatformIcon(p)}
                      <span>{p}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="detail-specs-card">
            <h3 className="specs-card-title">Game Specifications</h3>

            <div className="specs-table">
              <div className="spec-row">
                <span className="spec-label">
                  <Gamepad2 size={15} /> Developer
                </span>
                <strong className="spec-value">
                  {game.developer || "GDGSC Guild"}
                </strong>
              </div>

              <div className="spec-row">
                <span className="spec-label">
                  <Layers size={15} /> Genre
                </span>
                <strong className="spec-value">{game.genre || "Unknown"}</strong>
              </div>

              {game.info?.year && (
                <div className="spec-row">
                  <span className="spec-label">
                    <Calendar size={15} /> Release Year
                  </span>
                  <strong className="spec-value">{game.info.year}</strong>
                </div>
              )}

              {game.info?.players && (
                <div className="spec-row">
                  <span className="spec-label">
                    <Users size={15} /> Players
                  </span>
                  <strong className="spec-value">{game.info.players}</strong>
                </div>
              )}

              <div className="spec-row">
                <span className="spec-label">
                  <ShieldCheck size={15} /> Verified Build
                </span>
                <strong className="spec-value spec-verified">
                  GDGSC Certified
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameDetailPreview;