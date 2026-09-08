import React from "react";
import Button from "../Components/Button";
import "./Home.css"; 

const Home = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        overflow: "hidden",
      }}
    >
      <div
        className="home-text"
        style={{ zIndex: 2, paddingLeft: "5vw",background:"linear-gradient(90deg,black,black,transparent)" }}
      >
        <h1
          style={{
            fontWeight: 800,
            color: "white",
            marginTop: "100px",
            // fontSize: "3.5rem",
            lineHeight: "1.2",
          }}
        >
          Welcome to
          <br />
          <span
            style={{ color: "#ffc400ff", fontFamily: "'Valorax', sans-serif" }}
          >
            GDGSC
          </span>
        </h1>

        <p
          style={{
            color: "white",
            fontFamily: '"Rajdhani", "Agency FB", "Impact", sans-serif',
            fontSize: "1.5rem",
            textShadow: "0 0 10px #f5d95eff, 0 0 20px #000000ff",
            textAlign: "left",
            letterSpacing: "1px",
            fontWeight: "bold",
            margin: "20px 0",
            textTransform: "uppercase",
            maxWidth: "500px",
          }}
        >
          Where Gamers and creators come together to Build, Play and Grow!
        </p>

        <div
          style={{
            marginTop: "40px",
            display: "flex",
            gap: "60px",
            zIndex: 2,
          }}
        >
          <a 
            href="https://chat.whatsapp.com/CkYY8QDlQIkDBrWIOVOA8T?mode=ac_t" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
            <Button text="Join Community" />
          </a>
          <a 
            href="https://forms.gle/etn7j3AAQGMXiK6J7" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
          >
          <Button text="Become Partner" />
          </a>
        </div>
      </div>

      <div
        className="home-image"
        style={{
          position: "absolute",
          right: "0px",
          width: "60vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <img
          src="/images/home.webp"
          decoding="async"
          height="100%"
          width={"100%"}
          style={{
            objectFit: "cover",
            objectPosition: "top",
          }}
          alt="gaming community"
        />
      </div>
    </div>
  );
};

export default Home;

