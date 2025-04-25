import { handleProfile } from "./profile";
// In the future you can import other handlers too: handleFriends, handleMessages, etc.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      // Routing logic
      if (pathname === "/profile") {
        return handleProfile(request);
      }

      // Future endpoints could go here
      // if (pathname === "/friends") return handleFriends(request);
      // if (pathname === "/messages") return handleMessages(request);

      // 404 Not Found if no route matches
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
