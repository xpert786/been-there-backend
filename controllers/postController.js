const { validationResult } = require('express-validator');
const models = require('../models');
const Post = models.Post;
const Photo = models.Photo;
const apiResponse = require('../utills/apiResponse');
const { Op } = require('sequelize');
const Follower = models.Follower;
const Comment = models.Comment;
const User = models.User;
const Wishlist = models.Wishlist;
const TopDestination = models.TopDestination;
const Highlight = models.Highlight;

exports.createPost = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.ValidationError(res, errors.array().map(err => err.msg).join(', '));
  }

  const { country, visit_date, reason_for_visit, overall_rating, experience, cost_rating, safety_rating, food_rating, place_type, longitude, latitude } = req.body;

  try {
    // Extract user ID from the token
    const user_id = req.user.id;

    // Create the post
    const newPost = await Post.create({
      country,
      visit_date,
      reason_for_visit,
      overall_rating,
      experience,
      cost_rating,
      safety_rating,
      food_rating,
      place_type,
      longitude,  
      latitude,   
      user_id,
    });

    // Handle photo uploads
    // if (req.files && req.files.length > 0) {
    //   const photoPromises = req.files.map(file =>
    //     Photo.create({
    //       post_id: newPost.id,
    //       image_url: file.path, // Store the file path
    //     })
    //   );
    //   await Promise.all(photoPromises);
    // }

    return apiResponse.SuccessResponseWithData(res, 'Post created successfully', newPost);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getPosts = async (req, res) => {
  const { type, page = 1, limit = 10 } = req.query;

  try {
    const user_id = req.user.id;
    let posts, totalCount;

    if (type === '1') {
      // Discover: Fetch all posts
      totalCount = await Post.count(); // Count total posts
      posts = await Post.findAll({
        include: [
          {
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'image'],
          },
          {
            model: Photo,
            attributes: ['id', 'image_url'],
          },
        ],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
      });
    } else if (type === '2') {
      // Following: Fetch posts of followed users
      const followedUsers = await Follower.findAll({
        where: { follower_id: user_id },
        attributes: ['user_id'],
      });

      const followedUserIds = followedUsers.map(f => f.user_id);

      totalCount = await Post.count({ where: { user_id: { [Op.in]: followedUserIds } } }); // Count posts of followed users
      posts = await Post.findAll({
        where: { user_id: { [Op.in]: followedUserIds } },
        include: [
          {
            model: models.User,
            attributes: ['id', 'full_name', 'email', 'image'],
          },
          {
            model: Photo,
            attributes: ['id', 'image_url'],
          },
        ],
        limit: parseInt(limit),
        offset: (page - 1) * limit,
      });
    } else {
      return apiResponse.ValidationError(res, 'Invalid type parameter');
    }

    return apiResponse.SuccessResponseWithData(res, 'Posts retrieved successfully', {
      posts,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getPostDetail = async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    const post = await Post.findOne({
      where: { id: postId },
      include: [
        {
          model: User,
          attributes: ['id', 'full_name', 'email', 'image'],
        },
        {
          model: Photo,
          attributes: ['id', 'image_url'],
        },
      ],
      attributes: { exclude: ['like_count', 'comment_count'] }, // Exclude duplicate columns
    });

    if (!post) {
      return apiResponse.NotFound(res, 'Post not found');
    }

    const totalComments = await Comment.count({ where: { post_id: postId } }); // Count total comments
    const comments = await Comment.findAll({
      where: { post_id: postId },
      include: [
        {
          model: User,
          attributes: ['id', 'full_name', 'image'],
        },
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    return apiResponse.SuccessResponseWithData(res, 'Post details retrieved successfully', {
      post,
      comments,
      totalComments,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalComments / limit),
    });
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getUserDetails = async (req, res) => {
  const { id: currentUserId } = req.user;
  const { userId } = req.params;

  try {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Wishlist, attributes: ["id", "destination"] },
        { model: TopDestination, attributes: ["id", "name", "image", "rating"] },
        { model: Highlight, attributes: ["id", "type", "value"] },
      ],
    });

    if (!user) {
      return apiResponse.NotFound(res, "User not found");
    }

    const totalPosts = await Post.count({ where: { user_id: userId } });
    const totalFollowers = await Follower.count({ where: { user_id: userId } });
    const totalFollowing = await Follower.count({ where: { follower_id: userId } });

    // Check if current user is the owner of the profile being viewed
    const isOwner = currentUserId === userId; // No need for parseInt if IDs are same type

    return apiResponse.SuccessResponseWithData(res, "User details retrieved successfully", {
      user: {
        ...user.toJSON(),
        stats: {
          totalPosts,
          totalFollowers,
          totalFollowing,
        },
        follow: isOwner ? null : await Follower.findOne({
          where: { user_id: userId, follower_id: currentUserId },
        }) ? "following" : "follow",
        owner: isOwner,
      },
    });

  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};


