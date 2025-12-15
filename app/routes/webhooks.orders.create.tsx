import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    throw new Response();
  }

  console.log(`Received ${topic} webhook for ${shop}`);
  console.log("Order payload:", JSON.stringify(payload, null, 2));

  // Process the order webhook here
  // You can forward it to Hookdeck or handle it as needed

  return new Response();
};
