# Testing Live Notifications with Product Images

## Overview

To test the full functionality including product image fetching from Shopify Admin API, you need a **real shop session**. The `shopify app webhook trigger` command creates test webhooks without shop sessions, so `admin` is unavailable.

## Testing Approaches

### Option 1: Development Store Testing (Recommended)

This is the standard Shopify approach for testing apps with real API access.

#### Setup:

1. **Create a Development Store**

   - Go to your Partner Dashboard: https://partners.shopify.com
   - Navigate to "Stores" → "Add store" → "Development store"
   - Create a store with test data

2. **Install Your App on the Development Store**

   ```bash
   npm run dev
   ```

   - Access the app through the Shopify admin of your dev store
   - Install the app - this creates a session in your database

3. **Create a Test Order**

   - In your dev store admin, go to Orders → Create order
   - Add products with images
   - Complete the order
   - This triggers a **real webhook** with a valid shop session

4. **Verify the Flow**
   - Check `webhook-debug.log` for processing details
   - Check Hookdeck dashboard for the published event
   - Verify product images are included in the notification payload

#### Resources:

- [Creating a development store](https://shopify.dev/docs/apps/tools/development-stores)
- [Testing your app](https://shopify.dev/docs/apps/launch/test-your-app)

### Option 2: Use Hookdeck Test Events

Once you've captured a real webhook event in Hookdeck, you can replay it for testing.

#### Steps:

1. Create a real order (using Option 1)
2. In Hookdeck dashboard, find the captured event
3. Click "Retry" or "Replay" to re-send it to your app
4. Your app will process it with full admin access

### Option 3: Mock Admin for Unit Testing

For unit testing without a shop connection:

```typescript
// Create a test file: app/routes/webhooks.orders.create.test.ts
import { describe, it, expect, vi } from "vitest";

const mockAdmin = {
  graphql: vi.fn().mockResolvedValue({
    json: () =>
      Promise.resolve({
        data: {
          product: {
            featuredImage: {
              url: "https://cdn.shopify.com/test-image.jpg",
            },
          },
        },
      }),
  }),
};

// Test your helper functions with mock admin
```

## Current Behavior

### With Admin (Real Webhooks):

- ✅ Webhook received
- ✅ Shop session found
- ✅ Admin GraphQL client available
- ✅ Product images fetched from Shopify API
- ✅ Complete notification published to Hookdeck
- ✅ Forwarded to Ably with images

### Without Admin (Test Webhooks):

- ✅ Webhook received
- ⚠️ No shop session
- ⚠️ No admin GraphQL client
- ⚠️ Product images skipped
- ✅ Basic notification published to Hookdeck
- ✅ Forwarded to Ably (without images)

## Debugging Tips

### Check Shop Sessions:

```bash
# Connect to your database
npx prisma studio

# Look in the Session table to see which shops are installed
```

### Monitor Logs:

```bash
# Watch the debug log in real-time
tail -f webhook-debug.log
```

### Verify Hookdeck Events:

- Dashboard: https://dashboard.hookdeck.com/events
- Filter by source: `shopify-webhooks` for incoming
- Filter by source: `shopify-notifications-publish` for outgoing

## Expected Log Output (With Admin)

```
[timestamp] === WEBHOOK RECEIVED ===
[timestamp] Topic: ORDERS_CREATE, Shop: your-dev-store.myshopify.com, Has Admin: true
[timestamp] Starting order notification publication
[timestamp] [HOOKDECK] Starting order notification publication
[timestamp] [HOOKDECK] Shop: your-dev-store.myshopify.com
[timestamp] [HOOKDECK] Has admin: true
[timestamp] [HOOKDECK] Transforming order data...
[timestamp] [HOOKDECK] Fetching image for product 123456789
[timestamp] [HOOKDECK] Image URL for product 123456789: https://cdn.shopify.com/...
[timestamp] [HOOKDECK] Transformed notification with 1 items
[timestamp] [HOOKDECK] Publishing to source: shopify-notifications-publish
[timestamp] [HOOKDECK] Response status: 200
[timestamp] [HOOKDECK] Order notification published successfully: evt_xxxxx
[timestamp] Order notification published successfully
```

## Shopify Documentation References

- **Webhook Testing**: https://shopify.dev/docs/apps/build/webhooks/subscribe/test
- **Development Stores**: https://shopify.dev/docs/apps/tools/development-stores
- **Admin API Testing**: https://shopify.dev/docs/apps/build/graphql/test
- **App Authentication**: https://shopify.dev/docs/apps/build/authentication-authorization

## Recommended Testing Flow

1. **Initial Setup** (One time)

   - Create development store
   - Install app on dev store
   - Verify app appears in store admin

2. **Create Test Products** (One time)

   - Add products with images to your dev store
   - Note product IDs for reference

3. **Test Order Webhooks** (Repeatable)

   - Create order with products
   - Check `webhook-debug.log`
   - Verify event in Hookdeck dashboard
   - Check notification payload includes images

4. **Test Notifications UI** (End-to-end)
   - Have theme extension installed
   - Create order
   - Verify notification appears on storefront
   - Confirm product image displays

## Troubleshooting

### "Has Admin: false" in logs

**Cause**: No shop session in database
**Solution**: Install app on a development store

### Product images missing in notifications

**Cause**: Admin not available or product has no featured image
**Solution**:

- Ensure shop has active session
- Verify products have featured images set
- Check GraphQL query response in logs

### Events not reaching Ably

**Cause**: Hookdeck connection not configured
**Solution**: Run `npm run setup-hookdeck` to configure connections

## Next Steps After Testing

Once testing confirms everything works:

1. **Production Store**: Install on actual Shopify store
2. **Monitor**: Watch Hookdeck dashboard for real events
3. **Optimize**: Add caching for product images if needed
4. **Scale**: Monitor performance with real order volumes
