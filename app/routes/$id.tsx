import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/cloudflare";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { readTodoForm, requireListId } from "~/todo-request.server";
import {
  TodoListFullError,
  TodoManager,
  TodoNotFoundError,
} from "~/to-do-manager";

const MAX_TEXT_LENGTH = 1000;

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const todoManager = new TodoManager(
    context.cloudflare.env.TO_DO_LIST,
    requireListId(params.id),
  );
  const todos = await todoManager.list();
  return json({ todos });
};

export async function action({ request, context, params }: ActionFunctionArgs) {
  const todoManager = new TodoManager(
    context.cloudflare.env.TO_DO_LIST,
    requireListId(params.id),
  );
  const formData = await readTodoForm(request);
  const intent = formData.get("intent");

  switch (intent) {
    case "create": {
      const text = formData.get("text");
      if (typeof text !== "string" || !text || text.length > MAX_TEXT_LENGTH) {
        return json(
          { error: `Enter a todo of up to ${MAX_TEXT_LENGTH} characters.` },
          { status: 400 },
        );
      }
      try {
        await todoManager.create(text);
      } catch (error) {
        if (!(error instanceof TodoListFullError)) throw error;
        return json({ error: "Todo list is full" }, { status: 409 });
      }
      return json({ success: true });
    }

    case "toggle":
    case "delete": {
      const id = formData.get("id");
      if (typeof id !== "string" || !id) {
        return json({ error: "Invalid todo ID" }, { status: 400 });
      }
      if (intent === "delete") {
        await todoManager.delete(id);
      } else {
        try {
          await todoManager.toggle(id);
        } catch (error) {
          if (!(error instanceof TodoNotFoundError)) throw error;
          return json({ error: "Todo not found" }, { status: 404 });
        }
      }
      return json({ success: true });
    }

    default:
      return json({ error: "Invalid intent" }, { status: 400 });
  }
}

export default function () {
  const { todos } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
          Todo List
        </h1>

        <Form method="post" className="mb-8 flex gap-2">
          <input
            type="text"
            name="text"
            maxLength={MAX_TEXT_LENGTH}
            className="flex-1 rounded-lg border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-sm px-4 py-2"
            placeholder="Add a new todo..."
          />
          <button
            type="submit"
            name="intent"
            value="create"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            Add
          </button>
        </Form>

        {actionData && "error" in actionData && (
          <p role="alert" className="mb-4 text-sm text-red-700 dark:text-red-400">
            {actionData.error}
          </p>
        )}

        <ul className="space-y-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
            >
              <Form method="post" className="flex-1 flex items-center gap-2">
                <input type="hidden" name="id" value={todo.id} />
                <button
                  type="submit"
                  name="intent"
                  value="toggle"
                  className="text-gray-500 hover:text-blue-500"
                >
                  <span
                    className={
                      todo.completed ? "line-through text-gray-400" : ""
                    }
                  >
                    {todo.text}
                  </span>
                </button>
              </Form>

              <Form method="post">
                <input type="hidden" name="id" value={todo.id} />
                <button
                  type="submit"
                  name="intent"
                  value="delete"
                  className="text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </Form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
