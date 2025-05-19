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

const countryToContinent = require('../utils/countryToContinent');

exports.createPost = async (req, res) => {
  // Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.ValidationError(res, errors.array().map(err => err.msg).join(', '));
  }

  const { country, visit_date, reason_for_visit, overall_rating, experience, cost_rating, safety_rating, food_rating, place_type, longitude, latitude, city } = req.body;

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
      city,
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

    // Normalize values
    const normCountry = country ? country.trim().toLowerCase() : '';
    const normCity = req.body.city ? req.body.city.trim().toLowerCase() : '';
    const continent = countryToContinent(normCountry);

    // Helper to upsert highlight/topdestination
    async function upsertHighlightAndTopDestination(user_id, type, value) {
      // Highlight
      const [highlight, created] = await Highlight.findOrCreate({
        where: { user_id, type, value: value.toLowerCase() },
        defaults: { count: 1 }
      });
      if (!created) {
        highlight.count += 1;
        await highlight.save();
      }
      // TopDestination
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

    // Update highlights and top destinations for this user
    await upsertHighlightAndTopDestination(user_id, 'continent', continent);
    if (normCountry) await upsertHighlightAndTopDestination(user_id, 'country', normCountry);
    if (normCity) await upsertHighlightAndTopDestination(user_id, 'city', normCity);

    // Optionally: Keep only top N destinations for each type in TopDestination
    const types = ['continent', 'country', 'city'];
    for (const type of types) {
      const tops = await TopDestination.findAll({
        where: { user_id, type },
        order: [['count', 'DESC']],
      });
      const keep = 3; // keep top 3
      if (tops.length > keep) {
        const toDelete = tops.slice(keep);
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
      return apiResponse.ValidationError(res, 'Post already in wishlist');
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

exports.getWishlist = async (req, res) => {
  const user_id = req.user.id;
  try {
    // Get wishlist with post details
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

    // For each wishlist item, find users you follow who visited same city/country
    const followed = await Follower.findAll({ where: { follower_id: user_id }, attributes: ['user_id'] });
    const followedIds = followed.map(f => f.user_id);

    const result = [];
    for (const item of wishlist) {
      const post = item.Post;
      let cityUsers = [], countryUsers = [];
      if (post) {
        if (post.city) {
          cityUsers = await Post.findAll({
            where: {
              city: post.city,
              user_id: { [Op.in]: followedIds }
            },
            include: [{ model: User, attributes: ['id', 'full_name', 'image'] }]
          });
        }
        if (post.country) {
          countryUsers = await Post.findAll({
            where: {
              country: post.country,
              user_id: { [Op.in]: followedIds }
            },
            include: [{ model: User, attributes: ['id', 'full_name', 'image'] }]
          });
        }
      }
      result.push({
        wishlistId: item.id,
        destination: item.destination,
        post,
        cityVisitCount: cityUsers.length,
        countryVisitCount: countryUsers.length,
        cityVisitors: cityUsers.map(u => u.User),
        countryVisitors: countryUsers.map(u => u.User)
      });
    }

    return apiResponse.SuccessResponseWithData(res, 'Wishlist fetched successfully', result);
  } catch (error) {
    console.error(error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getTopDestinations = async (req, res) => {
  console.log('Fetching top destinations------------------------------');
  const user_id = req.user.id;
  try {
    console.log('Fetching top destinations for user:', user_id);

    // Get top destinations for the user
    const topDestinations = await TopDestination.findAll({
      where: { user_id },
      order: [['count', 'DESC']],
      limit: 10
    });
    console.log('Top destinations found:', topDestinations.length);

    // For each destination, get posts (from any user) and users you follow who visited same city/country
    const followed = await Follower.findAll({ where: { follower_id: user_id }, attributes: ['user_id'] });
    const followedIds = followed.map(f => f.user_id);
    console.log('Followed user IDs:', followedIds);

    const result = [];
    for (const dest of topDestinations) {
      console.log('Processing destination:', dest.type, dest.value);
      let posts = [], users = [];
      if (dest.type === 'city') {
        posts = await Post.findAll({
          where: { city: dest.value },
          include: [
            { model: User, attributes: ['id', 'full_name', 'image'] },
            { model: Photo, attributes: ['id', 'image_url'] }
          ]
        });
        console.log(`Posts found for city "${dest.value}":`, posts.length);

        users = await Post.findAll({
          where: { city: dest.value, user_id: { [Op.in]: followedIds } },
          include: [{ model: User, attributes: ['id', 'full_name', 'image'] }]
        });
        console.log(`Followed users who visited city "${dest.value}":`, users.length);
      } else if (dest.type === 'country') {
        posts = await Post.findAll({
          where: { country: dest.value },
          include: [
            { model: User, attributes: ['id', 'full_name', 'image'] },
            { model: Photo, attributes: ['id', 'image_url'] }
          ]
        });
        console.log(`Posts found for country "${dest.value}":`, posts.length);

        users = await Post.findAll({
          where: { country: dest.value, user_id: { [Op.in]: followedIds } },
          include: [{ model: User, attributes: ['id', 'full_name', 'image'] }]
        });
        console.log(`Followed users who visited country "${dest.value}":`, users.length);
      }

      // Fix: If there are no posts for this destination, still return the destination info
      result.push({
        destinationId: dest.id,
        type: dest.type,
        value: dest.value,
        count: dest.count,
        visited: dest.visited,
        posts, // will be [] if none found
        visitCount: users.length,
        visitors: users.map(u => u.User)
      });
    }

    console.log('Final result for top destinations:', result.length);
    return apiResponse.SuccessResponseWithData(res, 'Top destinations fetched successfully', result);
  } catch (error) {
    console.error('Error in getTopDestinations:', error);
    return apiResponse.InternalServerError(res, error);
  }
};


