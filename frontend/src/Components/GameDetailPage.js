import React, { useMemo } from "react";
import DetailCarousel from "./DetailCarousel";
import { resolveApiUrl } from "../services/api";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Play,
  Monitor,
  Smartphone,
  Globe,
  Gamepad2,
  Sparkles,
  Users,
  Calendar,
  Layers,
  FileCode,
  ShieldCheck,
} from "lucide-react";
import "./GameDetailPage.css";

// Platform icon helper
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

const GameDetailPage = ({ game, onBack, allGames = [], onSelectGame }) => {
  // Normalize screenshots
  const screenshots = useMemo(() => {
    if (!game) return [];
    if (game.screenshots && game.screenshots.length > 0) {
      return game.screenshots.map(resolveApiUrl);
    }
    if (game.image) {
      return [resolveApiUrl(game.image)];
    }
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

  // Compute related games (same genre or other titles excluding current)
  const relatedGames = useMemo(() => {
    if (!allGames || allGames.length <= 1) return [];
    const sameGenre = allGames.filter(
      (g) =>
        (g._id || g.id) !== (game._id || game.id) &&
        g.genre &&
        game.genre &&
        g.genre.toLowerCase() === game.genre.toLowerCase(),
    );
    if (sameGenre.length >= 3) return sameGenre.slice(0, 4);

    const otherGames = allGames.filter(
      (g) => (g._id || g.id) !== (game._id || game.id),
    );
    return otherGames.slice(0, 4);
  }, [allGames, game]);

  if (!game) return null;

  const resolvedGameLink = resolveApiUrl(game.gameLink);
  const isDownloadLink =
    Boolean(resolvedGameLink) &&
    (resolvedGameLink.startsWith("/api/games/assets") ||
      resolvedGameLink.includes("/api/assets/") ||
      resolvedGameLink.includes("drive.google.com/uc") ||
      resolvedGameLink.includes("drive.google.com/file") ||
      /\.(7z|apk|dmg|exe|rar|zip)(?:[?#]|$)/i.test(resolvedGameLink));

  const isPlaceholderLink =
    !game.gameLink || game.gameLink === "#" || game.gameLink === "";

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

  return (
    <div className="store-detail-page-container">
      {/* Top Breadcrumbs & Back Navigation */}
      <div className="detail-top-nav">
        <button onClick={onBack} className="detail-back-btn">
          <ArrowLeft size={18} />
          <span>Back to Store</span>
        </button>

        <div className="detail-breadcrumbs">
          <span>Store</span>
          <span className="crumb-sep">/</span>
          <span>Games</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-genre">{game.genre}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-active">{game.title}</span>
        </div>
      </div>

      {/* Header Info Banner */}
      <div className="detail-header-hero">
        <div className="detail-header-meta">
          <span className="detail-genre-pill">{game.genre}</span>
          {game.isFeatured && (
            <span className="detail-featured-badge">
              <Sparkles size={12} /> Featured Guild Title
            </span>
          )}
          {game.info?.year && (
            <span className="detail-year-badge">{game.info.year}</span>
          )}
        </div>

        <h1 className="detail-main-title">{game.title}</h1>

        <div className="detail-developer-row">
          <span className="detail-dev-label">Developed by:</span>
          <strong className="detail-dev-name">
            {game.developer || "GDGSC Game Guild"}
          </strong>
        </div>
      </div>

      {/* Two-Column Master Store Layout */}
      <div className="detail-layout-grid">
        {/* Left Master Column (Media & Narrative) */}
        <div className="detail-main-column">
          {/* Master Media Showcase */}
          <DetailCarousel
            screenshots={screenshots}
            mediaItems={mediaItems}
            gameTitle={game.title}
          />

          {/* About the Game Section */}
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
                  {game.description ||
                    "Experience this student-developed masterpiece from the GDGSC Game Development Guild."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Column (Sticky Action & Specifications) */}
        <div className="detail-sidebar-column">
          {/* Action Box Card */}
          <div className="detail-action-card">
            <div className="action-card-cover-wrapper">
              <img
                src={resolveApiUrl(game.image)}
                alt={game.title}
                className="action-card-cover-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    "https://images.unsplash.com/photo-1542751371-adc38448a05e";
                }}
              />
              <div className="action-card-cover-overlay">
                <span className="action-status-chip">
                  {isPlaceholderLink ? "COMING SOON" : "READY TO PLAY"}
                </span>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="action-button-wrapper">
              <button
                className={`store-primary-action-btn ${
                  isPlaceholderLink ? "is-disabled" : ""
                }`}
                onClick={handleActionClick}
                disabled={isPlaceholderLink}
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

              {/* Download File Notice */}
              {isDownloadLink && game.gameFile && (
                <div className="download-file-note">
                  <FileCode size={13} />
                  <span>Package: {game.gameFile}</span>
                </div>
              )}
            </div>

            {/* Supported Platforms */}
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

          {/* Specifications Table Card */}
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
                <strong className="spec-value">{game.genre}</strong>
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

      {/* Related Games Row */}
      {relatedGames.length > 0 && (
        <section className="detail-related-section">
          <div className="related-section-header">
            <Sparkles size={20} className="related-icon" />
            <h2>More Games To Explore</h2>
          </div>

          <div className="related-games-grid">
            {relatedGames.map((relGame) => (
              <div
                key={relGame._id || relGame.id}
                className="related-game-card"
                onClick={() => {
                  if (onSelectGame) {
                    onSelectGame(relGame);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <div className="related-art-wrap">
                  <img
                    src={resolveApiUrl(relGame.image)}
                    alt={relGame.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://images.unsplash.com/photo-1542751371-adc38448a05e";
                    }}
                  />
                  <span className="related-genre-chip">{relGame.genre}</span>
                </div>
                <div className="related-card-info">
                  <h4 className="related-title">{relGame.title}</h4>
                  <span className="related-dev">
                    {relGame.developer || "GDGSC Guild"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default GameDetailPage;
