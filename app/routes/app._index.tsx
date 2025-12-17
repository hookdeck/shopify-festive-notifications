import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  List,
  Link,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const authResult = await authenticate.admin(request);
  return {
    shop: authResult.session.shop,
  };
};

type LoaderData = {
  shop: string;
};

export default function Index() {
  const { shop } = useLoaderData<LoaderData>();

  return (
    <Page>
      <TitleBar title="Live Notifications by Hookdeck"></TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">
                  Welcome to Live Notifications
                </Text>
                <Text as="p" variant="bodyMd">
                  The Live Notifications application uses{" "}
                  <Link
                    url="https://hookdeck.com?ref=shopifyapp-livenotifications"
                    target="_blank"
                  >
                    Hookdeck
                  </Link>{" "}
                  to reliably receive, verify, and queue Shopify Order webhooks.
                  It uses{" "}
                  <Link
                    url="https://ably.com?ref=shopifyapp-livenotifications"
                    target="_blank"
                  >
                    Ably
                  </Link>{" "}
                  to deliver the notifications to the browser in real-time.
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Setup Instructions
                </Text>
                <List type="number">
                  <List.Item>
                    Set up your environment variables in <code>.env</code>:
                    <List type="bullet">
                      <List.Item>
                        <code>HOOKDECK_API_KEY</code> - Your Hookdeck API key
                      </List.Item>
                      <List.Item>
                        <code>SHOPIFY_API_SECRET</code> - Your Shopify app
                        client secret
                      </List.Item>
                      <List.Item>
                        <code>ABLY_API_KEY</code> - Your Ably API key
                      </List.Item>
                    </List>
                  </List.Item>
                  <List.Item>
                    Run the setup script to configure Hookdeck connections:
                    <br />
                    <code>npm run setup-hookdeck</code>
                  </List.Item>
                  <List.Item>
                    Install the live notifications theme extension on your store
                  </List.Item>
                  <List.Item>
                    Test by creating an order and watching notifications appear
                    in real-time
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  How It Works
                </Text>
                <List type="bullet">
                  <List.Item>
                    Shopify sends order webhooks to Hookdeck for reliable
                    delivery
                  </List.Item>
                  <List.Item>
                    Your app receives webhooks, fetches product images, and
                    publishes notifications
                  </List.Item>
                  <List.Item>
                    Hookdeck forwards notifications to Ably for real-time
                    delivery
                  </List.Item>
                  <List.Item>
                    The theme extension listens for notifications and displays
                    them to shoppers
                  </List.Item>
                </List>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">
                  Current Shop
                </Text>
                <Text as="p" variant="bodyMd">
                  {shop}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">
                    Resources
                  </Text>
                  <List>
                    <List.Item>
                      <Link
                        url="https://hookdeck.com/docs?ref=shopifyapp-livenotifications"
                        target="_blank"
                      >
                        Hookdeck Documentation
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="https://ably.com/docs?ref=shopifyapp-livenotifications"
                        target="_blank"
                      >
                        Ably Documentation
                      </Link>
                    </List.Item>
                    <List.Item>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                      >
                        Shopify GraphQL API
                      </Link>
                    </List.Item>
                  </List>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
