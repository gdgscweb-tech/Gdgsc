import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "./Navbar.css"; // Import the CSS file

const Navbar = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  console.log("Navbar User:", user); // Debugging
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <Link to="/" onClick={closeMenu}>
          <img src="/assets/logos/logo1.jpg" alt="logo" className="logo-img" />
        </Link>
      </div>

      {/* Hamburger menu icon */}
      <div className={`hamburger ${isOpen ? "open" : ""}`} onClick={toggleMenu}>
        <div className="line"></div>
        <div className="line"></div>
        <div className="line"></div>
      </div>

      {/* Navigation links */}
      <ul className={`nav-links ${isOpen ? "open" : ""}`}>
        <li>
          <Link to="/about" onClick={closeMenu}>
            ABOUT
          </Link>
        </li>
        <li>
          <Link to="/events" onClick={closeMenu}>
            EVENTS
          </Link>
        </li>
        <li>
          <Link to="/games" onClick={closeMenu}>
            GAMES
          </Link>
        </li>
        <li>
          <Link to="/team" onClick={closeMenu}>
            TEAMS
          </Link>
        </li>
        <li>
          <Link to="/gallery" onClick={closeMenu}>
            GALLERY
          </Link>
        </li>
        {/* User actions are moved inside the mobile menu for small screens */}
        <li className="nav-actions-mobile">
          {isAuthenticated && !loading ? (
            <>
              {user?.role === "admin" && (
                <Link to="/admin" onClick={closeMenu}>
                  Admin
                </Link>
              )}
              <Link to="/profile" onClick={closeMenu}>
                Profile
              </Link>
              <Link
                to="/"
                onClick={() => {
                  logout();
                  closeMenu();
                }}
              >
                Logout
              </Link>
            </>
          ) : (
            <Link to="/login" onClick={closeMenu}>
              Login
            </Link>
          )}
        </li>
      </ul>

      {/* User profile / Login section for desktop */}
      <div className="user-actions">
        {!loading &&
          (isAuthenticated ? (
            <>
              {user?.role === "admin" && (
                <Link to="/admin" className="admin-link">
                  Admin
                </Link>
              )}
              <Link to="/profile" className="profile-link">
                <img
                  src={user?.profilePicture || "/assets/default-avatar.png"} // Add a fallback avatar
                  alt="profile"
                  className="profile-picture"
                />
                <span className="username">{user?.username}</span>
              </Link>
            </>
          ) : (
            <Link to="/login" className="login-button">
              Login
            </Link>
          ))}
      </div>
    </nav>
  );
};

export default Navbar;
