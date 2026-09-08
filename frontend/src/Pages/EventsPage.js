import React, { useState, useEffect } from "react";
import "./EventsPage.css";
import EventCard from "../Components/Cards/EventCard";
import StayTuned from "./StayTuned";
import { AnimatePresence, motion } from "framer-motion";

const EVENTS_CACHE_KEY = "gdgsc:events:v1";
const EVENTS_CACHE_TTL_MS = 60 * 1000;

const readEventsCache = () => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(EVENTS_CACHE_KEY) || "null");
    if (!cached || !Array.isArray(cached.events)) return null;
    return cached;
  } catch {
    return null;
  }
};

const writeEventsCache = (events) => {
  try {
    sessionStorage.setItem(
      EVENTS_CACHE_KEY,
      JSON.stringify({ events, cachedAt: Date.now() }),
    );
  } catch {
    // Storage can be unavailable in private browsing; the network path still works.
  }
};

const EventsPage = () => {
  const [ongoingEvents, setOngoingEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalEvents, setTotalEvents] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const cached = readEventsCache();
      const cacheAge = cached ? Date.now() - cached.cachedAt : Infinity;

      if (cached) {
        categorizeEvents(cached.events);
        setLoading(false);
      }

      if (cacheAge < EVENTS_CACHE_TTL_MS) return;

      try {
        if (!cached) setLoading(true);
        const apiUrl = process.env.REACT_APP_ENV === 'production'
          ? process.env.REACT_APP_PROD_API_URL
          : process.env.REACT_APP_DEV_API_URL;

        const response = await fetch(`${apiUrl}/api/events`, { cache: "default" });

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const events = await response.json();
        writeEventsCache(events);
        categorizeEvents(events);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  },[]);

  const categorizeEvents = (events) => {
    const now = new Date();
    const ongoing = [];
    const upcoming = [];
    const past = [];

    events.forEach(event => {
      if(event.imageUrl) {
        console.log('Event image URL:', event.imageUrl);
      } else {
        event.imageUrl = "https://images.unsplash.com/photo-1542751371-adc38448a05e"; // temporary image
        //this is a temporary solution to cloudinary problem
      }
      const eventDate = new Date(event.date);
      const eventEndDate = event.eventEndDate ? new Date(event.eventEndDate) : new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);

      if (now >= eventDate && now <= eventEndDate) {
        ongoing.push(event);
      } else if (eventDate > now) {
        upcoming.push(event);
      } else {
        past.push(event);
      }
    });

    setOngoingEvents(ongoing);
    setUpcomingEvents(upcoming);
    setPastEvents(past);
    setTotalEvents(events.length);
  };

  if (loading) {
    return (
      <div className="background">
        <h1>Events Page</h1>
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="background">
        <h1>Events Page</h1>
        <p>Error: {error}</p>
      </div>
    );
  }

  // If no events exist, show StayTuned page
  if (totalEvents === 0) {
    return <StayTuned />;
  }

  // Find the selected event object
  const selectedEvent = [...ongoingEvents, ...upcomingEvents, ...pastEvents].find(e => e._id === selectedId);

  return (
    <div>
      <div className="background">
        <div className="section">
          <h1 className="section-heading">Upcoming Events</h1>
          <div className="cards-container">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map(event => (
                <EventCard 
                  key={event._id} 
                  event={event} 
                  layoutId={event._id} 
                  onClick={() => setSelectedId(event._id)}
                />
              ))
            ) : (
              <p>No upcoming events</p>
            )}
          </div>
        </div>

        {ongoingEvents.length > 0 && (
          <div className="section">
            <h1 className="section-heading">Ongoing Events</h1>
            <div className="cards-container">
              {ongoingEvents.map(event => (
                <EventCard 
                  key={event._id} 
                  event={event} 
                  layoutId={event._id} 
                  onClick={() => setSelectedId(event._id)}
                />
              ))}
            </div>
          </div>
        )}

        {pastEvents.length > 0 && (
          <div className="section">
            <h1 className="section-heading">Past Events</h1>
            <div className="cards-container">
              {pastEvents.map(event => (
                <EventCard 
                  key={event._id} 
                  event={event} 
                  layoutId={event._id} 
                  onClick={() => setSelectedId(event._id)}
                />
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {selectedId && selectedEvent && (
            <>
              <motion.div
                className="modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedId(null)}
              />
              <div className="modal-container">
                <EventCard 
                  event={selectedEvent} 
                  layoutId={selectedId} 
                  isExpanded={true}
                  onClick={() => {}} // Do nothing on click when expanded
                />
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EventsPage;
