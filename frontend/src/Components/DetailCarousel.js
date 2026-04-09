import React from "react";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./DetailCarousel.css";

const DetailCarousel = ({ screenshots, gameTitle, mediaItems }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Use mediaItems if provided, otherwise build from screenshots
  const items =
    mediaItems && mediaItems.length > 0
      ? mediaItems
      : (screenshots || []).map((url) => ({ url, isVideo: false }));

  // Auto-advance (pause on videos)
  useEffect(() => {
    if (items.length <= 1) return;
    if (items[currentSlide]?.isVideo) return; // Don't auto-advance on videos

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [items.length, currentSlide, items]);

  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const goToNext = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % items.length);
  }, [items.length]);

  if (items.length === 0) return null;

  const current = items[currentSlide];

  return (
    <section className="detail-carousel">
      <div className="detail-carousel-image-container">
        {current.isVideo ? (
          <video
            src={current.url}
            className="detail-carousel-image"
            key={currentSlide}
            autoPlay
            muted
            loop
            playsInline
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        ) : (
          <img
            src={current.url}
            alt={`${gameTitle} screenshot ${currentSlide + 1}`}
            className="detail-carousel-image"
            key={currentSlide}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://placehold.co/1200x600/374151/ffffff?text=SCREENSHOT+ERROR";
            }}
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            className="carousel-nav-btn carousel-nav-btn--left"
            onClick={goToPrev}
            aria-label="Previous screenshot"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            className="carousel-nav-btn carousel-nav-btn--right"
            onClick={goToNext}
            aria-label="Next screenshot"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="detail-carousel-dots-container">
        {items.length > 1 &&
          items.map((_, index) => (
            <button
              key={index}
              className={`detail-carousel-dot ${currentSlide === index ? "is-active" : ""}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to screenshot ${index + 1}`}
            ></button>
          ))}
      </div>

      {/* Slide counter */}
      {items.length > 1 && (
        <div className="carousel-counter">
          {currentSlide + 1} / {items.length}
        </div>
      )}
    </section>
  );
};

export default DetailCarousel;
