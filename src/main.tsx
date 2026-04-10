import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";
import "@/i18n";

import { ProtectedRoute } from "@/components/auth/protected-route";
import AppLayout from "@/layouts/app-layout";
import HomeScreen from "@/pages/home-screen";
import { NotFound } from "@/pages/not-found";
import { ProjectDetailsPage } from "@/pages/project-details-page";
import { DecisionLogPage } from "@/pages/decision-log-page";
import { PortfolioPage } from "@/pages/portfolio-page";
import { ProjectsPage } from "@/pages/projects-page";
import { UsersPage } from "@/pages/users-page";
import ProfilePage from "@/pages/profile-page";
import AccountSettingsPage from "@/pages/account-settings-page";
import LoginPage from "@/pages/login-page";
import RegisterPage from "@/pages/register-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import { AuthProvider } from "@/providers/auth-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeScreen />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/project/:id" element={<ProjectDetailsPage />} />
              <Route path="/decision-log" element={<DecisionLogPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/account-settings" element={<AccountSettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
