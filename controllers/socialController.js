const { User, Post, Like, Comment, Follower } = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const apiResponse = require('../utills/apiResponse');
const models = require('../models');

exports.followUser = async (req, res) => {
  const { id: user_id } = req.user;
  const { target_user_id } = req.body;

  try {
    if (user_id === target_user_id) {
      return apiResponse.ValidationError(res, "You cannot follow yourself.");
    }

    const existingFollow = await Follower.findOne({
      where: { user_id: target_user_id, follower_id: user_id },
    });

    if (existingFollow) {
      // Unfollow
      await Follower.destroy({
        where: { user_id: target_user_id, follower_id: user_id },
      });
      return apiResponse.SuccessResponseWithData(res, "Successfully unfollowed user", {
        isFollowing: false,
      });
    } else {
      // Follow
      await Follower.create({ user_id: target_user_id, follower_id: user_id });
      return apiResponse.SuccessResponseWithData(res, "Successfully followed user", {
        isFollowing: true,
      });
    }
  } catch (error) {
    console.error("Toggle follow error:", error);
    return apiResponse.InternalServerError(res, error);
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


