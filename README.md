# FCM Cloudflare Workers

[![npm version](https://badge.fury.io/js/fcm-cloudflare-workers.svg)](https://badge.fury.io/js/fcm-cloudflare-workers)

Send Firebase Cloud Messages (FCM) through the FCM HTTP v1 API on Cloudflare Workers.

This project is a fork of [fcm-http2](https://www.npmjs.com/package/fcm-http2) and has been modified to work with Cloudflare Workers.

## Features

- 🚀 Full support for FCM HTTP v1 API message format
- 💪 TypeScript support with comprehensive type definitions
- ⚡️ Optimized for Cloudflare Workers
- 🔄 Automatic token rotation and caching
- 📦 Batched message sending support
- 🎯 Multiple targeting options (token, topic, condition)
- ✨ Zero dependencies

## Installation

```bash
npm install fcm-cloudflare-workers
```

## Usage

### Initialize FCM

```typescript
import { FCM, FcmOptions } from 'fcm-cloudflare-workers';

// Init FCM with options (minimal example)
const fcmOptions = new FcmOptions({
    // Pass in your service account JSON private key file (https://console.firebase.google.com/u/0/project/_/settings/serviceaccounts/adminsdk)
    serviceAccount: JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON),
});

// Or, init FCM with access token caching using KV (optional but recommended for performance)
const fcmOptions = new FcmOptions({
    serviceAccount: JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON),
    // Specify a KV namespace
    kvStore: env.MY_KV_NAMESPACE,
    // Specify a key to use for caching the access token
    kvCacheKey: 'fcm_access_token',
});

const fcm = new FCM(fcmOptions);
```

### Send to Single Device

```typescript
import { EnhancedFcmMessage } from 'fcm-cloudflare-workers';

const message: EnhancedFcmMessage = {
    notification: {
        title: "New Message",
        body: "You have a new message!",
        image: "https://example.com/image.png" 
    },
    data: {
        key: "value",
    },
    // Optional platform-specific configurations
    android: {
        notification: {
            click_action: "OPEN_MESSAGE",
            channel_id: "messages",
            icon: "message_icon"
        }
    },
    apns: {
        payload: {
            aps: {
                badge: 1,
                sound: "default"
            }
        }
    },
    webpush: {
        notification: {
            icon: "https://example.com/icon.png",
            badge: "https://example.com/badge.png",
            actions: [
                {
                    action: "view",
                    title: "View Message"
                }
            ]
        }
    }
};

try {
    await fcm.sendToToken(message, "device-token");
} catch (error) {
    console.error("Error sending message:", error);
}
```

### Send to Multiple Devices

```typescript
const tokens = [
    "device-token-1",
    "device-token-2",
    "device-token-3"
];

try {
    const unregisteredTokens = await fcm.sendToTokens(message, tokens);
    if (unregisteredTokens.length > 0) {
        console.log("Some tokens are no longer registered:", unregisteredTokens);
    }
} catch (error) {
    console.error("Error sending to multiple devices:", error);
}
```

### Send to Topic

```typescript
try {
    await fcm.sendToTopic(message, "news");
} catch (error) {
    console.error("Error sending to topic:", error);
}
```

### Send with Condition

```typescript
try {
    await fcm.sendToCondition(message, "'sports' in topics && 'news' in topics");
} catch (error) {
    console.error("Error sending to condition:", error);
}
```

## Migration Guide

### Upgrading from `sendMulticast`

The `sendMulticast` method is now deprecated in favor of the new `sendToTokens` method. Here's how to upgrade your code:

```typescript
// Old way (deprecated)
import { FCM, FcmMessage } from 'fcm-cloudflare-workers';

const message: FcmMessage = {
    notification: {
        title: "Hello",
        body: "World"
    },
    data: {
        key: "value"
    }
};

const unregisteredTokens = await fcm.sendMulticast(message, tokens);

// New way
import { FCM, EnhancedFcmMessage } from 'fcm-cloudflare-workers';

const message: EnhancedFcmMessage = {
    notification: {
        title: "Hello",
        body: "World"
    },
    data: {
        key: "value"
    },
    // Now you can also use platform-specific configurations
    android: {
        notification: {
            channel_id: "default"
        }
    }
};

const unregisteredTokens = await fcm.sendToTokens(message, tokens);
```

The new `sendToTokens` method:
- Maintains the same batching and performance optimizations as `sendMulticast`
- Returns unregistered tokens in the same way
- Adds support for all FCM HTTP v1 API message properties (android, apns, webpush, etc.)
- Provides better TypeScript type safety

## API Reference

### FCM Methods

- `sendToToken(message: EnhancedFcmMessage, token: string): Promise<void>`
  Sends a message to a single device using its FCM token.

- `sendToTokens(message: EnhancedFcmMessage, tokens: string[]): Promise<string[]>`
  Sends a message to multiple devices. Returns an array of tokens that are no longer registered.

- `sendToTopic(message: EnhancedFcmMessage, topic: string): Promise<void>`
  Sends a message to all devices subscribed to a specific topic.

- `sendToCondition(message: EnhancedFcmMessage, condition: string): Promise<void>`
  Sends a message to devices that match the specified condition.

- `sendMulticast(message: FcmMessage, tokens: string[]): Promise<string[]>`
  **Deprecated**: Use `sendToTokens` instead. Kept for backward compatibility.

## Contributions

This repo is based on previous work by [kenble](https://gitlab.com/kenble) and [eladnava](https://github.com/eladnava).

## Support

Please open an issue on this repo if you have any questions or need support.

## License

Apache-2.0
