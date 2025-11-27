# Implementation Plan

- [x] 1. Create Cloudinary configuration file





  - Create `backend/src/config/cloudinary.js` with Cloudinary SDK setup
  - Configure multer-storage-cloudinary middleware
  - Set up environment variable validation
  - Add error handling for missing credentials
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. Fix event registration flow in frontend
  - [ ] 2.1 Update EventCard component to handle registration
    - Add registration handler function
    - Add loading and error states
    - Show success/error messages
    - Disable button after successful registration
    - Check if user is already registered
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ] 2.2 Update EventsPage to support registration
    - Pass authentication status to EventCard
    - Add callback to refresh user data after registration
    - Handle unauthenticated users (redirect to login)
    - Update user registrations list after successful registration
    - _Requirements: 2.1, 2.2_

- [ ] 3. Fix profile completion flow
  - [ ] 3.1 Verify User model pre-save hook logic
    - Review REQUIRED_PROFILE_FIELDS array
    - Ensure isProfileComplete calculation is correct
    - Test edge cases (empty strings, null values)
    - _Requirements: 3.2, 3.3_
  
  - [ ] 3.2 Fix CompleteProfilePage redirect logic
    - Improve useEffect dependencies
    - Add better loading state handling
    - Fix redirect conditions
    - Handle edge case where user is already complete
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [ ] 3.3 Update AuthContext to properly handle isProfileComplete
    - Ensure flag is read from API response
    - Update flag after profile completion
    - Add helper method to check profile status
    - _Requirements: 3.2, 3.3_

- [ ] 4. Improve error handling across the application
  - [ ] 4.1 Add consistent error responses in backend controllers
    - Standardize error response format
    - Add specific error messages for validation failures
    - Improve error logging
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 4.2 Enhance frontend error display
    - Add toast notifications for errors
    - Improve error message formatting
    - Add retry mechanisms for failed requests
    - _Requirements: 8.1, 8.3_

- [ ] 5. Fix admin event management issues
  - [ ] 5.1 Add better date validation in AdminPage
    - Validate dates on frontend before submission
    - Show clear error messages for invalid dates
    - Add date range validation
    - _Requirements: 6.1, 6.4_
  
  - [ ] 5.2 Improve image upload feedback
    - Show upload progress
    - Display image preview before upload
    - Add image size/format validation
    - Handle upload errors gracefully
    - _Requirements: 6.2_
  
  - [ ] 5.3 Add confirmation dialogs for destructive actions
    - Confirm before deleting events
    - Warn about EXP adjustments
    - Show impact of point changes
    - _Requirements: 6.3, 6.4_

- [ ] 6. Verify and test EXP/leveling system
  - [ ] 6.1 Test event registration EXP award
    - Register for event and verify EXP increase
    - Check level up when crossing threshold
    - Verify rank updates correctly
    - _Requirements: 7.1, 7.2_
  
  - [ ] 6.2 Test event point changes
    - Update event points and verify user EXP adjusts
    - Test both increase and decrease scenarios
    - Verify level/rank recalculation
    - _Requirements: 7.3_
  
  - [ ] 6.3 Test event deletion EXP adjustment
    - Delete event with registrations
    - Verify users' EXP is reduced
    - Ensure EXP doesn't go below 0
    - _Requirements: 7.4_

- [ ] 7. Add authentication improvements
  - [ ] 7.1 Verify token generation includes isProfileComplete
    - Check generateToken function
    - Ensure flag is in JWT payload
    - Test with both complete and incomplete profiles
    - _Requirements: 4.1, 4.2_
  
  - [ ] 7.2 Improve token expiry handling
    - Add better error messages on expiry
    - Ensure redirect to login works
    - Clear stale tokens from localStorage
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ] 7.3 Fix OAuth callback edge cases
    - Handle users without email from Discord
    - Handle duplicate account linking
    - Improve error messages
    - _Requirements: 4.4_

- [ ] 8. Add loading states and user feedback
  - [ ] 8.1 Add loading spinners to async operations
    - Event registration
    - Profile updates
    - Event creation/updates
    - _Requirements: 2.1, 3.4, 6.1_
  
  - [ ] 8.2 Add success notifications
    - Registration success
    - Profile completion success
    - Event management actions
    - _Requirements: 2.2, 3.4, 6.1_

- [ ] 9. Manual testing and verification
  - [ ] 9.1 Test complete user registration flow
    - Sign up with email/password
    - Sign up with Google OAuth
    - Sign up with Discord OAuth
    - Complete profile for social logins
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 9.2 Test event registration flow
    - Register for upcoming event
    - Try to register twice
    - Register outside registration window
    - Verify EXP updates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1_
  
  - [ ] 9.3 Test admin event management
    - Create event with image
    - Update event details
    - Change event points
    - Delete event
    - Verify all EXP adjustments
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.3_
  
  - [ ] 9.4 Test error scenarios
    - Invalid credentials
    - Expired token
    - Network errors
    - Invalid file uploads
    - Duplicate registrations
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
