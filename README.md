# Shopify Festive Real-Time Notifications Demo

A developer tutorial application demonstrating how to integrate Shopify webhooks, the Hookdeck Event Gateway, and Ably to display real-time purchase notifications in a Shopify online store with festive animations.

## What This Demonstrates

This is an example/tutorial app that shows developers how to:

- Receive Shopify order webhooks reliably through the Hookdeck Event Gateway
- Process webhook events in a Remix-based Shopify app
- Forward events to Ably for real-time pub/sub messaging
- Display live notifications in a Shopify storefront using theme app extensions
- Create interactive UI elements with holiday-themed animations

**Note:** This is a demonstration app for learning purposes, not a production-ready application for merchants to install.

## Architecture Overview

The application uses two Hookdeck Event Gateway connections for reliable webhook processing and real-time delivery:

**Connection 1: Shopify → Event Gateway → App**

- Receives Shopify webhooks reliably
- Queues and delivers to app with retries

**Connection 2: App → Event Gateway Publish API → Ably**

- Publishes PII-free notifications to Event Gateway
- Event Gateway forwards to Ably for real-time broadcast

```
1. Order Created in Shopify
   ↓
2. Shopify triggers orders/create webhook
   ↓
3. Event Gateway receives and queues the webhook at the Source
   ↓
4. Event Gateway delivers webhook to app webhook handler
   (app/routes/webhooks.orders.create.tsx)
   ↓
5. App transforms order to PII-free notification and publishes to Event Gateway
   (app/helpers/hookdeck-publisher.ts)
   ↓
6. Event Gateway queues and forwards event to Ably via REST API
   ↓
7. Ably broadcasts to all connected clients
   ↓
8. Storefront receives event via Ably Realtime
   (extensions/live-notifications/assets/notifications.js)
   ↓
9. Notification displayed with snowflake animation
   (extensions/live-notifications/blocks/notifications.liquid)
```

## Key Components

### Shopify App vs Extension

This project contains both a **Shopify app** and a **theme app extension**:

- **Shopify App**: The backend Remix application that handles webhooks, manages data, and provides an admin interface. It runs on a server and integrates with Shopify's Admin API.
- **Theme App Extension**: Frontend components that appear in the merchant's online store. Extensions add blocks, sections, or functionality directly to the storefront without modifying theme code.

### Backend (Remix App)

- **[`app/routes/webhooks.orders.create.tsx`](app/routes/webhooks.orders.create.tsx)** - Webhook endpoint that receives order creation events from Shopify via the Event Gateway and publishes PII-free notifications
- **[`app/helpers/hookdeck-publisher.ts`](app/helpers/hookdeck-publisher.ts)** - Helper functions for publishing events to the Event Gateway, including:
  - Transforming orders to PII-free notifications (removes customer data)
  - Fetching product images from Shopify
  - Publishing to the Event Gateway's Publish API with shop-specific routing
- **[`scripts/setup-hookdeck.ts`](scripts/setup-hookdeck.ts)** - Automated setup script that creates both Event Gateway connections

### Storefront Extension

- **[`extensions/live-notifications/blocks/notifications.liquid`](extensions/live-notifications/blocks/notifications.liquid)** - Theme app extension block with festive holiday lights and snowfall animations
- **[`extensions/live-notifications/assets/notifications.js`](extensions/live-notifications/assets/notifications.js)** - Client-side JavaScript that:
  - Connects to Ably Realtime
  - Subscribes to notification events
  - Creates snowflake animations
  - Handles interactive elements (clickable lights and snowflakes)
- **[`extensions/live-notifications/src/notifications.scss`](extensions/live-notifications/src/notifications.scss)** - Source SCSS styles (compiled to [`notifications.css`](extensions/live-notifications/assets/notifications.css))
- **[`extensions/live-notifications/assets/notifications.css`](extensions/live-notifications/assets/notifications.css)** - Compiled CSS (generated from SCSS, not manually edited)

### Configuration

- **[`shopify.app.toml`](shopify.app.toml)** - Shopify app configuration including:
  - Webhook subscriptions for `orders/create`
  - Required OAuth scopes (`read_products`, `read_orders`)
  - App authentication settings
- **[`package.json`](package.json)** - Dependencies including:
  - `@shopify/shopify-app-remix` - Shopify app framework
  - Ably client library (loaded via CDN in storefront)

## Prerequisites

Before setting up this app, you'll need:

1. **Node.js** (v18.20+, v20.10+, or v21.0.0+)
2. **Shopify Partner Account** - [Create one here](https://partners.shopify.com/)
3. **Shopify Development Store** - Create from your Partner Dashboard
4. **Hookdeck Account** - [Sign up at hookdeck.com](https://dashboard.hookdeck.com/signup) for the Event Gateway
5. **Hookdeck CLI** - Install globally with `npm install -g @hookdeck/cli`
6. **Ably Account** - [Sign up at ably.com](https://ably.com)

## Getting Your API Keys

### Hookdeck API Key

1. Log in to your [Hookdeck Dashboard](https://dashboard.hookdeck.com)
2. Navigate to Settings → API Keys
3. Create or copy your API key

### Ably API Keys

You'll need **two separate Ably API keys** with different permissions:

**1. Publishing API Key (used in Event Gateway)**

This key is used by the Event Gateway to forward events to Ably and must have **publish permissions only**.

1. Log in to your [Ably Dashboard](https://ably.com/dashboard)
2. Navigate to your app → API Keys
3. Click "Create new API key"
4. Name it "Event Gateway Publisher"
5. Under Capabilities, select **only** "Publish"
6. Copy the full API key (format: `appId.keyId:keySecret`)
7. Save this key - you'll use it in your `.env` file

**2. Subscribe API Key (for Storefront)**

This key is used by the storefront extension to receive notifications and must have **subscribe permissions only**.

1. In the Ably Dashboard, create another API key
2. Name it "Storefront Subscriber"
3. Under Capabilities, select **only** "Subscribe"
4. Copy this API key
5. Save this key - you'll use it in the extension JavaScript file

Learn more about [Ably API key permissions](https://ably.com/docs/auth/capabilities).

### Shopify Credentials

The Shopify CLI will automatically configure your app when you run `npm run dev` for the first time:

1. The CLI prompts you to create a new app or select an existing one
2. The `SHOPIFY_API_KEY` (client_id) is automatically saved to [`shopify.app.toml`](shopify.app.toml)
3. You need to manually add `SHOPIFY_API_SECRET` to your `.env` file

**To get your `SHOPIFY_API_SECRET`:**

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/organizations)
2. Navigate to Apps → [Your App]
3. Go to the Configuration tab
4. Copy the "Client secret" value
5. Add it to your `.env` file as `SHOPIFY_API_SECRET`

This secret is required for webhook signature verification by the Event Gateway.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Shopify App Credentials (automatically generated by CLI on first run)
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret

# Hookdeck Configuration
HOOKDECK_API_KEY=your_hookdeck_api_key

# Ably Configuration (use the publishing key)
ABLY_API_KEY=your_ably_publishing_api_key
```

## Setup Instructions

### 1. Clone and Install

```bash
git clone https://github.com/hookdeck/shopify-festive-notifications.git
cd shopify-festive-notifications
npm install
```

### 2. Configure Ably API Key in Extension

Edit [`extensions/live-notifications/assets/notifications.js`](extensions/live-notifications/assets/notifications.js) and replace the placeholder API key with your **Ably Subscribe API key**:

```javascript
const ably = new Ably.Realtime("YOUR_ABLY_SUBSCRIBE_API_KEY");
```

**Important:** Use the subscribe-only API key here, not the publishing key from your `.env` file.

**Note:** In production, this should be handled more securely using token authentication.

### 3. Install and Configure Hookdeck CLI

The Hookdeck CLI is required for this demo application to receive webhooks locally.

1. **Install Hookdeck CLI globally:**

   ```bash
   npm install -g @hookdeck/cli
   ```

2. **Login to Hookdeck:**

   ```bash
   hookdeck login
   ```

   This authenticates the CLI with your Hookdeck account.

### 4. Configure Shopify App

```bash
npm run dev
```

This will:

- Create a tunnel for local development (using Cloudflare)
- Prompt you to create/select a Shopify app
- Install the app on your development store
- Start the development server

**Note on Tunneling:**

- The Cloudflare tunnel created by `npm run dev` is **required** for Shopify to communicate with your local app (OAuth, app embeds, admin interface)
- The Hookdeck CLI is used to receive webhooks locally and provides better debugging capabilities
- Both run simultaneously: Cloudflare tunnel for the app, Hookdeck CLI for webhooks

**Benefits of Hookdeck CLI for webhooks:**

- Real-time webhook inspection and debugging
- Replay webhooks during development
- Test different payloads easily
- View webhook history and errors
- No need to trigger real Shopify events repeatedly

### 5. Configure Event Gateway Connections

Run the automated setup script to create both Event Gateway connections:

```bash
npm run setup:hookdeck
```

This script automatically creates:

1. **Connection 1: Shopify → App**

   - Source: `shopify-webhooks` (for receiving webhooks from Shopify)
   - Destination: Points to your app's webhook handler
   - CLI Connection: For local development
   - **Webhook Signing**: Automatically configured using your `SHOPIFY_API_SECRET` to verify webhook authenticity

2. **Connection 2: App → Ably**
   - Source: `shopify-notifications-publish` (for publishing from your app)
   - Destination: `ably-rest-api` (forwards to Ably REST API)
   - Authentication: Uses your Ably publishing API key from `.env`
   - Routing: Shop-specific channels for multi-tenant support

The script uses your `ABLY_API_KEY` and `SHOPIFY_API_SECRET` from `.env` to configure connections automatically.

**Note:** For production deployments, you'll need to update the destination URL in Connection 1 to point to your production server instead of localhost.

### 6. Start Hookdeck CLI for Local Webhook Development

Start the Hookdeck CLI to forward webhooks to your local server:

```bash
npm run hookdeck:listen
```

> [!NOTE]
> This runs the command:
>
> ```bash
> hookdeck listen 3000 shopify-webhooks
> ```

This creates or reuses an Event Gateway Connection that forwards events from a `shopify-webhooks` Source to `localhost:3000`. Keep this terminal running.

### 7. Enable the Theme Extension

1. Go to your Shopify admin → Online Store → Themes
2. Click "Customize" on your active theme
3. Navigate to any page in the theme editor
4. Click "Add section" or "Add block"
5. Look for "Festive Notifications" under App blocks
6. Add it to your theme (typically in the theme layout or header)
7. Save and publish

### 8. Test the Integration

See [`docs/TESTING.md`](docs/TESTING.md) for detailed testing instructions including:

- Step-by-step guide to creating a test order
- How to verify webhook delivery in app logs
- How to check the Event Gateway dashboard for event processing
- How to verify notifications appear in the storefront
- Troubleshooting common issues

## How It Works

### Webhook Flow

1. **Shopify triggers webhook**: When an order is created, Shopify sends an `orders/create` webhook to the Event Gateway Source
2. **Event Gateway receives and queues**: The Event Gateway reliably receives and queues the webhook with automatic retries
3. **App processes webhook**: The Event Gateway delivers the webhook to [`webhooks.orders.create.tsx`](app/routes/webhooks.orders.create.tsx)
4. **PII filtering**: The webhook handler extracts order data and uses [`hookdeck-publisher.ts`](app/helpers/hookdeck-publisher.ts) to:
   - Remove customer PII (name, email, address)
   - Fetch product images from Shopify
   - Create a clean notification payload
5. **Event publication**: The app publishes the PII-free notification to the Event Gateway's Publish API with shop-specific routing

### Real-time Delivery

1. **Event Gateway forwarding**: The Event Gateway queues and forwards the event to Ably's REST API via the configured destination
2. **Pub/Sub broadcast**: Ably broadcasts the event to all subscribed clients on the shop-specific channel
3. **Storefront receives**: The JavaScript in [`notifications.js`](extensions/live-notifications/assets/notifications.js) receives the event via Ably Realtime
4. **UI update**: The notification is displayed with product image and festive snowflake animations

### Theme Extension

The Shopify theme app extension consists of:

- **Liquid template**: Defines the HTML structure and holiday light animations
- **JavaScript**: Handles Ably connection, event subscriptions, and snowflake animations
- **CSS**: Compiled from SCSS, provides styling for animations and layout

## Development

### Running the App

```bash
npm run dev
```

This starts:

- Remix development server
- Shopify CLI tunnel
- SASS compiler for extension styles

### Building for Production

```bash
npm run build
```

### Deploying

```bash
npm run deploy
```

This deploys your app extensions to Shopify.

## Project Structure

```
live-notifications/
├── app/
│   ├── routes/
│   │   ├── webhooks.orders.create.tsx    # Order webhook handler
│   │   ├── app._index.tsx                 # App home page
│   │   └── ...
│   ├── helpers/
│   │   └── hookdeck-publisher.ts          # Event Gateway publishing utilities
│   └── shopify.server.ts                  # Shopify app configuration
├── extensions/
│   └── live-notifications/
│       ├── blocks/
│       │   └── notifications.liquid       # Theme block template
│       ├── assets/
│       │   ├── notifications.js           # Client-side logic
│       │   └── notifications.css          # Compiled styles
│       └── src/
│           └── notifications.scss         # Source styles
├── scripts/
│   └── setup-hookdeck.ts                  # Automated connection setup
├── plans/
│   ├── hookdeck-ably-architecture.md      # Architecture documentation
│   └── hookdeck-setup-architecture.md     # Setup process documentation
├── docs/
│   └── TESTING.md                         # Testing guide
├── prisma/
│   └── schema.prisma                      # Database schema
├── shopify.app.toml                       # App configuration
└── package.json                           # Dependencies
```

## Technologies Used

- **[Remix](https://remix.run/)** - Full-stack web framework
- **[Shopify App Remix](https://shopify.dev/docs/api/shopify-app-remix)** - Shopify app framework for Remix
- **[Hookdeck Event Gateway](https://hookdeck.com)** - Webhook infrastructure for reliable delivery and event routing
- **[Ably](https://ably.com)** - Real-time pub/sub messaging platform
- **[Prisma](https://www.prisma.io/)** - Database ORM
- **[Shopify Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)** - Storefront integration

## Official Documentation

- [Shopify App Development](https://shopify.dev/docs/apps)
- [Shopify Webhooks](https://shopify.dev/docs/apps/build/webhooks)
- [Shopify Theme App Extensions](https://shopify.dev/docs/apps/online-store/theme-app-extensions)
- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)
- [Hookdeck Event Gateway Documentation](https://hookdeck.com/docs)
- [Ably Documentation](https://ably.com/docs)
- [Remix Documentation](https://remix.run/docs)

## Learning Resources

- [Shopify App Tutorial](https://shopify.dev/docs/apps/getting-started)
- [Webhooks Best Practices](https://shopify.dev/docs/apps/build/webhooks/best-practices)
- [Theme App Extension Tutorial](https://shopify.dev/docs/apps/online-store/theme-app-extensions/getting-started)
- [Hookdeck Event Gateway Guide](https://hookdeck.com/webhooks)
- [Ably Realtime Guide](https://ably.com/docs/realtime)

## Limitations & Considerations

- **Security**: The Ably API key is currently hardcoded in the client-side JavaScript. For production, implement token authentication
- **Error Handling**: Basic error handling is implemented; production apps should include comprehensive error handling and monitoring
- **Scalability**: This demo uses a simple SQLite database; production apps should use PostgreSQL or MySQL
- **Shop-specific channels**: The current implementation creates shop-specific Ably channels to isolate events between stores

## License

This is a demonstration/tutorial project for educational purposes.

## Author

leggetter

---

**Questions or Issues?** This is a tutorial app - refer to the official documentation links above for detailed guidance on each technology used.
