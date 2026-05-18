import React from "react";
import { FaCrown, FaScroll, } from "react-icons/fa";
import { FaInstagram, FaLinkedin} from "react-icons/fa";
import { IoIosMail } from "react-icons/io";

const Footer = () => {
  return (
    <footer className="gold-footer" id="footer">
      {/* Gold texture background */}
      <div className="gold-overlay"></div>

      <div className="footer-container">
        {/* Left Section - Royal Crest */}
        <div className="footer-left">
          <div className="royal-crest">
            <FaCrown className="crown-icon" style={{ zIndex: "10" }} />
            <div className="crest-circle" style={{ position: "relative" }}>
              <img src="/assets/logos/logo1.jpg" alt="" width={"100%"} />
            </div>
          </div>
          <div className="royal-info">
            <h3 className="guild-name">
              <span className="decorative-bracket">{"<"}</span>
              GDGSC
              <span className="decorative-bracket">{"/>"}</span>
            </h3>
            <p className="guild-address">
              University School Of Automation And Robotics.
              <br />
              GGSIPU EAST DELHI CAMPUS, Surajmal Vihar, Delhi-110032
            </p>
          </div>
        </div>

        {/* Center Section - Social Links */}
        <div className="footer-center">
          <div className="court-section">
            <h3 className="section-title">
              <span className="title-decoration">⚔️</span> Follow Us{" "}
              <span className="title-decoration">⚔️</span>
            </h3>

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <a
                href="https://www.instagram.com/gdgsc_edc?igsh=MWRuZHlzd3lxOHpzdw=="
                className="social-link instagram"
              >
                <FaInstagram size={24} />
              </a>
              <a href="https://www.linkedin.com/company/game-dev-guild-students-club/" className="social-link linkedin">
                <FaLinkedin size={24} />
              </a>
              {/* <a href="https://github.com/" className="social-link github">
                <FaGithub size={24} />
              </a> */}
              <a
                href="mailto:gdsgc.web@gmail.com"
                className="social-link email"
              >
                <IoIosMail size={30} />
              </a>
            </div>
          </div>

          <div className="messenger-section">
            <div className="messenger-title">
              <span className="gold-bar"></span>
              <h3>Email</h3>
              <span className="gold-bar"></span>
            </div>
            <a
              className="messenger-link"
              style={{ fontSize: "1.2em" }}
              href="mailto:gdgsc.web@gmail.com"
            >
              &lt;gdgsc.web@gmail.com&gt;
            </a>
          </div>
        </div>

        {/* Right Section - Contact Form */}
        <div className="footer-right">
          <h3 className="contact-title">
            <span className="title-ornament">✦</span> Get In Touch{" "}
            <span className="title-ornament">✦</span>
          </h3>
          <form
      className="royal-form"
      action="https://formspree.io/f/xdkdywbv"
      method="POST"
    >
      <div className="form-field">
        <label>Your Name</label>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          className="form-input"
          required
        />
      </div>

      <div className="form-field">
        <label>Email address</label>
        <input
          type="email"
          name="email"
          placeholder="Email address"
          className="form-input"
          required
        />
      </div>

      <div className="form-field">
        <label>Your Message</label>
        <textarea
          name="message"
          placeholder="Your Message"
          className="form-textarea"
          required
        ></textarea>
      </div>

      <button type="submit" className="royal-button">
        <FaScroll className="button-icon" />
        Send
      </button>
    </form>

        </div>
      </div>

      {/* Divider */}
      <div className="footer-divider">
        <div className="divider-ornament left"></div>
        <div className="divider-center">✧ ✧ ✧</div>
        <div className="divider-ornament right"></div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <p>
          Developed by GDGSC USAR Web Team
          <br />© GDGSC USAR 2025 | All rights reserved.
        </p>
      </div>

      <style jsx>{`
        .social-link {
          color: white;
          transition: color 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .social-link.instagram:hover {
          color: #e1306c; /* Instagram pink */
        }

        .social-link.linkedin:hover {
          color: #0077b5; /* LinkedIn blue */
        }

        .social-link.github:hover {
          color: #6e5494; /* GitHub purple */
        }

        .social-link.email:hover {
          color: #d44638; /* Gmail red */
        }

        .email-icon {
          width: 24px;
          height: 24px;
        }

        .gold-footer {
          position: relative;
          background-color: #1a1200;
          color: #e8d8a0;
          padding: 2rem;
          font-family: "Trajan Pro", "Times New Roman", serif;
          overflow: hidden;
        }

        .gold-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url("https://www.transparenttextures.com/patterns/brushed-alum.png"),
            linear-gradient(to right, #3d2c0d, #5a4a1a);
          opacity: 0.15;
          z-index: 0;
        }

        .footer-container {
          position: relative;
          z-index: 1;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        @media (min-width: 768px) {
          .footer-container {
            flex-direction: row;
            justify-content: space-between;
          }
        }

        /* Left Section */
        .footer-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .royal-crest {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .crest-circle {
          width: 70px;
          height: 70px;
          border: 3px solid #d4af37;
          border-radius: 50%;
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.5);
        }

        .crown-icon {
          position: absolute;
          font-size: 2.5rem;
          color: #d4af37;
          text-shadow: 0 0 5px rgba(212, 175, 55, 0.7);
          top: -10px;
        }

        .guild-name {
          font-size: 1.5rem;
          color: #d4af37;
          text-align: center;
          margin: 0.5rem 0;
          letter-spacing: 1px;
        }

        .decorative-bracket {
          color: #a67c00;
          margin: 0 3px;
        }

        .guild-address {
          font-size: 0.9rem;
          text-align: center;
          line-height: 1.5;
          position: relative;
          padding-left: 1.5rem;
        }

        .scroll-icon {
          position: absolute;
          left: 0;
          top: 2px;
          color: #d4af37;
        }

        /* Center Section */
        .footer-center {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          align-items: center;
        }

        .section-title {
          font-size: 1.2rem;
          color: #d4af37;
          text-align: center;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-decoration {
          color: #a67c00;
        }

        .noble-links {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .noble-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #e8d8a0;
          text-decoration: none;
          transition: color 0.3s;
        }

        .noble-link:hover {
          color: #d4af37;
        }

        .link-icon {
          color: #d4af37;
          font-size: 1.2rem;
        }

        .messenger-section {
          text-align: center;
        }

        .messenger-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .gold-bar {
          width: 20px;
          height: 2px;
          background: linear-gradient(to right, #d4af37, #a67c00, #d4af37);
        }

        .messenger-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          color: #e8d8a0;
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.3s;
        }

        .messenger-link:hover {
          color: #d4af37;
        }

        /* Right Section */
        .footer-right {
          max-width: 100%;
        }

        .contact-title {
          font-size: 1.3rem;
          color: #d4af37;
          text-align: center;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .title-ornament {
          color: #a67c00;
        }

        .royal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .form-field label {
          font-size: 0.9rem;
          color: #d4af37;
        }

        .form-input,
        .form-textarea {
          padding: 0.7rem;
          background-color: rgba(26, 18, 0, 0.7);
          border: 1px solid #5a4a1a;
          color: #e8d8a0;
          font-family: inherit;
          border-radius: 2px;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #d4af37;
          box-shadow: 0 0 5px rgba(212, 175, 55, 0.5);
        }

        .form-textarea {
          min-height: 80px;
          resize: vertical;
        }

        .royal-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.7rem;
          background: linear-gradient(to bottom, #d4af37, #a67c00);
          color: #1a1200;
          border: none;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          border-radius: 2px;
          font-family: inherit;
        }

        .royal-button:hover {
          background: linear-gradient(to bottom, #e8c252, #b88c10);
          box-shadow: 0 0 10px rgba(212, 175, 55, 0.7);
        }

        .button-icon {
          font-size: 1rem;
        }

        /* Divider */
        .footer-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 2rem 0;
          position: relative;
        }

        .divider-ornament {
          flex: 1;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            #d4af37,
            transparent
          );
        }

        .divider-center {
          padding: 0 1rem;
          color: #d4af37;
        }

        /* Heraldry Section */
        .heraldry-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .heraldry-title {
          font-size: 1rem;
          color: #d4af37;
          margin-bottom: 0.5rem;
        }

        .house-sigils {
          display: flex;
          gap: 1.5rem;
        }

        .sigil {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.8rem;
        }

        .sigil-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #d4af37;
        }

        .house-1 {
          background: radial-gradient(circle, #d4af37 30%, #1a1200 70%);
        }

        .house-2 {
          background: radial-gradient(circle, #1a1200 30%, #d4af37 70%);
        }

        /* Footer Bottom */
        .footer-bottom {
          text-align: center;
          font-size: 0.8rem;
          color: #a67c00;
          line-height: 1.5;
        }
      `}</style>
    </footer>
  );
};

export default Footer;

