import React, { useState, useEffect, useCallback, useMemo } from "react";
import Header from "../Components/Header";
import Banner from "../Components/Banner";
import FeatureBanner from "../Components/FeatureBanner";
import Gamescard from "../Components/Gamescard";
import GameDetailPage from "../Components/GameDetailPage";
import api from "../services/api";
import "./Gamepage.css";

const Gamepage = () => {
  const [games, setGames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [activeTab, setActiveTab] = useState("discover"); // 'discover' | 'browse'

  // Fetch games and categories from the backend API
  const fetchStoreData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [gamesRes, categoriesRes] = await Promise.all([
        api.get("/api/games"),
        api.get("/api/games/categories"),
      ]);
      setGames(gamesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (err) {
      console.error("Failed to fetch store games data:", err);
      setError("Failed to load games from the GDGSC Vault. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const handleGameClick = useCallback((game) => {
    setSelectedGame(game);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBackClick = useCallback(() => {
    setSelectedGame(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleCategorySelect = useCallback((genre) => {
    setSelectedGenre(genre);
  }, []);

  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedGenre(null);
    setSortBy("featured");
  }, []);

  // Filter and sort games dynamically
  const filteredAndSortedGames = useMemo(() => {
    let result = [...games];

    // Filter by Genre
    if (selectedGenre) {
      const lowerGenre = selectedGenre.toLowerCase();
      result = result.filter(
        (game) => game.genre && game.genre.toLowerCase() === lowerGenre
      );
    }

    // Filter by Search Query
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (game) =>
          (game.title && game.title.toLowerCase().includes(query)) ||
          (game.genre && game.genre.toLowerCase().includes(query)) ||
          (game.description && game.description.toLowerCase().includes(query)) ||
          (game.developer && game.developer.toLowerCase().includes(query))
      );
    }

    // Sort result
    switch (sortBy) {
      case "title-asc":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "title-desc":
        result.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "year-desc":
        result.sort(
          (a, b) =>
            parseInt(b.info?.year || 0, 10) - parseInt(a.info?.year || 0, 10)
        );
        break;
      case "year-asc":
        result.sort(
          (a, b) =>
            parseInt(a.info?.year || 0, 10) - parseInt(b.info?.year || 0, 10)
        );
        break;
      case "featured":
      default:
        // Featured games first, then by creation
        result.sort((a, b) => {
          if (a.isFeatured === b.isFeatured) return 0;
          return a.isFeatured ? -1 : 1;
        });
        break;
    }

    return result;
  }, [games, selectedGenre, searchQuery, sortBy]);

  // Loading State
  if (loading) {
    return (
      <div className="store-page-root">
        <div className="store-loading-screen">
          <div className="store-loading-orb">
            <div className="orb-ring"></div>
            <div className="orb-ring-inner"></div>
          </div>
          <p className="store-loading-text">ACCESSING GDGSC VAULT...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="store-page-root">
        <div className="store-error-screen">
          <h3 className="store-error-title">Vault Connection Error</h3>
          <p className="store-error-message">{error}</p>
          <button onClick={fetchStoreData} className="store-retry-btn">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="store-page-root">
      {selectedGame ? (
        /* Individual Store Game Product Page */
        <GameDetailPage
          game={selectedGame}
          onBack={handleBackClick}
          allGames={games}
          onSelectGame={handleGameClick}
        />
      ) : (
        /* Store Front Experience */
        <main className="store-main-viewport">
          {/* Top Store Header & Navigation */}
          <Header
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            selectedGenre={selectedGenre}
            onGenreSelect={handleCategorySelect}
            sortBy={sortBy}
            onSortChange={setSortBy}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            categories={categories}
            totalGamesCount={games.length}
            filteredCount={filteredAndSortedGames.length}
          />

          {/* If in 'Discover' mode and no active search query, show Hero Spotlight & Genre Cards */}
          {activeTab === "discover" && !searchQuery && !selectedGenre && (
            <>
              {/* Epic-style Hero Spotlight */}
              <Banner games={games} onGameClick={handleGameClick} />

              {/* Genre Categories Hub */}
              <FeatureBanner
                categories={categories}
                onCategorySelect={handleCategorySelect}
                selectedGenre={selectedGenre}
                onSearchChange={handleSearchChange}
              />
            </>
          )}

          {/* Main Games Catalogue Grid */}
          <Gamescard
            games={filteredAndSortedGames}
            selectedGenre={selectedGenre}
            onGameClick={handleGameClick}
            searchQuery={searchQuery}
            onResetFilters={
              selectedGenre || searchQuery || sortBy !== "featured"
                ? handleResetFilters
                : null
            }
            sectionTitle={
              activeTab === "browse"
                ? "Full Vault Library"
                : selectedGenre
                ? `${selectedGenre} Games`
                : searchQuery
                ? `Search Results for "${searchQuery}"`
                : "Explore All Titles"
            }
          />
        </main>
      )}
    </div>
  );
};

export default Gamepage;
