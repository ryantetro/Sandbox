"use client"; // Ensures this component runs only on the client-side

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Example Task Data (for demo purposes)
const initialTasks = [
  { id: 1, text: "Complete project report", completed: false },
  { id: 2, text: "Call the client", completed: true },
];

export default function Dashboard() {
  const { data: session } = useSession(); // Get session data
  const [tasks, setTasks] = useState(initialTasks);
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Redirect to login if no session is available
  useEffect(() => {
    if (!session) {
      router.push("/auth/login");
    }
  }, [session]);

  // Handle adding a new task
  const handleAddTask = () => {
    if (newTask.trim() === "") {
      setError("Task description cannot be empty.");
      return;
    }

    setTasks([...tasks, { id: tasks.length + 1, text: newTask, completed: false }]);
    setNewTask(""); // Clear the input field
    setError(null);  // Reset any previous error
  };

  // Handle task completion toggle
  const handleTaskCompletion = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  // Handle deleting a task
  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  // Handle logout
  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h3 className="sidebar-title">Dashboard</h3>
        <ul className="sidebar-nav">
          <li><a href="#profile" className="sidebar-link">Profile</a></li>
          <li><a href="#tasks" className="sidebar-link">Tasks</a></li>
          <li><a href="#settings" className="sidebar-link">Settings</a></li>
        </ul>
      </div>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>Welcome, {session?.user?.companyName}!</h1>
        </header>

        {/* Profile Section */}
        <section id="profile" className="profile-section">
          <h2>Your Profile</h2>
          <div className="profile-info">
            <p><strong>Email:</strong> {session?.user?.email}</p>
            <p><strong>Company:</strong> {session?.user?.companyName}</p>
            <p><strong>Role:</strong> {session?.user?.role}</p>
          </div>
        </section>

        {/* Task Management Section */}
        <section id="tasks" className="task-section">
          <h2>Your Tasks</h2>
          <div className="task-input">
            <input 
              type="text" 
              value={newTask} 
              onChange={(e) => setNewTask(e.target.value)} 
              placeholder="Add a new task"
              className="task-input-field"
            />
            <button onClick={handleAddTask} className="task-add-button">Add Task</button>
          </div>
          {error && <p className="error-message">{error}</p>}

          <div className="task-list">
            {tasks.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? "completed" : ""}`}>
                <input 
                  type="checkbox" 
                  checked={task.completed} 
                  onChange={() => handleTaskCompletion(task.id)} 
                  className="task-checkbox"
                />
                <span className="task-text">{task.text}</span>
                <button className="delete-task" onClick={() => handleDeleteTask(task.id)}>Delete</button>
              </div>
            ))}
          </div>
        </section>

        {/* Settings Section */}
        <section id="settings" className="settings-section">
          <h2>Settings</h2>
          <button onClick={handleLogout} className="logout-button">Logout</button>
        </section>
      </div>
    </div>
  );
}
