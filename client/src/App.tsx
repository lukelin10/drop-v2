/**
 * Main Application Entry Point
 * 
 * This file defines the overall structure of the React application, including:
 * - Route configuration and navigation
 * - Authentication protection
 * - Global providers for state and UI
 * - Code splitting through lazy loading
 */

import { Suspense, lazy } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Layout } from "@/components/Layout";
import { AppProvider } from "@/context/AppContext";
import { AuthRequired } from "@/components/AuthRequired";

/**
 * Lazy load page components for better performance
 * This improves initial load time by splitting the bundle and loading pages on demand
 */
const DailyDrop = lazy(() => import("@/pages/DailyDrop"));   // Daily journal prompt page
const Chat = lazy(() => import("@/pages/Chat"));             // Conversation with AI coach
const LatestChat = lazy(() => import("@/pages/LatestChat")); // Redirects to most recent chat
const Feed = lazy(() => import("@/pages/Feed"));             // Journal entries feed/history
const Analysis = lazy(() => import("@/pages/Analysis"));     // Insights and trends
const AnalysisDetail = lazy(() => import("@/pages/AnalysisDetail")); // Individual analysis view
const Settings = lazy(() => import("@/pages/Settings"));     // User preferences
const Login = lazy(() => import("@/pages/Login"));          // Authentication page

/**
 * Protected Routes Component
 * 
 * Contains all routes that require authentication
 * Uses the common Layout component for consistent UI structure
 * Shows a loading screen while lazy-loaded components are being fetched
 */
function ProtectedRoutes() {
  return (
    <Layout>
      <Suspense fallback={<LoadingScreen />}>
        <Switch>
          <Route path="/" component={DailyDrop} />              {/* Home page with daily question */}
          <Route path="/chat/latest" component={LatestChat} />   {/* Redirects to latest conversation */}
          <Route path="/chat/:id" component={Chat} />           {/* Specific conversation by ID */}
          <Route path="/feed" component={Feed} />               {/* History of journal entries */}
          <Route path="/analysis/:id" component={AnalysisDetail} /> {/* Individual analysis view */}
          <Route path="/analysis" component={Analysis} />       {/* Insights and trends */}
          <Route path="/settings" component={Settings} />       {/* User settings */}
          <Route component={NotFound} />                       {/* 404 page for unmatched routes */}
        </Switch>
      </Suspense>
    </Layout>
  );
}

/**
 * Main Router Component
 * 
 * Defines the top-level routing structure
 * Handles authentication flow by:
 * - Allowing public access to login page
 * - Protecting all other routes with AuthRequired component
 * - Shows a loading screen while components are being loaded
 */
function Router() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Switch>
        <Route path="/login">
          <Login />
        </Route>
        <Route path="*">
          <AuthRequired>
            <ProtectedRoutes />
          </AuthRequired>
        </Route>
      </Switch>
    </Suspense>
  );
}

/**
 * Root App Component
 * 
 * Sets up the global providers and context for the application:
 * - QueryClientProvider: Manages API data fetching and caching
 * - TooltipProvider: Handles tooltip positioning and styling
 * - AppProvider: Manages application-wide state
 * - Toaster: Displays toast notifications
 */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <Toaster />
          <Router />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
