import React from "react";
import Counter from "../Components/Counter";
import Border from "../Components/Frame/border";


const About = () => {
  return (
    <div style={{ paddingTop: "140px", padding: "60px" }}>
      <div style={{ width: "fit-content" }}>
        <h1 style={{ position: "relative" }}>About GDGSC</h1>
        <div
          style={{
            width: "100%",
            height: "2px",
            background:
              "radial-gradient(transparent,transparent,gold,transparent,transparent)",
          }}
        ></div>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "60px" }}
        className="about"
      >
        <div>
          <p style={{ paddingBottom: "2rem", color: "white" }}>
            Welcome to GDGSC (GameDev Guild Students Club) at University School
            Of Automation And Robotics, East Delhi Campus! We are a vibrant tech
            society designed for passionate students interested in game
            development, design, and interactive media. Our mission is to foster
            collaboration, innovation, and creativity by bringing together
            like-minded individuals to work on exciting game development
            projects and Game related Events.
          </p>

          <div
            style={{
              fontFamily: "arial",
              display: "flex",
              gap: "40px",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <div className="about-stat-card stat-saffron">
              <span className="about-stat-number">
                <Counter target={60} duration={1000} /><span className="stat-plus">+</span>
              </span>
              <span className="about-stat-label">Team members</span>
            </div>
            
            <div className="about-stat-card stat-white">
              <span className="about-stat-number">
                <Counter target={1} duration={500} /><span className="stat-plus">+</span>
              </span>
              <span className="about-stat-label">Years active</span>
            </div>
            
            <div className="about-stat-card stat-green">
              <span className="about-stat-number">
                <Counter target={200} duration={1000} /><span className="stat-plus">+</span>
              </span>
              <span className="about-stat-label">Community</span>
            </div>
          </div>
        </div>
        <div>
          <img
            src="/assets/logos/About.jpeg"
            className="discordImage"
            alt="About"
            style={{zIndex: 1}}
          ></img>
        </div>
      </div>

      <div className="contest-container">
  <Border
    h2={"GAMEATHONS"}
    icon={"🎮"}
    p={
      <ul className="list-disc pl-5 space-y-1" style={{ marginTop: "1rem", color: "white" }}>
        <li>Build games under time pressure.</li>
        <li>Collaborate with devs and designers.</li>
        <li>Compete and showcase your talent.</li>
        <li>Boost creativity and teamwork.</li>
        <li>Strengthen your game dev portfolio.</li>
      </ul>
    }
  ></Border>

  <Border
    h2={"CONTESTS"}
    icon={"🏆"}
    p={
      <ul className="list-disc pl-5 space-y-1" style={{ marginTop: "1rem", color: "white" }}>
        <li>Test your game development skills.</li>
        <li>Compete with top talent.</li>
        <li>Win prizes and recognition.</li>
        <li>Solve theme-based challenges.</li>
        <li>Boost resume with achievements.</li>
      </ul>
    }
  ></Border>

  <Border
    h2={"EVENTS"}
    icon={"📃"}
    p={
      <ul className="list-disc pl-5 space-y-1" style={{ marginTop: "1rem", color: "white" }}>
        <li>Learn from industry experts.</li>
        <li>Explore trends and technologies.</li>
        <li>Attend keynotes and panels.</li>
        <li>Participate in Q&As.</li>
        <li>Gain insights into game development.</li>
      </ul>
    }
  ></Border>

  <Border
    h2={"WORKSHOPS"}
    icon={"🗣️"}
    p={
      <ul className="list-disc pl-5 space-y-1" style={{ marginTop: "1rem", color: "white" }}>
        <li>Gain hands-on experience.</li>
        <li>Learn tools and techniques.</li>
        <li>Build mini-projects live.</li>
        <li>Level up your dev skills.</li>
        <li>Get personalized guidance.</li>
        <li>Receive feedback on your projects.</li>
      </ul>
    }
  ></Border>
</div>

    </div>
  );
};

export default About;







