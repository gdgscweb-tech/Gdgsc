import React from "react";
import "./gallery.css";

const images = [
  {
    id: 1,
    src: "/images/Orientation/Orientation1.png",
    alt: "GDGSC Orientation Event - Group Photo"
  },
  // {
  //   id: 2,
  //   src: "/images/Orientation/Orientation2.png",
  //   alt: "GDGSC Orientation Event - Activities"
  // },
  // {
  //   id: 3,
  //   src: "/images/Orientation/zoo1.png",
  //   alt: "Zoo Visit Event"
  // },
  // {
  //   id: 4,
  //   src: "/images/Orientation/Orientation3.png",
  //   alt: "GDGSC Orientation Event - Presentations"
  // },
    {
    id: 2,
    src: "/images/Orientation/collage6.png",
    alt: "GDGSC Orientation Event - Networking"
  },

    {
    id: 4,
    src: "/images/Orientation/collage8.png",
    alt: "GDGSC Orientation Event - Networking"
  },
  
  {
    id: 5,
    src: "/images/Orientation/Orientation4.png",
    alt: "GDGSC Orientation Event - Networking"
  },
      {
    id: 3,
    src: "/images/Orientation/collage7.png",
    alt: "GDGSC Orientation Event - Networking"
  },
  {
    id: 6,
    src: "/images/Orientation/collage9.png",
    alt: "GDGSC Orientation Event - Networking" 
  },
    {
    id: 7,
    src: "/images/Orientation/combine.png",
    alt: "GDGSC Orientation Event - Networking"
  },
];

export default function Gallery() {
  return (
    <div className="gallery-container">
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "fit-content", textAlign: "center" }}>
          <h1
            style={{
              position: "relative",
              color: "rgb(255, 215, 0)",
              marginBottom: "0.5rem",
            }}
          >
            Gallery
          </h1>
          <div
            style={{
              width: "100%",
              height: "3px",
              background:
                "radial-gradient(transparent, transparent, gold, transparent, transparent)",
              marginBottom: "2rem",
            }}
          ></div>
        </div>
      </div>

      <div className="photo-grid">
        {images.map((image) => (
          <div key={image.id} className="photo-item">
            <img 
              src={image.src} 
              alt={image.alt} 
              className="photo-img"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div 
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                height: '200px',
                background: '#333',
                color: '#999',
                fontSize: '14px'
              }}
            >
              Image not found
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




