import React from "react";
import Button from "./Button";



const Discord = () => {
  return (
    <>
      <div
        style={{ display: "flex", paddingTop: "100px", gap: "100px" }}
        className="discord"
      >
        <div>
          <img
            src="/images/chest.png"
            className="discordImage"
            alt="chest"
            loading="lazy"
            decoding="async"
          ></img>
        </div>
        <div className="discordtext">
          <div style={{ width: "fit-content" }}>
            <h1 style={{ position: "relative" }}>Stay tuned</h1>
            <div
              style={{
                width: "100%",
                height: "2px",
                background:
                  "radial-gradient(transparent,transparent,gold,transparent,transparent)",
              }}
            ></div>
          </div>
          <p style={{ paddingTop: "2rem", paddingBottom: "2rem", color: "white" }}>
            We're passionate about connecting with people to talk about what we
            are doing at GDGSC. Join our Discord community and stay up to date
            with the latest news and updates.
          </p>

          <a href="https://discord.gg/mzMJnbYYWc" target="_blank" rel="noopener noreferrer">
  <Button text="Join Discord" />
</a>


          {/* <Frame>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
      <img src="/images/chest.png" alt="discord" width={"100px"}></img>
    </Frame> */}
        </div>
      </div>
      {/* <Timeline></Timeline> */}
    </>
  );
};

export default Discord;

