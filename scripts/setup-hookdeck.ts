#!/usr/bin/env node

/**
 * Hookdeck Connection Setup Script
 * This script creates a Hookdeck connection for Shopify webhooks and updates shopify.app.toml
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync } from "fs";
import { createInterface } from "readline";
import * as TOML from "@iarna/toml";

// Load environment variables from .env file
config();

// Configuration
const CONFIG = {
  connectionName: "shopify-orders-create",
  sourceName: "shopify-webhooks",
  destinationPath: "/webhooks/orders/create",
  shopifyConfig: "shopify.app.toml",
  hookdeckApiUrl: "https://api.hookdeck.com/2025-07-01",
};

// Get Shopify API secret (client secret) from environment for webhook verification
function getShopifyApiSecret(): string {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    printError("SHOPIFY_API_SECRET environment variable is not set");
    console.log("");
    console.log("This is required for webhook signature verification.");
    console.log("This should be your Shopify application's client secret.");
    console.log("Set it in your .env file or environment:");
    console.log("  export SHOPIFY_API_SECRET=your_shopify_client_secret");
    process.exit(1);
  }
  return secret;
}

// Color codes for output
const colors = {
  red: "\x1b[0;31m",
  green: "\x1b[0;32m",
  yellow: "\x1b[1;33m",
  blue: "\x1b[0;34m",
  reset: "\x1b[0m",
};

// Types
interface HookdeckSource {
  id: string;
  name: string;
  url: string;
}

interface HookdeckDestination {
  id: string;
  name: string;
  cli_path?: string;
}

interface HookdeckConnection {
  id: string;
  name: string;
  source: HookdeckSource;
  destination: HookdeckDestination;
}

// Helper functions
function printSuccess(message: string): void {
  console.log(`${colors.green}✓ ${message}${colors.reset}`);
}

function printError(message: string): void {
  console.log(`${colors.red}✗ ${message}${colors.reset}`);
}

function printWarning(message: string): void {
  console.log(`${colors.yellow}⚠ ${message}${colors.reset}`);
}

function printInfo(message: string): void {
  console.log(`${colors.blue}ℹ ${message}${colors.reset}`);
}

// Validate prerequisites
function validatePrerequisites(): {
  apiKey: string;
  shopifySecret: string;
  ablyApiKey: string;
} {
  printInfo("Validating prerequisites...");

  // Check if HOOKDECK_API_KEY is set
  const apiKey = process.env.HOOKDECK_API_KEY;
  if (!apiKey) {
    printError("HOOKDECK_API_KEY environment variable is not set");
    console.log("");
    console.log("To set your API key:");
    console.log(
      "  1. Get your API key from https://dashboard.hookdeck.com/settings/project/api-keys",
    );
    console.log("  2. Set it in your environment:");
    console.log("     export HOOKDECK_API_KEY=your_api_key_here");
    console.log("");
    process.exit(1);
  }
  printSuccess("HOOKDECK_API_KEY is set");

  // Check if SHOPIFY_API_SECRET is set
  const shopifySecret = getShopifyApiSecret();
  printSuccess("SHOPIFY_API_SECRET is set");

  // Check if ABLY_API_KEY is set
  const ablyApiKey = process.env.ABLY_API_KEY;
  if (!ablyApiKey) {
    printError("ABLY_API_KEY environment variable is not set");
    console.log("");
    console.log("This is required for forwarding events to Ably.");
    console.log("The API key should be in format: appId.keyId:keySecret");
    console.log("Set it in your .env file or environment:");
    console.log("  export ABLY_API_KEY=your_ably_api_key");
    console.log("");
    process.exit(1);
  }
  printSuccess("ABLY_API_KEY is set");

  // Check if shopify.app.toml exists
  try {
    readFileSync(CONFIG.shopifyConfig, "utf-8");
    printSuccess(`${CONFIG.shopifyConfig} found`);
  } catch {
    printError(`${CONFIG.shopifyConfig} not found`);
    process.exit(1);
  }

  console.log("");
  return { apiKey, shopifySecret, ablyApiKey };
}

// Create or update Hookdeck connection using API
async function createHookdeckConnection(
  apiKey: string,
  shopifySecret: string,
): Promise<string> {
  printInfo("Creating Hookdeck connection...");
  console.log("");

  try {
    // Create/update connection using PUT /connections
    const response = await fetch(`${CONFIG.hookdeckApiUrl}/connections`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: CONFIG.connectionName,
        source: {
          name: CONFIG.sourceName,
          type: "SHOPIFY",
          config: {
            auth: {
              webhook_secret_key: shopifySecret,
            },
          },
        },
        destination: {
          name: `${CONFIG.connectionName}-cli`,
          type: "CLI",
          config: {
            path: CONFIG.destinationPath,
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const connection: HookdeckConnection = await response.json();

    printSuccess(
      `Hookdeck connection created/updated: ${CONFIG.connectionName}`,
    );
    console.log("");

    // Get the source URL
    const sourceUrl = connection.source.url;

    if (!sourceUrl) {
      printError("Failed to get Hookdeck source URL from API response");
      console.log("");
      console.log(
        "Please check your connection at https://dashboard.hookdeck.com/connections",
      );
      process.exit(1);
    }

    return sourceUrl;
  } catch (error) {
    printError("Failed to create Hookdeck connection");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Create Ably forwarding connection using Publish API
async function createAblyConnection(
  apiKey: string,
  ablyApiKey: string,
): Promise<string> {
  printInfo("Creating Ably notifications connection...");
  console.log("");

  try {
    // Parse Ably API key (format: appId.keyId:keySecret)
    const [username, password] = ablyApiKey.split(":");
    if (!username || !password) {
      throw new Error("ABLY_API_KEY must be in format: appId.keyId:keySecret");
    }

    // Create/update connection using PUT /connections
    const response = await fetch(`${CONFIG.hookdeckApiUrl}/connections`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "ably-notifications",
        source: {
          name: "shopify-notifications-publish",
          type: "PUBLISH_API",
        },
        destination: {
          name: "ably-rest-api",
          type: "HTTP",
          config: {
            url: "https://rest.ably.io/channels/shopify-notifications/messages",
            http_method: "POST",
            auth_type: "BASIC_AUTH",
            auth: {
              username: username,
              password: password,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed with status ${response.status}: ${errorText}`,
      );
    }

    const connection: HookdeckConnection = await response.json();

    printSuccess("Hookdeck connection created/updated: ably-notifications");
    console.log("");

    // Get the source URL (though not used directly for Publish API)
    const sourceUrl = connection.source.url;

    if (!sourceUrl) {
      printError("Failed to get Hookdeck source URL from API response");
      console.log("");
      console.log(
        "Please check your connection at https://dashboard.hookdeck.com/connections",
      );
      process.exit(1);
    }

    return sourceUrl;
  } catch (error) {
    printError("Failed to create Ably notifications connection");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

// Update shopify.app.toml with confirmation
async function updateShopifyConfig(sourceUrl: string): Promise<void> {
  printInfo(`Preparing to update ${CONFIG.shopifyConfig}...`);
  console.log("");

  // Read and parse the TOML file
  const fileContent = readFileSync(CONFIG.shopifyConfig, "utf-8");
  const config = TOML.parse(fileContent) as any;

  // Find the orders/create webhook subscription
  const webhookSubs = config.webhooks?.subscriptions;
  if (!webhookSubs || !Array.isArray(webhookSubs)) {
    printError("Could not find webhook subscriptions in shopify.app.toml");
    process.exit(1);
  }

  const ordersCreateSub = webhookSubs.find((sub: any) =>
    sub.topics?.includes("orders/create"),
  );

  if (!ordersCreateSub) {
    printError("Could not find orders/create webhook subscription");
    process.exit(1);
  }

  const currentUri = ordersCreateSub.uri;

  // Show what will be replaced
  console.log("Current webhook configuration:");
  console.log(`${colors.yellow}  uri = "${currentUri}"${colors.reset}`);
  console.log("");
  console.log("Will be replaced with:");
  console.log(`${colors.green}  uri = "${sourceUrl}"${colors.reset}`);
  console.log("");

  // Ask for confirmation
  const confirmed = await confirm(
    "Do you want to proceed with this change? (y/N): ",
  );

  if (!confirmed) {
    printWarning("Update cancelled by user");
    console.log("");
    printInfo(
      `You can manually update the orders/create webhook uri in ${CONFIG.shopifyConfig} to:`,
    );
    console.log(`  uri = "${sourceUrl}"`);
    process.exit(0);
  }

  // Update the URI using regex to preserve formatting
  const updatedContent = fileContent.replace(
    /(\[\[webhooks\.subscriptions\]\][\s\S]*?topics\s*=\s*\[\s*"orders\/create"\s*\][\s\S]*?uri\s*=\s*)"[^"]*"/,
    `$1"${sourceUrl}"`,
  );

  // Write back to file
  try {
    writeFileSync(CONFIG.shopifyConfig, updatedContent, "utf-8");
    printSuccess(`${CONFIG.shopifyConfig} updated successfully`);
    console.log("");

    // Show the change
    console.log("Updated configuration:");
    console.log(`${colors.green}  uri = "${sourceUrl}"${colors.reset}`);
    console.log("");
  } catch (error) {
    printError(`Failed to update ${CONFIG.shopifyConfig}`);
    console.error(error);
    process.exit(1);
  }
}

// Prompt for confirmation
function confirm(question: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// Main execution
async function main(): Promise<void> {
  console.log("");
  console.log("================================================");
  console.log("  Hookdeck Connection Setup for Shopify App");
  console.log("================================================");
  console.log("");

  // Step 1: Validate prerequisites and get API key
  const { apiKey, shopifySecret, ablyApiKey } = validatePrerequisites();

  // Step 2: Create Shopify webhook connection and get source URL
  const hookdeckSourceUrl = await createHookdeckConnection(
    apiKey,
    shopifySecret,
  );

  printInfo(`Hookdeck Source URL: ${hookdeckSourceUrl}`);
  console.log("");

  // Step 3: Create Ably notifications connection
  await createAblyConnection(apiKey, ablyApiKey);

  printInfo("Ably forwarding connection created");
  console.log("");

  // Step 4: Update shopify.app.toml with confirmation
  await updateShopifyConfig(hookdeckSourceUrl);

  // Success summary
  console.log("================================================");
  console.log(`${colors.green}✓ Setup Complete!${colors.reset}`);
  console.log("================================================");
  console.log("");
  printInfo("Connection 1: Shopify → Hookdeck → App");
  console.log(`  • Connection Name: ${CONFIG.connectionName}`);
  console.log(`  • Source: ${CONFIG.sourceName} (SHOPIFY)`);
  console.log(`  • Source URL: ${hookdeckSourceUrl}`);
  console.log(`  • Destination: CLI`);
  console.log(`  • Destination Path: ${CONFIG.destinationPath}`);
  console.log("");
  printInfo("Connection 2: App → Hookdeck → Ably");
  console.log("  • Connection Name: ably-notifications");
  console.log("  • Source: shopify-notifications-publish (PUBLISH_API)");
  console.log("  • Destination: ably-rest-api (HTTP)");
  console.log(
    "  • Destination URL: https://rest.ably.io/channels/shopify-notifications/messages",
  );
  console.log("");
  printInfo("Configuration changes:");
  console.log(`  • Updated ${CONFIG.shopifyConfig}`);
  console.log("  • Webhook URI now points to Hookdeck source");
  console.log("");
  printInfo("Publishing events to Ably:");
  console.log(
    "  To publish events from your webhook handler, use the Publish API:",
  );
  console.log("");
  console.log("  POST https://hkdk.events/v1/publish");
  console.log("  Headers:");
  console.log("    Content-Type: application/json");
  console.log("    X-Hookdeck-Source-Name: shopify-notifications-publish");
  console.log("  Body:");
  console.log("    {");
  console.log('      "name": "order_notification",');
  console.log('      "data": "{\\"orderId\\": \\"123\\", ...}"');
  console.log("    }");
  console.log("");
  printInfo("Next steps:");
  console.log("  1. Start your app: npm run dev");
  console.log("  2. In a separate terminal, start Hookdeck forwarding:");
  console.log(`     hookdeck listen 3000 ${CONFIG.sourceName}`);
  console.log("  3. Update your webhook handler to publish events to Hookdeck");
  console.log("  4. Test webhooks from Shopify admin or trigger test events");
  console.log("");
  printInfo("To view your connections:");
  console.log("  hookdeck connection list");
  console.log("");
  printInfo("To view events in real-time:");
  console.log("  Visit https://dashboard.hookdeck.com/events");
  console.log("");
}

// Run main function
main().catch((error) => {
  printError("An unexpected error occurred");
  console.error(error);
  process.exit(1);
});
