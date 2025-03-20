"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useSession, signOut } from "next-auth/react";
import { Session } from "next-auth";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Calendar, ChevronDown, FileText, Home, LogOut, Menu, MessageSquare, Settings, User, X } from "lucide-react";
import Link from "next/link";
import "../../styles/dashboard.css";

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

// Custom Tabs Component
interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <div className={className}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TabsList) {
            return React.cloneElement(child, { activeTab, setActiveTab } as any);
          }
          if (child.type === TabsContent) {
            return React.cloneElement(child, { activeTab } as any);
          }
        }
        return child;
      })}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

function TabsList({ children, activeTab, setActiveTab }: TabsListProps) {
  return (
    <div className="tabs-list">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TabsTrigger) {
          return React.cloneElement(child, { activeTab, setActiveTab } as any);
        }
        return child;
      })}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
  setActiveTab?: (value: string) => void;
}

function TabsTrigger({ value, children, activeTab, setActiveTab }: TabsTriggerProps) {
  const isActive = activeTab === value;
  return (
    <button
      className={`tabs-trigger ${isActive ? "active" : ""}`}
      onClick={() => setActiveTab && setActiveTab(value)}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  activeTab?: string;
}

function TabsContent({ value, children, activeTab }: TabsContentProps) {
  if (activeTab !== value) return null;
  return <div className="tabs-content">{children}</div>;
}

// Custom Button Component
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button className={`add-task-button ${className || ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

// Custom Input Component
interface InputProps {
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
}

function Input({ placeholder, value, onChange, className }: InputProps) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`add-task-input ${className || ""}`}
    />
  );
}

// Custom Select Component
interface SelectProps {
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
  value?: string;
  options: { value: string; label: string }[];
}

function Select({ children, onValueChange, value, options }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (selectedValue: string) => {
    if (onValueChange) {
      onValueChange(selectedValue);
    }
    setIsOpen(false); // Close the dropdown after selection
  };

  return (
    <div className="custom-select">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === SelectTrigger) {
            return React.cloneElement(child, {
              onToggle: () => setIsOpen(!isOpen),
              isOpen,
              selectedLabel: options.find((opt) => opt.value === value)?.label || "Select a project",
            } as any);
          }
          if (child.type === SelectContent) {
            return React.cloneElement(child, { isOpen, onSelect: handleSelect } as any);
          }
        }
        return child;
      })}
    </div>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  onToggle?: () => void;
  isOpen?: boolean;
  selectedLabel?: string;
}

function SelectTrigger({ children, onToggle, isOpen, selectedLabel }: SelectTriggerProps) {
  return (
    <div className="select-trigger" onClick={onToggle}>
      {selectedLabel || children}
      <ChevronDown className={`select-arrow ${isOpen ? "rotate-180" : ""}`} />
    </div>
  );
}

interface SelectValueProps {
  placeholder: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  return <span className="select-value">{placeholder}</span>;
}

interface SelectContentProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onSelect?: (value: string) => void;
}

function SelectContent({ children, isOpen, onSelect }: SelectContentProps) {
  if (!isOpen) return null;
  return (
    <div className="select-content">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === SelectItem) {
          return React.cloneElement(child, { onSelect } as any);
        }
        return child;
      })}
    </div>
  );
}

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
  onSelect?: (value: string) => void;
}

function SelectItem({ value, children, onSelect }: SelectItemProps) {
  return (
    <div
      className="select-item"
      onClick={() => onSelect && onSelect(value)}
      data-value={value}
    >
      {children}
    </div>
  );
}

// Interfaces for Data
interface Subcontractor {
  id: string; // Updated to string for MongoDB ObjectId
  name: string;
  phone: string;
  projects: string[]; // Updated to string[] for MongoDB ObjectIds
  role?: string;
  status: string;
}

interface Project {
  id: string; // Updated to string for MongoDB ObjectId
  name: string;
  jobSiteAddress: string;
  subcontractorIds: number[];
}

interface Schedule {
  id: string; // Updated to string for MongoDB ObjectId
  projectId: string; // Updated to string for MongoDB ObjectId
  subcontractorId: string; // Updated to string for MongoDB ObjectId
  date: string;
  time: string;
  confirmed: boolean;
}

interface AutomatedMessage {
  id: string; // Updated to string for MongoDB ObjectId
  name: string;
  content: string;
  projectId: string; // Updated to string for MongoDB ObjectId
  deliveryMethod: string;
  trigger: { type: string; offset: string };
  status: string;
  lastSent?: string;
}

interface MessageHistory {
  id: string; // Updated to string for MongoDB ObjectId
  messageId: string; // Updated to string for MongoDB ObjectId
  content: string;
  recipientId: string; // Updated to string for MongoDB ObjectId
  deliveryMethod: string;
  sentAt: string;
  status: string;
}

export default function Messaging() {
  interface ExtendedUser {
    companyName?: string;
    role?: string;
  }

  const { data: session, status } = useSession() as { data: Session & { user: ExtendedUser }; status: "loading" | "authenticated" | "unauthenticated" };
  const router = useRouter();
  const pathname = usePathname();

  const [selectedProject, setSelectedProject] = useState("");
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [messages, setMessages] = useState<AutomatedMessage[]>([]);
  const [messageHistory, setMessageHistory] = useState<MessageHistory[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [newMessage, setNewMessage] = useState({
    name: "",
    content: "You’re scheduled to work on {ProjectName} at {JobSiteAddress} on {Date} at {Time}. Reply YES to confirm.",
    projectId: "",
    deliveryMethod: "SMS",
    trigger: { type: "schedule-based", offset: "-24h" },
    status: "Active",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications] = useState<{ id: number; message: string; read: boolean }[]>([
    { id: 1, message: "New comment on your project", read: false },
    { id: 2, message: "Meeting scheduled for tomorrow", read: false },
  ]);

  // Map projects to options for the Select component
  const projectOptions = projects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subcontractorsRes, projectsRes, schedulesRes, messagesRes, historyRes] = await Promise.all([
          fetch("/api/subcontractors"),
          fetch("/api/projects"),
          fetch("/api/schedules"),
          fetch("/api/messages/automated"),
          fetch("/api/messages/history"),
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
        if (!messagesRes.ok) {
          const errorText = await messagesRes.text();
          errors.push(`Messages API failed: ${messagesRes.status} ${messagesRes.statusText} - ${errorText}`);
        }
        if (!historyRes.ok) {
          const errorText = await historyRes.text();
          errors.push(`History API failed: ${historyRes.status} ${schedulesRes.statusText} - ${errorText}`);
        }

        if (errors.length > 0) {
          console.error("API Errors:", errors);
          throw new Error(errors.join("\n"));
        }

        const subcontractorsData = await subcontractorsRes.json();
        const projectsData = await projectsRes.json();
        const schedulesData = await schedulesRes.json();
        const messagesData = await messagesRes.json();
        const historyData = await historyRes.json();

        console.log("Subcontractors Data:", subcontractorsData);
        console.log("Projects Data:", projectsData);

        setSubcontractors(subcontractorsData);
        setProjects(projectsData);
        setSchedules(schedulesData);
        setMessages(messagesData);
        setMessageHistory(historyData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error instanceof Error ? error.message : "Failed to load data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateMessage = async () => {
    if (!newMessage.name || !newMessage.projectId) {
      alert("Please provide a reminder name and select a project.");
      return;
    }

    try {
      const response = await fetch("/api/messages/automated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newMessage, projectId: newMessage.projectId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create message");
      }

      const message = await response.json();
      setMessages([...messages, message]);
      setNewMessage({
        name: "",
        content: "You’re scheduled to work on {ProjectName} at {JobSiteAddress} on {Date} at {Time}. Reply YES to confirm.",
        projectId: "",
        deliveryMethod: "SMS",
        trigger: { type: "schedule-based", offset: "-24h" },
        status: "Active",
      });
    } catch (error) {
      console.error("Error creating message:", error);
      alert("Failed to create reminder. Please try again.");
    }
  };

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

  // Handle logout
  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

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
              <Link
                href="/auth/dashboard"
                className={pathname === "/auth/dashboard" ? "active" : ""}
              >
                <Home />
                <span>Dashboard</span>
              </Link>
            </li>
            <li>
              <Link
                href="/auth/dashboard/messaging"
                className={pathname === "/auth/dashboard/messaging" ? "active" : ""}
              >
                <MessageSquare />
                <span>Messaging</span>
              </Link>
            </li>
            <li>
              <button
                onClick={() => router.push("/auth/dashboard#tasks")}
                className={pathname.includes("#tasks") ? "active" : ""}
              >
                <FileText />
                <span>Tasks</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/auth/dashboard#calendar")}
                className={pathname.includes("#calendar") ? "active" : ""}
              >
                <Calendar />
                <span>Calendar</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/auth/dashboard#profile")}
                className={pathname.includes("#profile") ? "active" : ""}
              >
                <User />
                <span>Profile</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => router.push("/auth/dashboard#settings")}
                className={pathname.includes("#settings") ? "active" : ""}
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
              <h2 className="header-title">Messaging</h2>
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
          {loading && (
            <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
              Loading...
            </div>
          )}

          {error && (
            <div className="section">
              <div className="section-content">
                <p className="error-message">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <Tabs defaultValue="subcontractors">
                <TabsList>
                  <TabsTrigger value="subcontractors">Subcontractors</TabsTrigger>
                  <TabsTrigger value="reminders">Job Site Reminders</TabsTrigger>
                  <TabsTrigger value="history">Message History</TabsTrigger>
                </TabsList>
                <TabsContent value="subcontractors">
                  <div className="section">
                    <div className="section-header">
                      <h3 className="section-title">Subcontractors</h3>
                    </div>
                    <div className="section-content">
                      <div className="add-task-grid">
                        <div>
                          <Select
                            onValueChange={setSelectedProject}
                            value={selectedProject}
                            options={projectOptions}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {selectedProject ? (
                        (() => {
                          const filteredSubcontractors = subcontractors.filter((sub) => sub.projects.includes(selectedProject));
                          console.log("Selected Project ID:", selectedProject);
                          console.log("Subcontractors (before filter):", subcontractors);
                          console.log("Filtered Subcontractors:", filteredSubcontractors);
                          return filteredSubcontractors.length > 0 ? (
                            <table className="message-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Phone</th>
                                  <th>Role</th>
                                  <th>Schedule</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredSubcontractors.map((sub) => (
                                  <tr key={sub.id}>
                                    <td>{sub.name}</td>
                                    <td>{sub.phone}</td>
                                    <td>{sub.role || "N/A"}</td>
                                    <td>
                                      {schedules
                                        .filter((s) => s.subcontractorId === sub.id)
                                        .map((s) => `${s.date} at ${s.time}`)
                                        .join(", ") || "No schedule"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="no-tasks">No subcontractors found for this project.</p>
                          );
                        })()
                      ) : (
                        <p className="no-tasks">Please select a project to view subcontractors.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="reminders">
                  <div className="section">
                    <div className="section-header">
                      <h3 className="section-title">Job Site Reminders</h3>
                    </div>
                    <div className="section-content">
                      <div className="add-task-form">
                        <h3 className="add-task-title">Create Job Site Reminder</h3>
                        <div className="add-task-grid">
                          <div>
                            <Select
                              onValueChange={(value) => setNewMessage({ ...newMessage, projectId: value })}
                              value={newMessage.projectId}
                              options={projectOptions}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                              <SelectContent>
                                {projects.map((project) => (
                                  <SelectItem key={project.id} value={project.id}>
                                    {project.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="add-task-grid">
                          <div>
                            <Input
                              placeholder="Reminder Name"
                              value={newMessage.name}
                              onChange={(e) =>
                                setNewMessage({ ...newMessage, name: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="add-task-grid">
                          <div>
                            <Input
                              placeholder="Message Content"
                              value={newMessage.content}
                              onChange={(e) =>
                                setNewMessage({ ...newMessage, content: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <div className="add-task-footer">
                          <Button onClick={handleCreateMessage}>
                            Create Reminder
                          </Button>
                        </div>
                      </div>
                      {messages.length > 0 ? (
                        <table className="message-table">
                          <thead>
                            <tr>
                              <th>Project</th>
                              <th>Message</th>
                              <th>Trigger</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {messages.map((msg) => (
                              <tr key={msg.id}>
                                <td>{projects.find((p) => p.id === msg.projectId)?.name || "Unknown"}</td>
                                <td>{msg.content}</td>
                                <td>{msg.trigger.offset} before schedule</td>
                                <td>{msg.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="no-tasks">No reminders created yet.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="history">
                  <div className="section">
                    <div className="section-header">
                      <h3 className="section-title">Message History</h3>
                    </div>
                    <div className="section-content">
                      {messageHistory.length > 0 ? (
                        <table className="message-table">
                          <thead>
                            <tr>
                              <th>Date Sent</th>
                              <th>Message</th>
                              <th>Recipient</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {messageHistory.map((entry) => (
                              <tr key={entry.id}>
                                <td>{new Date(entry.sentAt).toLocaleString()}</td>
                                <td>{entry.content}</td>
                                <td>{subcontractors.find((s) => s.id === entry.recipientId)?.name || "Unknown"}</td>
                                <td>{entry.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="no-tasks">No message history available.</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}