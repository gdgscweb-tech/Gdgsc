import React, { useState, useEffect, useRef } from "react";
import "./Banner.css";
import { Download, ExternalLink, Sparkles, Monitor, Smartphone, Globe, Gamepad2, ChevronRight, Play } from "lucide-react";
import { isDownloadUrl, resolveApiUrl } from "../services/api";

// Platform icon helper
const getPlatformIcon = (platform) => {
  switch (platform) {
    case "Windows":
    case "macOS":
    case "Linux":
      return <Monitor size={13} />;
    case "Android":
    case "iOS":
      return <Smartphone size={13} />;
    case "Web":
      return <Globe size={13} />;
    default:
      return <Gamepad2 size={13} />;
  }
};

const Banner = ({ games = [], onGameClick }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const SLIDE_DURATION = 6000; // 6 seconds per slide

  // Select featured games, or first 5 games
  const featuredGames =
    games && games.length > 0
      ? games.filter((g) => g.isFeatured).length > 0
        ? games.filter((g) => g.isFeatured).slice(0, 5)
        : games.slice(0, 5)
      : [];

  useEffect(() => {
    if (featuredGames.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredGames.length);
    }, SLIDE_DURATION);

    return () => clearInterval(timer);
  }, [featuredGames.length, isPaused, currentIndex]);

  if (featuredGames.length === 0) return null;

  const current = featuredGames[currentIndex] || featuredGames[0];

  const isDownload = isDownloadUrl(current.gameLink);

  return (
    <div
      className="hero-spotlight-container"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Featured Stage (Left) */}
      <div className="hero-main-stage" onClick={() => onGameClick(current)}>
        {/* Background Image with Ambient Glow */}
        <div className="hero-bg-layer">
          <img
            src={resolveApiUrl(current.image)}
            alt={current.title}
            className="hero-bg-img"
            key={`bg-${currentIndex}`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e";
            }}
          />
          <div className="hero-gradient-overlay"></div>
          <div className="hero-vignette-overlay"></div>
        </div>

        {/* Hero Content Overlay */}
        <div className="hero-content-box">
          <div className="hero-meta-top">
            <span className="hero-spotlight-badge">
              <Sparkles size={13} /> GUILD SPOTLIGHT
            </span>
            <span className="hero-genre-badge">{current.genre}</span>
            {current.info?.year && (
              <span className="hero-year-badge">{current.info.year}</span>
            )}
          </div>

          <h1 className="hero-game-title">{current.title}</h1>

          <p className="hero-game-desc">
            {current.description || current.fullStory?.slice(0, 160) + "..."}
          </p>

          {/* Platforms Strip */}
          {current.platforms && current.platforms.length > 0 && (
            <div className="hero-platforms-list">
              <span className="platforms-label">AVAILABLE ON:</span>
              {current.platforms.map((p) => (
                <span key={p} className="hero-platform-pill">
                  {getPlatformIcon(p)}
                  <span>{p}</span>
                </span>
              ))}
            </div>
          )}

          {/* Dual Action CTAs */}
          <div className="hero-actions-row">
            <button
              className="hero-primary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGameClick(current);
              }}
            >
              {isDownload ? <Download size={18} /> : <Play size={18} />}
              <span>{isDownload ? "GET & DOWNLOAD" : "PLAY NOW"}</span>
            </button>

            <button
              className="hero-secondary-btn"
              onClick={(e) => {
                e.stopPropagation();
                onGameClick(current);
              }}
            >
              <span>VIEW DETAILS</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Side Interactive Thumbnail Track (Right) */}
      <div className="hero-side-track">
        {featuredGames.map((game, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={game._id || game.id || idx}
              className={`hero-thumb-card ${isActive ? "active" : ""}`}
              onClick={() => setCurrentIndex(idx)}
            >
              {/* Progress bar on active card */}
              {isActive && (
                <div
                  className="thumb-progress-bar"
                  style={{ animationDuration: `${SLIDE_DURATION}ms` }}
                ></div>
              )}

              <div className="thumb-img-wrapper">
                <img
                  src={resolveApiUrl(game.image)}
                  alt={game.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "https://images.unsplash.com/photo-1542751371-adc38448a05e";
                  }}
                />
              </div>

              <div className="thumb-info">
                <h4 className="thumb-title">{game.title}</h4>
                <div className="thumb-meta">
                  <span className="thumb-genre">{game.genre}</span>
                  {game.developer && (
                    <span className="thumb-dev">• {game.developer}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Banner;
