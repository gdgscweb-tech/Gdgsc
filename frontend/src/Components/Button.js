import React from "react";

const Button = ({ text, variant = "hexagon", style = {}, ...props }) => {
  // Base style using JS syntax
  const baseStyle = {
    borderRadius: ".25rem",
    textTransform: "uppercase",
    fontFamily: "Arial",
    fontWeight: 800,
    paddingLeft: "25px",
    paddingRight: "25px",
    color: "#000", // Dark text for contrast
    clipPath:
      "polygon(0 0,0 0,100% 0,100% 0,100% calc(100% - 15px),calc(100% - 15px) 100%,15px 100%,0 100%)",
    height: "40px",
    fontSize: "0.7rem",
    lineHeight: "14px",
    letterSpacing: "1.2px",
    transition: "0.2s ease-in-out",
    backgroundImage: "linear-gradient(90deg, #fff700, #ffb10aff)", // Yellow gradient
    border: "0",
    overflow: "hidden",
    position: "relative",
    ...style,
  };

  // Add custom hover styles per variant
  const variantStyles = {
    hexagon: {
      "&:hover": {
        paddingLeft: "30px",
        paddingRight: "30px",
        background: "linear-gradient(90deg, #ffb10aff, #fff700)",
        transform: "scale(1.05)",
        boxShadow: "0 0 12px rgba(255, 217, 0, 0.6)",
      },
    },
    bubble: {
      "&:hover": {
        borderRadius: "50px",
        transform: "scale(1.1)",
        boxShadow: "0 0 14px rgba(255, 217, 0, 0.8)",
      },
    },
    star: {
      "&:hover": {
        transform: "rotate(1deg) scale(1.03)",
        boxShadow: "0 0 10px rgba(255, 230, 0, 0.6)",
      },
    },
    disabled: {
      "&:hover": {
        cursor: "not-allowed",
        transform: "none",
        boxShadow: "none",
      },
    },
  };

  if (variant === "disabled") {
    baseStyle.backgroundImage = "none";
    baseStyle.backgroundColor = "#555";
    baseStyle.color = "#888";
    baseStyle.cursor = "not-allowed";
  }

  const handleMouseEvents = (e) => {
    const hover = variantStyles[variant]["&:hover"];

    if (e.type === "mouseover") {
      Object.assign(e.target.style, hover);
    } else if (e.type === "mouseout") {
      Object.assign(e.target.style, baseStyle);
    } else if (e.type === "mousedown") {
      e.target.style.transform = "scale(0.95)";
    } else if (e.type === "mouseup") {
      e.target.style.transform = hover.transform || "";
    }
  };

  return (
    <button
      style={baseStyle}
      onMouseOver={handleMouseEvents}
      onMouseOut={handleMouseEvents}
      onMouseDown={handleMouseEvents}
      onMouseUp={handleMouseEvents}
      {...props}
    >
      {variant === "star" ? (
        <span
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
          }}
        >
          {text}
        </span>
      ) : (
        text
      )}
    </button>
  );
};

export default Button;
