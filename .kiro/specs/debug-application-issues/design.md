# Design Document

## Overview

This design document outlines the technical approach to fixing critical bugs and issues in the GDGSC event management application. The fixes address missing configurations, broken flows, and error handling issues across both backend and frontend.

## Architecture

The application follows a standard MERN stack architecture:
- **Backend**: Node.js + Express + MongoDB (Mongoose)
- **Frontend**: React with Context API for state management
- **Authentication**: JWT tokens with Passport.js for OAuth
- **File Storage**: Cloudinary for image uploads
- **API Communication**: Axios with interceptors

### Current Issues Map

```
Backend Issues:
├── Missing cloudinary.js config file (CRITICAL)
├── Event registration endpoint works but frontend doesn't call it properly
├── Profile completion logic has edge cases
└── Error handling is inconsistent

Frontend Issues:
├── EventCard navigation goes to non-existent route
├── Registration flow is incomplete
├── Profile completion redirect logic has bugs
└── API error handling could be improved
```

## Components and Interfaces

### 1. Cloudinary Configuration Module

**File**: `backend/src/config/cloudinary.js`

**Purpose**: Configure Cloudinary SDK and provide multer middleware for file uploads

**Interface**:
```javascript
module.exports = {
  cloudinary: CloudinaryInstance,
  upload: MulterMiddleware
}
```

**Design Decisions**:
- Use multer-storage-cloudinary for direct uploads
- Configure folder structure: `event-images/`
- Set file size limits and allowed formats
- Use environment variables for credentials

### 2. Event Registration Frontend Flow

**Files**: 
- `frontend/src/Components/Cards/EventCard.js`
- `frontend/src/Pages/EventsPage.js`

**Current Issue**: EventCard navigates to `/events/${event.eventId}` which doesn't exist

**Solution Design**:
- Option A: Create a modal-based registration within EventsPage
- Option B: Add registration functionality to expanded card view
- **Chosen**: Option B (simpler, uses existing modal pattern)

**Flow**:
```
User clicks "Register Now" 
→ Check if user is authenticated
→ If not: redirect to login
→ If yes: Call POST /api/registrations/:eventId
→ Show success/error message
→ Update user context with new EXP
→ Refresh registrations list
```

### 3. Profile Completion Flow Fix

**Files**:
- `frontend/src/contexts/AuthContext.js`
- `frontend/src/Pages/CompleteProfilePage.js`
- `backend/src/models/User.js`

**Current Issue**: isProfileComplete logic has edge cases where users get stuck

**Solution Design**:
- Ensure User model pre-save hook correctly calculates isProfileComplete
- Fix AuthContext to properly check isProfileComplete from API response
- Add better redirect logic in CompleteProfilePage
- Handle social login users who need to set username

**Logic Flow**:
```
User logs in
→ Backend returns user object with isProfileComplete flag
→ Frontend AuthContext stores this flag
→ Protected routes check isProfileComplete
→ If false: redirect to /complete-profile
→ If true: allow access
```

### 4. Event Card Registration Integration

**Component**: `EventCard.js`

**Design Changes**:
- Add `onRegister` callback prop
- Pass user authentication status from parent
- Show loading state during registration
- Display success/error messages
- Disable button after successful registration

**State Management**:
```javascript
const [isRegistering, setIsRegistering] = useState(false);
const [registrationStatus, setRegistrationStatus] = useState(null);
const [userRegistrations, setUserRegistrations] = useState([]);
```

### 5. Admin Event Management Fixes

**Files**:
- `backend/src/controllers/eventController.js`
- `frontend/src/Pages/AdminPage.js`

**Issues**:
- Image upload requires cloudinary config
- Date validation could be improved
- EXP adjustment logic is correct but needs testing

**Design Improvements**:
- Add better date validation on frontend before submission
- Show image preview before upload
- Add confirmation dialogs for destructive actions
- Improve error messages for validation failures

### 6. Authentication Token Improvements

**Files**:
- `backend/src/utils/generateToken.js`
- `frontend/src/services/api.js`
- `frontend/src/contexts/AuthContext.js`

**Current State**: Token generation and validation work but could be more robust

**Improvements**:
- Ensure isProfileComplete is always included in token payload
- Add token refresh mechanism (future enhancement)
- Improve error messages when token expires
- Handle edge cases in OAuth callback

## Data Models

### User Model Updates

No schema changes needed, but pre-save hook logic needs verification:

```javascript
// Ensure this logic is correct
const REQUIRED_PROFILE_FIELDS = [
  'username', 'college', 'graduationYear', 
  'course', 'enrollmentNumber', 'phoneNumber', 'branch'
];

// Check all fields are present and non-empty
const isProfileFullyComplete = REQUIRED_PROFILE_FIELDS.every(field => {
  const value = this[field];
  return value !== null && value !== undefined && value !== '';
});
```

### Event Model

Current model is correct. No changes needed.

### Registration Model

Current model is correct. No changes needed.

## Error Handling

### Backend Error Handling Strategy

1. **Validation Errors**: Return 400 with specific field errors
2. **Authentication Errors**: Return 401 with clear message
3. **Authorization Errors**: Return 403 with role information
4. **Not Found Errors**: Return 404 with resource type
5. **Server Errors**: Return 500 with generic message (log details)

### Frontend Error Handling Strategy

1. **API Interceptor**: Catch 401 and redirect to login
2. **Component Level**: Display error messages in UI
3. **Form Validation**: Client-side validation before submission
4. **Loading States**: Show spinners during async operations

## Testing Strategy

### Manual Testing Checklist

1. **Cloudinary Integration**
   - Create event with image
   - Update event with new image
   - Verify image appears on frontend

2. **Event Registration**
   - Register for event as regular user
   - Verify EXP increases
   - Check registration appears in profile
   - Try to register twice (should fail)

3. **Profile Completion**
   - Sign up with Google (no username)
   - Complete profile with all fields
   - Verify redirect to profile page
   - Check isProfileComplete is true

4. **Admin Functions**
   - Create event with all fields
   - Update event points
   - Verify user EXP adjusts
   - Delete event
   - Verify registrations removed

5. **Authentication**
   - Login with email/password
   - Login with Google
   - Login with Discord
   - Verify token persists across page refreshes
   - Wait for token expiry and verify redirect

### Edge Cases to Test

1. User tries to register for event outside registration window
2. User tries to access profile without completing it
3. Admin changes event points after users registered
4. Admin deletes event with registrations
5. User's EXP would go negative (should cap at 0)
6. Duplicate username/email/enrollment number
7. Invalid image file upload
8. Network errors during API calls

## Implementation Priority

### Phase 1: Critical Fixes (Blocks functionality)
1. Create cloudinary.js configuration file
2. Fix EventCard registration navigation
3. Fix profile completion redirect logic

### Phase 2: Important Fixes (Improves UX)
4. Add registration modal/flow to EventCard
5. Improve error messages throughout
6. Add loading states

### Phase 3: Enhancements (Polish)
7. Add confirmation dialogs
8. Improve date validation
9. Add success notifications
10. Enhance error handling

## Security Considerations

1. **File Uploads**: Validate file types and sizes
2. **JWT Tokens**: Use secure secret, appropriate expiry
3. **API Endpoints**: Ensure proper authentication/authorization
4. **Input Validation**: Sanitize all user inputs
5. **Error Messages**: Don't leak sensitive information

## Performance Considerations

1. **Image Optimization**: Use Cloudinary transformations
2. **API Calls**: Minimize unnecessary requests
3. **State Management**: Avoid unnecessary re-renders
4. **Database Queries**: Use proper indexes
5. **Caching**: Consider caching event list

## Deployment Notes

1. Ensure all environment variables are set:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
   - JWT_SECRET
   - MONGO_URI
   - Google/Discord OAuth credentials

2. Test OAuth callbacks with production URLs

3. Verify CORS settings for production domain

4. Check that all required npm packages are in package.json
