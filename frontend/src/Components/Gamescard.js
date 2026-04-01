import React from "react";
import "./Gamescard.css";
import { useMemo } from "react";

const Gamescard = ({ games, selectedGenre, onGameClick, searchQuery }) => {
  const filteredGames = games;
  return (
    <section className="Games-avail">
      <div className="section-title">
        <h4 style={{ color: "#ffc400ff", fontFamily: "'Valorax', sans-serif" }}>
          {searchQuery
            ? `Search Results for "${searchQuery}"`
            : selectedGenre
              ? `${selectedGenre} Games`
              : "All Available Games"}
        </h4>
        <div
          style={{
            width: "100%",
            height: "2px",
            background:
              "radial-gradient(transparent,transparent,gold,transparent,transparent)",
          }}
        ></div>
      </div>

      <div className="games-grid">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div
              key={game.id}
              className="game-card"
              onClick={() => onGameClick(game)}
            >
              <img src={game.image} alt={game.title} />
              <div className="game-overlay">
                <h3 className="game-title">{game.title}</h3>
                <p className="game-genre">{game.genre}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="no-games-message">
            <h3 className="no-games-title">No Games Found</h3>
            <p className="no-games-main-text">
              {searchQuery
                ? `We couldn't find any games matching "${searchQuery}".`
                : selectedGenre
                  ? `Stay tuned! We'll be adding ${selectedGenre} games soon.`
                  : `No games are currently available.`}
            </p>
            <p className="no-games-hint-text">
              Click "SHOW ALL" to view all games.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default Gamescard;
