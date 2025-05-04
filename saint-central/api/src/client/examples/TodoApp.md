# Todo App Example Using SaintCentral SDK

This example demonstrates how to build a simple Todo application using the SaintCentral SDK.

## App Structure

```
todo-app/
├── index.html
├── styles.css
└── src/
    ├── index.js     # Main entry point
    ├── api.js       # SDK setup and API functions
    ├── auth.js      # Authentication logic
    ├── todoList.js  # Todo list component
    └── todoItem.js  # Todo item component
```

## SDK Setup (api.js)

```javascript
import { SaintCentralClient } from "@saint-central/sdk";

// Create a singleton client instance
class API {
  constructor() {
    this.client = new SaintCentralClient({
      apiUrl: "https://api.example.com",
      debug: process.env.NODE_ENV !== "production",
    });
  }

  // Check if user is authenticated
  isAuthenticated() {
    return this.client.auth.isAuthenticated();
  }

  // Authentication methods
  async login(email, password) {
    try {
      const result = await this.client.auth.login({ email, password });
      return { success: true, user: result.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    await this.client.auth.logout();
  }

  // Todo CRUD operations
  async getTodos(filters = null) {
    try {
      const params = {
        table: "todos",
        columns: ["id", "title", "description", "completed", "due_date", "created_at"],
        order: {
          column: "created_at",
          ascending: false,
        },
      };

      if (filters) {
        params.filter = filters;
      }

      const todos = await this.client.select(params);
      return { success: true, data: todos };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addTodo(todo) {
    try {
      const result = await this.client.insert({
        table: "todos",
        values: {
          ...todo,
          created_at: new Date().toISOString(),
        },
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateTodo(id, updates) {
    try {
      const result = await this.client.update({
        table: "todos",
        values: updates,
        filter: {
          column: "id",
          operator: "eq",
          value: id,
        },
      });

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteTodo(id) {
    try {
      await this.client.delete({
        table: "todos",
        filter: {
          column: "id",
          operator: "eq",
          value: id,
        },
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get statistics
  async getTodoStats() {
    try {
      const total = await this.client.count({
        table: "todos",
      });

      const completed = await this.client.count({
        table: "todos",
        filter: {
          column: "completed",
          operator: "eq",
          value: true,
        },
      });

      const overdue = await this.client.count({
        table: "todos",
        filter: [
          {
            column: "completed",
            operator: "eq",
            value: false,
          },
          {
            column: "due_date",
            operator: "lt",
            value: new Date().toISOString(),
          },
        ],
      });

      return {
        success: true,
        data: {
          total: total.count,
          completed: completed.count,
          active: total.count - completed.count,
          overdue: overdue.count,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Subscribe to real-time updates
  subscribeTodoUpdates(callback) {
    return this.client.subscribe("todos", callback);
  }
}

// Export a singleton instance
export default new API();
```

## Authentication Logic (auth.js)

```javascript
import api from "./api.js";

export async function setupAuth() {
  const loginForm = document.getElementById("login-form");
  const logoutButton = document.getElementById("logout-button");
  const authStatus = document.getElementById("auth-status");

  // Update UI based on authentication status
  function updateAuthUI() {
    const isAuthenticated = api.isAuthenticated();

    document.getElementById("app-container").style.display = isAuthenticated ? "block" : "none";

    document.getElementById("auth-container").style.display = isAuthenticated ? "none" : "block";

    if (isAuthenticated) {
      authStatus.textContent = "Authenticated";
      authStatus.className = "status-authenticated";
    } else {
      authStatus.textContent = "Not authenticated";
      authStatus.className = "status-unauthenticated";
    }
  }

  // Handle login form submission
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const errorElement = document.getElementById("login-error");

    errorElement.textContent = ""; // Clear previous errors

    const result = await api.login(email, password);

    if (result.success) {
      updateAuthUI();
      // Initialize the todo list after successful login
      await initializeTodoList();
    } else {
      errorElement.textContent = result.error || "Login failed";
    }
  });

  // Handle logout
  logoutButton.addEventListener("click", async () => {
    await api.logout();
    updateAuthUI();
  });

  // Initial UI update
  updateAuthUI();
}
```

## Todo List Component (todoList.js)

```javascript
import api from "./api.js";
import { renderTodoItem, setupTodoItemListeners } from "./todoItem.js";

export async function initializeTodoList() {
  const todoList = document.getElementById("todo-list");
  const todoForm = document.getElementById("todo-form");
  const todoFilter = document.getElementById("todo-filter");
  const statsElement = document.getElementById("todo-stats");

  // Load and render todos
  async function loadTodos(filter = null) {
    todoList.innerHTML = '<div class="loading">Loading...</div>';

    const result = await api.getTodos(filter);

    if (result.success) {
      if (result.data.length === 0) {
        todoList.innerHTML = '<div class="empty-state">No todos found</div>';
        return;
      }

      todoList.innerHTML = "";
      result.data.forEach((todo) => {
        const todoElement = renderTodoItem(todo);
        todoList.appendChild(todoElement);
      });

      // Setup event listeners for todo items
      setupTodoItemListeners();
    } else {
      todoList.innerHTML = `<div class="error">Error: ${result.error}</div>`;
    }

    // Update statistics
    updateStats();
  }

  // Update todo statistics
  async function updateStats() {
    const result = await api.getTodoStats();

    if (result.success) {
      const { total, completed, active, overdue } = result.data;

      statsElement.innerHTML = `
        <div>Total: ${total}</div>
        <div>Active: ${active}</div>
        <div>Completed: ${completed}</div>
        <div class="${overdue > 0 ? "overdue" : ""}">Overdue: ${overdue}</div>
      `;
    }
  }

  // Handle form submission to add new todo
  todoForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const titleInput = document.getElementById("todo-title");
    const descriptionInput = document.getElementById("todo-description");
    const dueDateInput = document.getElementById("todo-due-date");

    // Validate input
    if (!titleInput.value.trim()) {
      alert("Title is required");
      return;
    }

    const newTodo = {
      title: titleInput.value.trim(),
      description: descriptionInput.value.trim(),
      due_date: dueDateInput.value || null,
      completed: false,
    };

    const result = await api.addTodo(newTodo);

    if (result.success) {
      // Reset form
      todoForm.reset();

      // Reload todos
      await loadTodos(getActiveFilter());
    } else {
      alert(`Failed to add todo: ${result.error}`);
    }
  });

  // Handle filter changes
  todoFilter.addEventListener("change", () => {
    loadTodos(getActiveFilter());
  });

  // Get current active filter
  function getActiveFilter() {
    const filterValue = todoFilter.value;

    switch (filterValue) {
      case "active":
        return {
          column: "completed",
          operator: "eq",
          value: false,
        };
      case "completed":
        return {
          column: "completed",
          operator: "eq",
          value: true,
        };
      case "overdue":
        return [
          {
            column: "completed",
            operator: "eq",
            value: false,
          },
          {
            column: "due_date",
            operator: "lt",
            value: new Date().toISOString(),
          },
        ];
      default:
        return null; // All todos
    }
  }

  // Set up real-time updates
  const subscription = api.subscribeTodoUpdates(() => {
    // Reload todos when data changes
    loadTodos(getActiveFilter());
  });

  // Initial load
  await loadTodos();

  // Cleanup function (for SPA)
  return function cleanup() {
    subscription.unsubscribe();
  };
}
```

## Todo Item Component (todoItem.js)

```javascript
import api from "./api.js";

// Render a todo item
export function renderTodoItem(todo) {
  const element = document.createElement("div");
  element.className = `todo-item ${todo.completed ? "completed" : ""}`;
  element.dataset.id = todo.id;

  // Check if overdue
  const isOverdue = !todo.completed && todo.due_date && new Date(todo.due_date) < new Date();

  // Format date for display
  const formattedDate = todo.due_date
    ? new Date(todo.due_date).toLocaleDateString()
    : "No due date";

  element.innerHTML = `
    <div class="todo-header">
      <input type="checkbox" class="todo-checkbox" ${todo.completed ? "checked" : ""}>
      <h3 class="todo-title">${todo.title}</h3>
      <div class="todo-actions">
        <button class="edit-btn">Edit</button>
        <button class="delete-btn">Delete</button>
      </div>
    </div>
    <div class="todo-description">${todo.description || ""}</div>
    <div class="todo-footer">
      <span class="todo-date ${isOverdue ? "overdue" : ""}">
        ${isOverdue ? "⚠️ Overdue: " : "Due: "} ${formattedDate}
      </span>
      <span class="todo-created">
        Created: ${new Date(todo.created_at).toLocaleDateString()}
      </span>
    </div>
    <div class="todo-edit-form" style="display: none;">
      <input type="text" class="edit-title" value="${todo.title}">
      <textarea class="edit-description">${todo.description || ""}</textarea>
      <input type="date" class="edit-due-date" value="${todo.due_date ? todo.due_date.split("T")[0] : ""}">
      <div class="edit-actions">
        <button class="save-btn">Save</button>
        <button class="cancel-btn">Cancel</button>
      </div>
    </div>
  `;

  return element;
}

// Set up event listeners for todo items
export function setupTodoItemListeners() {
  // Toggle completion status
  document.querySelectorAll(".todo-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", async (e) => {
      const todoId = e.target.closest(".todo-item").dataset.id;
      const completed = e.target.checked;

      await api.updateTodo(todoId, { completed });

      // Update UI
      e.target.closest(".todo-item").classList.toggle("completed", completed);
    });
  });

  // Delete todo
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const todoItem = e.target.closest(".todo-item");
      const todoId = todoItem.dataset.id;

      if (confirm("Are you sure you want to delete this todo?")) {
        const result = await api.deleteTodo(todoId);

        if (result.success) {
          todoItem.remove();
        } else {
          alert(`Failed to delete: ${result.error}`);
        }
      }
    });
  });

  // Edit todo
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const todoItem = e.target.closest(".todo-item");

      // Hide content and show edit form
      todoItem
        .querySelectorAll(".todo-header, .todo-description, .todo-footer")
        .forEach((el) => (el.style.display = "none"));

      todoItem.querySelector(".todo-edit-form").style.display = "block";
    });
  });

  // Cancel edit
  document.querySelectorAll(".cancel-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const todoItem = e.target.closest(".todo-item");

      // Show content and hide edit form
      todoItem
        .querySelectorAll(".todo-header, .todo-description, .todo-footer")
        .forEach((el) => (el.style.display = ""));

      todoItem.querySelector(".todo-edit-form").style.display = "none";
    });
  });

  // Save edits
  document.querySelectorAll(".save-btn").forEach((button) => {
    button.addEventListener("click", async (e) => {
      const todoItem = e.target.closest(".todo-item");
      const todoId = todoItem.dataset.id;

      const title = todoItem.querySelector(".edit-title").value.trim();
      const description = todoItem.querySelector(".edit-description").value.trim();
      const dueDate = todoItem.querySelector(".edit-due-date").value;

      if (!title) {
        alert("Title is required");
        return;
      }

      const updates = {
        title,
        description,
        due_date: dueDate || null,
      };

      const result = await api.updateTodo(todoId, updates);

      if (result.success) {
        // Update the UI with the edited values
        todoItem.querySelector(".todo-title").textContent = title;
        todoItem.querySelector(".todo-description").textContent = description;

        const formattedDate = dueDate ? new Date(dueDate).toLocaleDateString() : "No due date";

        todoItem.querySelector(".todo-date").textContent = `Due: ${formattedDate}`;

        // Show content and hide edit form
        todoItem
          .querySelectorAll(".todo-header, .todo-description, .todo-footer")
          .forEach((el) => (el.style.display = ""));

        todoItem.querySelector(".todo-edit-form").style.display = "none";
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    });
  });
}
```

## Main Application Entry (index.js)

```javascript
import { setupAuth } from "./auth.js";
import { initializeTodoList } from "./todoList.js";

// Initialize the application
async function initApp() {
  // Setup authentication
  await setupAuth();

  // Initialize todo list if authenticated
  if (document.getElementById("app-container").style.display !== "none") {
    await initializeTodoList();
  }
}

// Start the app when DOM is ready
document.addEventListener("DOMContentLoaded", initApp);
```

## HTML Structure (index.html)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo App with SaintCentral SDK</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <header>
      <h1>Todo App</h1>
      <div id="auth-status" class="status-unauthenticated">Not authenticated</div>
      <button id="logout-button" class="button">Logout</button>
    </header>

    <div id="auth-container">
      <form id="login-form" class="card">
        <h2>Login</h2>
        <div class="form-group">
          <label for="email">Email</label>
          <input type="email" id="email" required />
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" required />
        </div>
        <div id="login-error" class="error-message"></div>
        <button type="submit" class="button primary">Login</button>
      </form>
    </div>

    <div id="app-container" style="display: none;">
      <div class="container">
        <div class="card">
          <h2>Add New Todo</h2>
          <form id="todo-form">
            <div class="form-group">
              <label for="todo-title">Title</label>
              <input type="text" id="todo-title" required />
            </div>
            <div class="form-group">
              <label for="todo-description">Description</label>
              <textarea id="todo-description"></textarea>
            </div>
            <div class="form-group">
              <label for="todo-due-date">Due Date</label>
              <input type="date" id="todo-due-date" />
            </div>
            <button type="submit" class="button primary">Add Todo</button>
          </form>
        </div>

        <div class="card">
          <div class="filter-container">
            <h2>My Todos</h2>
            <select id="todo-filter">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div id="todo-stats" class="stats-container"></div>

          <div id="todo-list" class="todo-list">
            <!-- Todo items will be rendered here -->
          </div>
        </div>
      </div>
    </div>

    <script type="module" src="src/index.js"></script>
  </body>
</html>
```

## CSS Styling (styles.css)

```css
/* Basic styling for the Todo app */
:root {
  --primary-color: #4a6fa5;
  --secondary-color: #166088;
  --danger-color: #e74c3c;
  --success-color: #27ae60;
  --warning-color: #f39c12;
  --text-color: #333;
  --light-gray: #f5f5f5;
  --gray: #ddd;
  --border-radius: 4px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f9f9f9;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1,
h2,
h3 {
  color: var(--secondary-color);
}

.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.card {
  background-color: white;
  border-radius: var(--border-radius);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
}

input,
textarea,
select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--gray);
  border-radius: var(--border-radius);
  font-size: 1rem;
}

.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background-color: var(--light-gray);
  color: var(--text-color);
  cursor: pointer;
  font-size: 1rem;
}

.button.primary {
  background-color: var(--primary-color);
  color: white;
}

.button:hover {
  opacity: 0.9;
}

.error-message {
  color: var(--danger-color);
  margin-bottom: 1rem;
}

.status-authenticated {
  color: var(--success-color);
  font-weight: bold;
}

.status-unauthenticated {
  color: var(--text-color);
}

.filter-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filter-container select {
  width: auto;
}

.stats-container {
  display: flex;
  justify-content: space-between;
  background-color: var(--light-gray);
  padding: 0.5rem;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
}

.overdue {
  color: var(--danger-color);
  font-weight: bold;
}

.todo-list {
  margin-top: 1rem;
}

.todo-item {
  border: 1px solid var(--gray);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-bottom: 1rem;
}

.todo-item.completed {
  background-color: var(--light-gray);
}

.todo-item.completed .todo-title {
  text-decoration: line-through;
}

.todo-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.todo-checkbox {
  width: auto;
  margin-right: 0.5rem;
}

.todo-title {
  flex-grow: 1;
  margin: 0;
}

.todo-actions {
  display: flex;
  gap: 0.5rem;
}

.todo-description {
  margin-bottom: 0.5rem;
  padding-left: 1.5rem;
}

.todo-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #666;
}

.todo-edit-form {
  margin-top: 1rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.loading {
  text-align: center;
  padding: 1rem;
  color: #666;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #666;
  background-color: var(--light-gray);
  border-radius: var(--border-radius);
}

.edit-btn,
.save-btn {
  background-color: var(--primary-color);
  color: white;
}

.delete-btn {
  background-color: var(--danger-color);
  color: white;
}
```

## Using This Example

1. Create a new project with the file structure shown above
2. Install the SaintCentral SDK: `npm install @saint-central/sdk`
3. Copy the code for each file into your project
4. Configure the API URL in `api.js` to point to your SaintCentral API endpoint
5. Build and run the application

This example demonstrates:

- Authentication flow
- CRUD operations with the SaintCentral SDK
- Real-time data subscriptions
- Filter and search functionality
- Error handling
- Responsive UI design
