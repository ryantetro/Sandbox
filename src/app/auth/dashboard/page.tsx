// src/app/auth/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { FaProjectDiagram, FaTimes } from "react-icons/fa";
import { Bell, Calendar, ChevronDown, ChevronUp, FileText, Home, LogOut, Menu, MessageSquare, Settings, User, X, FolderKanban, Kanban, Hammer, MapPin, Users, Plus, Save } from "lucide-react";
import Link from "next/link";
import "../styles/dashboard.css";

// Extend the Session type to include companyName and role
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      companyName?: string;
      role?: string;
    };
  }
}

interface Task {
  id: number;
  text: string;
  completed: boolean;
  dueDate?: string;
  priority?: "low" | "medium" | "high";
}

interface Subcontractor {
  id: string;
  name: string;
  phone: string;
  projects: string[];
  role?: string;
  status: string;
}

interface Project {
  id: string;
  name: string;
  jobSiteAddress: string;
  subcontractorIds: string[];
}

interface Schedule {
  id: string;
  projectId: string;
  subcontractorId: string;
  date: string;
  time: string;
  confirmed: boolean;
}

export default function Dashboard() {
  interface ExtendedUser {
    companyName?: string;
    role?: string;
  }

  const { data: session, status } = useSession() as { data: Session & { user: ExtendedUser }; status: "loading" | "authenticated" | "unauthenticated" };
  const router = useRouter();

  const initialTasks: Task[] = [
    { id: 1, text: "Complete project report", completed: false, dueDate: "2025-03-25", priority: "high" },
    { id: 2, text: "Call the client", completed: true, dueDate: "2025-03-18", priority: "medium" },
    { id: 3, text: "Review marketing strategy", completed: false, dueDate: "2025-03-22", priority: "medium" },
    { id: 4, text: "Update website content", completed: false, dueDate: "2025-03-28", priority: "low" },
  ];

  const [selectedProject, setSelectedProject] = useState("");
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("medium");
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [notifications, setNotifications] = useState<{ id: number; message: string; read: boolean }[]>([
    { id: 1, message: "New comment on your project", read: false },
    { id: 2, message: "Meeting scheduled for tomorrow", read: false },
  ]);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    jobSiteAddress: "",
    subcontractorIds: [] as string[],
  });

  // Handle redirect on client-side only
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  // Fetch data on component mount
    useEffect(() => {
      const fetchData = async () => {
        try {
          const [subcontractorsRes, projectsRes, schedulesRes] = await Promise.all([
            fetch("/api/subcontractors"),
            fetch("/api/projects"),
            fetch("/api/schedules"),
          ]);
  
          const errors: string[] = [];
          if (!subcontractorsRes.ok) {
            const errorText = await subcontractorsRes.text();
            errors.push(`Subcontractors API failed: ${subcontractorsRes.status} ${subcontractorsRes.statusText} - ${errorText}`);
          }
          if (!projectsRes.ok) {
            const errorText = await projectsRes.text();
            errors.push(`Projects API failed: ${projectsRes.status} ${projectsRes.statusText} - ${errorText}`);
          }
          if (!schedulesRes.ok) {
            const errorText = await schedulesRes.text();
            errors.push(`Schedules API failed: ${schedulesRes.status} ${schedulesRes.statusText} - ${errorText}`);
          }
  
          if (errors.length > 0) {
            console.error("API Errors:", errors);
            throw new Error(errors.join("\n"));
          }
  
          const subcontractorsData = await subcontractorsRes.json();
          const projectsData = await projectsRes.json();
          const schedulesData = await schedulesRes.json();
  
          setSubcontractors(subcontractorsData);
          setProjects(projectsData);
          setSchedules(schedulesData);
        } catch (error) {
          console.error("Error fetching data:", error);
          setError(error instanceof Error ? error.message : "Failed to load data. Please try again later.");
        }
      };
  
      fetchData();
    }, []);

  // Show a loading state while session is being fetched
  if (status === "loading") {
    return <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "#64748b" }}>Loading...</div>;
  }

  // If there's no session, return null (the redirect will happen via useEffect)
  if (!session) {
    return null;
  }

  // Handle adding a new task
  const handleAddTask = () => {
    if (newTask.trim() === "") {
      setError("Task description cannot be empty.");
      return;
    }

    setTasks([
      ...tasks,
      {
        id: tasks.length + 1,
        text: newTask,
        completed: false,
        dueDate: newTaskDueDate || undefined,
        priority: newTaskPriority,
      },
    ]);
    setNewTask("");
    setNewTaskDueDate("");
    setError(null);
  };

  // Handle task completion toggle
  const handleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map((task) =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  // Handle logout
  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/home" });
  };

  // Mark notification as read
  const markNotificationAsRead = (id: number) => {
    setNotifications(notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!newProject.name.trim() || !newProject.jobSiteAddress.trim()) {
      setError("Project name and address are required.");
      return;
    }
  
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProject.name,
          jobSiteAddress: newProject.jobSiteAddress,
          subcontractorIds: newProject.subcontractorIds,
          userId: session?.user?.id, // Include the userId from the session
        }),
        credentials: "include", // Include cookies for authentication
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create project: ${response.status} ${response.statusText} - ${errorText}`);
      }
  
      const createdProject = await response.json();
      setProjects([...projects, createdProject]); // Add the new project to the state
      setNewProject({ name: "", jobSiteAddress: "", subcontractorIds: [] }); // Reset the form
      setIsAddProjectModalOpen(false); // Close the modal
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project. Please try again.");
    }
  };

  // Get priority color class (now handled in CSS)
  const getPriorityClass = (priority?: "low" | "medium" | "high") => {
    return priority ? `task-priority ${priority}` : "task-priority";
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // Function to determine if a task is overdue
  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  // Get tasks count by status
  const completedTasks = tasks.filter((task) => task.completed).length;
  const pendingTasks = tasks.filter((task) => !task.completed).length;
  const overdueTasks = tasks.filter((task) => !task.completed && isOverdue(task.dueDate)).length;

  // Calculate progress percentage for the progress bar
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  return (
    <div className="dashboard-container">
      {/* Mobile sidebar toggle */}
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">
            {session?.user?.companyName || "Company"} Dashboard
          </h1>
          <p className="sidebar-role">
            {session?.user?.role || "User"}
          </p>
        </div>

        <nav className="sidebar-nav">
          <ul style={{ listStyleType: "none" }}>
            <li>
              <button
                onClick={() => setActiveSection("dashboard")}
                className={activeSection === "dashboard" ? "active" : ""}
              >
                <Home className="sidebar-icon" />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setActiveSection("messaging");
                  router.push("/auth/dashboard/messaging");
                }}
                className={activeSection === "messaging" ? "active" : ""}
              >
                <MessageSquare className="sidebar-icon" />
                <span>Messaging</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("projects")}
                className={activeSection === "projects" ? "active" : ""}
              >
                <FolderKanban />
                <span>Projects</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("tasks")}
                className={activeSection === "tasks" ? "active" : ""}
              >
                <FileText className="sidebar-icon" />
                <span>Tasks</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("calendar")}
                className={activeSection === "calendar" ? "active" : ""}
              >
                <Calendar className="sidebar-icon" />
                <span>Calendar</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("profile")}
                className={activeSection === "profile" ? "active" : ""}
              >
                <User className="sidebar-icon" />
                <span>Profile</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("settings")}
                className={activeSection === "settings" ? "active" : ""}
              >
                <Settings className="sidebar-icon" />
                <span>Settings</span>
              </button>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="logout-button"
          >
            <LogOut className="sidebar-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <header className="header">
          <div className="header-content">
            <div>
              {/* Add Welcome Message */}
              {activeSection === "dashboard" && (
                <p className="welcome-message">
                  Welcome back, {session?.user?.email || "User"}!
                </p>
              )}
              <h2 className="header-title">
                {activeSection === "dashboard" && "Dashboard Overview"}
                {activeSection === "messaging" && "Messaging"}
                {activeSection === "tasks" && "Task Management"}
                {activeSection === "calendar" && "Calendar"}
                {activeSection === "profile" && "Your Profile"}
                {activeSection === "settings" && "Settings"}
                {activeSection === "projects" && "Projects"}
              </h2>
            </div>

            <div className="header-right">
              <div className="relative">
                <button className="notification-button">
                  <Bell className="sidebar-icon" />
                  {unreadNotificationsCount > 0 && (
                    <span className="notification-badge">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="user-info">
                <div className="user-avatar">
                  {session?.user?.name?.charAt(0) || "U"}
                </div>
                <span className="user-name">
                  {session?.user?.name || session?.user?.email}
                </span>
                <ChevronDown className="sidebar-icon" />
              </div>
            </div>
          </div>
        </header>

        <main className="main-section">
          {/* Dashboard Overview Section */}
          {activeSection === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="stats-grid">
                <div className="card">
                  <h3 className="card-title">Total Tasks</h3>
                  <p className="card-value">{tasks.length}</p>
                  <div className="card-details">
                    <span className="completed">{completedTasks} completed</span>
                    <span className="separator">|</span>
                    <span className="pending">{pendingTasks} pending</span>
                  </div>
                  {/* Add Progress Bar */}
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title">Overdue Tasks</h3>
                  <p className="card-value overdue">{overdueTasks}</p>
                  <div className="card-details">
                    <span className="message">
                      {overdueTasks > 0 ? "Requires immediate attention" : "You're on track!"}
                    </span>
                  </div>
                </div>

                <div className="card">
                  <h3 className="card-title">Notifications</h3>
                  <p className="card-value">{notifications.length}</p>
                  <div className="card-details">
                    <span className="unread">{unreadNotificationsCount} unread</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Recent Tasks</h3>
                </div>
                <div className="section-content">
                  <ul className="task-list">
                    {tasks.slice(0, 3).map((task) => (
                      <li key={task.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleTaskCompletion(task.id)}
                          />
                          {/* Add Priority Dot */}
                          {task.priority && (
                            <span className={`priority-dot ${task.priority}`}></span>
                          )}
                          <span className={`task-text ${task.completed ? "completed" : ""}`}>
                            {task.text}
                          </span>
                          {task.priority && (
                            <span className={getPriorityClass(task.priority)}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.dueDate && (
                          <span className={`task-due-date ${isOverdue(task.dueDate) && !task.completed ? "overdue" : ""}`}>
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  {tasks.length > 3 && (
                    <button
                      onClick={() => setActiveSection("tasks")}
                      className="view-all-button"
                    >
                      View all tasks
                    </button>
                  )}
                </div>
              </div>

              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Recent Notifications</h3>
                </div>
                <div className="section-content">
                  <ul className="task-list">
                    {notifications.slice(0, 3).map((notification) => (
                      <li key={notification.id} className="notification-item">
                        <div className={`notification-text ${notification.read ? "read" : ""}`}>
                          {notification.message}
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="mark-as-read"
                          >
                            Mark as read
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Projects Section */}
          {activeSection === "projects" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Project List Card */}
              <div className="section add-project-form">
                <div className="section-header">
                  <h3 className="add-task-title">Projects</h3>
                  <button
                    className="add-task-button"
                    onClick={() => setIsAddProjectModalOpen(true)}
                  >
                    Add Project
                  </button>
                </div>
                <div className="projects-list">
                  {projects.length === 0 ? (
                    <div className="no-projects">
                      No projects found. Create a project to get started.
                    </div>
                  ) : (
                    <ul className="project-list-items">
                      {projects.map((project) => (
                        <li key={project.id}>
                          <div
                            className={`project-list-item ${
                              selectedProject === project.id ? "selected" : ""
                            }`}
                            onClick={() =>
                              setSelectedProject(
                                selectedProject === project.id ? "" : project.id
                              )
                            }
                          >
                            <div className="project-list-item-content">
                              <div className="project-name">
                                <Hammer
                                  size={16}
                                  style={{ marginRight: "8px", color: "#3b82f6" }}
                                />
                                {project.name}
                              </div>
                              <div className="project-address">
                                <MapPin
                                  size={16}
                                  style={{ marginRight: "8px", color: "#64748b" }}
                                />
                                {project.jobSiteAddress}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Project Details Card (only shown when a project is selected) */}
              {selectedProject && (
                <div className="section">
                  <div className="task-list-header">
                    <h3 className="task-list-title">Project Details</h3>
                  </div>
                  <div className="task-list-content">
                    {(() => {
                      const project = projects.find((p) => p.id === selectedProject);
                      if (!project) return <div>Project not found.</div>;

                      const projectSubcontractors = subcontractors.filter((sub) =>
                        project.subcontractorIds.includes(sub.id)
                      );
                      const projectSchedules = schedules.filter(
                        (schedule) => schedule.projectId === project.id
                      );

                      return (
                        <div className="project-details-content">
                          <div className="project-details-section">
                            <h4>
                              <Hammer
                                size={16}
                                style={{ marginRight: "8px", color: "#3b82f6" }}
                              />
                              {project.name}
                            </h4>
                            <p>
                              <MapPin
                                size={16}
                                style={{ marginRight: "8px", color: "#64748b" }}
                              />
                              {project.jobSiteAddress}
                            </p>
                          </div>

                          <div className="project-details-section">
                            <h4>Subcontractors</h4>
                            {projectSubcontractors.length === 0 ? (
                              <p>No subcontractors assigned.</p>
                            ) : (
                              <ul className="subcontractor-list">
                                {projectSubcontractors.map((sub) => (
                                  <li key={sub.id}>
                                    <Users
                                      size={16}
                                      style={{ marginRight: "8px", color: "#64748b" }}
                                    />
                                    <strong>{sub.name}</strong> - {sub.role || "N/A"} (
                                    {sub.phone})
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="project-details-section">
                            <h4>Schedules</h4>
                            {projectSchedules.length === 0 ? (
                              <p>No schedules set.</p>
                            ) : (
                              <ul className="schedule-list">
                                {projectSchedules.map((schedule) => {
                                  const sub = subcontractors.find(
                                    (s) => s.id === schedule.subcontractorId
                                  );
                                  return (
                                    <li key={schedule.id}>
                                      <Calendar
                                        size={16}
                                        style={{ marginRight: "8px", color: "#64748b" }}
                                      />
                                      <strong>{sub?.name || "Unknown"}:</strong>{" "}
                                      {new Date(schedule.date).toLocaleDateString()} at{" "}
                                      {schedule.time} -{" "}
                                      {schedule.confirmed ? "Confirmed" : "Pending"}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Add Project Modal */}
              {isAddProjectModalOpen && (
                <div className="add-project-modal">
                  <div className="add-project-modal-content">
                    <div className="add-project-modal-header">
                      <h3>Add New Project</h3>
                      <button
                        onClick={() => setIsAddProjectModalOpen(false)}
                        className="close-modal-button"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={handleAddProject} className="add-project-form">
                      <div className="form-group">
                        <label htmlFor="project-name">Project Name</label>
                        <input
                          type="text"
                          id="project-name"
                          value={newProject.name}
                          onChange={(e) =>
                            setNewProject({ ...newProject, name: e.target.value })
                          }
                          placeholder="Enter project name"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="job-site-address">Job Site Address</label>
                        <input
                          type="text"
                          id="job-site-address"
                          value={newProject.jobSiteAddress}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              jobSiteAddress: e.target.value,
                            })
                          }
                          placeholder="Enter job site address"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="subcontractors">Subcontractors</label>
                        <select
                          id="subcontractors"
                          multiple
                          value={newProject.subcontractorIds}
                          onChange={(e) =>
                            setNewProject({
                              ...newProject,
                              subcontractorIds: Array.from(
                                e.target.selectedOptions,
                                (option) => option.value
                              ),
                            })
                          }
                        >
                          {subcontractors.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} ({sub.role || "N/A"})
                            </option>
                          ))}
                        </select>
                        <small>Hold Ctrl (or Cmd on Mac) to select multiple subcontractors.</small>
                      </div>

                      {error && <p className="error-message">{error}</p>}

                      <div className="add-project-modal-footer">
                        <button
                          type="button"
                          onClick={() => setIsAddProjectModalOpen(false)}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="save-project-button">
                          <Save size={16} style={{ marginRight: "8px" }} />
                          Save Project
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tasks Section */}
          {activeSection === "tasks" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="section add-task-form">
                <h3 className="add-task-title">Add New Task</h3>

                <div className="add-task-grid">
                  <div>
                    <input
                      type="text"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="What needs to be done?"
                      className="add-task-input"
                    />
                  </div>

                  <div>
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="add-task-input"
                    />
                  </div>
                </div>

                <div className="add-task-footer">
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <label className="priority-label">
                      <span>Priority:</span>
                      <select
                        value={newTaskPriority}
                        onChange={(e) =>
                          setNewTaskPriority(e.target.value as "low" | "medium" | "high")
                        }
                        className="priority-select"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>

                  <button
                    onClick={handleAddTask}
                    className="add-task-button"
                  >
                    Add Task
                  </button>
                </div>

                {error && <p className="error-message">{error}</p>}
              </div>

              <div className="section">
                <div className="task-list-header">
                  <h3 className="task-list-title">Task List</h3>
                  <div className="task-list-stats">
                    {completedTasks} of {tasks.length} completed
                  </div>
                </div>

                <div className="task-list-content">
                  <ul className="task-list">
                    {tasks.map((task) => (
                      <li key={task.id} className="task-item">
                        <div className="task-item-details">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => handleTaskCompletion(task.id)}
                          />
                          <span className={`task-text ${task.completed ? "completed" : ""}`}>
                            {task.text}
                          </span>
                          {task.priority && (
                            <span className={`task-priority-tag ${task.priority}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>

                        <div className="task-actions">
                          {task.dueDate && (
                            <span className={`task-due-date ${isOverdue(task.dueDate) && !task.completed ? "overdue" : ""}`}>
                              {isOverdue(task.dueDate) && !task.completed ? "Overdue: " : "Due: "}
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="delete-button"
                          >
                            <X className="sidebar-icon" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {tasks.length === 0 && (
                    <div className="no-tasks">
                      No tasks yet. Add a task to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Calendar Section - Placeholder */}
          {activeSection === "calendar" && (
            <div className="section calendar-placeholder">
              <h3 className="calendar-title">Calendar</h3>
              <p className="calendar-message">Calendar view would be implemented here.</p>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="section profile-card">
                <div className="profile-header"></div>
                <div className="profile-content">
                  <div className="profile-info">
                    <div className="profile-avatar">
                      {session?.user?.name?.charAt(0) ||
                        session?.user?.email?.charAt(0) ||
                        "U"}
                    </div>
                    <div className="profile-details">
                      <h2 className="profile-name">{session?.user?.name || "User"}</h2>
                      <p className="profile-role">
                        {session?.user?.role || "Team Member"} at{" "}
                        {session?.user?.companyName || "Company"}
                      </p>
                    </div>
                  </div>

                  <div className="profile-grid">
                    <div>
                      <h3 className="profile-section-title">Account Information</h3>
                      <div className="profile-section-content">
                        <div>
                          <label className="profile-label">Email</label>
                          <div className="profile-value">
                            {session?.user?.email || "email@example.com"}
                          </div>
                        </div>
                        <div>
                          <label className="profile-label">Company</label>
                          <div className="profile-value">
                            {session?.user?.companyName || "Company Name"}
                          </div>
                        </div>
                        <div>
                          <label className="profile-label">Role</label>
                          <div className="profile-value">
                            {session?.user?.role || "Team Member"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="profile-section-title">Account Statistics</h3>
                      <div className="profile-section-content">
                        <div>
                          <label className="profile-label">Total Tasks</label>
                          <div className="profile-value">{tasks.length}</div>
                        </div>
                        <div>
                          <label className="profile-label">Completed Tasks</label>
                          <div className="profile-value">
                            {completedTasks} (
                            {Math.round((completedTasks / tasks.length) * 100) || 0}%)
                          </div>
                        </div>
                        <div>
                          <label className="profile-label">Account Status</label>
                          <div className="profile-status">Active</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Section */}
          {activeSection === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="section settings-section">
                <div className="settings-header">
                  <h3 className="settings-title">Account Settings</h3>
                </div>

                <div className="settings-content">
                  <div className="settings-subsection">
                    <h4 className="settings-subsection-title">Notification Preferences</h4>
                    <div className="settings-subsection">
                      <label className="settings-option">
                        <input type="checkbox" defaultChecked />
                        <span>Email notifications</span>
                      </label>
                      <label className="settings-option">
                        <input type="checkbox" defaultChecked />
                        <span>Task reminders</span>
                      </label>
                      <label className="settings-option">
                        <input type="checkbox" defaultChecked />
                        <span>System updates</span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-subsection">
                    <h4 className="settings-subsection-title">Privacy Settings</h4>
                    <div className="settings-subsection">
                      <label className="settings-option">
                        <input type="checkbox" defaultChecked />
                        <span>Share task statistics with team</span>
                      </label>
                      <label className="settings-option">
                        <input type="checkbox" />
                        <span>Allow other users to assign me tasks</span>
                      </label>
                    </div>
                  </div>

                  <div className="settings-footer">
                    <button className="save-settings-button">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>

              <div className="section settings-section">
                <div className="settings-header">
                  <h3 className="settings-title danger">Danger Zone</h3>
                </div>

                <div className="settings-content">
                  <p className="danger-message">
                    These actions are permanent and cannot be undone.
                  </p>

                  <div className="danger-actions">
                    <button className="reset-button">
                      Reset account data
                    </button>

                    <button
                      onClick={handleLogout}
                      className="danger-logout-button"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}