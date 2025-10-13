import React from 'react';
import './border.css';

const FormBg = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto', // allow scroll only if needed
        background: `
          linear-gradient(rgba(10, 10, 10, 0.7), rgba(10, 10, 10, 0.7)),
          url('/images/yellow_futuristic_background_01.jpg')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        padding: '40px 10px', // responsive side padding
      }}
    >
      <div
        className="contest-card"
        style={{
          width: '100%',
          maxWidth: '420px', // keep form at readable width
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '32px 28px',
          boxShadow: '0 0 20px rgba(255, 255, 0, 0.3)',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default FormBg;
