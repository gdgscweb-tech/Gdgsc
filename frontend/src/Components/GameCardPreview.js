import React from "react";
import { Sparkles, Monitor, Smartphone, Globe, Gamepad2, Download, Play, SearchX } from "lucide-react";
import { isDownloadUrl, resolveApiUrl } from "../services/api";
import "./GameCardPreview.css";

const getPlatformIcon = (platform) => {
  switch (platform) {
    case "Windows":
    case "macOS":
    case "Linux":
      return <Monitor size={12} />;
    case "Android":
    case "iOS":
      return <Smartphone size={12} />;
    case "Web":
      return <Globe size={12} />;
    default:
      return <Gamepad2 size={12} />;
  }
};

const GameCardPreview = ({ game, isPreview = false }) => {
  const isDownload = isDownloadUrl(game.gameLink);

  return (
    <div
      className={`store-game-card preview-card ${isPreview ? "is-preview" : ""}`}
      style={isPreview ? { pointerEvents: "none" } : {}}
    >
      <div className="card-artwork-wrapper">
        <img
          src={resolveApiUrl(game.image)}
          alt={game.title}
          className="card-artwork-img"
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e";
          }}
        />

        <div className="card-top-badges">
          <span className="card-genre-badge">{game.genre || "Unknown"}</span>
          {game.isFeatured && (
            <span className="card-featured-star" title="Featured Game">
              <Sparkles size={12} />
            </span>
          )}
          {isPreview && (
            <span className="preview-badge">PREVIEW</span>
          )}
        </div>
      </div>

      <div className="card-details-box">
        <div className="card-title-row">
          <h4 className="card-game-title" title={game.title}>
            {game.title || "Untitled Game"}
          </h4>
        </div>

        <div className="card-sub-info">
          <span className="card-dev-name">
            {game.developer ? game.developer : "GDGSC Guild"}
          </span>
          {game.info?.year && (
            <span className="card-year-tag">{game.info.year}</span>
          )}
        </div>

        <div className="card-footer-row">
          <div className="card-platforms-strip">
            {game.platforms && game.platforms.length > 0 ? (
              game.platforms.map((p) => (
                <span key={p} className="card-platform-icon-pill" title={p}>
                  {getPlatformIcon(p)}
                </span>
              ))
            ) : (
              <span className="card-platform-icon-pill" title="Desktop">
                <Monitor size={12} />
              </span>
            )}
          </div>

          <span className="card-action-type-pill">
            {isDownload ? (
              <>
                <Download size={11} /> <span>Download</span>
              </>
            ) : (
              <>
                <Play size={11} /> <span>Play</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameCardPreview;