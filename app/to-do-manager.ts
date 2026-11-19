interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

const MAX_TODOS_PER_LIST = 500;

export class TodoListFullError extends Error {}
export class TodoNotFoundError extends Error {}

function isTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const todo = value as Partial<Todo>;
  return (
    typeof todo.id === "string" &&
    typeof todo.text === "string" &&
    typeof todo.completed === "boolean" &&
    Number.isFinite(todo.createdAt)
  );
}

/**
 * TodoManager handles all interactions with the Todos KV store.
 * This class provides CRUD operations for managing todo items in Cloudflare KV storage.
 *
 * By separating all of the logic for interacting with the KV store from the
 * rest of the Remix application, we can easily test the logic in isolation
 * using [Cloudflare's vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
 */
export class TodoManager {
  /**
   * Creates a new TodoManager instance
   * @param kv - The Cloudflare KV namespace instance to use for storage
   * @param todosKey - The key under which todos will be stored in KV (defaults to "todos")
   */
  constructor(
    private kv: KVNamespace,
    private todosKey: string = "todos",
  ) {}

  /**
   * Retrieves all todos from storage
   * @returns Promise containing an array of Todo items, sorted by creation date (newest first)
   */
  async list(): Promise<Todo[]> {
    const stored = await this.kv.get(this.todosKey, "text");
    if (stored === null) return [];
    const todos: unknown = JSON.parse(stored);
    if (!Array.isArray(todos) || !todos.every(isTodo)) {
      throw new Error("Invalid stored todo list");
    }
    return todos.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Creates a new todo item
   * @param text - The text content of the todo item
   * @returns Promise containing the newly created Todo item
   */
  async create(text: string): Promise<Todo> {
    const todos = await this.list();
    if (todos.length >= MAX_TODOS_PER_LIST) {
      throw new TodoListFullError("Todo list is full");
    }
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    };
    todos.push(newTodo);
    await this.kv.put(this.todosKey, JSON.stringify(todos), {
      expirationTtl: 300,
    });
    return newTodo;
  }

  /**
   * Toggles the completed status of a todo item
   * @param id - The unique identifier of the todo item to toggle
   * @returns Promise containing the updated Todo item
   * @throws Error if the todo item with the specified ID is not found
   */
  async toggle(id: string): Promise<Todo> {
    const todos = await this.list();
    const todoIndex = todos.findIndex((todo) => todo.id === id);
    if (todoIndex === -1) {
      throw new TodoNotFoundError("Todo not found");
    }
    todos[todoIndex].completed = !todos[todoIndex].completed;
    await this.kv.put(this.todosKey, JSON.stringify(todos), {
      expirationTtl: 300,
    });
    return todos[todoIndex];
  }

  /**
   * Deletes a todo item
   * @param id - The unique identifier of the todo item to delete
   * @returns Promise that resolves when the deletion is complete
   */
  async delete(id: string): Promise<void> {
    const todos = await this.list();
    const newTodos = todos.filter((todo) => todo.id !== id);
    if (newTodos.length === todos.length) return;
    await this.kv.put(this.todosKey, JSON.stringify(newTodos), {
      expirationTtl: 300,
    });
  }
}
