const { admin } = require('../firebase.config');

/**
 * Send a push notification using Firebase Cloud Messaging
 * @param {Object} options
 * @param {string|string[]} options.token - Device token(s) or topic
 * @param {Object} options.notification - { title, body, imageUrl? }
 * @param {Object} [options.data] - Additional data payload
 * @param {number} [options.retryCount=1] - Number of retry attempts
 * @returns {Promise<Object>} Firebase response
 */
async function sendNotification({ token, notification, data = {}, retryCount = 1 }) {
  const message = {
    notification: {
      ...notification,
    },
    data: {
      ...data,
      // Ensure all values are strings
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      )
    },
    // Android specific config
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channel_id: 'default_channel'
      }
    },
    // APNS specific config
    apns: {
      payload: {
        aps: {
          sound: 'default'
        }
      }
    }
  };

  const sendWithRetry = async (msg, t, attemptsLeft) => {
    try {
      console.log('Sending notification to token:', t, msg);
      const result = await admin.messaging().send(msg);
      return { token: t, result };
    } catch (error) {
      console.error('Error sending notification to token:', t, error);
      if (attemptsLeft > 1) {
        console.log(`Retrying (${retryCount - attemptsLeft + 1}/${retryCount})...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendWithRetry(msg, t, attemptsLeft - 1);
      }
      return { token: t, error: error.message };
    }
  };

  if (Array.isArray(token)) {
    // Process tokens in parallel with a limit of 5 concurrent sends
    const BATCH_SIZE = 5;
    const results = [];
    
    for (let i = 0; i < token.length; i += BATCH_SIZE) {
      const batch = token.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(t => {
          const msg = { ...message, token: t };
          return sendWithRetry(msg, t, retryCount);
        })
      );
      results.push(...batchResults);
    }
    
    return results;
  } else if (typeof token === 'string') {
    if (token.startsWith('/topics/')) {
      message.topic = token.replace('/topics/', '');
    } else {
      message.token = token;
    }
    return sendWithRetry(message, token, retryCount);
  } else {
    throw new Error('Invalid token parameter');
  }
}

module.exports = { sendNotification };