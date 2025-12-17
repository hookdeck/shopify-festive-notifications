import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { publishOrderNotification } from "../helpers/hookdeck-publisher";
import { appendFileSync } from "fs";

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}${data ? "\n" + JSON.stringify(data, null, 2) : ""}\n\n`;
  try {
    appendFileSync("webhook-debug.log", logLine);
  } catch (e) {
    // Ignore
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  log("=== WEBHOOK RECEIVED ===");

  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  log(`Topic: ${topic}, Shop: ${shop}, Has Admin: ${!!admin}`);

  // For test webhooks or offline scenarios, admin might not be available
  // We'll proceed without fetching product images in these cases
  if (!admin) {
    log("No admin available - proceeding without product images");
  }

  log("Starting order notification publication");

  try {
    log("Calling publishOrderNotification...");
    const result = await publishOrderNotification(payload, shop, admin);
    log("Order notification published successfully", result);

    return new Response();
  } catch (error) {
    log("ERROR publishing notification", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Re-throw to trigger Hookdeck retry
    throw error;
  }
};
