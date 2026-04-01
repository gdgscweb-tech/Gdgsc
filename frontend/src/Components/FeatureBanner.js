import React from "react";
import "./FeatureBanner.css";
import { useState } from "react";

const FeatureBanner = ({
  categories,
  onCategorySelect,
  selectedGenre,
  onSearchChange,
}) => {
  const handleCategoryClick = (genre) => {
    // When a genre is selected, clear the search bar to show only genre results
    onSearchChange("");
    onCategorySelect(genre);
  };

  return (
    <section className="categories">
      <div className="categories-grid">
        {categories.map((category) => (
          <div
            key={category.id}
            className={`category-card ${
              selectedGenre === category.name ? "is-selected" : ""
            }`}
            onClick={() => handleCategoryClick(category.name)}
          >
            <img src={category.image} alt={category.name} />
            <div className="category-overlay">
              <h3>{category.name}</h3>
            </div>
          </div>
        ))}
        <div
          className={`category-card category-card--reset ${
            !selectedGenre ? "is-selected is-selected--reset" : ""
          }`}
          onClick={() => handleCategoryClick(null)}
        >
          <h3>SHOW ALL</h3>
        </div>
      </div>
    </section>
  );
};

export default FeatureBanner;
