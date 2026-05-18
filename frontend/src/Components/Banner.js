import React from "react";
import "./Banner.css";
import { useState, useEffect } from "react";
import Button from "./Button.js";

const Banner = ({ games, onGameClick }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use featured games if available, otherwise use first 3 games
  const slides =
    games && games.length > 0
      ? games.filter((g) => g.isFeatured).length > 0
        ? games.filter((g) => g.isFeatured).slice(0, 5)
        : games.slice(0, 3)
      : [];

  useEffect(() => {
    if (slides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const handleDotClick = (index) => {
    setCurrentSlide(index);
  };

  if (slides.length === 0) return null;

  const current = slides[currentSlide];

  return (
    <section className="Banner">
      <div className="Banner-overlay"></div>
      <img
        src={current.image}
        alt={current.title}
        className="Banner-image"
        key={currentSlide}
        onError={(e) => {
          e.target.onerror = null;
          e.target.src =
            "https://placehold.co/1920x600/1f2937/ffffff?text=GAME+BANNER";
        }}
      />

      <div className="Banner-content">
        <div className="Banner-logo">
          <h1>{current.title}</h1>
        </div>

        <div className="Banner-info">
          <span className="info-item">
            Players: {current.info?.players || "N/A"}
          </span>
          <span className="info-dot">•</span>
          <span className="info-item">{current.info?.year || "N/A"}</span>
          <span className="info-dot">•</span>
          <span className="info-item">{current.genre}</span>
        </div>

        <p className="Banner-description">{current.description}</p>

        {current.platforms && current.platforms.length > 0 && (
          <div className="Banner-platforms">
            {current.platforms.map((p) => (
              <span key={p} className="platform-badge">{p}</span>
            ))}
          </div>
        )}

        <div className="Banner-buttons">
          <Button text="View Now" onClick={() => onGameClick(current)} />
        </div>
      </div>

      <div className="Banner-nav">
        {slides.map((_, index) => (
          <button
            key={index}
            className={`Banner-nav-dot ${currentSlide === index ? "active" : ""}`}
            onClick={() => handleDotClick(index)}
          ></button>
        ))}
      </div>
    </section>
  );
};

export default Banner;
