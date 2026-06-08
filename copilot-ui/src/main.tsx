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
import {
    RhDashboardPage,
    RhEmployeesPage,
    RhMobilityPage,
    RhProfilePage,
    RhWorkforceArbitrationPage,
    RhChatPage,
    RhAccountsPage,
} from "@/pages/workspace/rh";
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
import ValidationsPage from "@/pages/manager/ValidationsPage";
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
                                                <Navigate to="/workspace/rh/employees" replace />
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
                                        <Route path="copilot" element={<Navigate to="/workspace/rh/chat" replace />} />
                                        <Route path="mobility" element={<RhMobilityPage />} />
                                        <Route path="workforce-arbitration" element={<RhWorkforceArbitrationPage />} />
                                        <Route path="chat" element={<RhChatPage />} />
                                        <Route path="profile" element={<RhProfilePage />} />
                                        <Route path="accounts" element={<RhAccountsPage />} />
                                        <Route path="skills-catalog" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="critical-gaps" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="training-plans" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="org-alerts" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="talent/*" element={<Navigate to="/workspace/rh/employees" replace />} />
                                        <Route path="actions/*" element={<Navigate to="/workspace/rh/manager-requests" replace />} />
                                        <Route path="sessions" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="reports" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="projects" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="projects/*" element={<Navigate to="/workspace/rh/dashboard" replace />} />
                                        <Route path="decision-log" element={<Navigate to="/workspace/rh/dashboard" replace />} />
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
                                        <Route path="validations" element={<ValidationsPage />} />
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
