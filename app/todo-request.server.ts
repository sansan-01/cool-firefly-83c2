const MAX_FORM_BYTES = 32 * 1024;

export function requireListId(id: string | undefined): string {
  if (
    !id || id === "." || id === ".." ||
    new TextEncoder().encode(id).byteLength > 512
  ) {
    throw new Response("Not Found", { status: 404 });
  }
  return id;
}

export async function readTodoForm(request: Request): Promise<FormData> {
  if (request.method !== "POST") {
    throw new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  const origin = request.headers.get("Origin");
  if (
    request.headers.get("Sec-Fetch-Site") === "cross-site" ||
    (origin !== null && origin !== new URL(request.url).origin)
  ) {
    throw new Response("Forbidden", { status: 403 });
  }

  const contentType = request.headers.get("Content-Type") ?? "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (
    mediaType !== "application/x-www-form-urlencoded" &&
    mediaType !== "multipart/form-data"
  ) {
    throw new Response("Unsupported Media Type", { status: 415 });
  }
  if (!request.body) {
    throw new Response("Invalid form data", { status: 400 });
  }

  const reader = request.body.getReader();
  const buffer = new Uint8Array(MAX_FORM_BYTES);
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.byteLength > MAX_FORM_BYTES) {
        void reader.cancel().catch(() => {});
        throw new Response("Form data is too large", { status: 413 });
      }
      buffer.set(value, size);
      size += value.byteLength;
    }

    return await new Response(buffer.subarray(0, size), {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response("Invalid form data", { status: 400 });
  } finally {
    reader.releaseLock();
  }
}
