import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import XirakoAuth from "./pages/XirakoAuth";
import { queryClientInstance } from "@/lib/query-client";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("XirAI crashed while rendering.", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm rounded-2xl border border-white/10 bg-card/90 p-6 shadow-2xl shadow-black/30">
            <h1 className="font-heading text-lg font-semibold text-foreground">XirAI needs a refresh</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The page hit a temporary display issue. Refreshing will bring the chat back.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, authError } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (authError && authError.type === "user_not_registered") {
    return <UserNotRegisteredError />;
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth/xirako" element={<XirakoAuth />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AppErrorBoundary>
            <AuthenticatedApp />
          </AppErrorBoundary>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
