import React from "react";
import { useState, useEffect } from "react";
import "./DetailCarousel.css";

const DetailCarousel = ({ screenshots, gameTitle }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!screenshots || screenshots.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % screenshots.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [screenshots]);

  const slide = screenshots?.[currentSlide];

  return (
    <section className="detail-carousel">
      <div className="detail-carousel-image-container">
        <img
          src={slide}
          alt={`${gameTitle} screenshot ${currentSlide + 1}`}
          className="detail-carousel-image"
          key={currentSlide}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/1200x600/374151/ffffff?text=SCREENSHOT+ERROR";
          }}
        />
        <div className="detail-carousel-overlay"></div>
      </div>

      <div className="detail-carousel-dots-container">
        {screenshots &&
          screenshots.length > 0 &&
          screenshots.map((_, index) => (
            <button
              key={index}
              className={`detail-carousel-dot ${currentSlide === index ? "is-active" : ""}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to screenshot ${index + 1}`}
            ></button>
          ))}
      </div>
    </section>
  );
};

export default DetailCarousel;
