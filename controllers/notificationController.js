const models = require('../models');
const apiResponse = require('../utils/apiResponse');

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