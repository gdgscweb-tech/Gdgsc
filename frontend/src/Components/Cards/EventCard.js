import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../Button"; // Assuming you have a reusable Button component
import { motion } from "framer-motion";

const EventCard = ({ event, layoutId, onClick, isExpanded }) => {
  const navigate = useNavigate();
  const now = new Date();
  const eventDate = new Date(event.date);
  const eventEndDate = new Date(event.eventEndDate);
  const regStartDate = new Date(event.registrationStartDate);
  const regEndDate = new Date(event.registrationEndDate);

  // Determine Event Status
  let statusBadge = null;
  if (now >= eventDate && now <= eventEndDate) {
    statusBadge = <span className="status-badge live">LIVE</span>;
  } else if (now < eventDate) {
    statusBadge = <span className="status-badge upcoming">UPCOMING</span>;
  } else {
    statusBadge = <span className="status-badge past">PAST</span>;
  }

  // Determine Registration Button State
  let buttonText = "Register Now";
  let isButtonDisabled = false;
  let buttonVariant = "hexagon"; // Default variant

  if (now < regStartDate) {
    buttonText = "Registration Opens Soon";
    isButtonDisabled = true;
    buttonVariant = "disabled";
  } else if (now > regEndDate) {
    buttonText = "Registration Closed";
    isButtonDisabled = true;
    buttonVariant = "disabled";
  } else {
    // Registration is open
    buttonText = "Register Now";
    isButtonDisabled = false;
  }

  const handleRegistration = (e) => {
    e.stopPropagation(); // Prevent card click when clicking button
    if (!isButtonDisabled) {
      navigate(`/events/${event.eventId}`); // Navigate to event details or registration page
    }
  };

  const formatDate = (dateObj) => {
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDateOnly = (dateObj) => {
    return dateObj.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <motion.div 
      className={`event-card ${isExpanded ? 'expanded' : ''}`}
      layoutId={layoutId}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={!isExpanded ? { scale: 1.02 } : {}}
      transition={{ duration: 0.3 }}
    >
      <div className="event-image-container">
        {event.imageUrl ? (
          <motion.img 
            src={event.imageUrl} 
            alt={event.name} 
            className="event-image" 
            layoutId={`image-${layoutId}`}
          />
        ) : (
          <div className="event-image-placeholder">
            <span>{event.name.charAt(0)}</span>
          </div>
        )}
        <div className="event-status-overlay">
          {statusBadge}
        </div>
      </div>

      <div className="event-content">
        <motion.h3 className="event-title" layoutId={`title-${layoutId}`}>{event.name}</motion.h3>
        
        <div className="event-meta">
          {!isExpanded ? (
            <div className="meta-row">
              <span className="meta-value">{formatDateOnly(eventDate)}</span>
              <span className="meta-value highlight">{event.pointsAwarded} EXP</span>
            </div>
          ) : (
            <>
              <div className="meta-item">
                <span className="meta-label">Date:</span>
                <span>{formatDate(eventDate)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Location:</span>
                <span>{event.location}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">EXP:</span>
                <span>{event.pointsAwarded}</span>
              </div>
            </>
          )}
        </div>

        {/* Only show full description and actions if expanded */}
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.2 }}
          >
            <p className="event-description">
              {event.description}
            </p>

            <div className="event-actions">
              <Button 
                text={buttonText} 
                onClick={handleRegistration} 
                variant={isButtonDisabled ? "disabled" : "hexagon"}
                disabled={isButtonDisabled}
                style={{ width: '100%' }}
              />
            </div>
          </motion.div>
        )}
        
        {!isExpanded && (
           <p className="event-description-preview">
             Click to view details
           </p>
        )}
      </div>
    </motion.div>
  );
};

export default EventCard;
