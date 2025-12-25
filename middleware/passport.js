// passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import AppleStrategy from "passport-apple";
import { User } from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google account does not have an email"), null);

        let user = await User.findOne({ email });
        let isNewUser = false; // 🔥 NEW: Track if user is new

        if (!user) {
          // Create new user with proper initialization
          user = new User({
            name: profile.displayName,
            email,
            googleId: profile.id,
            authType: "google",
            profileImage: profile.photos?.[0]?.value || "",
            role: "user",
            // 🔥 NEW: Initialize arrays for new users
            purchasedSongs: [],
            purchasedAlbums: [],
            likedsong: [],
            preferredGenres: [] // Empty for new users - will be set in genre selection
          });

          await user.save({ validateBeforeSave: false });
          isNewUser = true; // 🔥 NEW: Mark as new user
        }

        // 🔥 NEW: Return user with isNewUser flag
        return done(null, { user, isNewUser });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ["id", "emails", "name", "picture.type(large)"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Facebook account has no email"), null);

        let user = await User.findOne({ email });
        let isNewUser = false; // 🔥 NEW: Track if user is new

        if (!user) {
          // Create new user with proper initialization
          user = new User({
            name: `${profile.name.givenName} ${profile.name.familyName}`,
            email,
            facebookId: profile.id,
            authType: "facebook",
            profileImage: profile.photos?.[0]?.value || "",
            role: "user",
            // 🔥 NEW: Initialize arrays for new users
            purchasedSongs: [],
            purchasedAlbums: [],
            likedsong: [],
            preferredGenres: [] // Empty for new users
          });

          await user.save({ validateBeforeSave: false });
          isNewUser = true; // 🔥 NEW: Mark as new user
        }

        // 🔥 NEW: Return user with isNewUser flag
        return done(null, { user, isNewUser });
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.use(
  new AppleStrategy(
    {
      clientID: process.env.APPLE_CLIENT_ID,
      teamID: process.env.APPLE_TEAM_ID,
      keyID: process.env.APPLE_KEY_ID,
      privateKey: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      callbackURL: process.env.APPLE_CALLBACK_URL,
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, idToken, profile, done) => {
      try {
        const email = idToken.email;
        const name = `${idToken.firstName || "Apple"} ${idToken.lastName || "User"}`;

        let user = await User.findOne({ email });
        let isNewUser = false; // 🔥 NEW: Track if user is new

        if (!user) {
          // Create new user with proper initialization
          user = new User({
            name,
            email,
            appleId: idToken.sub,
            password: null,
            authType: "apple",
            profileImage: "",
            role: "user",
            // 🔥 NEW: Initialize arrays for new users
            purchasedSongs: [],
            purchasedAlbums: [],
            likedsong: [],
            preferredGenres: [] // Empty for new users
          });
          
          await user.save({ validateBeforeSave: false });
          isNewUser = true; // 🔥 NEW: Mark as new user
        }

        // 🔥 NEW: Return user with isNewUser flag
        return done(null, { user, isNewUser });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// 🔥 NEW: Serialize and deserialize user for session
passport.serializeUser((data, done) => {
  // data contains { user, isNewUser }
  done(null, data);
});

passport.deserializeUser(async (data, done) => {
  try {
    // If data is just user ID (from other login methods)
    if (typeof data === 'string') {
      const user = await User.findById(data);
      return done(null, user);
    }
    
    // If data contains user object and isNewUser flag
    if (data.user) {
      const user = await User.findById(data.user._id);
      return done(null, { user, isNewUser: data.isNewUser });
    }
    
    return done(null, data);
  } catch (error) {
    return done(error, null);
  }
});

export default passport;

