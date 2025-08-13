const models = require('../models');
const { User, Post, Like, Comment, Follower, Wishlist, TopDestination, Photo } = models;
const { Op } = require('sequelize');
const moment = require('moment');
const apiResponse = require('../utils/apiResponse');
const s3Util = require('../utils/s3');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // temp local storage
const { firestore, admin } = require('../firebase.config');
const { sendNotification } = require('../utils/notification'); // Add this import


exports.followUser = async (req, res) => {
  const { id: userId } = req.user;
  const { target_user_id: targetUserId } = req.body;

  try {
    if (!targetUserId) {
      return apiResponse.ValidationError(res, "Target user ID is required.");
    }
    
    if (userId === targetUserId) {
      return apiResponse.ValidationError(res, "You cannot follow yourself.");
    }

    // Fetch target user details
    const targetUser = await User.findByPk(targetUserId, {
      attributes: ['id', 'full_name', 'image', 'email', 'notification_type']
    });
    if (!targetUser) {
      return apiResponse.NotFound(res, "Target user not found.");
    }

    // Fetch current user details
    const currentUser = await User.findByPk(userId, {
      attributes: ['id', 'full_name', 'image', 'email']
    });
    if (!currentUser) {
      return apiResponse.NotFound(res, "Current user not found.");
    }

    // Check if already following
    const existingFollow = await Follower.findOne({
      where: { user_id: targetUserId, follower_id: userId },
    });

    if (existingFollow) {
      // Unfollow
      await Follower.destroy({
        where: { user_id: targetUserId, follower_id: userId },
      });

      return apiResponse.SuccessResponseWithData(res, "Successfully unfollowed user", {
        isFollowing: false,
        user: {
          id: targetUser.id,
          name: targetUser.full_name,
          image: targetUser.image,
          email: targetUser.email
        }
      });
    } else {
      // Follow
      await Follower.create({ user_id: targetUserId, follower_id: userId });

      // --- Notification logic for follow ---
      // Notification type 4: follow
      const notificationTypes = targetUser.notification_type
        ? targetUser.notification_type.toString().split(',').map(Number)
        : [];
      if (notificationTypes.includes(4)) {
        const message = `${currentUser.full_name || 'Someone'} started following you.`;
        // Store notification in DB
        const notification = await models.Notification.create({
          user_id: targetUser.id,
          notification_type: 4,
          message,
          reference_id: userId, // reference to the follower
          is_read: false,
          sender_id: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Send push notification
        const fcmTokens = await models.FcmToken.findAll({
          where: { user_id: targetUser.id }
        });
        if (fcmTokens.length > 0) {
          const tokens = fcmTokens.map(t => t.token).filter(Boolean);
          try {
            await sendNotification({
              token: tokens,
              notification: {
                title: 'New Follower',
                body: message,
                ...(currentUser.image && { imageUrl: currentUser.image })
              },
              data: {
                type: '4',
                follower_id: userId.toString(),
                notification_id: notification.id.toString(),
                sender_id: userId.toString(),
                timestamp: Date.now().toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            });
          } catch (err) {
            console.error('Notification send error:', err);
            await handleFailedNotifications(err, tokens, targetUser.id);
          }
        }
      }
      // --- End notification logic ---

      return apiResponse.SuccessResponseWithData(res, "Successfully followed user", {
        isFollowing: true,
        user: {
          id: targetUser.id,
          name: targetUser.full_name,
          image: targetUser.image,
          email: targetUser.email
        }
      });
    }
  } catch (error) {
    console.error("Toggle follow error:", error);
    return apiResponse.InternalServerError(res, error.message || "Something went wrong.");
  }
};

exports.likePost = async (req, res) => {
  const { id: user_id } = req.user;
  const { post_id } = req.body;

  try {
    console.log('likePost called by user:', user_id, 'for post:', post_id);

    // Fetch post with owner (User) information
    const post = await Post.findByPk(post_id, {
      include: [{
        model: User,
        attributes: ['id', 'full_name', 'notification_type']
      }]
    });

    if (!post) {
      console.log('Post not found:', post_id);
      return apiResponse.NotFound(res, "Post not found.");
    }

    const postOwner = post.User;
    console.log('Post owner:', postOwner ? postOwner.id : null);

    if (!postOwner) {
      console.error('Post owner not found');
      return apiResponse.SuccessResponseWithData(res, "Successfully liked post", {
        isLiked: true,
      });
    }

    const existingLike = await models.Like.findOne({
      where: { user_id, post_id },
    });

    if (existingLike) {
      console.log('User already liked post, unliking...');
      await models.Like.destroy({
        where: { user_id, post_id },
      });

      await Post.decrement("like_count", {
        where: { id: post_id },
      });

      return apiResponse.SuccessResponseWithData(res, "Successfully unliked post", {
        isLiked: false,
      });
    } else {
      console.log('User is liking the post...');
      await models.Like.create({ user_id, post_id });
      await Post.increment("like_count", { where: { id: post_id } });

      // --- Notification logic ---
      if (user_id !== postOwner.id) {
        const liker = await User.findByPk(user_id, {
          attributes: ['id', 'full_name', 'image']
        });
        console.log('Liker:', liker ? liker.full_name : null);

        const notificationTypes = postOwner.notification_type 
          ? postOwner.notification_type.toString().split(',').map(Number)
          : [];
        console.log('Post owner notification types:', notificationTypes);

        if (notificationTypes.includes(3)) {
          const message = `${liker.full_name || 'Someone'} liked your post.`;
          console.log('Creating notification in DB with message:', message);

          const notification = await models.Notification.create({
            user_id: postOwner.id,
            notification_type: 3,
            message,
            reference_id: post_id,
            is_read: false,
            sender_id: user_id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('Notification DB entry created:', notification);

          // Send push notification
          const fcmTokens = await models.FcmToken.findAll({
            where: { 
              user_id: postOwner.id
            }
          });
          console.log('FCM tokens for post owner:', fcmTokens.map(t => t.token));

          if (fcmTokens.length > 0) {
            const tokens = fcmTokens.map(t => t.token).filter(Boolean);
            try {
              const sendResult = await sendNotification({
                token: tokens,
                notification: {
                  title: 'New Like',
                  body: message,
                  ...(liker.image && { imageUrl: liker.image })
                },
                data: {
                  type: '3',
                  post_id: post_id.toString(),
                  notification_id: notification.id.toString(),
                  sender_id: user_id.toString(),
                  timestamp: Date.now().toString(),
                  click_action: 'FLUTTER_NOTIFICATION_CLICK'
                }
              });
              console.log('Notification send result:', sendResult);
            } catch (err) {
              console.error('Notification send error:', err);
              await handleFailedNotifications(err, tokens, postOwner.id);
            }
          } else {
            console.log('No valid FCM tokens found for post owner.');
          }
        } else {
          console.log('Post owner does not want like/comment notifications.');
        }
      } else {
        console.log('User liked their own post, no notification sent.');
      }

      return apiResponse.SuccessResponseWithData(res, "Successfully liked post", {
        isLiked: true,
      });
    }
  } catch (error) {
    console.error("Toggle like error:", error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.commentOnPost = async (req, res) => {
  const { postId } = req.params;
  const { comment } = req.body;

  try {
    const userId = req.user.id;

    // Fetch post with owner (User) information
    const post = await Post.findByPk(postId, {
      include: [{
        model: User,
        attributes: ['id', 'full_name', 'notification_type']
      }]
    });
    if (!post) {
      return apiResponse.NotFound(res, "Post not found.");
    }

    // Access the user through the automatically generated association
    const postOwner = post.User;

    await Comment.create({ post_id: postId, user_id: userId, comment });

    post.comment_count += 1;
    await post.save();

    // --- Notification logic ---
    if (postOwner && userId !== postOwner.id) {
      const commenter = await User.findByPk(userId, {
        attributes: ['id', 'full_name', 'image']
      });

      const notificationTypes = postOwner.notification_type
        ? postOwner.notification_type.toString().split(',').map(Number)
        : [];
      // 3: like and comment
      if (notificationTypes.includes(3)) {
        const message = `${commenter.full_name || 'Someone'} commented on your post.`;

        // Store notification in DB
        const notification = await models.Notification.create({
          user_id: postOwner.id,
          notification_type: 3,
          message,
          reference_id: postId,
          is_read: false,
          sender_id: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Send push notification
        const fcmTokens = await models.FcmToken.findAll({
          where: { user_id: postOwner.id }
        });
        if (fcmTokens.length > 0) {
          const tokens = fcmTokens.map(t => t.token).filter(Boolean);
          try {
            await sendNotification({
              token: tokens,
              notification: {
                title: 'New Comment',
                body: message,
                ...(commenter.image && { imageUrl: commenter.image })
              },
              data: {
                type: '3',
                post_id: postId.toString(),
                notification_id: notification.id.toString(),
                sender_id: userId.toString(),
                timestamp: Date.now().toString(),
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            });
          } catch (err) {
            console.error('Notification send error:', err);
            await handleFailedNotifications(err, tokens, postOwner.id);
          }
        }
      }
    }

    return apiResponse.SuccessResponseWithOutData(res, "Comment added successfully.");
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Get all top destinations for a user (userId from query or path)
exports.getTopDestinations = async (req, res) => {
  const user_id = req.query.userId || req.params.userId;
  const { filterValue } = req.query;
  try {
    if (!user_id) {
      return apiResponse.ValidationError(res, 'userId is required');
    }
    const whereClause = { user_id };
    if (filterValue) {
      whereClause.value = { [Op.like]: filterValue.toLowerCase() };
    }
    const topDestinations = await TopDestination.findAll({
      where: whereClause,
      order: [['count', 'DESC']]
    });
    const result = [];
    for (const dest of topDestinations) {
      let postWhere = {
        [Op.or]: [
          { continent: dest.value },
          { country: dest.value },
          { city: dest.value }
        ]
      };
      const posts = await Post.findAll({
        where: postWhere,
        include: [
          { model: User, attributes: ['id', 'full_name', 'image'] },
          { model: Photo, attributes: ['id', 'image_url'] }
        ],
        order: [['createdAt', 'DESC']]
      });
      result.push({
        destinationId: dest.id,
        type: dest.type,
        value: dest.value,
        count: dest.count,
        visited: dest.visited,
        posts
      });
    }
    return apiResponse.SuccessResponseWithData(res, 'Top destinations fetched successfully', result);
  } catch (error) {
    console.error('Error in getTopDestinations:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Get all wishlist items for a user (userId from query or path)
exports.getAllWishlist = async (req, res) => {
  try {
    const user_id = req.query.userId || req.params.userId;
    if (!user_id) {
      return apiResponse.ValidationError(res, 'userId is required');
    }
    const wishlist = await Wishlist.findAll({
      where: { user_id },
      include: [
        {
          model: Post,
          include: [
            { model: User, attributes: ['id', 'full_name', 'image'] },
            { model: Photo, attributes: ['id', 'image_url'] }
          ]
        }
      ]
    });
    return apiResponse.SuccessResponseWithData(res, 'Wishlist fetched successfully', wishlist);
  } catch (error) {
    console.error('Error in getAllWishlist:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

/**
 * @swagger
 * /image/upload:
 *   post:
 *     summary: Upload an image to S3
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       400:
 *         description: No image provided
 *       500:
 *         description: Internal server error
 */
exports.uploadImage = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return apiResponse.ValidationError(res, 'No image provided');
      }
      const url = await s3Util.uploadToS3(req.file);
      return apiResponse.SuccessResponseWithData(res, 'Image uploaded successfully', { url });
    } catch (error) {
      console.error('Error uploading image:', error);
      return apiResponse.InternalServerError(res, error);
    }
  }
];

/**
 * @swagger
 * /image/delete:
 *   delete:
 *     summary: Delete an image from S3
 *     tags: [Social]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *                 description: S3 object key (e.g. "uploads/filename.jpg")
 *     responses:
 *       200:
 *         description: Image deleted successfully
 *       400:
 *         description: Key is required
 *       500:
 *         description: Internal server error
 */
exports.deleteImage = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return apiResponse.ValidationError(res, 'Key is required');
    }
    await s3Util.deleteFromS3(key);
    return apiResponse.SuccessResponseWithOutData(res, 'Image deleted successfully');
  } catch (error) {
    console.error('Error deleting image:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Check if a user has enabled message requests
exports.checkMessageRequestEnabled = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId, { attributes: ['id', 'message_request'] });
    if (!user) {
      return apiResponse.NotFound(res, 'User not found');
    }
    // If the field is undefined/null, treat as false
    return apiResponse.SuccessResponseWithData(res, 'Message request status retrieved', {
      messageRequestEnabled: !!user.message_request_enabled
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { search } = req.query; // Get search parameter

    // Get all Follower records where current user is the follower
    const followingRecords = await Follower.findAll({
      where: { follower_id },
      attributes: ['user_id', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });

    // Extract user_ids
    const userIds = followingRecords.map(f => f.user_id);

    // Build user query with optional search
    const userWhere = { id: userIds };
    if (search) {
      userWhere.full_name = { [Op.iLike]: `%${search}%` }; // Case-insensitive search
    }

    // Fetch user details for all followed users (with search if provided)
    const users = await User.findAll({
      where: userWhere,
      attributes: ['id', 'full_name', 'email', 'image', 'address']
    });

    // Map user details with followedAt
    const following = users.map(user => {
      const record = followingRecords.find(f => f.user_id === user.id);
      return {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        image: user.image,
        address: user.address,
        followedAt: record ? record.createdAt : null
      };
    });

    return apiResponse.SuccessResponseWithData(
      res,
      'Following list retrieved successfully',
      { following }
    );
  } catch (error) {
    console.error('Error in getFollowing:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Helper function to handle failed notifications
async function handleFailedNotifications(error, tokens, user_id) {
  console.log('Handling failed notifications:', error, tokens, user_id);
  // Example: Mark tokens as invalid if Firebase returns invalid/expired token errors
  const invalidTokenErrors = [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered'
  ];
  if (error.code && invalidTokenErrors.includes(error.code)) {
    // If error.details is available and is an array, extract tokens from it
    const invalidTokens = Array.isArray(error.details)
      ? error.details.map(d => d.token)
      : tokens;

    await models.FcmToken.update(
      { is_valid: false },
      {
        where: {
          user_id,
          token: invalidTokens
        }
      }
    );
    console.log(`Marked ${invalidTokens.length} invalid FCM tokens`);
  }
}




