"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useRouter } from "next/navigation";
import { Bell, Calendar, ChevronDown, FileText, Home, LogOut, Menu, Settings, User, X } from "lucide-react";
import "../styles/dashboard.css";

// Extend the Session type to include companyName and role
declare module "next-auth" {
  interface Session {
    user: {
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

  // Handle redirect on client-side only
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

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
    signOut({ callbackUrl: "/auth/login" });
  };

  // Mark notification as read
  const markNotificationAsRead = (id: number) => {
    setNotifications(notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification
    ));
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
          <ul>
            <li>
              <button
                onClick={() => setActiveSection("dashboard")}
                className={activeSection === "dashboard" ? "active" : ""}
              >
                <Home />
                <span>Dashboard</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("tasks")}
                className={activeSection === "tasks" ? "active" : ""}
              >
                <FileText />
                <span>Tasks</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("calendar")}
                className={activeSection === "calendar" ? "active" : ""}
              >
                <Calendar />
                <span>Calendar</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("profile")}
                className={activeSection === "profile" ? "active" : ""}
              >
                <User />
                <span>Profile</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveSection("settings")}
                className={activeSection === "settings" ? "active" : ""}
              >
                <Settings />
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
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <header className="header">
          <div className="header-content">
            <div>
              <h2 className="header-title">
                {activeSection === "dashboard" && "Dashboard Overview"}
                {activeSection === "tasks" && "Task Management"}
                {activeSection === "calendar" && "Calendar"}
                {activeSection === "profile" && "Your Profile"}
                {activeSection === "settings" && "Settings"}
              </h2>
            </div>

            <div className="header-right">
              <div className="relative">
                <button className="notification-button">
                  <Bell />
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
                <ChevronDown />
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
                            <X size={16} />
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