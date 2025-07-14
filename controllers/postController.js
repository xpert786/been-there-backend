const { validationResult } = require('express-validator');
const models = require('../models');
const Post = models.Post;
const Photo = models.Photo;
const apiResponse = require('../utils/apiResponse');
const { Op } = require('sequelize');
const Follower = models.Follower;
const Comment = models.Comment;
const User = models.User;
const Wishlist = models.Wishlist;
const TopDestination = models.TopDestination;
const Highlight = models.Highlight;
const FlaggedContent = models.flaggedContent;


const countryToContinent = require('../utils/countryToContinent');
const s3Util = require('../utils/s3');

exports.createPost = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.ValidationError(res, errors.array().map(err => err.msg).join(', '));
  }

  const {
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
    city
  } = req.body;

  try {
    const user_id = req.user.id;
    const normCountry = country ? country.trim().toLowerCase() : '';
    const normCity = city ? city.trim().toLowerCase() : '';
    const continent = countryToContinent(normCountry);

    // Create the post
    const newPost = await Post.create({
      country,
      city,
      continent,
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

    // --- Upload Photos to S3 ---
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const image_url = await s3Util.uploadToS3(file);
        await Photo.create({ post_id: newPost.id, image_url }); // use image_url, not url
      }
    }

    // --- Upsert Highlights & Top Destinations ---
    async function upsertHighlightAndTopDestination(user_id, type, value) {
      const [highlight, created] = await Highlight.findOrCreate({
        where: { user_id, type, value: value.toLowerCase() },
        defaults: { count: 1 }
      });
      if (!created) {
        highlight.count += 1;
        await highlight.save();
      }

      const [top, topCreated] = await TopDestination.findOrCreate({
        where: { user_id, type, value: value.toLowerCase() },
        defaults: { count: 1, visited: true }
      });
      if (!topCreated) {
        top.count += 1;
        top.visited = true;
        await top.save();
      }
    }

    await upsertHighlightAndTopDestination(user_id, 'continent', continent);
    if (normCountry) await upsertHighlightAndTopDestination(user_id, 'country', normCountry);
    if (normCity) await upsertHighlightAndTopDestination(user_id, 'city', normCity);

    const types = ['continent', 'country', 'city'];
    for (const type of types) {
      const tops = await TopDestination.findAll({
        where: { user_id, type },
        order: [['count', 'DESC']],
      });
      if (tops.length > 3) {
        const toDelete = tops.slice(3);
        for (const d of toDelete) await d.destroy();
      }
    }

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

    // Add isLiked field for each post
    const postIds = posts.map(post => post.id);
    const likes = await models.Like.findAll({
      where: { user_id, post_id: { [Op.in]: postIds } },
      attributes: ['post_id']
    });
    const likedPostIds = new Set(likes.map(like => like.post_id));

    const postsWithIsLiked = posts.map(post => {
      const postObj = post.toJSON();
      postObj.isLiked = likedPostIds.has(post.id);
      return postObj;
    });

    return apiResponse.SuccessResponseWithData(res, 'Posts retrieved successfully', {
      posts: postsWithIsLiked,
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
    const user_id = req.user.id;
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
    });

    if (!post) {
      return apiResponse.NotFound(res, 'Post not found');
    }

    // Check if current user has liked this post
    const like = await models.Like.findOne({ where: { user_id, post_id: postId } });
    const isLiked = !!like;

    // Check if current user has wishlisted this post
    const wishlist = await Wishlist.findOne({ where: { user_id, post_id: postId } });
    const isWishlisted = !!wishlist;

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

    // Add isLiked and isWishlisted to post object
    const postObj = post.toJSON();
    postObj.isLiked = isLiked;
    postObj.isWishlisted = isWishlisted;

    return apiResponse.SuccessResponseWithData(res, 'Post details retrieved successfully', {
      post: postObj,
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
    // Only select fields that actually exist in TopDestination table
    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Wishlist, attributes: ["id", "destination"] },
        { model: TopDestination, attributes: ["id", "type", "value", "count", "visited", "createdAt", "updatedAt"] },
        { model: Highlight, attributes: ["id", "type", "value"] },
      ],
    });

    if (!user) {
      return apiResponse.NotFound(res, "User not found");
    }

    // Check for public profile sharing
    if (user.public_profile === false) {
      return apiResponse.ValidationError(res, "User profile is private");
    }

    const totalPosts = await Post.count({ where: { user_id: userId } });
    const totalFollowers = await Follower.count({ where: { user_id: userId } });
    const totalFollowing = await Follower.count({ where: { follower_id: userId } });

    // Check if current user is the owner of the profile being viewed
    const isOwner = currentUserId === userId;

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

exports.wishlistPost = async (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user.id;

  if (!post_id) {
    return apiResponse.ValidationError(res, 'post_id is required');
  }

  try {
    const post = await Post.findByPk(post_id);
    if (!post) {
      return apiResponse.NotFound(res, 'Post not found');
    }

    // Check if already wishlisted
    const existing = await Wishlist.findOne({
      where: { user_id, post_id }
    });
    if (existing) {
      // If already wishlisted, remove it (toggle off)
      await existing.destroy();
      return apiResponse.SuccessResponseWithOutData(res, 'Post removed from wishlist');
    }

    // Store city and country in destination
    const destination = [post.city, post.country].filter(Boolean).join(',');

    await Wishlist.create({ user_id, post_id, destination });

    return apiResponse.SuccessResponseWithOutData(res, 'Post wishlisted successfully');
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Get all posts for a specific user by userId
exports.getUserPosts = async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return apiResponse.NotFound(res, "User not found");
    }

    const totalCount = await Post.count({ where: { user_id: userId } });
    const posts = await Post.findAll({
      where: { user_id: userId },
      include: [
        { model: Photo, attributes: ['id', 'image_url'] },
        { model: User, attributes: ['id', 'full_name', 'email', 'image'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
    });

    return apiResponse.SuccessResponseWithData(res, 'User posts retrieved successfully', {
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

// User flags a post
exports.flagPost = async (req, res) => {
  try {
    const { postId, reason } = req.body;
    if (!postId || !reason) {
      return apiResponse.ValidationError(res, 'postId and reason are required');
    }
    const userId = req.user.id;
    // Prevent duplicate flag by same user for same post
    const existing = await FlaggedContent.findOne({ where: { postId, userId, status: 'pending' } });
    if (existing) {
      return apiResponse.ValidationError(res, 'You have already flagged this post and it is pending review.');
    }
    const flag = await FlaggedContent.create({ postId, userId, reason });
    return apiResponse.SuccessResponseWithData(res, 'Post flagged successfully', flag);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Get all flags by the current user
exports.getUserFlags = async (req, res) => {
  try {
    const userId = req.user.id;
    const flags = await FlaggedContent.findAll({ where: { userId } });
    return apiResponse.SuccessResponseWithData(res, 'Your flagged content', flags);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

// Get all flags for a specific post
exports.getPostFlags = async (req, res) => {
  try {
    const { postId } = req.params;
    const flags = await FlaggedContent.findAll({ where: { postId } });
    return apiResponse.SuccessResponseWithData(res, 'Flags for this post', flags);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};



