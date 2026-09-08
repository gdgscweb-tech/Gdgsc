import React from "react";
import "./Gamescard.css";
import { Sparkles, Monitor, Smartphone, Globe, Gamepad2, Download, Play, SearchX } from "lucide-react";
import { isDownloadUrl, resolveApiUrl } from "../services/api";

// Platform icon helper
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

const Gamescard = ({
  games = [],
  selectedGenre,
  onGameClick,
  searchQuery,
  onResetFilters,
  sectionTitle,
}) => {
  const isFiltered = Boolean(selectedGenre || searchQuery);

  return (
    <section className="store-catalogue-section">
      {/* Section Header */}
      <div className="catalogue-header-row">
        <div className="catalogue-title-wrap">
          <Gamepad2 size={22} className="catalogue-icon" />
          <h3 className="catalogue-title">
            {sectionTitle || (selectedGenre ? `${selectedGenre} Titles` : "All Games Library")}
          </h3>
          <span className="catalogue-count-badge">{games.length}</span>
        </div>

        {isFiltered && onResetFilters && (
          <button onClick={onResetFilters} className="catalogue-reset-btn">
            Reset Filters
          </button>
        )}
      </div>

      {/* Game Cards Grid */}
      <div className="store-games-grid">
        {games.length > 0 ? (
          games.map((game) => {
            const isDownload = isDownloadUrl(game.gameLink);

            return (
              <div
                key={game._id || game.id}
                className="store-game-card"
                onClick={() => onGameClick(game)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onGameClick(game);
                  }
                }}
              >
                {/* Artwork Container */}
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

                  {/* Top Floating Badges */}
                  <div className="card-top-badges">
                    <span className="card-genre-badge">{game.genre}</span>
                    {game.isFeatured && (
                      <span className="card-featured-star" title="Featured Game">
                        <Sparkles size={12} />
                      </span>
                    )}
                  </div>

                </div>

                {/* Card Metadata Details */}
                <div className="card-details-box">
                  <div className="card-title-row">
                    <h4 className="card-game-title" title={game.title}>
                      {game.title}
                    </h4>
                  </div>

                  {/* Developer & Year */}
                  <div className="card-sub-info">
                    <span className="card-dev-name">
                      {game.developer ? game.developer : "GDGSC Guild"}
                    </span>
                    {game.info?.year && (
                      <span className="card-year-tag">{game.info.year}</span>
                    )}
                  </div>

                  {/* Footer Platforms & Action hint */}
                  <div className="card-footer-row">
                    <div className="card-platforms-strip">
                      {game.platforms && game.platforms.length > 0 ? (
                        game.platforms.map((p) => (
                          <span
                            key={p}
                            className="card-platform-icon-pill"
                            title={p}
                          >
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
          })
        ) : (
          /* Empty State */
          <div className="store-empty-state">
            <div className="empty-state-icon-box">
              <SearchX size={44} className="empty-icon" />
            </div>
            <h4 className="empty-state-title">No Games Found</h4>
            <p className="empty-state-desc">
              {searchQuery
                ? `No games matched your search for "${searchQuery}". Try a different keyword or genre.`
                : "No games currently match the selected filter criteria."}
            </p>
            {onResetFilters && (
              <button onClick={onResetFilters} className="empty-reset-action-btn">
                Clear Filters & Show All
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default Gamescard;
