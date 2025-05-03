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

// Lazy load pages
const DailyDrop = lazy(() => import("@/pages/DailyDrop"));
const Chat = lazy(() => import("@/pages/Chat"));
const LatestChat = lazy(() => import("@/pages/LatestChat"));
const Feed = lazy(() => import("@/pages/Feed"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const Settings = lazy(() => import("@/pages/Settings"));
const Login = lazy(() => import("@/pages/Login"));

function ProtectedRoutes() {
  return (
    <Layout>
      <Suspense fallback={<LoadingScreen />}>
        <Switch>
          <Route path="/" component={DailyDrop} />
          <Route path="/chat/latest" component={LatestChat} />
          <Route path="/chat/:id" component={Chat} />
          <Route path="/feed" component={Feed} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

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
