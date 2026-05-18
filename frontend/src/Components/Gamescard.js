import React from "react";
import "./Gamescard.css";

const Gamescard = ({ games, selectedGenre, onGameClick, searchQuery }) => {
  const filteredGames = games;
  return (
    <section className="Games-avail">
      <div className="section-title">
        <h4 style={{ color: "#ffd700", fontFamily: "'Valorax', sans-serif" }}>
          {selectedGenre ? `${selectedGenre} Games` : "All Available Games"}
        </h4>
        <div
          style={{
            width: "100%",
            height: "2px",
            background:
              "radial-gradient(transparent,transparent,rgba(255, 215, 0, 0.5),transparent,transparent)",
          }}
        ></div>
      </div>

      <div className="games-grid">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => (
            <div
              key={game._id || game.id}
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
            <h3 className="no-games-title">No results found ;&lt;</h3>
          </div>
        )}
      </div>
    </section>
  );
};

export default Gamescard;
