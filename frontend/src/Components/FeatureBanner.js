import React from "react";
import "./FeatureBanner.css";
import { Sparkles, Compass, Layers } from "lucide-react";

const FeatureBanner = ({
  categories = [],
  onCategorySelect,
  selectedGenre,
  onSearchChange,
}) => {
  if (!categories || categories.length === 0) return null;

  const handleCategoryClick = (genre) => {
    onSearchChange("");
    onCategorySelect(genre);
  };

  return (
    <section className="categories-section">
      <div className="section-header-row">
        <div className="section-header-title">
          <Layers size={20} className="section-icon" />
          <h3>Browse by Genre</h3>
        </div>
        <span className="section-subtitle">Explore student creations across genres</span>
      </div>

      <div className="categories-grid">
        {/* "ALL GENRES" Card */}
        <div
          className={`category-card category-card--all ${
            !selectedGenre ? "is-selected" : ""
          }`}
          onClick={() => handleCategoryClick(null)}
        >
          <div className="category-all-content">
            <Compass size={28} className="all-genres-icon" />
            <h4>ALL GENRES</h4>
            <span>View Full Library</span>
          </div>
        </div>

        {/* Dynamic Category Cards */}
        {categories.map((category) => {
          const isSelected = selectedGenre === category.name;
          return (
            <div
              key={category._id || category.name}
              className={`category-card ${isSelected ? "is-selected" : ""}`}
              onClick={() => handleCategoryClick(category.name)}
            >
              <img
                src={category.image}
                alt={category.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://images.unsplash.com/photo-1550745165-9bc0b252726f";
                }}
              />
              <div className="category-overlay">
                <div className="category-text-wrap">
                  <h4>{category.name}</h4>
                  <span className="category-explore-hint">
                    {isSelected ? "Active Filter" : "Explore →"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeatureBanner;
