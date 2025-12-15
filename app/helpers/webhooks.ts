import { HookdeckClient } from "@hookdeck/sdk";
import type { AdminOperations } from "@shopify/admin-api-client";
import type { GraphQLClient } from "node_modules/@shopify/shopify-app-remix/dist/ts/server/clients/types";

if (!process.env.HOOKDECK_API_KEY) {
  throw new Error("HOOKDECK_API_KEY is required");
}

const hookdeck = new HookdeckClient({ token: process.env.HOOKDECK_API_KEY });

const updateHookdeckConnection = async (shopDomain: string) => {
  const shopId = shopDomain.replace(".", "-");
  const connection = await hookdeck.connection.upsert({
    name: `${shopId}_order-created`,
    source: {
      name: `${shopId}_order-created`,
    },
    destination: {
      name: `${shopId}_ably`,
      url: `https://rest.ably.io/channels/${shopId}/messages`,
      authMethod: {
        type: "BEARER_TOKEN",
        config: {
          token: process.env.ABLY_API_KEY!, // probably needs to be base64 encoded
        },
      },
    },
  });

  return connection.source.url;
};

export const getWebhookSubscriptions = async ({
  graphql,
}: {
  graphql: GraphQLClient<AdminOperations>;
}) => {
  const response = await graphql(`
    #graphql
    query WebhookSubscriptionList {
      webhookSubscriptions(first: 10) {
        edges {
          node {
            id
            topic
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
            createdAt
            updatedAt
            apiVersion {
              handle
            }
            format
            includeFields
            metafieldNamespaces
          }
        }
      }
    }
  `);
  return await response.json();
};

export const createOrdersWebhook = async ({
  graphql,
  shopDomain,
}: {
  graphql: GraphQLClient<AdminOperations>;
  shopDomain: string;
}) => {
  const shopId = shopDomain.replace(".", "-");
  const webhookUrl = await updateHookdeckConnection(shopId);

  const response = await graphql(
    `
      #graphql
      mutation webhookSubscriptionCreate(
        $topic: WebhookSubscriptionTopic!
        $webhookSubscription: WebhookSubscriptionInput!
      ) {
        webhookSubscriptionCreate(
          topic: $topic
          webhookSubscription: $webhookSubscription
        ) {
          webhookSubscription {
            id
            topic
            format
            includeFields
            endpoint {
              __typename
              ... on WebhookHttpEndpoint {
                callbackUrl
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        topic: "ORDERS_CREATE",
        webhookSubscription: {
          callbackUrl: webhookUrl,
          format: "JSON",
        },
      },
    },
  );

  console.log(response);
  return await response.json();
};

export const deleteWebhook = async ({
  graphql,
  webhookId,
}: {
  graphql: GraphQLClient<AdminOperations>;
  webhookId: string;
}) => {
  const response = await graphql(
    `
      #graphql
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          userErrors {
            field
            message
          }
          deletedWebhookSubscriptionId
        }
      }
    `,
    {
      variables: {
        id: webhookId,
      },
    },
  );

  console.log(response);
  return await response.json();
};

// export const updateWebhook = async (req: Request, res: Response) => {
//   mutation WebhookSubscriptionUpdate($id: ID!, $webhookSubscription: WebhookSubscriptionInput!) {
//     webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
//       userErrors {
//         field
//         message
//       }
//       webhookSubscription {
//         id
//         topic
//         endpoint {
//           __typename
//           ... on WebhookHttpEndpoint {
//             callbackUrl
//           }
//           ... on WebhookEventBridgeEndpoint {
//             arn
//           }
//           ... on WebhookPubSubEndpoint {
//             pubSubProject
//             pubSubTopic
//           }
//         }
//         apiVersion {
//           handle
//         }
//         format
//       }
//     }
//   }

// }
