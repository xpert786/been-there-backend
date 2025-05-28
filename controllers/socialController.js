const models = require('../models');
const { User, Post, Like, Comment, Follower, Wishlist, TopDestination, Photo } = models;
const { Op } = require('sequelize');
const moment = require('moment');
const apiResponse = require('../utils/apiResponse');
const s3Util = require('../utils/s3');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // temp local storage
const { firestore, admin } = require('../firebase.config');


// Helper function to generate consistent chat IDs
function getChatId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}
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
      attributes: ['id', 'full_name', 'image', 'email']
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

    // Prepare chatId and chatRef
    const chatId = getChatId(userId, targetUserId);
    const chatRef = firestore.collection("chats").doc(chatId);
    let chatDoc = await chatRef.get();
    let membersInfo;

    if (!chatDoc.exists) {
      // Only create chat if it doesn't exist
      await chatRef.set({
        id: chatId,
        members: [userId, targetUserId],
        membersInfo: [
          {
            id: currentUser.id,
            name: currentUser.full_name,
            image: currentUser.image,
            email: currentUser.email
          },
          {
            id: targetUser.id,
            name: targetUser.full_name,
            image: targetUser.image,
            email: targetUser.email
          }
        ],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      membersInfo = [
        {
          id: currentUser.id,
          name: currentUser.full_name,
          image: currentUser.image,
          email: currentUser.email
        },
        {
          id: targetUser.id,
          name: targetUser.full_name,
          image: targetUser.image,
          email: targetUser.email
        }
      ];
    } else {
      // If chat exists, get membersInfo from Firestore
      const data = chatDoc.data();
      membersInfo = data && data.membersInfo ? data.membersInfo : [];
    }

    if (existingFollow) {
      // Unfollow
      await Follower.destroy({
        where: { user_id: targetUserId, follower_id: userId },
      });

      // Optional: Delete chat if required
      // await chatRef.delete();

      return apiResponse.SuccessResponseWithData(res, "Successfully unfollowed user", {
        isFollowing: false,
        chatId,
        membersInfo,
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

      return apiResponse.SuccessResponseWithData(res, "Successfully followed user", {
        isFollowing: true,
        chatId,
        membersInfo,
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
    const post = await Post.findByPk(post_id);
    if (!post) {
      return apiResponse.NotFound(res, "Post not found.");
    }

    const existingLike = await models.Like.findOne({
      where: { user_id, post_id },
    });

    if (existingLike) {
      // Unlike
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
      // Like
      await models.Like.create({ user_id, post_id });

      await Post.increment("like_count", {
        where: { id: post_id },
      });

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

    const post = await Post.findByPk(postId);
    if (!post) {
      return apiResponse.NotFound(res, "Post not found.");
    }

    await Comment.create({ post_id: postId, user_id: userId, comment });

    post.comment_count += 1;
    await post.save();

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





