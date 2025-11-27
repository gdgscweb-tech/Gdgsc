// frontend/src/pages/ProfilePage.js
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "./ProfilePage.css";
import "./AuthForm.css";
import AdminNavbar from "./AdminNavbar";
import { FaUserPlus } from "react-icons/fa";
import { PiGameControllerBold } from "react-icons/pi";


// --- SYNCHRONIZED HELPER FUNCTION FOR LEVELING LOGIC ---
const getExpForLevel = (level) => {
    if (level <= 1) return 0;
    const BASE_EXP_INCREMENT = 100;
    const EXP_INCREMENT_FACTOR = 50;
    let totalExpRequired = 0;
    for (let i = 1; i < level; i++) {
        totalExpRequired += BASE_EXP_INCREMENT + (i - 1) * EXP_INCREMENT_FACTOR;
    }
    return totalExpRequired;
};

function formatDate(isoString) {
  const date = new Date(isoString);

  const day = date.getUTCDate();
  const month = date.toLocaleString('default', { month: 'long', timeZone: 'UTC' });
  const year = date.getUTCFullYear();

  const suffix = (n) => {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  return `${day}${suffix(day)} ${month} ${year}`;
}

// Helper function to get EXP needed for next level
const getExpForNextLevel = (currentLevel) => {
  const BASE_EXP_INCREMENT = 100;
  const EXP_INCREMENT_FACTOR = 50;
  return BASE_EXP_INCREMENT + (currentLevel - 1) * EXP_INCREMENT_FACTOR;
};

// Helper function to calculate progress percentage


const ProfilePage = () => {
  const { user, loading, logout, setUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    bio: "",
    profilePicture: "",
  });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [updateError, setUpdateError] = useState("");
  const [updateSuccess, setUpdateSuccess] = useState("");
  const [userRegistrations, setUserRegistrations] = useState([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(true);
  const [registrationsError, setRegistrationsError] = useState("");






  useEffect(() => {
    if (!loading && !user) {
      navigate("/login?session_expired=true");
    } else if (user) {
      if (!user.isProfileComplete) {
        navigate("/complete-profile");
        return;
      }
      setFormData({
        username: user.username || "",
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
      });
      fetchUserRegistrations();
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (isEditing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = ""; // Reset to default
    }

    // Cleanup on unmount or when isEditing changes
    return () => {
      document.body.style.overflow = "";
    };
  }, [isEditing]);

  const fetchUserRegistrations = async () => {
    setRegistrationsLoading(true);
    setRegistrationsError("");
    try {
      const { data } = await api.get("/api/registrations/my");
      setUserRegistrations(data);
    } catch (error) {
      console.error("Failed to fetch user registrations:", error);
      setRegistrationsError("Failed to load your event registrations.");
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleProfileImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setUpdateError(
          "Please upload an image file (e.g., JPG, PNG, GIF) for your profile picture."
        );
        setProfileImageFile(null);
        setFormData((prev) => ({
          ...prev,
          profilePicture: user.profilePicture || "",
        }));
        return;
      }

      setProfileImageFile(file);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setFormData((prev) => ({ ...prev, profilePicture: reader.result }));
        setUpdateError("");
      };
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        setUpdateError("Failed to read image file.");
        setProfileImageFile(null);
        setFormData((prev) => ({
          ...prev,
          profilePicture: user.profilePicture || "",
        }));
      };
    } else {
      setProfileImageFile(null);
      setFormData((prev) => ({
        ...prev,
        profilePicture: user.profilePicture || "",
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setUpdateError("");
    setUpdateSuccess("");

    try {
      let dataToSend = { ...formData };
      if (profileImageFile) {
        // formData.profilePicture already has the Base64 string
      } else if (!formData.profilePicture) {
        dataToSend.profilePicture = "";
      }

      const { data } = await api.put("/api/user/profile", dataToSend);
      setUser(data.user);
      setUpdateSuccess("Profile updated successfully!");
      setIsEditing(false);
      setProfileImageFile(null);
    } catch (error) {
      console.error(
        "Error updating profile:",
        error.response?.data?.message || error.message
      );
      setUpdateError(
        error.response?.data?.message || "Failed to update profile."
      );
    }
  };

  if (loading) {
    return (
      <div className="futuristic-profile-container">
        <div className="loading-card">Loading profile...</div>
      </div>
    );
  }

  if (!user || !user.isProfileComplete) {
    return null;
  }

  // --- PROGRESS BAR CALCULATIONS ---
const currentTotalExp = user.exp;
const expToStartCurrentLevel = getExpForLevel(user.level);
const expToStartNextLevel = getExpForLevel(user.level + 1);
const expGainedInCurrentLevel = currentTotalExp - expToStartCurrentLevel;
const expNeededForNextLevel = expToStartNextLevel - expToStartCurrentLevel;
let progressPercentage = 0;
if (expNeededForNextLevel > 0) {
    progressPercentage = (expGainedInCurrentLevel / expNeededForNextLevel) * 100;
} else {
    progressPercentage = 100;
}
progressPercentage = Math.min(100, Math.max(0, progressPercentage));
// --- END PROGRESS BAR CALCULATIONS ---


  return (
    <>
      <div className="futuristic-profile-container">
        {/* Navigation Bar */}
        <nav className="futuristic-nav">
          {/* <div className="nav-links">
            <a href="/" className="nav-link">HOME</a>
            <a href="/about" className="nav-link">ABOUT</a>
            <a href="/events" className="nav-link">EVENTS</a>
            <a href="/games" className="nav-link">GAMES</a>
            <a href="/team" className="nav-link">TEAM</a>
            <a href="/gallery" className="nav-link">GALLERY</a>
            <a href="/contact" className="nav-link">CONTACT</a>
          </div> */}
          <button onClick={handleLogout} className="nav-link logout-btn">LOGOUT</button>
        </nav>

        <div className="profile-grid">
          {/* Left Profile Card */}
          <div className="profile-card">
            <div className="avatar-container">
              <img
                src={user.profilePicture || "https://via.placeholder.com/120"}
                alt="Profile"
                className="avatar"
              />
            </div>
            <h2 className="profile-name">{user.username}</h2>
            <h4 className=''>{user.rank}</h4>

            <p className="profile-role" style={{marginTop: "10px", marginBottom: "10px"}}>{user.bio || "No bio provided."}</p>
            <span className="detail-value">{user.email}</span>
            
            {/* <div className="profile-details">
              <div className="detail-row">
                <span className="detail-label">Gender</span>
                <span className="detail-value">Male</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">DOB</span>
                <span className="detail-value">xx/xx/xxxx</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Age</span>
                <span className="detail-value">xx</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Mail</span>
                <span className="detail-value">{user.email}</span>
              </div>
            </div> */}

            <button onClick={() => setIsEditing(true)} className="edit-profile-button">
              Edit Profile
            </button>

            {/* Level Badge moved here */}
            <div className="level-badge">
              <div className="level-circle">
                <span className="level-number">{user.level}</span>
                <span className="level-text">LEVEL</span>


              </div>
            </div>
                     <div className="exp-progress-container">
                        <div className="exp-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
                         <span className="exp-progress-text">
                             {user.level >= 20 ? 'Max Level Reached!' : `${Math.round(expGainedInCurrentLevel)} / ${expNeededForNextLevel} EXP to Level ${user.level + 1}`}
                         </span>
                     </div>
          </div>

          {/* Center Content */}
          <div className="center-content">
            {/* Participated Events */}
            <div className="events-card" style={{position:'relative'}}>
              <h3 className="card-title">Participated Events</h3>
              <div className="events-list">
                {userRegistrations.length > 0 ? (
                  userRegistrations.map((reg, index) => (
                    <div key={reg._id} className="event-item">
                      <div className="event-info">
                        <span className="event-name">{reg.event?.name || "Event"}</span>
                        <span className="event-status">
                          {new Date(reg.event?.date) > new Date() ? "Upcoming" : "Completed"}
                        </span>
                      </div>
                      <span className="event-date">{formatDate(reg.event?.date)}</span>
                    </div>
                  ))
                ):<div style={{opacity:".8",left:"100%",transform:"translateX(-50%)",position:'relative'}}><center>Participated in no events yet!</center></div>}
                 {/* : (
                  <>
                    <div className="event-item">
                      <div className="event-info">
                        <span className="event-name">Hack-a-thon</span>
                        <span className="event-status upcoming">Upcoming</span>
                      </div>
                      <span className="event-date">xx/xx/xxxx</span>
                    </div>
                    <div className="event-item">
                      <div className="event-info">
                        <span className="event-name">Game-a-thon</span>
                        <span className="event-status position">1st Position</span>
                      </div>
                      <span className="event-date">xx/xx/xxxx</span>
                    </div>
                    <div className="event-item">
                      <div className="event-info">
                        <span className="event-name">Design-a-thon</span>
                        <span className="event-status position">2nd Position</span>
                      </div>
                      <span className="event-date">xx/xx/xxxx</span>
                    </div>
                  </>
                )} */}
              </div>
            </div>

            {/* Recently Played */}
            <div className="recently-played-card">
              <h3 className="card-title">Recently played</h3>
              {/* <div className="games-list">
                <div className="game-item">
                  <span className="game-name">Valorant</span>
                  <span className="game-time">2 Mins Ago</span>
                </div>
                <div className="game-item">
                  <span className="game-name">Among Us</span>
                  <span className="game-time">4 Hours Ago</span>
                </div>
                <div className="game-item">
                  <span className="game-name">Brawlhalla</span>
                  <span className="game-time">7 days ago</span>
                </div>
                 <div className="game-item">
                  <span className="game-name">Among Us</span>
                  <span className="game-time">4 Hours Ago</span>
                </div>
              </div> */}
              <div style={{margin:'20px',marginBottom:'40px',opacity:'0.8'}}><center>No game played yet!</center></div>
              <a href="stay-tuned" style={{textDecoration:'none'}}>
              <button className="add-friends-btn">
              <PiGameControllerBold className="add-friends-icon" />
              
              Play games
            </button>
            </a>
            </div>
          </div>

          {/* Right Friend List */}
          <div className="friends-card">
            <h3 className="card-title">Friend List</h3>
            <div style={{margin:'20px',opacity:'0.8'}}><center>Stay tuned</center></div>
            {/* <div className="friends-list">
              <div className="friend-item">
                <div className="friend-info">
                  <div className="friend-avatar"></div>
                  <span className="friend-name">Cab</span>
                </div>
                <span className="friend-level">Level 21</span>
              </div>
              <div className="friend-item">
                <div className="friend-info">
                  <div className="friend-avatar"></div>
                  <span className="friend-name">abc</span>
                </div>
                <span className="friend-level">Level 18</span>
              </div>
              <div className="friend-item">
                <div className="friend-info">
                  <div className="friend-avatar"></div>
                  <span className="friend-name">cba</span>
                </div>
                <span className="friend-level">Level 25</span>
              </div>
              <div className="friend-item">
                <div className="friend-info">
                  <div className="friend-avatar"></div>
                  <span className="friend-name">bac</span>
                </div>
                <span className="friend-level">Level 14</span>
              </div>
              <div className="friend-item">
                <div className="friend-info">
                  <div className="friend-avatar"></div>
                  <span className="friend-name">bca</span>
                </div>
                <span className="friend-level">Level 30</span>
              </div>
            </div> */}
            {/* <button className="add-friends-btn">
              <FaUserPlus className="add-friends-icon" />
              Add Friends
            </button> */}
          </div>
        </div>

        {/* Edit Profile Modal */}
        {isEditing && (
          <div
            className="edit-profile-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsEditing(false);
            }}
          >
            <div
              className="edit-profile-modal-content dashboard-card"
              style={{ marginTop: "2rem" }}
            >
              <h3>Edit Profile</h3>
              {updateError && <p className="error-message">{updateError}</p>}
              {updateSuccess && (
                <p className="success-message">{updateSuccess}</p>
              )}
              <form onSubmit={handleSave} className="profile-edit-form">
                <div className="form-group">
                  <label htmlFor="username">Username:</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bio">Bio:</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                  ></textarea>
                </div>
                <div className="form-group">
                  <label htmlFor="profilePictureFile">
                    Upload Profile Picture:
                  </label>
                  <input
                    type="file"
                    id="profilePictureFile"
                    name="profilePictureFile"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                  />
                  {formData.profilePicture && (
                    <div className="profile-image-preview">
                      <p>Current/New Profile Picture:</p>
                      <img
                        src={formData.profilePicture}
                        alt="Profile Preview"
                      />
                      {formData.profilePicture !== user.profilePicture && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              profilePicture: "",
                            }));
                            setProfileImageFile(null);
                          }}
                          className="clear-image-btn"
                        >
                          Clear Image
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="form-actions">
                  <button type="submit" className="auth-submit-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProfilePage;







// // frontend/src/pages/ProfilePage.js

// import React, { useEffect, useState } from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { useNavigate } from 'react-router-dom';
// import api from '../services/api';
// import './ProfilePage.css';
// import './AuthForm.css';

// // --- SYNCHRONIZED HELPER FUNCTION FOR LEVELING LOGIC ---
// const getExpForLevel = (level) => {
//     if (level <= 1) return 0;
//     const BASE_EXP_INCREMENT = 100;
//     const EXP_INCREMENT_FACTOR = 50;
//     let totalExpRequired = 0;
//     for (let i = 1; i < level; i++) {
//         totalExpRequired += BASE_EXP_INCREMENT + (i - 1) * EXP_INCREMENT_FACTOR;
//     }
//     return totalExpRequired;
// };
// // --- END SYNCHRONIZED HELPER FUNCTION ---

// const ProfilePage = () => {
//     const { user, loading, logout, setUser } = useAuth();
//     const navigate = useNavigate();

//     const [isEditing, setIsEditing] = useState(false);
//     const [formData, setFormData] = useState({
//         username: '',
//         bio: '',
//         profilePicture: '' // This will now hold the Base64 string or URL
//     });
//     const [profileImageFile, setProfileImageFile] = useState(null); // NEW: To hold the actual file object for conversion
//     const [updateError, setUpdateError] = useState('');
//     const [updateSuccess, setUpdateSuccess] = useState('');

//     const [userRegistrations, setUserRegistrations] = useState([]);
//     const [registrationsLoading, setRegistrationsLoading] = useState(true);
//     const [registrationsError, setRegistrationsError] = useState('');

//     useEffect(() => {
//         if (!loading && !user) {
//             navigate('/login?session_expired=true');
//         } else if (user) {
//             console.log(user)
//             if (!user.isProfileComplete) { // Use !user.isProfileComplete
//                 navigate('/complete-profile');
//                 return;
//             }
//             // Initialize formData with current user data
//             setFormData({
//                 username: user.username || '',
//                 bio: user.bio || '',
//                 profilePicture: user.profilePicture || ''
//             });
//             fetchUserRegistrations();
//         }
//     }, [user, loading, navigate]); // Remove isProfileComplete from deps

//     const fetchUserRegistrations = async () => {
//         setRegistrationsLoading(true);
//         setRegistrationsError('');
//         try {
//             const { data } = await api.get('/api/registrations/my');
//             setUserRegistrations(data);
//         } catch (error) {
//             console.error('Failed to fetch user registrations:', error);
//             setRegistrationsError('Failed to load your event registrations.');
//         } finally {
//             setRegistrationsLoading(false);
//         }
//     };

//     const handleLogout = () => {
//         logout();
//         navigate('/');
//     };

//     // Handler for general form input changes (bio, etc.)
//     const handleChange = (e) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     // --- NEW: Handle Profile Image File Upload and Conversion ---
//     const handleProfileImageUpload = (e) => {
//         const file = e.target.files[0];
//         if (file) {
//             // Basic file type validation
//             if (!file.type.startsWith('image/')) {
//                 setUpdateError('Please upload an image file (e.g., JPG, PNG, GIF) for your profile picture.');
//                 setProfileImageFile(null); // Clear the file
//                 setFormData(prev => ({ ...prev, profilePicture: user.profilePicture || '' })); // Revert preview
//                 return;
//             }

//             setProfileImageFile(file); // Store the file temporarily

//             const reader = new FileReader();
//             reader.readAsDataURL(file); // Convert file to Base64
//             reader.onload = () => {
//                 // Update formData.profilePicture with the Base64 string for preview
//                 setFormData(prev => ({ ...prev, profilePicture: reader.result }));
//                 setUpdateError(''); // Clear any previous error
//             };
//             reader.onerror = (error) => {
//                 console.error('Error reading file:', error);
//                 setUpdateError('Failed to read image file.');
//                 setProfileImageFile(null);
//                 setFormData(prev => ({ ...prev, profilePicture: user.profilePicture || '' })); // Revert preview
//             };
//         } else {
//             setProfileImageFile(null);
//             setFormData(prev => ({ ...prev, profilePicture: user.profilePicture || '' })); // Revert to current user's profile picture if file is cleared
//         }
//     };
//     // --- END NEW IMAGE HANDLING ---

//     const handleSave = async (e) => {
//         e.preventDefault();
//         setUpdateError('');
//         setUpdateSuccess('');

//         try {
//             let dataToSend = { ...formData }; // Start with current form data

//             // If a new file was selected, ensure we send its Base64 string
//             if (profileImageFile) {
//                 // If the user picked a file, formData.profilePicture already has the Base64 from handleProfileImageUpload
//                 // No extra conversion needed here
//             } else if (!formData.profilePicture) {
//                 // If profilePicture is intentionally cleared (empty string from input)
//                 dataToSend.profilePicture = ''; // Ensure it's explicitly sent as empty
//             }


//             const { data } = await api.put('/api/user/profile', dataToSend);
//             setUser(data.user); // Update context with new user data
//             setUpdateSuccess('Profile updated successfully!');
//             setIsEditing(false);
//             setProfileImageFile(null); // Clear the temporary file state
//         } catch (error) {
//             console.error('Error updating profile:', error.response?.data?.message || error.message);
//             setUpdateError(error.response?.data?.message || 'Failed to update profile.');
//         }
//     };

//     if (loading) {
//         return (
//             <div className="profile-dashboard-container">
//                 <div className="dashboard-card">Loading profile...</div>
//             </div>
//         );
//     }

//     if (!user || !user.isProfileComplete) { // Use !user.isProfileComplete
//         return null;
//     }

//     // --- PROGRESS BAR CALCULATIONS ---
//     const currentTotalExp = user.exp;
//     const expToStartCurrentLevel = getExpForLevel(user.level);
//     const expToStartNextLevel = getExpForLevel(user.level + 1);
//     const expGainedInCurrentLevel = currentTotalExp - expToStartCurrentLevel;
//     const expNeededForNextLevel = expToStartNextLevel - expToStartCurrentLevel;
//     let progressPercentage = 0;
//     if (expNeededForNextLevel > 0) {
//         progressPercentage = (expGainedInCurrentLevel / expNeededForNextLevel) * 100;
//     } else {
//         progressPercentage = 100;
//     }
//     progressPercentage = Math.min(100, Math.max(0, progressPercentage));
//     // --- END PROGRESS BAR CALCULATIONS ---

//     return (
//         <div className="profile-dashboard-container" style={{ marginTop: "140px", padding: "60px" }}>
//             <div className="dashboard-header">
//                 <h2>Welcome, {user.username}!</h2>
//                 <button onClick={handleLogout} className="logout-dashboard-btn">Logout</button>
//             </div>

//             {updateError && <p className="error-message">{updateError}</p>}
//             {updateSuccess && <p className="success-message">{updateSuccess}</p>}

//             <div className="dashboard-grid">
//                 <div className="dashboard-card profile-overview-card">
//                     {/* Display user.profilePicture, which can be a URL or Base64 */}
//                     <img src={user.profilePicture} alt="Profile" className="profile-picture-lg" />
//                     <h3>{user.username}</h3>
//                     <p className="profile-email">{user.email}</p>
//                     <p className="profile-bio">{user.bio || 'No bio provided.'}</p> {/* Use user.bio directly for display */}
//                     <button onClick={() => setIsEditing(true)} className="edit-profile-btn">Edit Profile</button>
//                 </div>

//                 <div className="dashboard-card gamification-stats-card">
//                     <h3>Your Progress</h3>
//                     <div className="stat-item">
//                         <span className="stat-label">Current EXP:</span>
//                         <span className="stat-value">{user.exp}</span>
//                     </div>
//                     <div className="stat-item">
//                         <span className="stat-label">Level:</span>
//                         <span className="stat-value">{user.level}</span>
//                     </div>
//                     <div className="stat-item">
//                         <span className="stat-label">Rank:</span>
//                         <span className="stat-value rank-text">{user.rank}</span>
//                     </div>

//                     <div className="exp-progress-container">
//                         <div className="exp-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
//                         <span className="exp-progress-text">
//                             {user.level >= 20 ? 'Max Level Reached!' : `${Math.round(expGainedInCurrentLevel)} / ${expNeededForNextLevel} EXP to Level ${user.level + 1}`}
//                         </span>
//                     </div>
//                 </div>

//                 <div className="dashboard-card registered-events-card">
//                     <h3>My Registered Events</h3>
//                     {registrationsLoading ? (
//                         <p>Loading registrations...</p>
//                     ) : registrationsError ? (
//                         <p className="error-message">{registrationsError}</p>
//                     ) : userRegistrations.length === 0 ? (
//                         <p>You haven't registered for any events yet.</p>
//                     ) : (
//                         <div className="registered-events-list">
//                             {userRegistrations.map((reg) => (
//                                 <div key={reg._id} className="registered-event-item">
//                                     {/* Check if reg.event exists before accessing its properties */}
//                                     {reg.event ? (
//                                         <>
//                                             <h4>{reg.event.name}</h4>
//                                             <p>Date: {new Date(reg.event.date).toLocaleDateString()}</p>
//                                             <p>Points: {reg.event.pointsAwarded} EXP</p>
//                                         </>
//                                     ) : (
//                                         // Fallback for deleted events
//                                         <p className="event-deleted-message">
//                                             Event details not available (Event may have been deleted).
//                                         </p>
//                                     )}
//                                 </div>
//                             ))}
//                         </div>
//                     )}
//                 </div>
//             </div>

//             {isEditing && (
//                 <div className="edit-profile-modal-overlay">
//                     <div className="edit-profile-modal-content dashboard-card">
//                         <h3>Edit Profile</h3>
//                         {updateError && <p className="error-message">{updateError}</p>}
//                         {updateSuccess && <p className="success-message">{updateSuccess}</p>}
//                         <form onSubmit={handleSave} className="profile-edit-form">
//                             <div className="form-group">
//                                 <label htmlFor="username">Username:</label>
//                                 {/* Display username but make it non-editable if that's the desired behavior after initial setup */}
//                                 {/* If you want to allow username changes, change to an input */}
//                                 <input
//                                     type="text"
//                                     id="username"
//                                     name="username"
//                                     value={formData.username}
//                                     onChange={handleChange}
//                                     required
//                                 />
//                             </div>
//                             <div className="form-group">
//                                 <label htmlFor="bio">Bio:</label>
//                                 <textarea
//                                     id="bio"
//                                     name="bio"
//                                     value={formData.bio}
//                                     onChange={handleChange}
//                                     rows="4"
//                                 ></textarea>
//                             </div>
//                             {/* --- NEW: Profile Picture File Input --- */}
//                             <div className="form-group">
//                                 <label htmlFor="profilePictureFile">Upload Profile Picture:</label>
//                                 <input
//                                     type="file"
//                                     id="profilePictureFile"
//                                     name="profilePictureFile" // Note: name is for internal React, not for backend form data
//                                     accept="image/*" // Only allow image files
//                                     onChange={handleProfileImageUpload}
//                                 />
//                                 {formData.profilePicture && (
//                                     <div className="profile-image-preview">
//                                         <p>Current/New Profile Picture:</p>
//                                         <img src={formData.profilePicture} alt="Profile Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '50%', border: '2px solid #61dafb', marginTop: '10px' }} />
//                                         {/* Option to clear image if user wants to remove it */}
//                                         {formData.profilePicture !== user.profilePicture && ( // Only show clear if it's a new or modified picture
//                                             <button type="button" onClick={() => {
//                                                 setFormData(prev => ({ ...prev, profilePicture: '' })); // Set to empty string
//                                                 setProfileImageFile(null); // Clear file
//                                             }} className="clear-image-btn">Clear Image</button>
//                                         )}
//                                     </div>
//                                 )}
//                             </div>
//                             {/* --- END NEW --- */}
//                             <div className="form-actions">
//                                 <button type="submit" className="auth-submit-btn">Save Changes</button>
//                                 <button type="button" onClick={() => setIsEditing(false)} className="cancel-btn">Cancel</button>
//                             </div>
//                         </form>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default ProfilePage;