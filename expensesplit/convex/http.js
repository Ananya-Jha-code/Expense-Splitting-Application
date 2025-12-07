import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter(); 

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Invalid webhook", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.deleted":
        await ctx.runMutation(internal.users.deleteFromClerk, {
          clerkUserId: event.data.id,
        });
        break;

      default:
        console.log("Ignoring event:", event.type);
    }

    return new Response("OK", { status: 200 });
  }),
});

async function validateRequest(req) {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id"),
    "svix-timestamp": req.headers.get("svix-timestamp"),
    "svix-signature": req.headers.get("svix-signature"),
  };

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
  try {
    return wh.verify(payloadString, svixHeaders);
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return null;
  }
}

export default http; 