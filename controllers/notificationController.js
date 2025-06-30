const models = require('../models');
const apiResponse = require('../utils/apiResponse');
const { sendNotification } = require('../utils/notification'); // Make sure this util exists

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit, 10) || 20;
    const offset = parseInt(req.query.offset, 10) || 0;

    const notifications = await models.Notification.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    return apiResponse.SuccessResponseWithData(res, 'Notifications fetched successfully', notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { user_id, message } = req.body;
    // user_id: the recipient user
    // notification_type: integer (e.g. 2 for message)
    // message: notification message

    if (!user_id  || !message) {
      return apiResponse.ValidationError(res, 'user_id, notification_type, and message are required');
    }

    // Fetch recipient user to check notification preferences
    const recipient = await models.User.findByPk(user_id, {
      attributes: ['id', 'full_name', 'notification_type']
    });

    if (!recipient) {
      return apiResponse.NotFound(res, 'Recipient user not found');
    }

    // Default notification_type for message is 2
    const notification_type = 2;

    // Check if recipient wants message notifications
    const notificationTypes = recipient.notification_type
      ? recipient.notification_type.toString().split(',').map(Number)
      : [];
    if (!notificationTypes.includes(2)) {
      // Still create notification in DB, but skip push
      const notification = await models.Notification.create({
        user_id,
        notification_type,
        message,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return apiResponse.SuccessResponseWithData(res, 'Notification created (push skipped by user preference)', notification);
    }

    // Create notification in DB
    const notification = await models.Notification.create({
      user_id,
      notification_type,
      message,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Send push notification via FCM
    const fcmTokens = await models.FcmToken.findAll({
      where: { user_id }
    });
    const tokens = fcmTokens.map(t => t.token).filter(Boolean);

    if (tokens.length > 0) {
      try {
        await sendNotification({
          token: tokens,
          notification: {
            title: 'New Message',
            body: message
          },
          data: {
            type: '2',
            notification_id: notification.id.toString(),
            timestamp: Date.now().toString(),
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          }
        });
      } catch (err) {
        console.error('Notification send error:', err);
        // Optionally handle failed tokens
      }
    }

    return apiResponse.SuccessResponseWithData(res, 'Notification created', notification);
  } catch (error) {
    console.error('Error creating notification:', error);
    return apiResponse.InternalServerError(res, error);
  }
};