import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";
import "@/i18n";

import { ProtectedRoute } from "@/components/auth/protected-route";
import AppLayout from "@/layouts/app-layout";
import HomeScreen from "@/pages/home-screen";
import { NotFound } from "@/pages/not-found";
import { ProjectDetailsPage } from "@/pages/project-details-page";
import { DecisionLogPage } from "@/pages/decision-log-page";
import { ProjectsPage } from "@/pages/projects-page";
import { UsersPage } from "@/pages/users-page";
import ProfilePage from "@/pages/profile-page";
import AccountSettingsPage from "@/pages/account-settings-page";
import ProjectShowcasePage from "@/pages/project-showcase-page";
import LoginPage from "@/pages/login-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import PendingApprovalPage from "@/pages/pending-approval-page";
import { AuthProvider } from "@/providers/auth-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { AuthRouteSync } from "@/components/auth/auth-route-sync";
import { RhTalentWorkspaceLayout, RhTalentOverviewTab, RhTalentProfilesTab, RhTalentGapsTab, RhTalentStaffingTab } from "@/pages/workspace/rh-talent-workspace";
import RhAccountsWorkspacePage from "@/pages/workspace/rh-accounts-workspace-page";
import RhReportsWorkspacePage from "@/pages/workspace/rh-reports-workspace-page";
import RhSessionsWorkspacePage from "@/pages/workspace/rh-sessions-workspace-page";
import { ManagerProjectsWorkspacePage, ManagerMonitoringWorkspacePage } from "@/pages/workspace/manager-workspace-pages";
import { TalentMissionsWorkspacePage, TalentTrainingWorkspacePage } from "@/pages/workspace/talent-workspace-pages";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <BrowserRouter>
          <AuthRouteSync />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<HomeScreen />} />
              <Route path="/portfolio" element={<Navigate to="/" replace />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/project/:id" element={<ProjectDetailsPage />} />
              <Route path="/decision-log" element={<DecisionLogPage />} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={["rh"]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/account-settings" element={<AccountSettingsPage />} />
              <Route path="/projet" element={<ProjectShowcasePage />} />
              <Route path="/workspace/rh/talent" element={<ProtectedRoute roles={["rh"]}><RhTalentWorkspaceLayout /></ProtectedRoute>}>
                <Route index element={<RhTalentOverviewTab />} />
                <Route path="profiles" element={<RhTalentProfilesTab />} />
                <Route path="gaps" element={<RhTalentGapsTab />} />
                <Route path="staffing" element={<RhTalentStaffingTab />} />
              </Route>
              <Route path="/workspace/rh/accounts" element={<ProtectedRoute roles={["rh"]}><RhAccountsWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/rh/sessions" element={<ProtectedRoute roles={["rh"]}><RhSessionsWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/rh/reports" element={<ProtectedRoute roles={["rh"]}><RhReportsWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/manager/projects" element={<ProtectedRoute roles={["manager"]}><ManagerProjectsWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/manager/monitoring" element={<ProtectedRoute roles={["manager"]}><ManagerMonitoringWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/talent/missions" element={<ProtectedRoute roles={["talent"]}><TalentMissionsWorkspacePage /></ProtectedRoute>} />
              <Route path="/workspace/talent/training" element={<ProtectedRoute roles={["talent"]}><TalentTrainingWorkspacePage /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
