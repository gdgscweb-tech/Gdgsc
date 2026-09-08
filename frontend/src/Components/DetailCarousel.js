import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Play, Image as ImageIcon, Film } from "lucide-react";
import "./DetailCarousel.css";

const DetailCarousel = ({ screenshots = [], gameTitle = "Game", mediaItems = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(true);
  const videoRef = useRef(null);

  // Normalize media items: prioritize mediaItems, fallback to screenshots
  const items =
    mediaItems && mediaItems.length > 0
      ? mediaItems
      : (screenshots || []).map((url) => {
          const isVid =
            typeof url === "string" &&
            (url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".ogg"));
          return { url, isVideo: isVid };
        });

  // Auto-advance if not video
  useEffect(() => {
    if (items.length <= 1) return;
    if (items[currentSlide]?.isVideo) return; // Never auto-advance when watching a video

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);

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
    <div className="store-media-showcase">
      {/* Primary Master Stage */}
      <div className="media-master-stage">
        {current.isVideo ? (
          <div className="master-video-wrapper">
            <video
              ref={videoRef}
              src={current.url}
              className="master-media-player"
              key={`video-${currentSlide}`}
              controls
              autoPlay
              muted
              playsInline
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="master-image-wrapper">
            <img
              src={current.url}
              alt={`${gameTitle} screenshot ${currentSlide + 1}`}
              className="master-media-img"
              key={`img-${currentSlide}`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://placehold.co/1200x675/11121a/ffd700?text=SCREENSHOT+UNAVAILABLE";
              }}
            />
          </div>
        )}

        {/* Navigation Arrows */}
        {items.length > 1 && (
          <>
            <button
              className="media-nav-arrow media-nav-arrow--left"
              onClick={goToPrev}
              aria-label="Previous media"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              className="media-nav-arrow media-nav-arrow--right"
              onClick={goToNext}
              aria-label="Next media"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Slide Counter Badge */}
        {items.length > 1 && (
          <div className="media-counter-badge">
            {current.isVideo ? <Film size={12} /> : <ImageIcon size={12} />}
            <span>
              {currentSlide + 1} / {items.length}
            </span>
          </div>
        )}
      </div>

      {/* Interactive Thumbnail Filmstrip */}
      {items.length > 1 && (
        <div className="media-thumbnail-filmstrip">
          {items.map((item, index) => {
            const isActive = currentSlide === index;
            return (
              <button
                key={index}
                className={`media-thumb-btn ${isActive ? "is-active" : ""}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`View media ${index + 1}`}
              >
                {item.isVideo ? (
                  <div className="thumb-video-placeholder">
                    <video src={item.url} muted preload="metadata" />
                    <div className="thumb-video-icon-overlay">
                      <Play size={14} fill="#ffd700" />
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        "https://placehold.co/200x120/11121a/ffffff?text=IMG";
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DetailCarousel;
