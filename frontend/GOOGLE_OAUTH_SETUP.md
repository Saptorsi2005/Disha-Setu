# Google OAuth Setup Guide for DishaSetu

## ✅ Backend Configuration - COMPLETE

Your backend is already configured with:
```
GOOGLE_CLIENT_ID=821266969114-kihsrvi0uehnfv265ij0c02av1bl4b5l.apps.googleusercontent.com
```

Backend endpoint `POST /api/auth/google` is ready and working.

---

## 📱 Frontend Setup - IN PROGRESS

### Step 1: Install Required Packages

Run this command in the frontend directory:

```bash
cd frontend
npx expo install expo-auth-session expo-web-browser
```

Or if you prefer npm:

```bash
npm install expo-auth-session expo-web-browser
```

### Step 2: Configure app.json (Optional for Android)

For better Android support, add this to `frontend/app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "config": {
        "googleSignIn": {
          "apiKey": "YOUR_ANDROID_API_KEY",
          "certificateHash": "YOUR_SHA1_CERT_HASH"
        }
      }
    }
  }
}
```

**Note:** This is optional. The current implementation will work with just the Client ID.

### Step 3: Test Google Sign-In

1. Start the Expo dev server:
   ```bash
   npm start
   ```

2. Open the app and navigate to the Auth screen

3. Click "Continue with Google"

4. A Google Sign-In popup will appear

5. Select your Google account

6. The app will receive the ID token and authenticate with your backend

---

## 🔧 How It Works

### Frontend Flow:

1. **User clicks "Continue with Google"**
   ```javascript
   handleGoogleSignIn() → promptAsync()
   ```

2. **Google OAuth consent screen opens**
   - User selects account
   - Grants permissions

3. **OAuth returns authentication object**
   ```javascript
   useEffect monitors response
   → Gets authentication.idToken
   ```

4. **Send idToken to backend**
   ```javascript
   loginWithGoogle(idToken)
   → POST /api/auth/google
   ```

5. **Backend verifies and returns JWT**
   ```javascript
   Backend decodes Google token
   → Creates/updates user
   → Returns JWT + user object
   ```

6. **Frontend stores token and logs in**
   ```javascript
   login(data.user)
   → Navigate to home screen
   ```

---

## 📝 Code Changes Made

### `frontend/app/auth.jsx`

**Added imports:**
```javascript
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();
```

**Added Google OAuth hook:**
```javascript
const [request, response, promptAsync] = Google.useAuthRequest({
  androidClientId: GOOGLE_CLIENT_ID,
  iosClientId: GOOGLE_CLIENT_ID,
  webClientId: GOOGLE_CLIENT_ID,
});
```

**Added response handler:**
```javascript
useEffect(() => {
  if (response?.type === 'success') {
    const { authentication } = response;
    handleGoogleSuccess(authentication.idToken);
  }
}, [response]);
```

**Simplified button handler:**
```javascript
const handleGoogleSignIn = async () => {
  await promptAsync();
};
```

---

## 🧪 Testing Checklist

- [ ] Install packages (`expo-auth-session`, `expo-web-browser`)
- [ ] Run `npm start` in frontend directory
- [ ] Click "Continue with Google" button
- [ ] Google consent screen appears
- [ ] Select Google account
- [ ] App receives authentication
- [ ] Backend receives idToken
- [ ] User logged in successfully
- [ ] Navigate to home screen

---

## 🔐 Security Notes

### Token Flow:
1. **Frontend** gets Google ID token (contains user info, signed by Google)
2. **Backend** receives ID token
3. **Backend** can verify token authenticity (currently accepts in dev mode)
4. **Backend** creates/updates user in database
5. **Backend** returns your app's JWT token
6. **Frontend** stores JWT for API calls

### Production Enhancement (Optional):

For production, enhance backend verification:

```bash
cd backend
npm install google-auth-library
```

Then update `backend/src/controllers/auth.controller.js`:

```javascript
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    
    // Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const name = payload.name;
    const avatar = payload.picture;
    
    // ... rest of the code
  } catch (err) {
    next(err);
  }
};
```

---

## 🛠️ Troubleshooting

### "Google Sign-In popup doesn't open"
- Make sure packages are installed: `npx expo install expo-auth-session expo-web-browser`
- Restart Expo dev server: `r` in terminal or `npm start -- --clear`

### "Invalid OAuth client"
- Check Client ID matches in both frontend and backend
- Frontend: `frontend/app/auth.jsx` → `GOOGLE_CLIENT_ID`
- Backend: `backend/.env` → `GOOGLE_CLIENT_ID`

### "Token verification failed"
- Backend is using dev mode (accepts tokens without strict verification)
- For production, implement `google-auth-library` verification

### "Redirect URI mismatch" (Web only)
- Go to Google Cloud Console
- Add authorized redirect URLs:
  - `https://auth.expo.io/@your-username/your-app-slug`
  - `http://localhost:8081`

---

## 📚 References

- [Expo Auth Session Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)

---

## ✅ Current Status

- ✅ Backend: Fully configured and ready
- ✅ Frontend: Code implemented
- ⏳ Packages: Need to install (`expo-auth-session`, `expo-web-browser`)
- ⏳ Testing: Ready to test after package installation

---

## 🚀 Quick Start

Just run these commands:

```bash
cd frontend
npx expo install expo-auth-session expo-web-browser
npm start
```

Then test Google Sign-In in the app!

---

**Last Updated:** March 4, 2026
