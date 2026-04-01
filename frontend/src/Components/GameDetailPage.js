import React from "react";
import DetailCarousel from "./DetailCarousel";
import { Play } from "lucide-react";
import "./GameDetailPage.css";
import { ArrowLeft } from "lucide-react";

const GameDetailPage = ({ game, onBack, showBackButton }) => {
  const handlePlayGame = () => {
    if (game.gameLink) {
      window.open(game.gameLink, "_blank");
    } else {
      console.error("Game link not available.");
    }
  };

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

      {/* Carousel Section */}
      <DetailCarousel screenshots={game.screenshots} gameTitle={game.title} />

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
            <h3 className="metadata-heading">Development Year</h3>
            <p className="metadata-text">{game.info.year}</p>
          </div>

          <div className="metadata-item">
            <h3 className="metadata-heading">Genre</h3>
            <p className="metadata-text">{game.genre}</p>
          </div>
        </div>

        {/* Play Game Button */}
        <div className="box-button">
          <button onClick={handlePlayGame} className="play-game-button">
            <Play size={24} className="play-icon" fill="black" />
            PLAY {game.title.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDetailPage;
