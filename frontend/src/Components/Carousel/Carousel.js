import React from "react";
import "./Carousel.css";

const Carousel = () => {
  const images = [
    "/assets/g_photos/one.webp",
    "/assets/g_photos/one_g.jpg",
    "/assets/g_photos/photo4.jpeg",
    "/assets/g_photos/two.jpg",
    "/assets/g_photos/one.webp",
    "/assets/g_photos/five.jpg",
    "/assets/g_photos/photo7.jpeg",
    "/assets/g_photos/photo3.jpeg",
    "/assets/g_photos/three.jpg",
    "/assets/g_photos/photo2.jpeg",
  ];

  return (
    <div className="carousel-container">
      <div className="carousel-fade-left"></div>
      <div className="carousel-fade-right"></div>
      
      <div className="carousel-track">
        {/* Set 1 */}
        <div className="carousel-images">
          {images.map((src, index) => (
            <div className="carousel-card" key={`img-1-${index}`}>
              <img src={src} alt={`Past Event ${index}`} />
            </div>
          ))}
        </div>
        {/* Set 2 - To create infinite loop effect */}
        <div className="carousel-images">
          {images.map((src, index) => (
            <div className="carousel-card" key={`img-2-${index}`}>
              <img src={src} alt={`Past Event ${index}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Carousel;
