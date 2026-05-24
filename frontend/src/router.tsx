import { createBrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ProjectPage } from "./pages/ProjectPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { ProjectListPage } from "./pages/ProjectListPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/projects", element: <ProjectListPage /> },
      { path: "/projects/:projectId", element: <ProjectPage /> },
      { path: "/tickets/:ticketId", element: <TicketDetailPage /> },
      { path: "/", element: <ProjectListPage /> },
    ],
  },
]);
