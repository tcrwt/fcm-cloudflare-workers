import { Hono } from "hono";
import { fcmMiddleware } from "./fcm.middleware";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { StatusCode } from "hono/utils/http-status";
import { FCM, FcmMessage, EnhancedFcmMessage } from "fcm-cloudflare-workers";
import { KVNamespace } from "@cloudflare/workers-types";

type Bindings = {
  FIREBASE_PROJECT_ID: string; // Firebase project ID
  FIREBASE_SERVICE_ACCOUNT_JSON: string; // Firebase service account JSON
  MY_WORKER_CACHE: KVNamespace; // Worker KV namespace
};

type Variables = {
  error: {
    response: (
      StatusCode: StatusCode,
      message: string,
      description: string
    ) => void;
  };
  fcm: FCM,
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>().basePath(
  "/api"
);

app.use(fcmMiddleware);

// Schema for legacy single push
const sendSinglePushSchema = z.object({
  deviceToken: z.string(),
});

// Schema for legacy multi push
const sendMultiPushSchema = z.object({
  deviceTokens: z.array(z.string()),
});

// Schema for enhanced message
const enhancedMessageSchema = z.object({
  notification: z.object({
    title: z.string(),
    body: z.string(),
    image: z.string().optional(),
  }),
  data: z.record(z.string(), z.string()).optional(),
  android: z.object({
    notification: z.object({
      channel_id: z.string(),
      click_action: z.string().optional(),
    }).optional(),
    priority: z.enum(['normal', 'high']).optional(),
  }).optional(),
  apns: z.object({
    payload: z.object({
      aps: z.object({
        badge: z.number().optional(),
        sound: z.string().optional(),
      }).optional(),
    }).optional(),
  }).optional(),
  webpush: z.object({
    notification: z.object({
      icon: z.string().optional(),
      badge: z.string().optional(),
    }).optional(),
  }).optional(),
});

// Legacy endpoints (using deprecated sendMulticast)
app.post("/push-single", zValidator("json", sendSinglePushSchema), async (c) => {
  const { deviceToken } = await c.req.json();

  const message = {
    notification: {
      title: "Test",
      body: "Test from single (legacy)",
    },
    data: {
      notification: "true",
    },
  } satisfies FcmMessage;

  try {
    const unregisteredTokens = await c.var.fcm.sendMulticast(message, [deviceToken]);
    console.log("Message sent successfully");
    if (unregisteredTokens.length > 0) {
      console.log("Unregistered device token(s): ", unregisteredTokens.join(", "));
    }
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }

  return c.json({ success: true });
});

app.post("/push-multi", zValidator("json", sendMultiPushSchema), async (c) => {
  const { deviceTokens } = await c.req.json();

  const message = {
    notification: {
      title: "Test",
      body: "Test from multiple (legacy)",
    },
    data: {
      notification: "true",
    },
  } satisfies FcmMessage;

  try {
    const unregisteredTokens = await c.var.fcm.sendMulticast(message, deviceTokens);
    console.log("Message sent successfully");
    if (unregisteredTokens.length > 0) {
      console.log("Unregistered device token(s): ", unregisteredTokens.join(", "));
    }
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }

  return c.json({ success: true });
});

app.post("/v2/push-token", zValidator("json", z.object({
  token: z.string(),
  message: enhancedMessageSchema,
})), async (c) => {
  const { token, message } = await c.req.json();

  try {
    await c.var.fcm.sendToToken(message as EnhancedFcmMessage, token);
    return c.json({ success: true });
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }
});

app.post("/v2/push-tokens", zValidator("json", z.object({
  tokens: z.array(z.string()),
  message: enhancedMessageSchema,
})), async (c) => {
  const { tokens, message } = await c.req.json();

  try {
    const unregisteredTokens = await c.var.fcm.sendToTokens(message as EnhancedFcmMessage, tokens);
    return c.json({ 
      success: true,
      unregisteredTokens: unregisteredTokens.length > 0 ? unregisteredTokens : undefined
    });
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }
});

app.post("/v2/push-topic", zValidator("json", z.object({
  topic: z.string(),
  message: enhancedMessageSchema,
})), async (c) => {
  const { topic, message } = await c.req.json();

  try {
    await c.var.fcm.sendToTopic(message as EnhancedFcmMessage, topic);
    return c.json({ success: true });
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }
});

app.post("/v2/push-condition", zValidator("json", z.object({
  condition: z.string(),
  message: enhancedMessageSchema,
})), async (c) => {
  const { condition, message } = await c.req.json();

  try {
    await c.var.fcm.sendToCondition(message as EnhancedFcmMessage, condition);
    return c.json({ success: true });
  } catch (error) {
    console.log(error);
    return c.var.error.response(400, "Sending Failed", error.message);
  }
});

export default app;
