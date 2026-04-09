import React from "react";
import FeatureBanner from "../Components/FeatureBanner";
import Header from "../Components/Header";
import "./Gamepage.css";
import Banner from "../Components/Banner";
import Gamescard from "../Components/Gamescard";
import { useState, useEffect, useCallback, useMemo } from "react";
import GameDetailPage from "../Components/GameDetailPage";
import api from "../services/api";

const Gamepage = () => {
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch games and categories from the API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [gamesRes, categoriesRes] = await Promise.all([
          api.get("/api/games"),
          api.get("/api/games/categories"),
        ]);
        setGames(gamesRes.data);
        setCategories(categoriesRes.data);
      } catch (err) {
        console.error("Failed to fetch games data:", err);
        setError("Failed to load games. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleGameClick = useCallback((game) => {
    setSelectedGame(game);
    window.scrollTo(0, 0);
  }, []);

  const handleBackClick = useCallback(() => {
    setSelectedGame(null);
    window.scrollTo(0, 0);
  }, []);

  const handleCategorySelect = (genre) => {
    setSearchQuery("");
    setSelectedGenre(genre);
  };

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    if (query.length > 0) {
      setSelectedGenre(null);
    }
  }, []);

  const filteredGames = useMemo(() => {
    let gamesToDisplay = games;

    // Filter by Genre
    if (selectedGenre && searchQuery.length === 0) {
      const lowerSelectedGenre = selectedGenre.toLowerCase();
      gamesToDisplay = gamesToDisplay.filter(
        (game) => game.genre.toLowerCase() === lowerSelectedGenre,
      );
    }

    // Search filter
    if (searchQuery.length > 0) {
      const lowerSearchQuery = searchQuery.toLowerCase();
      gamesToDisplay = games.filter(
        (game) =>
          game.title.toLowerCase().includes(lowerSearchQuery) ||
          game.description.toLowerCase().includes(lowerSearchQuery),
      );
    }

    return gamesToDisplay;
  }, [games, selectedGenre, searchQuery]);

  // Loading state
  if (loading) {
    return (
      <div className="game">
        <div className="game-loading">
          <div className="game-loading-spinner"></div>
          <p>Loading games...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="game">
        <div className="game-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game">
      {selectedGame ? (
        <GameDetailPage
          game={selectedGame}
          onBack={handleBackClick}
          showBackButton={!!selectedGame}
        />
      ) : (
        <>
          <main className="main-content">
            {searchQuery.length === 0 && <Banner games={games} onGameClick={handleGameClick} />}

            <Header
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
            />

            {searchQuery.length === 0 && (
              <FeatureBanner
                categories={categories}
                onCategorySelect={handleCategorySelect}
                selectedGenre={selectedGenre}
                onSearchChange={handleSearchChange}
              />
            )}
            <Gamescard
              games={filteredGames}
              selectedGenre={selectedGenre}
              onGameClick={handleGameClick}
              searchQuery={searchQuery}
            />
          </main>
        </>
      )}
    </div>
  );
};

export default Gamepage;
