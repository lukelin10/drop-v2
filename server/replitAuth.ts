/**
 * Replit Authentication Module
 * 
 * This module implements authentication using Replit's OAuth/OpenID Connect service.
 * It handles user login, session management, and token refresh for secure API access.
 * 
 * The implementation uses:
 * - Passport.js for authentication strategy management
 * - Express session for maintaining user sessions
 * - PostgreSQL for storing session data
 * - OpenID Connect for the authentication protocol
 */

import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Verify required environment variables
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

/**
 * Caches and retrieves the OpenID Connect configuration from Replit
 * Uses memoization to prevent excessive network requests (cache for 1 hour)
 */
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      // Use the configured issuer URL or default to Replit's OIDC endpoint
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

/**
 * Configures and returns the session middleware
 * Sets up PostgreSQL session storage using the same database as the application
 * @returns Express session middleware configured for secure usage
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  
  // Set up PostgreSQL session store
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false, // Table should already exist via schema
    tableName: "sessions",
  });
  
  // Configure session middleware
  return session({
    secret: process.env.SESSION_SECRET || "drop-session-secret-dev-only",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true, // Prevents client-side JavaScript from accessing cookies
      secure: true,   // Require HTTPS
      maxAge: sessionTtl,
    },
  });
}

/**
 * Updates the user session with new token information
 * @param user - The user object stored in the session
 * @param tokens - The OAuth/OIDC tokens received from authentication
 */
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  // Store essential token information in the session
  user.claims = tokens.claims();       // User identity claims from token
  user.access_token = tokens.access_token;     // For API access
  user.refresh_token = tokens.refresh_token;   // For token renewal
  user.expires_at = user.claims?.exp;          // Token expiration timestamp
}

/**
 * Creates or updates a user record in the database based on authentication claims
 * @param claims - The identity claims from the authentication token
 */
async function upsertUser(
  claims: any,
) {
  // Map OIDC claims to our user model fields and persist to database
  await storage.upsertUser({
    id: claims["sub"],                       // Subject identifier (unique ID)
    username: claims["username"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    bio: claims["bio"],
    profileImageUrl: claims["profile_image_url"],
  });
}

/**
 * Sets up all authentication routes and middleware for the Express app
 * @param app - The Express application instance
 */
export async function setupAuth(app: Express) {
  // Configure Express for authentication
  app.set("trust proxy", 1);           // Trust first proxy (important for secure cookies)
  app.use(getSession());               // Enable session middleware
  app.use(passport.initialize());      // Initialize Passport
  app.use(passport.session());         // Use session for persistent login

  // Get Replit's OIDC configuration
  const config = await getOidcConfig();

  /**
   * Define the verification function for authentication
   * This is called after successful authentication with the identity provider
   */
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    // Store token information in the user session
    updateUserSession(user, tokens);
    // Create/update the user record in our database
    await upsertUser(tokens.claims());
    // Complete the authentication process
    verified(null, user);
  };

  // Set up authentication strategies for each of our domains
  // This handles multi-domain deployments on Replit
  for (const domain of process.env.REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,        // Unique name for this domain's strategy
        config,                             // OIDC configuration
        scope: "openid email profile offline_access", // Requested permissions
        callbackURL: `https://${domain}/api/callback`, // Where to redirect after auth
      },
      verify,
    );
    passport.use(strategy);
  }

  // Configure Passport session serialization
  // These functions determine what user data is stored in the session
  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  /**
   * Login route - initiates the authentication flow
   */
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",  // Always ask for user consent
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  /**
   * Callback route - handles the response from the identity provider
   * This is where users are redirected after authenticating with Replit
   */
  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/", // Redirect to home page on success
      failureRedirect: "/api/login",  // Redirect back to login on failure
    })(req, res, next);
  });

  /**
   * Logout route - ends the user session and redirects to Replit's logout
   */
  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      // Redirect to Replit's logout endpoint to complete the process
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

/**
 * Authentication middleware for protecting API routes
 * This middleware checks if the user is authenticated and handles token refresh
 * Use this on routes that require authentication
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  // Check if the user is authenticated
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if the token is still valid
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Token is still valid, proceed to the route
    return next();
  }

  // Token has expired, attempt to refresh it
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    // No refresh token available, redirect to login
    return res.redirect("/api/login");
  }

  try {
    // Try to get a new token using the refresh token
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next(); // Proceed to the route with the new token
  } catch (error) {
    // Refresh token failed, redirect to login
    return res.redirect("/api/login");
  }
};