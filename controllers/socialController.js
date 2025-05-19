const models = require('../models');
const { User, Post, Like, Comment, Follower, Wishlist, TopDestination, Photo } = models;
const { Op } = require('sequelize');
const moment = require('moment');
const apiResponse = require('../utills/apiResponse');

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

exports.getWishlist = async (req, res) => {
  const user_id = req.user.id;
  
  try {
    // Get wishlist with posts and related data
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

    // Get followed users in a single query
    const followed = await Follower.findAll({ 
      where: { follower_id: user_id }, 
      attributes: ['user_id'] 
    });
    const followedIds = followed.map(f => f.user_id);

    // Get all unique cities and countries from wishlist posts
    const cities = [];
    const countries = [];
    
    wishlist.forEach(item => {
      if (item.Post?.city) cities.push(item.Post.city);
      if (item.Post?.country) countries.push(item.Post.country);
    });

    // Get all city and country visitors in two queries instead of N queries
    const [cityVisitors, countryVisitors] = await Promise.all([
      Post.findAll({
        where: {
          city: { [Op.in]: [...new Set(cities)] },
          user_id: { [Op.in]: followedIds }
        },
        include: [{ model: User, attributes: ['id', 'full_name', 'image'] }],
        group: ['city', 'user_id'] // Avoid duplicates
      }),
      Post.findAll({
        where: {
          country: { [Op.in]: [...new Set(countries)] },
          user_id: { [Op.in]: followedIds }
        },
        include: [{ model: User, attributes: ['id', 'full_name', 'image'] }],
        group: ['country', 'user_id'] // Avoid duplicates
      })
    ]);

    // Create lookup maps for visitors
    const cityVisitorsMap = cityVisitors.reduce((acc, post) => {
      if (!acc[post.city]) acc[post.city] = [];
      acc[post.city].push(post.User);
      return acc;
    }, {});

    const countryVisitorsMap = countryVisitors.reduce((acc, post) => {
      if (!acc[post.country]) acc[post.country] = [];
      acc[post.country].push(post.User);
      return acc;
    }, {});

    // Build response
    const result = wishlist.map(item => {
      const post = item.Post;
      const cityVisitors = post?.city ? cityVisitorsMap[post.city] || [] : [];
      const countryVisitors = post?.country ? countryVisitorsMap[post.country] || [] : [];

      return {
        wishlistId: item.id,
        destination: item.destination,
        post,
        cityVisitCount: cityVisitors.length,
        countryVisitCount: countryVisitors.length,
        cityVisitors,
        countryVisitors
      };
    });

    return apiResponse.SuccessResponseWithData(res, 'Wishlist fetched successfully', result);
  } catch (error) {
    console.error('Error in getWishlist:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getTopDestinations = async (req, res) => {
  const user_id = req.user.id;
  
  try {
    // Get top destinations
    const topDestinations = await TopDestination.findAll({
      where: { user_id },
      order: [['count', 'DESC']],
      limit: 10
    });

    // Get followed users
    const followed = await Follower.findAll({ 
      where: { follower_id: user_id }, 
      attributes: ['user_id'] 
    });
    const followedIds = followed.map(f => f.user_id);

    // Separate cities and countries
    const cities = topDestinations.filter(d => d.type === 'city').map(d => d.value);
    const countries = topDestinations.filter(d => d.type === 'country').map(d => d.value);

    // Get all posts and visitors in parallel
    const [cityPosts, countryPosts, cityVisitors, countryVisitors] = await Promise.all([
      Post.findAll({
        where: { city: { [Op.in]: cities } },
        include: [
          { model: User, attributes: ['id', 'full_name', 'image'] },
          { model: Photo, attributes: ['id', 'image_url'] }
        ]
      }),
      Post.findAll({
        where: { country: { [Op.in]: countries } },
        include: [
          { model: User, attributes: ['id', 'full_name', 'image'] },
          { model: Photo, attributes: ['id', 'image_url'] }
        ]
      }),
      Post.findAll({
        where: { 
          city: { [Op.in]: cities },
          user_id: { [Op.in]: followedIds }
        },
        include: [{ model: User, attributes: ['id', 'full_name', 'image'] }],
        group: ['city', 'user_id']
      }),
      Post.findAll({
        where: { 
          country: { [Op.in]: countries },
          user_id: { [Op.in]: followedIds }
        },
        include: [{ model: User, attributes: ['id', 'full_name', 'image'] }],
        group: ['country', 'user_id']
      })
    ]);

    // Create lookup maps
    const postsMap = {};
    [...cityPosts, ...countryPosts].forEach(post => {
      const key = post.city ? `city:${post.city}` : `country:${post.country}`;
      if (!postsMap[key]) postsMap[key] = [];
      postsMap[key].push(post);
    });

    const visitorsMap = {};
    [...cityVisitors, ...countryVisitors].forEach(post => {
      const key = post.city ? `city:${post.city}` : `country:${post.country}`;
      if (!visitorsMap[key]) visitorsMap[key] = [];
      visitorsMap[key].push(post.User);
    });

    // Build response
    const result = topDestinations.map(dest => {
      const key = `${dest.type}:${dest.value}`;
      const posts = postsMap[key] || [];
      const visitors = visitorsMap[key] || [];

      return {
        destinationId: dest.id,
        type: dest.type,
        value: dest.value,
        count: dest.count,
        visited: dest.visited,
        posts,
        visitCount: visitors.length,
        visitors
      };
    });

    return apiResponse.SuccessResponseWithData(res, 'Top destinations fetched successfully', result);
  } catch (error) {
    console.error('Error in getTopDestinations:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

