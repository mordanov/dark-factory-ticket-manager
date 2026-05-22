import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { useAuthStore } from "../store/auth";
import { logout } from "../api/auth";

export function ProjectListPage() {
  const navigate = useNavigate();
  const { refreshToken, logout: storeLogout } = useAuthStore();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  async function handleLogout() {
    if (refreshToken) {
      try { await logout(refreshToken); } catch { /* best effort */ }
    }
    storeLogout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={page}>
      <header style={header}>
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Projects</h1>
        <button onClick={handleLogout} style={logoutBtn}>Sign out</button>
      </header>

      <main style={main}>
        {isLoading && <p>Loading projects…</p>}
        {isError && <p style={{ color: "#c0392b" }}>Failed to load projects.</p>}
        {data && data.length === 0 && (
          <p style={{ color: "#888" }}>No projects available.</p>
        )}
        {data && (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {data.map((p) => (
              <li key={p.id} style={projectItem}>
                <Link to={`/projects/${p.id}`} style={projectLink}>
                  <span style={{ fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "#888", marginLeft: "0.5rem" }}>
                    /{p.slug}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#f5f5f5" };
const header: React.CSSProperties = {
  background: "#fff",
  borderBottom: "1px solid #e0e0e0",
  padding: "0.75rem 1.5rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};
const main: React.CSSProperties = { maxWidth: 800, margin: "0 auto", padding: "1.5rem" };
const logoutBtn: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  border: "1px solid #ccc",
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.875rem",
};
const projectItem: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e0e0e0",
  borderRadius: 6,
  marginBottom: "0.5rem",
};
const projectLink: React.CSSProperties = {
  display: "block",
  padding: "0.75rem 1rem",
  color: "#0066cc",
};
