import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";
import "@/i18n";

import { ProtectedRoute } from "@/components/auth/protected-route";
import {
    LegacyDecisionLogRedirect,
    LegacyProfileRedirect,
    LegacyProjectDetailRedirect,
    LegacyProjectsListRedirect,
    RootWorkspaceRedirect,
} from "@/components/routing/workspace-redirects";
import { NotFound } from "@/pages/not-found";
import { ProjectDetailsPage } from "@/pages/project-details-page";
import { DecisionLogPage } from "@/pages/decision-log-page";
import { ProjectsPage } from "@/pages/projects-page";
import ProfilePage from "@/pages/profile-page";
import LoginPage from "@/pages/login-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import PendingApprovalPage from "@/pages/pending-approval-page";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryClientProviderWrapper } from "@/providers/query-client-provider";
import { ToastProvider } from "@/providers/toast-provider";
import { CrossRoleQuerySync } from "@/providers/cross-role-query-sync";
import { AuthRouteSync } from "@/components/auth/auth-route-sync";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { CopilotProvider } from "@/providers/copilot-provider";
import { WhatIfProvider } from "@/providers/what-if-provider";
import RhAccountsWorkspacePage from "@/pages/workspace/rh-accounts-workspace-page";
import RhReportsWorkspacePage from "@/pages/workspace/rh-reports-workspace-page";
import RhSessionsWorkspacePage from "@/pages/workspace/rh-sessions-workspace-page";
import RhDashboardPage from "@/pages/workspace/rh/rh-dashboard-page";
import RhEmployeesPage from "@/pages/workspace/rh/rh-employees-page";
import RhSkillsCatalogPage from "@/pages/workspace/rh/rh-skills-catalog-page";
import RhCriticalGapsPage from "@/pages/workspace/rh/rh-critical-gaps-page";
import RhTrainingPlansPage from "@/pages/workspace/rh/rh-training-plans-page";
import RhManagerRequestsPage from "@/pages/workspace/rh/rh-manager-requests-page";
import RhMobilityPage from "@/pages/workspace/rh/rh-mobility-page";
import RhOrgAlertsPage from "@/pages/workspace/rh/rh-org-alerts-page";
import { ManagerProjectsWorkspacePage } from "@/pages/workspace/manager-workspace-pages";
import { ManagerDashboardPage } from "@/pages/workspace/manager/manager-dashboard-page";
import { ManagerTeamPage } from "@/pages/workspace/manager/manager-team-page";
import { ManagerRisksPage } from "@/pages/workspace/manager/manager-risks-page";
import { ManagerReportsPage } from "@/pages/workspace/manager/manager-reports-page";
import {
    TalentDashboardPage,
    TalentNotificationsPage,
    TalentProfileWorkspacePage,
    TalentProjectsPage,
    TalentSkillsPage,
    TalentTasksPage,
    TalentTrainingPage,
    TalentWorkloadPage,
} from "@/pages/workspace/talent-workspace-pages";
import RhWorkspaceLayout from "@/layouts/rh-workspace-layout";
import ManagerWorkspaceLayout from "@/layouts/manager-workspace-layout";
import TalentWorkspaceAppLayout from "@/layouts/talent-workspace-app-layout";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <AuthProvider>
                <QueryClientProviderWrapper>
                    <ToastProvider>
                        <BrowserRouter>
                            <AuthRouteSync />
                            <CrossRoleQuerySync />
                            <CopilotProvider>
                                <WhatIfProvider>
                                <Routes>
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/auth/login" element={<Navigate to="/login" replace />} />
                                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                                    <Route path="/pending-approval" element={<PendingApprovalPage />} />

                                    <Route path="/projects" element={<ProtectedRoute><LegacyProjectsListRedirect /></ProtectedRoute>} />
                                    <Route path="/projects/:projectId" element={<ProtectedRoute><LegacyProjectDetailRedirect /></ProtectedRoute>} />
                                    <Route path="/project/:projectId" element={<ProtectedRoute><LegacyProjectDetailRedirect /></ProtectedRoute>} />
                                    <Route path="/decision-log" element={<ProtectedRoute><LegacyDecisionLogRedirect /></ProtectedRoute>} />
                                    <Route path="/profile" element={<ProtectedRoute><LegacyProfileRedirect /></ProtectedRoute>} />
                                    <Route path="/portfolio" element={<Navigate to="/" replace />} />
                                    <Route
                                        path="/users"
                                        element={
                                            <ProtectedRoute roles={["rh"]}>
                                                <Navigate to="/workspace/rh/accounts" replace />
                                            </ProtectedRoute>
                                        }
                                    />

                                    <Route path="/" element={<ProtectedRoute><RootWorkspaceRedirect /></ProtectedRoute>} />

                                    <Route
                                        path="/workspace/rh"
                                        element={
                                            <ProtectedRoute roles={["rh"]}>
                                                <RhWorkspaceLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<Navigate to="dashboard" replace />} />
                                        <Route path="dashboard" element={<RhDashboardPage />} />
                                        <Route path="employees" element={<RhEmployeesPage />} />
                                        <Route path="skills-catalog" element={<RhSkillsCatalogPage />} />
                                        <Route path="critical-gaps" element={<RhCriticalGapsPage />} />
                                        <Route path="training-plans" element={<RhTrainingPlansPage />} />
                                        <Route path="manager-requests" element={<RhManagerRequestsPage />} />
                                        <Route path="mobility" element={<RhMobilityPage />} />
                                        <Route path="org-alerts" element={<RhOrgAlertsPage />} />
                                        <Route path="projects" element={<ProjectsPage />} />
                                        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                                        <Route path="decision-log" element={<DecisionLogPage />} />
                                        <Route path="profile" element={<ProfilePage />} />
                                        <Route path="talent/*" element={<Navigate to="/workspace/rh/employees" replace />} />
                                        <Route path="accounts" element={<RhAccountsWorkspacePage />} />
                                        <Route path="sessions" element={<RhSessionsWorkspacePage />} />
                                        <Route path="reports" element={<RhReportsWorkspacePage />} />
                                        <Route path="actions/*" element={<Navigate to="/workspace/rh/manager-requests" replace />} />
                                    </Route>

                                    <Route
                                        path="/workspace/manager"
                                        element={
                                            <ProtectedRoute roles={["manager"]}>
                                                <ManagerWorkspaceLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<Navigate to="dashboard" replace />} />
                                        <Route path="dashboard" element={<ManagerDashboardPage />} />
                                        <Route path="projects" element={<ManagerProjectsWorkspacePage />} />
                                        <Route path="project" element={<Navigate to="/workspace/manager/projects" replace />} />
                                        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                                        <Route path="team" element={<ManagerTeamPage />} />
                                        <Route path="risks" element={<ManagerRisksPage />} />
                                        <Route path="recommendations" element={<Navigate to="/workspace/manager/dashboard" replace />} />
                                        <Route path="what-if" element={<Navigate to="/workspace/manager/projects" replace />} />
                                        <Route path="reports" element={<ManagerReportsPage />} />
                                        <Route path="decision-log" element={<DecisionLogPage />} />
                                        <Route path="profile" element={<ProfilePage />} />
                                        <Route path="portfolio" element={<Navigate to="/workspace/manager/projects" replace />} />
                                        <Route path="monitoring" element={<Navigate to="/workspace/manager/team" replace />} />
                                    </Route>

                                    <Route
                                        path="/workspace/talent"
                                        element={
                                            <ProtectedRoute roles={["talent"]}>
                                                <TalentWorkspaceAppLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<Navigate to="dashboard" replace />} />
                                        <Route path="dashboard" element={<TalentDashboardPage />} />
                                        <Route path="projects" element={<TalentProjectsPage />} />
                                        <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
                                        <Route path="tasks" element={<TalentTasksPage />} />
                                        <Route path="workload" element={<TalentWorkloadPage />} />
                                        <Route path="skills" element={<TalentSkillsPage />} />
                                        <Route path="trainings" element={<TalentTrainingPage />} />
                                        <Route path="training" element={<Navigate to="/workspace/talent/trainings" replace />} />
                                        <Route path="notifications" element={<TalentNotificationsPage />} />
                                        <Route path="profile" element={<TalentProfileWorkspacePage />} />
                                        <Route path="decision-log" element={<Navigate to="/workspace/talent" replace />} />
                                    </Route>
                                    <Route path="/workspace/talent/missions" element={<Navigate to="/workspace/talent/projects" replace />} />

                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                                <CopilotPanel />
                                </WhatIfProvider>
                            </CopilotProvider>
                        </BrowserRouter>
                    </ToastProvider>
                </QueryClientProviderWrapper>
            </AuthProvider>
        </ThemeProvider>
    </StrictMode>,
);
