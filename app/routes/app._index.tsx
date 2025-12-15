import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  List,
  Link,
  InlineStack,
  TextField,
  Box,
} from "@shopify/polaris";
import { ClipboardIcon, DeleteIcon } from "@shopify/polaris-icons";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  createOrdersWebhook,
  deleteWebhook,
  getWebhookSubscriptions,
} from "app/helpers/webhooks";

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const authResult = await authenticate.admin(request);
  const webhookSubscriptions = await getWebhookSubscriptions({
    graphql: authResult.admin.graphql,
  });

  return {
    accessToken: authResult.session.accessToken,
    webhookSubscriptions,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log(request.method, ">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");

  const authResult = await authenticate.admin(request);
  const admin = authResult.admin;

  let webhook = null;

  if (request.method === "POST") {
    webhook = await createOrdersWebhook({
      graphql: admin.graphql,
      shopDomain: authResult.session.shop,
    });
  } else if (request.method === "DELETE") {
    const data = await request.formData();
    console.log({ data });

    const webhookId = data.get("webhookId");
    console.log("DELETE", webhookId);
    if (webhookId !== null) {
      webhook = await deleteWebhook({
        graphql: admin.graphql,
        webhookId: webhookId.valueOf() as string,
      });
    }
  }

  const webhookSubscriptions = await getWebhookSubscriptions({
    graphql: admin.graphql,
  });

  return { webhook, webhookSubscriptions };
};

type LoaderData = {
  accessToken: string;
  webhookSubscriptions: any;
};

export default function Index() {
  const { accessToken, webhookSubscriptions } = useLoaderData<LoaderData>();
  const fetcher = useFetcher<typeof action>({ key: "webhooks" });
  const [mounted, setMounted] = useState(false);

  let displayWebhookSubscriptions = webhookSubscriptions;

  const isLoading =
    (["loading", "submitting"].includes(fetcher.state) &&
      fetcher.formMethod === "POST") ||
    fetcher.formMethod === "DELETE";
  if (fetcher.data?.webhookSubscriptions) {
    displayWebhookSubscriptions = fetcher.data.webhookSubscriptions;

    console.log("displayWebhookSubscriptions", displayWebhookSubscriptions);
  }

  const webhook = fetcher.data?.webhook;

  const appBridge = useAppBridge();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // const appBridge = (window as any).shopify;
    if (!appBridge?.toast) return;

    if (webhook && fetcher.formMethod === "POST") {
      appBridge.toast.show("Webhook created");
    }
    if (webhook && fetcher.formMethod === "DELETE") {
      appBridge.toast.show("Webhook deleted");
    }
  }, [fetcher.formMethod, webhook, mounted, appBridge.toast]);

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value);
    const appBridge = (window as any).shopify;
    if (appBridge?.toast) {
      appBridge.toast.show("Copied to clipboard");
    }
  };

  const deleteWebhookClicked = async (webhookId: string) => {
    console.log("deleteWebhookClicked", webhookId);
    const confirmed = window.confirm(
      "Are you sure you want to delete this webhook?",
    );
    if (!confirmed) return;

    fetcher.submit({ webhookId }, { method: "DELETE" });
  };

  const setupWebhooks = () => fetcher.submit({}, { method: "POST" });

  return (
    <Page>
      <TitleBar title="Live Notifications by Hookdeck"></TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  The Live Notifications application uses{" "}
                  <Link url="https://hookdeck.com?ref=shopifyapp-livenotifications">
                    Hookdeck
                  </Link>{" "}
                  to reliably recieve, verify, and queue Shopify Order webhooks.
                  It uses{" "}
                  <Link url="https://ably.com?ref=shopifyapp-livenotifications">
                    Ably
                  </Link>{" "}
                  to deliver the notifications to the browser client.
                </Text>
                <Text as="p" variant="bodyMd">
                  Begin by setting up the required webhooks. Click{" "}
                  <strong>Setup</strong> to get started.
                </Text>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Webhooks
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack gap="400" align="start">
                      {displayWebhookSubscriptions.data.webhookSubscriptions.edges.map(
                        (webhook: any) => {
                          return (
                            <InlineStack
                              wrap={false}
                              gap="500"
                              key={webhook.node.id}
                              align="center"
                              blockAlign="center"
                            >
                              <Box>{webhook.node.topic}</Box>
                              <Box>{webhook.node.endpoint.callbackUrl}</Box>
                              <Box>{webhook.node.updatedAt}</Box>
                              <Box>
                                <Button
                                  icon={DeleteIcon}
                                  disabled={isLoading}
                                  onClick={() => {
                                    deleteWebhookClicked(webhook.node.id);
                                  }}
                                ></Button>
                              </Box>
                            </InlineStack>
                          );
                        },
                      )}
                    </InlineStack>
                  </BlockStack>
                  <InlineStack gap="200" align="end">
                    <Button
                      disabled={isLoading}
                      variant="primary"
                      onClick={setupWebhooks}
                    >
                      Setup
                    </Button>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Useful Information
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="start" blockAlign="end" gap="200">
                      <TextField
                        label="Shopify Access Token"
                        type="password"
                        value={accessToken}
                        autoComplete="off"
                      />
                      <Button
                        icon={ClipboardIcon}
                        onClick={() => {
                          copyToClipboard(accessToken);
                        }}
                      ></Button>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link
                        url="https://remix.run"
                        target="_blank"
                        removeUnderline
                      >
                        Remix
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link
                        url="https://www.prisma.io/"
                        target="_blank"
                        removeUnderline
                      >
                        Prisma
                      </Link>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link
                          url="https://polaris.shopify.com"
                          target="_blank"
                          removeUnderline
                        >
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                          removeUnderline
                        >
                          App Bridge
                        </Link>
                      </span>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                        removeUnderline
                      >
                        GraphQL API
                      </Link>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List>
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                        removeUnderline
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify's API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                        removeUnderline
                      >
                        GraphiQL
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
