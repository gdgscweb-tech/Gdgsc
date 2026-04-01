import React from "react";
import "./Banner.css";
import { Play } from "lucide-react";
import { useState, useEffect } from "react";
import Button from "./Button.js";

const Banner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      image:
        "https://wallpapers.com/images/hd/bgmi-holding-off-zombies-ews8jphkgngvlkhd.jpg",
      title: "BGMI",
      info: { players: "40k", year: "2021", genre: "Action" },
      description:
        "A deadly virus is spreading across Los Angeles, turning its inhabitants into ravenous zombies.",
    },
    {
      image:
        "https://cdn2.unrealengine.com/fgss04-keyart-offerimagelandscape-2560x1440-2560x1440-89c8edd4ffe307f5d760f286a28c3404-2560x1440-e9d811eebce7.jpg",
      title: "FALL GUYS",
      info: { players: "60k", year: "2023", genre: "Adventure" },
      description: "You will fall for Fall Guys",
    },
    {
      image:
        "https://clan.akamai.steamstatic.com/images/11088164/fc149fcdcf38d84b9fe8d24ba0d70517353c1c5f.png",
      title: "ELDEN RING",
      info: { players: "100k", year: "2022", genre: "RPG" },
      description:
        "Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring.",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const handleDotClick = (index) => {
    setCurrentSlide(index);
  };
  return (
    <section className="Banner">
      <div className="Banner-overlay"></div>
      <img
        src={slides[currentSlide].image}
        alt={slides[currentSlide].title}
        className="Banner-image"
        key={currentSlide}
      />

      <div className="Banner-content">
        <div className="Banner-logo">
          <h1>{slides[currentSlide].title}</h1>
        </div>

        <div className="Banner-info">
          <span className="info-item">
            Join Game: {slides[currentSlide].info.players}
          </span>
          <span className="info-dot">•</span>
          <span className="info-item">{slides[currentSlide].info.year}</span>
          <span className="info-dot">•</span>
          <span className="info-item">{slides[currentSlide].info.genre}</span>
        </div>

        <p className="Banner-description">{slides[currentSlide].description}</p>

        <div className="Banner-buttons">
          <Button text="View Now" />
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
