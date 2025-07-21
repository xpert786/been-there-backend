const models = require('../models');
const apiResponse = require('../utils/apiResponse');
const User = models.User;
const UserBlock = models.UserBlock;

/**
 * @desc Block a user
 * @route POST /user-block/block
 * @access Private
 */
const blockUser = async (req, res) => {
  const userId = req.user.id;
  const { target_user_id } = req.body;
  if (!target_user_id) return apiResponse.ValidationError(res, 'target_user_id is required');
  if (userId === target_user_id) return apiResponse.ValidationError(res, 'Cannot block yourself');
  try {
    const [block, created] = await UserBlock.findOrCreate({
      where: { user_id: userId, target_user_id }
    });
    if (!created) return apiResponse.ValidationError(res, 'User already blocked');
    return apiResponse.SuccessResponseWithOutData(res, 'User blocked successfully');
  } catch (err) {
    return apiResponse.InternalServerError(res, err.message || err);
  }
};

/**
 * @desc Unblock a user
 * @route POST /user-block/unblock
 * @access Private
 */
const unblockUser = async (req, res) => {
  const userId = req.user.id;
  const { target_user_id } = req.body;
  if (!target_user_id) return apiResponse.ValidationError(res, 'target_user_id is required');
  try {
    const deleted = await UserBlock.destroy({ where: { user_id: userId, target_user_id } });
    if (!deleted) return apiResponse.NotFound(res, 'Block not found');
    return apiResponse.SuccessResponseWithOutData(res, 'User unblocked successfully');
  } catch (err) {
    return apiResponse.InternalServerError(res, err.message || err);
  }
};

/**
 * @desc Get all users blocked by the current user
 * @route GET /user-block/blocked
 * @access Private
 */
const getBlockedUsers = async (req, res) => {
  const userId = req.user.id;
  try {
    const blocks = await UserBlock.findAll({
      where: { user_id: userId },
      include: [{
        model: User,
        as: 'blocked',
        attributes: ['id', 'full_name', 'email', 'image']
      }]
    });
    const users = blocks.map(b => b.blocked);
    return apiResponse.SuccessResponseWithData(res, 'Blocked users fetched', users);
  } catch (err) {
    return apiResponse.InternalServerError(res, err.message || err);
  }
};

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers
};
