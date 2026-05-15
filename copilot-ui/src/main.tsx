import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { ThemeProvider } from "@/providers/theme-provider";
import "@/styles/globals.css";
import "@/i18n";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { RhManagerRequestsEntry } from "@/components/routing/rh-manager-requests-entry";
import {
    LegacyDecisionLogRedirect,
    LegacyProfileRedirect,
    LegacyProjectDetailRedirect,
    LegacyProjectsListRedirect,
    ManagerWorkspaceProjectDetailRedirect,
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
import { HttpErrorToaster } from "@/providers/http-error-toaster";
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
import RhMobilityPage from "@/pages/workspace/rh/rh-mobility-page";
import RhOrgAlertsPage from "@/pages/workspace/rh/rh-org-alerts-page";
import DashboardPage from "@/pages/manager/DashboardPage";
import ProjectsPageManager from "@/pages/manager/ProjectsPage";
import TeamPage from "@/pages/manager/TeamPage";
import TalentRequestsPage from "@/pages/manager/TalentRequestsPage";
import TalentDetailPage from "@/pages/manager/TalentDetailPage";
import RisksPage from "@/pages/manager/RisksPage";
import ReportsPage from "@/pages/manager/ReportsPage";
import ManagerDecisionLogPage from "@/pages/manager/DecisionLogPage";
import ManagerProfilePage from "@/pages/manager/ProfilePage";
import NotificationsPage from "@/pages/manager/NotificationsPage";
import HelperChatPage from "@/pages/manager/HelperChatPage";
import ManagerRhRequestsPage from "@/pages/workspace/manager/manager-rh-requests-page";
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
                        <HttpErrorToaster />
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
                                        path="/workspace/rh/manager-requests"
                                        element={
                                            <ProtectedRoute roles={["manager", "rh"]}>
                                                <RhManagerRequestsEntry />
                                            </ProtectedRoute>
                                        }
                                    />

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
                                            <ProtectedRoute roles={["manager", "rh"]}>
                                                <ManagerWorkspaceLayout />
                                            </ProtectedRoute>
                                        }
                                    >
                                        <Route index element={<Navigate to="dashboard" replace />} />
                                        <Route path="dashboard" element={<DashboardPage />} />
                                        <Route path="projects" element={<ProjectsPageManager />} />
                                        <Route path="project" element={<Navigate to="/workspace/manager/projects" replace />} />
                                        <Route path="projects/:projectId" element={<ManagerWorkspaceProjectDetailRedirect />} />
                                        <Route path="team" element={<TeamPage />} />
                                        <Route path="team/:talentId" element={<TalentDetailPage />} />
                                        <Route path="talent-requests" element={<TalentRequestsPage />} />
                                        <Route path="rh-requests" element={<ManagerRhRequestsPage />} />
                                        <Route path="risks" element={<RisksPage />} />
                                        <Route path="recommendations" element={<Navigate to="/workspace/manager/dashboard" replace />} />
                                        <Route path="what-if" element={<Navigate to="/workspace/manager/projects" replace />} />
                                        <Route path="reports" element={<ReportsPage />} />
                                        <Route path="decision-log" element={<ManagerDecisionLogPage />} />
                                        <Route path="notifications" element={<NotificationsPage />} />
                                        <Route path="helper" element={<HelperChatPage />} />
                                        <Route path="profile" element={<ManagerProfilePage />} />
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
