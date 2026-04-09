import React from "react";
import "./frame.css";

const Frame = ({ text, children }) => {
  return (
    <div className="faculty-card">
      <div className="faculty-card-content">
        {children}
        <div className="faculty-card-info">
          <p className="faculty-subtitle">CLUB FACULTY</p>
          <div className="faculty-title">{text}</div>
        </div>
      </div>
    </div>
  );
};

export default Frame;
