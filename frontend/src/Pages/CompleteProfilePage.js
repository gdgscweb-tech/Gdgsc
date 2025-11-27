import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import CompleteProfileForm from '../Components/auth/CompleteProfileForm'; // New component
import './AuthForm.css'; // Re-use auth form styling

const CompleteProfilePage = () => {
    const { user, loading, isAuthenticated, setUser } = useAuth();
    const navigate = useNavigate();
    const [pageError, setPageError] = useState('');

    useEffect(() => {
        // If not authenticated or profile is already complete, redirect away
        if (!loading && (!isAuthenticated || (user && user.isProfileComplete))) {
           console.log("Authenticated : ",isAuthenticated,"User : ", user, "Profile Complete : ",user.isProfileComplete)
            if (isAuthenticated && user && user.isProfileComplete) {
                navigate('/profile', { replace: true }); // Already set up, go to profile
            } else {
                navigate('/login', { replace: true }); // Not logged in or somehow not needing setup
            }
        }
    }, [loading, isAuthenticated, user, navigate]);

    if (loading || !user || user.isProfileComplete) {
        // Show loading or nothing if still determining state or not relevant
        return (
            <div className="auth-container">
                <div className="auth-form-card">
                    <p>Loading profile setup...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container" style={{marginTop:"140px",padding:"60px"}}>
            <div className="auth-form-card">
                <h2>Complete Your Profile</h2>
                <p>Welcome! Please fill in the required information to complete your profile.</p><br></br>
                {pageError && <p className="error-message">{pageError}</p>}
                <CompleteProfileForm setPageError={setPageError} />
            </div>
        </div>
    );
};

export default CompleteProfilePage;