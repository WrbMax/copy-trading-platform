import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import HomeRouter from "./pages/HomeRouter";
import LandingPage from "./pages/LandingPage";
import ExchangeApi from "./pages/ExchangeApi";
import Strategy from "./pages/Strategy";
import Orders from "./pages/Orders";

import InviteReward from "./pages/InviteReward";
// Admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSignalSources from "./pages/admin/AdminSignalSources";
import AdminOrders from "./pages/admin/AdminOrders";


function AppRouter() {
  return (
    <Switch>
      {/* Landing */}
      <Route path="/landing" component={LandingPage} />
      {/* Auth */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      {/* User */}
      <Route path="/" component={HomeRouter} />
      <Route path="/exchange-api" component={ExchangeApi} />
      <Route path="/strategy" component={Strategy} />
      <Route path="/orders" component={Orders} />

      <Route path="/invite-reward" component={InviteReward} />
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/signals" component={AdminSignalSources} />
      <Route path="/admin/orders" component={AdminOrders} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Detect base path from the current URL (supports both / and /copy/ deployments)
const BASE_PATH = import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router base={BASE_PATH}>
            <AppRouter />
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
