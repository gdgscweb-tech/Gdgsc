import React from "react";
import Carousel from "./Carousel/Carousel";
import "./Carousel/Carousel.css";
const Timeline = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "fit-content" }}>
          <h1 style={{ position: "relative" }}>Past Events</h1>
          <div
            style={{
              width: "100%",
              height: "2px",
              background:
                "radial-gradient(transparent, transparent, gold, transparent, transparent)",
              marginBottom: "2rem",
            }}
          ></div>
        </div>
      </div>
      <Carousel />
    </div>
  );
};

export default Timeline;
