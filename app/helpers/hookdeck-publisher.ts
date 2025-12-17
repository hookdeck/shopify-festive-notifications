/**
 * Hookdeck Publisher Helper
 *
 * Utilities for publishing events to Hookdeck with PII-safe transformations
 * for Shopify order webhooks.
 */

// Types for Hookdeck API
interface HookdeckPublishResponse {
  id: string;
  source_id: string;
  created_at: string;
}

// Types for notification data
interface OrderNotificationLineItem {
  name: string;
  title?: string;
  quantity: number;
  price: string;
  sku?: string;
  product_id?: number;
  variant_id?: number;
  grams?: number;
  vendor?: string;
  requires_shipping?: boolean;
  taxable?: boolean;
  gift_card?: boolean;
  image?: string;
}

interface OrderNotification {
  created_at: string;
  currency: string;
  total_price: string;
  subtotal_price: string;
  total_tax: string;
  total_discounts: string;
  item_count: number;
  line_items: OrderNotificationLineItem[];
  shop: string;
  test: boolean;
  financial_status?: string;
  fulfillment_status?: string | null;
  total_weight?: number;
  tags?: string;
  source_name?: string;
  gateway?: string;
  processing_method?: string;
  confirmed?: boolean;
}

/**
 * Publishes data to Hookdeck using the Publish API
 *
 * @param sourceName - The Hookdeck source name to publish to
 * @param data - The data payload to publish
 * @param headers - Optional custom headers to include
 * @returns The Hookdeck API response
 * @throws Error if the publish fails
 */
export async function publishToHookdeck(
  sourceName: string,
  data: any,
  headers?: Record<string, string>,
): Promise<HookdeckPublishResponse> {
  const url = "https://hkdk.events/v1/publish";

  console.error(`[HOOKDECK] Publishing to source: ${sourceName}`);
  console.error(`[HOOKDECK] Payload:`, JSON.stringify(data, null, 2));

  // Get API key from environment
  const apiKey = process.env.HOOKDECK_API_KEY;
  if (!apiKey) {
    throw new Error("HOOKDECK_API_KEY environment variable is not set");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Hookdeck-Source-Name": sourceName,
        ...headers,
      },
      body: JSON.stringify({ data }),
    });

    console.error(`[HOOKDECK] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HOOKDECK] Error response: ${errorText}`);
      throw new Error(
        `Hookdeck publish failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const result = await response.json();
    console.error(`[HOOKDECK] Publish response:`, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error("[HOOKDECK] Error publishing to Hookdeck:", error);
    throw error;
  }
}

/**
 * Fetches product image for a variant using Shopify Admin API
 *
 * @param admin - Shopify admin GraphQL client
 * @param productId - The product ID
 * @returns The product image URL or undefined
 */
async function fetchProductImage(
  admin: any,
  productId: number,
): Promise<string | undefined> {
  try {
    console.error(`[HOOKDECK] Fetching image for product ${productId}`);
    const response = await admin.graphql(
      `#graphql
      query getProduct($id: ID!) {
        product(id: $id) {
          featuredImage {
            url
          }
        }
      }`,
      {
        variables: {
          id: `gid://shopify/Product/${productId}`,
        },
      },
    );

    const data = await response.json();
    const imageUrl = data?.data?.product?.featuredImage?.url;
    console.error(`[HOOKDECK] Image URL for product ${productId}:`, imageUrl);
    return imageUrl;
  } catch (error) {
    console.error(
      `[HOOKDECK] Error fetching product image for ${productId}:`,
      error,
    );
    return undefined;
  }
}

/**
 * Transforms a Shopify order payload to remove all PII and extract
 * only non-sensitive information suitable for public notifications.
 *
 * @param order - The Shopify order webhook payload
 * @param shopDomain - The shop domain (optional, from webhook context)
 * @param admin - Optional Shopify admin GraphQL client for fetching product images
 * @returns A PII-free order notification object
 */
async function transformOrderToNotification(
  order: any,
  shopDomain?: string,
  admin?: any,
): Promise<OrderNotification> {
  // Extract line items without PII
  const lineItems: OrderNotificationLineItem[] = await Promise.all(
    (order.line_items || []).map(async (item: any) => {
      let image: string | undefined;

      // Fetch product image if admin client is available and product_id exists
      if (admin && item.product_id) {
        image = await fetchProductImage(admin, item.product_id);
      }

      return {
        name: item.name,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
        sku: item.sku,
        product_id: item.product_id,
        variant_id: item.variant_id,
        grams: item.grams,
        vendor: item.vendor,
        requires_shipping: item.requires_shipping,
        taxable: item.taxable,
        gift_card: item.gift_card,
        image,
      };
    }),
  );

  // Calculate total item count
  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0);

  // Build notification object with all non-PII data
  const notification: OrderNotification = {
    created_at: order.created_at,
    currency: order.currency,
    total_price: order.total_price,
    subtotal_price: order.subtotal_price,
    total_tax: order.total_tax,
    total_discounts: order.total_discounts,
    item_count: itemCount,
    line_items: lineItems,
    shop: shopDomain || order.shop_domain || "",
    test: order.test || false,
    total_weight: order.total_weight,
    tags: order.tags,
    source_name: order.source_name,
  };

  return notification;
}

/**
 * Publishes a PII-safe order notification to Hookdeck
 *
 * Extracts all non-PII information from a Shopify order webhook and
 * publishes it to the 'shopify-notifications-publish' source.
 *
 * Excluded PII:
 * - Customer names, emails, phone numbers
 * - Shipping/billing addresses
 * - Order numbers (potential PII)
 * - IP addresses
 * - Payment details
 *
 * Included non-PII data:
 * - Order metadata (created_at, currency, test flag)
 * - Financial data (prices, tax, discounts)
 * - Line items (product names, quantities, prices, SKUs)
 * - Shop info
 * - Order status
 *
 * @param order - The Shopify order webhook payload
 * @param shopDomain - Optional shop domain from webhook context
 * @param admin - Optional Shopify admin GraphQL client for fetching product images
 * @returns The Hookdeck API response
 * @throws Error if the publish fails
 */
export async function publishOrderNotification(
  order: any,
  shopDomain?: string,
  admin?: any,
): Promise<HookdeckPublishResponse> {
  try {
    // Transform order to remove PII and fetch product images
    const notification = await transformOrderToNotification(
      order,
      shopDomain,
      admin,
    );

    // Publish to Hookdeck
    const result = await publishToHookdeck(
      "shopify-notifications-publish",
      notification,
    );

    console.log("Order notification published successfully:", result.id);
    return result;
  } catch (error) {
    console.error("Error publishing order notification:", error);
    throw error;
  }
}
