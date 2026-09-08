import React from "react";
import "./Header.css";
import { Search, X, SlidersHorizontal, Sparkles, LayoutGrid, Tag } from "lucide-react";

const Header = ({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreSelect,
  sortBy,
  onSortChange,
  activeTab,
  onTabChange,
  categories = [],
  totalGamesCount = 0,
  filteredCount = 0,
}) => {
  return (
    <div className="store-header-container">
      {/* Top Store Sub-Nav Bar */}
      <div className="store-subnav">
        <div className="store-brand">
          <span className="store-badge">
            <Sparkles size={14} className="store-badge-icon" /> GDGSC VAULT
          </span>
          <h2 className="store-title">Game Arcade & Store</h2>
        </div>

        {/* Tab Navigation */}
        <div className="store-tabs">
          <button
            className={`store-tab-btn ${activeTab === "discover" ? "active" : ""}`}
            onClick={() => onTabChange("discover")}
          >
            <Sparkles size={16} />
            <span>Discover</span>
          </button>
          <button
            className={`store-tab-btn ${activeTab === "browse" ? "active" : ""}`}
            onClick={() => onTabChange("browse")}
          >
            <LayoutGrid size={16} />
            <span>Browse All ({totalGamesCount})</span>
          </button>
        </div>
      </div>

      {/* Search & Controls Row */}
      <div className="store-controls-row">
        {/* Search Bar */}
        <div className="store-search-bar">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search games by title, genre, story..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Controls (Sort & Quick Genres) */}
        <div className="store-filter-controls">
          {/* Quick Genre Dropdown on mobile/compact */}
          {categories.length > 0 && (
            <div className="filter-select-wrapper">
              <Tag size={15} className="filter-select-icon" />
              <select
                value={selectedGenre || ""}
                onChange={(e) => onGenreSelect(e.target.value || null)}
                className="store-select"
              >
                <option value="">All Genres</option>
                {categories.map((cat) => (
                  <option key={cat._id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="filter-select-wrapper">
            <SlidersHorizontal size={15} className="filter-select-icon" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="store-select"
            >
              <option value="featured">Sort: Featured</option>
              <option value="title-asc">Title (A → Z)</option>
              <option value="title-desc">Title (Z → A)</option>
              <option value="year-desc">Year (Newest)</option>
              <option value="year-asc">Year (Oldest)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filter Chips Bar (Shown when search or genre is active) */}
      {(selectedGenre || searchQuery) && (
        <div className="active-filters-bar">
          <span className="results-count">
            Showing <strong>{filteredCount}</strong> of {totalGamesCount} games
          </span>

          <div className="active-chips-list">
            {selectedGenre && (
              <span className="filter-chip">
                Genre: <strong>{selectedGenre}</strong>
                <button
                  onClick={() => onGenreSelect(null)}
                  className="chip-remove"
                  aria-label="Remove genre filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            {searchQuery && (
              <span className="filter-chip">
                Search: <strong>"{searchQuery}"</strong>
                <button
                  onClick={() => onSearchChange("")}
                  className="chip-remove"
                  aria-label="Clear search query"
                >
                  <X size={13} />
                </button>
              </span>
            )}

            <button
              onClick={() => {
                onGenreSelect(null);
                onSearchChange("");
              }}
              className="clear-all-filters-btn"
            >
              Reset All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Header;
