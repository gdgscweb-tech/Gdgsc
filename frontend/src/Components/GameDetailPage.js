import React from "react";
import DetailCarousel from "./DetailCarousel";
import { Play, Download, ExternalLink, ArrowLeft, Monitor, Smartphone, Globe, Gamepad2 } from "lucide-react";
import "./GameDetailPage.css";

// Helper to determine if a link is a downloadable file
const isDownloadLink = (link) => {
  if (!link) return false;
  const downloadExtensions = ['.zip', '.rar', '.7z', '.exe', '.msi', '.dmg', '.apk', '.tar', '.gz'];
  const lowerLink = link.toLowerCase();
  return downloadExtensions.some(ext => lowerLink.includes(ext));
};

// Helper to determine if a link is a placeholder
const isPlaceholderLink = (link) => {
  return !link || link === '#' || link === '';
};

// Platform icon mapper
const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'Windows':
    case 'macOS':
    case 'Linux':
      return <Monitor size={16} />;
    case 'Android':
    case 'iOS':
      return <Smartphone size={16} />;
    case 'Web':
      return <Globe size={16} />;
    default:
      return <Gamepad2 size={16} />;
  }
};

const GameDetailPage = ({ game, onBack, showBackButton }) => {
  const handlePlayGame = () => {
    if (isPlaceholderLink(game.gameLink)) {
      return; // Do nothing for placeholder links
    }

    if (isDownloadLink(game.gameLink)) {
      // Trigger download
      const link = document.createElement('a');
      link.href = game.gameLink;
      link.download = game.gameFile || game.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Open external link in new tab
      window.open(game.gameLink, "_blank");
    }
  };

  // Determine button text and icon
  const getButtonConfig = () => {
    if (isPlaceholderLink(game.gameLink)) {
      return { text: "COMING SOON", icon: null, disabled: true };
    }
    if (isDownloadLink(game.gameLink)) {
      return {
        text: `DOWNLOAD ${game.title.toUpperCase()}`,
        icon: <Download size={24} className="play-icon" />,
        disabled: false,
      };
    }
    return {
      text: `PLAY ${game.title.toUpperCase()}`,
      icon: <ExternalLink size={24} className="play-icon" />,
      disabled: false,
    };
  };

  const buttonConfig = getButtonConfig();

  // Separate screenshots into images and videos
  const mediaItems = (game.screenshots || []).map(url => {
    const lower = url.toLowerCase();
    const isVideo = lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogg');
    return { url, isVideo };
  });

  return (
    <div className="detail-page-wrapper">
      <div className="heading">
        {showBackButton && (
          <button
            onClick={onBack}
            className="back-button"
            aria-label="Go back to game list"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="detail-page-title">{game.title}</h1>
      </div>

      {/* Carousel Section — supports both images and videos */}
      <DetailCarousel screenshots={game.screenshots} gameTitle={game.title} mediaItems={mediaItems} />

      {/* Content Box */}
      <div className="detail-content-box">
        {/* About Game Section */}
        <div className="about-game-section">
          <h2 className="content-heading content-heading-center">About Game</h2>
          <p className="game-full-story">{game.fullStory}</p>
        </div>

        {/* Metadata Grid */}
        <div className="metadata-grid">
          <div className="metadata-item">
            <h3 className="metadata-heading">Developer</h3>
            <p className="metadata-text">{game.developer}</p>
          </div>

          <div className="metadata-item">
            <h3 className="metadata-heading">Release Year</h3>
            <p className="metadata-text">{game.info?.year || "N/A"}</p>
          </div>

          <div className="metadata-item">
            <h3 className="metadata-heading">Genre</h3>
            <p className="metadata-text">{game.genre}</p>
          </div>
        </div>

        {/* Platforms */}
        {game.platforms && game.platforms.length > 0 && (
          <div className="platforms-section">
            <h3 className="metadata-heading" style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              Available On
            </h3>
            <div className="platforms-grid">
              {game.platforms.map((platform) => (
                <div key={platform} className="platform-chip">
                  {getPlatformIcon(platform)}
                  <span>{platform}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Play / Download / Coming Soon Button */}
        <div className="box-button">
          <button
            onClick={handlePlayGame}
            className={`play-game-button ${buttonConfig.disabled ? 'play-game-button--disabled' : ''}`}
            disabled={buttonConfig.disabled}
          >
            {buttonConfig.icon}
            {buttonConfig.text}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDetailPage;
