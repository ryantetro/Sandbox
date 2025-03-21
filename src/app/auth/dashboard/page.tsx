// src/app/auth/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { FaProjectDiagram, FaTimes } from "react-icons/fa";
import { Bell, Calendar, ChevronDown, ChevronUp, FileText, Home, LogOut, Menu, MessageSquare, Settings, User, X, FolderKanban, Kanban, Hammer, MapPin, Users, Plus, Save, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import Link from "next/link";
import "../styles/dashboard.css";
import { DateTime } from "next-auth/providers/kakao";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";

// Setup date-fns localizer for react-big-calendar
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

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

enum TaskStatus {
  pending = "pending",
  IN_PROGRESS = "in_progress", // Match the schema's TaskStatus enum
  COMPLETED = "completed",
}

enum TaskPriority {
  low = "low",
  medium = "medium",
  high = "high",
}

interface Task {
  id: string;
  description: string;
  status: TaskStatus;
  priority?: TaskPriority;
  startDate?: string; // Updated to string to match API response
  endDate?: string;
  projectId: string;
  subcontractorIds?: string[];
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
  taskIds: string[];
  subcontractorIds?: string[];
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

  const [selectedProject, setSelectedProject] = useState("");
  const [calendarProjectFilter, setCalendarProjectFilter] = useState("all"); // Filter for calendar
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high">("low");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskSubcontractorIds, setNewTaskSubcontractorIds] = useState<string[]>([]);
  const [isAddSubcontractorFormOpen, setIsAddSubcontractorFormOpen] = useState(false);
  const [newSubcontractor, setNewSubcontractor] = useState({
    name: "",
    role: "",
    phone: "",
  });
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
        const [subcontractorsRes, projectsRes, schedulesRes, tasksRes] = await Promise.all([
          fetch("/api/subcontractors"),
          fetch("/api/projects"),
          fetch("/api/schedules"),
          fetch("/api/tasks"),
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
        if (!tasksRes.ok) {
          const errorText = await tasksRes.text();
          errors.push(`Tasks API failed: ${tasksRes.status} ${tasksRes.statusText} - ${errorText}`);
        }

        if (errors.length > 0) {
          console.error("API Errors:", errors);
          throw new Error(errors.join("\n"));
        }

        const subcontractorsData = await subcontractorsRes.json();
        const projectsData = await projectsRes.json();
        const schedulesData = await schedulesRes.json();
        const tasksData = await tasksRes.json();

        setSubcontractors(subcontractorsData);
        setProjects(projectsData);
        setSchedules(schedulesData);
        setTasks(tasksData);
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
  const handleAddTask = async () => {
    if (!newTaskProjectId) {
      setError("Please select a project for the task.");
      return;
    }

    if (!newTask.trim()) {
      setError("Task description is required.");
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: newTask,
          status: "pending",
          priority: newTaskPriority || undefined,
          startDate: newTaskStartDate ? new Date(newTaskStartDate).toISOString() : undefined,
          endDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
          projectId: newTaskProjectId,
          subcontractorIds: newTaskSubcontractorIds,
          userId: session?.user?.id,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create task: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const createdTask = await response.json();
      setTasks([...tasks, createdTask]);
      setNewTask("");
      setNewTaskDueDate("");
      setNewTaskPriority("medium");
      setNewTaskProjectId("");
      setNewTaskStartDate("");
      setNewTaskSubcontractorIds([]);
      setError(null);
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err instanceof Error ? err.message : "Failed to create task. Please try again.");
    }
  };

  // Handle task status update
  const handleTaskStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const updatedTask = await response.json();
      setTasks(tasks.map((t) => (t.id === taskId ? updatedTask : t)));
    } catch (error) {
      console.error("Error updating task:", error);
      setError("Failed to update task. Please try again.");
    }
  };

  // Handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task. Please try again.");
    }
  };

  const handleAddSubcontractor = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSubcontractor.name.trim()) {
      setError("Subcontractor name is required.");
      return;
    }

    try {
      const response = await fetch("/api/subcontractors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newSubcontractor.name,
          role: newSubcontractor.role || undefined,
          phone: newSubcontractor.phone || undefined,
          userId: session?.user?.id,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create subcontractor: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const createdSubcontractor = await response.json();
      setSubcontractors([...subcontractors, createdSubcontractor]);
      setNewTaskSubcontractorIds([...newTaskSubcontractorIds, createdSubcontractor.id]);
      setNewSubcontractor({ name: "", role: "", phone: "" });
      setIsAddSubcontractorFormOpen(false);
      setError(null);
    } catch (err) {
      console.error("Error creating subcontractor:", err);
      setError(err instanceof Error ? err.message : "Failed to create subcontractor. Please try again.");
    }
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
          userId: session?.user?.id,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create project: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const createdProject = await response.json();
      setProjects([...projects, createdProject]);
      setNewProject({ name: "", jobSiteAddress: "", subcontractorIds: [] });
      setIsAddProjectModalOpen(false);
      setError(null);
    } catch (err) {
      console.error("Error creating project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project. Please try again.");
    }
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

  // Get priority color class
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
  const completedTasks = tasks.filter((task) => task.status === "completed").length;
  const pendingTasks = tasks.filter((task) => task.status !== "completed").length;
  const overdueTasks = tasks.filter((task) => task.status !== "completed" && isOverdue(task.endDate)).length;

  const currentTasks = tasks.filter((task) => task.startDate && new Date(task.startDate) <= new Date());
  const upcomingTasks = tasks.filter((task) => task.startDate && new Date(task.startDate) > new Date());
  const needsScheduling = tasks.filter((task) => !task.startDate);

  // Calculate progress percentage for the progress bar
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

  // Calendar Events: Combine tasks and schedules
  const calendarEvents = [
    // Tasks as events
    ...tasks
      .filter((task) => {
        if (calendarProjectFilter === "all") return true;
        return task.projectId === calendarProjectFilter;
      })
      .filter((task) => task.startDate && task.endDate) // Only include tasks with start and end dates
      .map((task) => {
        const start = new Date(task.startDate!);
        const end = new Date(task.endDate!);
        // Ensure dates are valid
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn(`Invalid dates for task ${task.id}:`, task.startDate, task.endDate);
          return null;
        }
        return {
          id: `task-${task.id}`,
          title: `Task: ${task.description} (${projects.find((p) => p.id === task.projectId)?.name || "Unknown"})`,
          start,
          end,
          allDay: false,
          resource: {
            type: "task",
            priority: task.priority,
            status: task.status,
          },
        };
      })
      .filter((event) => event !== null), // Remove invalid events
    // Schedules as events
    ...schedules
      .filter((schedule) => {
        if (calendarProjectFilter === "all") return true;
        return schedule.projectId === calendarProjectFilter;
      })
      .map((schedule) => {
        const subcontractor = subcontractors.find((sub) => sub.id === schedule.subcontractorId);
        const project = projects.find((proj) => proj.id === schedule.projectId);
        const dateTimeStr = `${schedule.date} ${schedule.time}`;
        const eventDate = new Date(dateTimeStr);
        if (isNaN(eventDate.getTime())) {
          console.warn(`Invalid date for schedule ${schedule.id}:`, dateTimeStr);
          return null;
        }
        return {
          id: `schedule-${schedule.id}`,
          title: `Schedule: ${subcontractor?.name || "Unknown"} @ ${project?.name || "Unknown"}`,
          start: eventDate,
          end: eventDate, // Schedules are point-in-time events
          allDay: false,
          resource: {
            type: "schedule",
            confirmed: schedule.confirmed,
          },
        };
      })
      .filter((event) => event !== null), // Remove invalid events
  ];

  // Log events for debugging
  console.log("Calendar Events:", calendarEvents);

  // Analytics for Calendar Section
  const filteredTasks = tasks.filter((task) => {
    if (calendarProjectFilter === "all") return true;
    return task.projectId === calendarProjectFilter;
  });

  const filteredUpcomingTasks = filteredTasks.filter((task) => {
    if (!task.endDate) return false;
    const due = new Date(task.endDate);
    const now = new Date();
    const diff = due.getTime() - now.getTime();
    return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000; // Within 7 days
  }).length;

  const filteredOverdueTasks = filteredTasks.filter((task) => task.status !== "completed" && isOverdue(task.endDate)).length;

  const filteredCompletedTasks = filteredTasks.filter((task) => task.status === "completed").length;
  const completionPercentage = filteredTasks.length > 0 ? (filteredCompletedTasks / filteredTasks.length) * 100 : 0;

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
                <FolderKanban className="sidebar-icon"/>
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
                  <h3 className="section-title">Current Tasks</h3>
                </div>
                <div className="section-content">
                  <ul className="task-list">
                    {currentTasks.slice(0, 3).map((task) => (
                      <li key={task.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value as TaskStatus)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          {task.priority && (
                            <span className={`priority-dot ${task.priority}`}></span>
                          )}
                          <span className={`task-text ${task.status === "completed" ? "completed" : ""}`}>
                            {task.description}
                          </span>
                          {task.priority && (
                            <span className={getPriorityClass(task.priority)}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.endDate && (
                          <span className={`task-due-date ${isOverdue(task.endDate) && task.status !== "completed" ? "overdue" : ""}`}>
                            Due: {new Date(task.endDate).toLocaleDateString()}
                          </span>
                        )}
                        {!task.endDate && (
                          <span className="task-due-date">
                            No Scheduled Due Date
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
                  <h3 className="section-title">Upcoming Tasks</h3>
                </div>
                <div className="section-content">
                  <ul className="task-list">
                    {upcomingTasks.slice(0, 3).map((task) => (
                      <li key={task.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value as TaskStatus)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          {task.priority && (
                            <span className={`priority-dot ${task.priority}`}></span>
                          )}
                          <span className={`task-text ${task.status === "completed" ? "completed" : ""}`}>
                            {task.description}
                          </span>
                          {task.priority && (
                            <span className={getPriorityClass(task.priority)}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.startDate && (
                          <span className={`task-due-date ${isOverdue(task.startDate) && task.status !== "completed" ? "overdue" : ""}`}>
                            Scheduled Start Date: {new Date(task.startDate).toLocaleDateString()}
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
                  <h3 className="section-title">Needs Scheduling</h3>
                </div>
                <div className="section-content">
                  <ul className="task-list">
                    {needsScheduling.slice(0, 3).map((task) => (
                      <li key={task.id} className="task-item">
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value as TaskStatus)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          {task.priority && (
                            <span className={`priority-dot ${task.priority}`}></span>
                          )}
                          <span className={`task-text ${task.status === "completed" ? "completed" : ""}`}>
                            {task.description}
                          </span>
                          {task.priority && (
                            <span className={getPriorityClass(task.priority)}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {!task.startDate && (
                          <span className="task-due-date">
                            No Scheduled Start Date
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

              {selectedProject && (
                <div className="section">
                  <div className="task-list-header">
                    <h3 className="task-list-title">Project Details</h3>
                  </div>
                  <div className="task-list-content">
                    {(() => {
                      const project = projects.find((p) => p.id === selectedProject);
                      if (!project) return <div>Project not found.</div>;

                      const projectTasks = tasks.filter((task) =>
                        project.taskIds.includes(task.id)
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
                            <h4>Tasks</h4>
                            {projectTasks.length === 0 ? (
                              <p>No tasks assigned.</p>
                            ) : (
                              <ul className="subcontractor-list">
                                {projectTasks.map((task) => (
                                  <li key={task.id}>
                                    <FaProjectDiagram
                                      size={16}
                                      style={{ marginRight: "8px", color: "#64748b" }}
                                    />
                                    <strong>{task.description}</strong>
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
                  <div className="form-group">
                    <label htmlFor="task-project">Project</label>
                    <select
                      id="task-project"
                      value={newTaskProjectId}
                      onChange={(e) => setNewTaskProjectId(e.target.value)}
                      className="add-task-input"
                      required
                    >
                      <option value="">Select a project</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-description">Description</label>
                    <input
                      type="text"
                      id="task-description"
                      value={newTask}
                      onChange={(e) => setNewTask(e.target.value)}
                      placeholder="What needs to be done?"
                      className="add-task-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-start-date">Start Date</label>
                    <input
                      type="date"
                      id="task-start-date"
                      value={newTaskStartDate}
                      onChange={(e) => setNewTaskStartDate(e.target.value)}
                      className="add-task-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-due-date">Due Date</label>
                    <input
                      type="date"
                      id="task-due-date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="add-task-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select
                      id="task-priority"
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(e.target.value as "low" | "medium" | "high")
                      }
                      className="add-task-input"
                    >
                      <option value="">None</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-subcontractors">Subcontractors</label>
                    <select
                      id="task-subcontractors"
                      multiple
                      value={newTaskSubcontractorIds}
                      onChange={(e) =>
                        setNewTaskSubcontractorIds(
                          Array.from(e.target.selectedOptions, (option) => option.value)
                        )
                      }
                      className="add-task-input"
                    >
                      {subcontractors.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name} ({sub.role || "N/A"})
                        </option>
                      ))}
                    </select>
                    <small>Hold Ctrl (or Cmd on Mac) to select multiple subcontractors.</small>
                    <button
                      type="button"
                      onClick={() => setIsAddSubcontractorFormOpen(true)}
                      className="add-subcontractor-button"
                    >
                      Add New Subcontractor
                    </button>
                  </div>
                </div>

                {isAddSubcontractorFormOpen && (
                  <div className="add-subcontractor-form">
                    <h4>Add New Subcontractor</h4>
                    <form onSubmit={handleAddSubcontractor}>
                      <div className="form-group">
                        <label htmlFor="subcontractor-name">Name</label>
                        <input
                          type="text"
                          id="subcontractor-name"
                          value={newSubcontractor.name}
                          onChange={(e) =>
                            setNewSubcontractor({ ...newSubcontractor, name: e.target.value })
                          }
                          placeholder="Enter subcontractor name"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="subcontractor-role">Role</label>
                        <input
                          type="text"
                          id="subcontractor-role"
                          value={newSubcontractor.role}
                          onChange={(e) =>
                            setNewSubcontractor({ ...newSubcontractor, role: e.target.value })
                          }
                          placeholder="Enter role (optional)"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="subcontractor-phone">Phone</label>
                        <input
                          type="text"
                          id="subcontractor-phone"
                          value={newSubcontractor.phone}
                          onChange={(e) =>
                            setNewSubcontractor({ ...newSubcontractor, phone: e.target.value })
                          }
                          placeholder="Enter phone number (optional)"
                        />
                      </div>
                      <div className="add-subcontractor-footer">
                        <button
                          type="button"
                          onClick={() => setIsAddSubcontractorFormOpen(false)}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                        <button type="submit" className="save-subcontractor-button">
                          Save Subcontractor
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="add-task-footer">
                  <button onClick={handleAddTask} className="add-task-button">
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
                          <select
                            value={task.status}
                            onChange={(e) => handleTaskStatusUpdate(task.id, e.target.value as TaskStatus)}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <span className={`task-text ${task.status === "completed" ? "completed" : ""}`}>
                            {task.description}
                          </span>
                          {task.priority && (
                            <span className={`task-priority-tag ${task.priority}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>

                        <div className="task-actions">
                          <span className="task-project">
                            {projects.find((p) => p.id === task.projectId)?.name || "Unknown"}
                          </span>
                          {task.endDate && (
                            <span className={`task-due-date ${isOverdue(task.endDate) && task.status !== "completed" ? "overdue" : ""}`}>
                              {isOverdue(task.endDate) && task.status !== "completed" ? "Overdue: " : "Due: "}
                              {new Date(task.endDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="task-subcontractors">
                            Assigned to: {task.subcontractorIds?.length
                              ? task.subcontractorIds.map((id) => subcontractors.find((sub) => sub.id === id)?.name || "Unknown").join(", ")
                              : "None"}
                          </span>
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

          {/* Calendar Section */}
          {activeSection === "calendar" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="section">
                <div className="section-header">
                  <h3 className="section-title">Calendar</h3>
                </div>
                <div className="section-content">
                  {/* Project Filter */}
                  <div className="calendar-filter">
                    <label htmlFor="calendar-project-filter" className="calendar-filter-label">
                      Filter by Project:
                    </label>
                    <select
                      id="calendar-project-filter"
                      value={calendarProjectFilter}
                      onChange={(e) => setCalendarProjectFilter(e.target.value)}
                      className="add-task-input calendar-filter-select"
                    >
                      <option value="all">All Projects</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Calendar */}
                  <BigCalendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    defaultView="month"
                    views={["month", "week", "day"]}
                    style={{ height: 600, marginTop: "1rem" }}
                    eventPropGetter={(event) => ({
                      className: `rbc-event ${
                        event.resource.type === "task"
                          ? (event.resource.priority || "medium") +
                            " " +
                            (event.resource.status === "completed" ? "completed" : "")
                          : event.resource.type === "schedule"
                          ? event.resource.confirmed
                            ? "schedule-confirmed"
                            : "schedule-pending"
                          : ""
                      }`,
                    })}
                    components={{
                      event: (props) => {
                        const { event } = props;
                        return (
                          <div className="rbc-event-content" title={event.title}>
                            {event.title}
                          </div>
                        );
                      },
                    }}
                    onSelectEvent={(event) => {
                      if (event.resource.type === "task") {
                        const taskId = event.id.replace("task-", "");
                        const currentStatus = tasks.find((t) => t.id === taskId)?.status;
                        const newStatus =
                          currentStatus === "completed" ? "in_progress" : "completed";
                        handleTaskStatusUpdate(taskId, newStatus);
                      }
                    }}
                  />

                  {/* Analytics Section */}
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <Clock className="analytics-icon" />
                      <div>
                        <p className="analytics-value">{filteredUpcomingTasks}</p>
                        <p className="analytics-label">Upcoming Tasks (Next 7 Days)</p>
                      </div>
                    </div>
                    <div className="analytics-card">
                      <AlertTriangle className="analytics-icon" />
                      <div>
                        <p className="analytics-value">{filteredOverdueTasks}</p>
                        <p className="analytics-label">Overdue Tasks</p>
                      </div>
                    </div>
                    <div className="analytics-card">
                      <CheckCircle className="analytics-icon" />
                      <div>
                        <p className="analytics-value">{Math.round(completionPercentage)}%</p>
                        <p className="analytics-label">Completion Rate</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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