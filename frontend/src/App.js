import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navbar from "./Components/Navbar";
import LandingPage from "./Pages/LandingPage";
import LoginPage from "./Pages/Login";
import AuthCallbackPage from "./Pages/AuthCallbackPage";
import ProfilePage from "./Pages/ProfilePage";
import CompleteProfilePage from "./Pages/CompleteProfilePage";
import SignupPage from "./Pages/SignupPage";
import EventsPage from "./Pages/EventsPage";
import AdminPage from "./Pages/AdminPage";
import MeetTeam from "./Pages/MeetTeam";
import Gallery from "./Pages/gallery";
import StayTuned from "./Pages/StayTuned";
import Gamepage from "./Pages/GamePage";
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

const MainRoutes = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <div style={{ paddingTop: "95px" }} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/team" element={<MeetTeam />} />
        <Route path="/about" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/games" element={<Gamepage />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/stay-tuned" element={<StayTuned />} />
      </Routes>
    </>
  );
};

export default App;
