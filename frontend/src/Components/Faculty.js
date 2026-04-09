import React from "react";
import Frame from "./Frame/Frame";
import Button from "./Frame/Button";

const Faculty = () => {
  return (
    <div style={{ padding: "60px" }}>
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 style={{ position: "relative" }}>Our Faculty Council</h1>

        <div
          style={{
            width: "100%",
            maxWidth: "300px", // optional: restrict underline width
            height: "2px",
            background:
              "radial-gradient(transparent, transparent, gold, transparent, transparent)",
          }}
        ></div>
      </div>

      <div
        style={{
          marginTop: "50px",
          width: "100%",
          justifyContent: "center",
          display: "flex",
          position: "relative",
          gap: "60px",
          flexWrap: "wrap",
        }}
      >
        <Frame text={"Dr. Jyoti"}>
          <img
            src="/images/mam/jyoti_mam1.jpg"
            alt="Dr. Jyoti"
          />
        </Frame>

        <Frame text={"Dr. Renu"}>
          <img
            src="/images/mam/renu_mam.jpg"
            alt="Dr. Renu"
          />
        </Frame>
      </div>
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: "40px",
        }}
      >
        {/* <Button text="View all teams"></Button> */}
      </div>
    </div>
  );
};

export default Faculty;
