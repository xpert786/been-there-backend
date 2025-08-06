const models = require('../models');
const { TopDestination, Post, Photo } = models;
const apiResponse = require('../utils/apiResponse');
const { Op } = require('sequelize');

exports.getVisitedCountries = async (req, res) => {
  try {
    const user_id = req.user.id;
    // Find all TopDestination entries of type 'country' for this user, visited=true
    const destinations = await TopDestination.findAll({
      where: { user_id, type: 'country', visited: true },
      attributes: ['value']
    });
    // Extract unique country names
    const countriesSet = new Set(destinations.map(d => d.value));
    const countries = Array.from(countriesSet);
    return apiResponse.SuccessResponseWithData(res, 'Countries fetched successfully', { countries });
  } catch (error) {
    console.error('Error in getVisitedCountries:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getCountryStats = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { 
      country,
      keyword,
      view = 'recent', // 'all', 'recent', 'rating'
      sortBy,
      sortOrder
    } = req.query;

    if (!country) {
      return apiResponse.ValidationError(res, 'Country is required');
    }

    // Build search and filter conditions
    const searchConditions = {
      user_id,
      country
    };

    // Add keyword search if provided (across city and experience)
    if (keyword) {
      searchConditions[Op.or] = [
        { city: { [Op.iLike]: `%${keyword}%` } },
        { experience: { [Op.iLike]: `%${keyword}%` } }
      ];
    }

    // Add rating filter if view is 'rating'
    if (view === 'rating') {
      searchConditions.overall_rating = { [Op.not]: null };
    }

    // Determine sorting
    let finalSortBy = sortBy || 'visit_date';
    let finalSortOrder = (sortOrder || 'DESC').toUpperCase();

    // Override sort based on view if not explicitly provided
    if (view === 'all' && !sortBy && !sortOrder) {
        finalSortBy = 'visit_date';
        finalSortOrder = 'ASC';
    } else if (view === 'recent' && !sortBy && !sortOrder) {
         finalSortBy = 'visit_date';
         finalSortOrder = 'DESC';
    } else if (view === 'rating' && !sortBy && !sortOrder) {
         finalSortBy = 'visit_date'; // Default sort for rating view
         finalSortOrder = 'DESC'; // Default sort order for rating view
    }

    // Validate sort parameters
    const validSortFields = ['visit_date', 'overall_rating', 'cost_rating', 'safety_rating', 'food_rating', 'like_count', 'comment_count'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(finalSortBy) || !validSortOrders.includes(finalSortOrder)) {
         // Fallback to default if validation fails
         finalSortBy = 'visit_date';
         finalSortOrder = 'DESC';
    }

    // Find all posts for this user and country with their photos
    const posts = await Post.findAll({
      where: searchConditions,
      include: [{
        model: Photo,
        attributes: ['id', 'image_url']
      }],
      order: [[finalSortBy, finalSortOrder]]
    });

    const visitCount = posts.length;
    const citiesSet = new Set(posts.map(p => p.city).filter(Boolean));
    const citiesVisited = citiesSet.size;
    const lastVisit = posts.length > 0 ? posts[0].visit_date : null;

    // Extract all unique images from all posts
    const allImages = posts.reduce((acc, post) => {
      const postImages = post.Photos.map(photo => ({
        id: photo.id,
        image_url: photo.image_url,
        post_id: post.id
      }));
      return [...acc, ...postImages];
    }, []);

    // Format posts data to include photos
    const formattedPosts = posts.map(post => ({
      id: post.id,
      city: post.city,
      visit_date: post.visit_date,
      reason_for_visit: post.reason_for_visit,
      overall_rating: post.overall_rating,
      experience: post.experience,
      cost_rating: post.cost_rating,
      safety_rating: post.safety_rating,
      food_rating: post.food_rating,
      like_count: post.like_count,
      comment_count: post.comment_count,
      photos: post.Photos.map(photo => ({
        id: photo.id,
        image_url: photo.image_url
      }))
    }));

    return apiResponse.SuccessResponseWithData(res, 'Country stats fetched successfully', {
      visitCount,
      citiesVisited,
      lastVisit,
      posts: formattedPosts,
      allImages,
      filters: {
        keyword,
        view,
        sortBy: finalSortBy,
        sortOrder: finalSortOrder
      }
    });
  } catch (error) {
    console.error('Error in getCountryStats:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getVisitedCitiesForCountry = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { country } = req.query;

    if (!country) {
      return apiResponse.ValidationError(res, 'Country is required');
    }

    // Find all posts for this user and country
    const posts = await Post.findAll({
      where: { user_id, country },
      attributes: ['id', 'city', 'longitude', 'latitude', 'visit_date', 'overall_rating'],
      order: [['visit_date', 'DESC']]
    });

    // Process posts to get unique cities and their visit details
    const uniqueCitiesMap = new Map();

    posts.forEach(post => {
      if (!uniqueCitiesMap.has(post.city)) {
        // For the first post of a city, initialize the entry with city details and the visit
        uniqueCitiesMap.set(post.city, {
          city: post.city,
          longitude: post.longitude,
          latitude: post.latitude,
          visits: [{
            id: post.id,
            visit_date: post.visit_date,
            overall_rating: post.overall_rating
          }]
        });
      } else {
        // For subsequent posts of the same city, just add the visit details to the existing entry
        uniqueCitiesMap.get(post.city).visits.push({
          id: post.id,
          visit_date: post.visit_date,
          overall_rating: post.overall_rating
        });
      }
    });

    // Convert map values to an array
    const uniqueCities = Array.from(uniqueCitiesMap.values());

    return apiResponse.SuccessResponseWithData(res, 'Visited cities fetched successfully', { cities: uniqueCities });
  } catch (error) {
    console.error('Error in getVisitedCitiesForCountry:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getVisitedCities = async (req, res) => {
  try {
    const user_id = req.user.id;
    // Find all TopDestination entries of type 'country' for this user, visited=true
    const destinations = await TopDestination.findAll({
      where: { user_id, type: 'city', visited: true },
      attributes: ['value']
    });
    // Extract unique country names
    const citiesSet = new Set(destinations.map(d => d.value));
    const cities = Array.from(citiesSet);
    return apiResponse.SuccessResponseWithData(res, 'Cities fetched successfully', { cities });
  } catch (error) {
    console.error('Error in getVisitedCountries:', error);
    return apiResponse.InternalServerError(res, error);
  }
};

exports.getCityStats = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { 
      city,
      keyword,
      view = 'recent', // 'all', 'recent', 'rating'
      sortBy,
      sortOrder
    } = req.query;

    if (!city) {
      return apiResponse.ValidationError(res, 'City is required');
    }

    // Build search and filter conditions
    const searchConditions = {
      user_id,
      city
    };

    // Add keyword search if provided (across country and experience)
    if (keyword) {
      searchConditions[Op.or] = [
        { country: { [Op.iLike]: `%${keyword}%` } },
        { experience: { [Op.iLike]: `%${keyword}%` } }
      ];
    }

    // Add rating filter if view is 'rating'
    if (view === 'rating') {
      searchConditions.overall_rating = { [Op.not]: null };
    }

    // Determine sorting
    let finalSortBy = sortBy || 'visit_date';
    let finalSortOrder = (sortOrder || 'DESC').toUpperCase();

    // Override sort based on view if not explicitly provided
    if (view === 'all' && !sortBy && !sortOrder) {
        finalSortBy = 'visit_date';
        finalSortOrder = 'ASC';
    } else if (view === 'recent' && !sortBy && !sortOrder) {
         finalSortBy = 'visit_date';
         finalSortOrder = 'DESC';
    } else if (view === 'rating' && !sortBy && !sortOrder) {
         finalSortBy = 'visit_date';
         finalSortOrder = 'DESC';
    }

    // Validate sort parameters
    const validSortFields = ['visit_date', 'overall_rating', 'cost_rating', 'safety_rating', 'food_rating', 'like_count', 'comment_count'];
    const validSortOrders = ['ASC', 'DESC'];
    
    if (!validSortFields.includes(finalSortBy) || !validSortOrders.includes(finalSortOrder)) {
         finalSortBy = 'visit_date';
         finalSortOrder = 'DESC';
    }

    // Find all posts for this user and city with their photos
    const posts = await Post.findAll({
      where: searchConditions,
      include: [{
        model: Photo,
        attributes: ['id', 'image_url']
      }],
      order: [[finalSortBy, finalSortOrder]]
    });

    const visitCount = posts.length;
    const countriesSet = new Set(posts.map(p => p.country).filter(Boolean));
    const countriesVisited = countriesSet.size;
    const lastVisit = posts.length > 0 ? posts[0].visit_date : null;

    // Calculate review count for the city (posts with non-null overall_rating)
    const reviewCount = await Post.count({
      where:{city:city}
    });

    // Extract all unique images from all posts
    const allImages = posts.reduce((acc, post) => {
      const postImages = post.Photos.map(photo => ({
        id: photo.id,
        image_url: photo.image_url,
        post_id: post.id
      }));
      return [...acc, ...postImages];
    }, []);

    // Format posts data to include photos
    const formattedPosts = posts.map(post => ({
      id: post.id,
      country: post.country,
      visit_date: post.visit_date,
      reason_for_visit: post.reason_for_visit,
      overall_rating: post.overall_rating,
      experience: post.experience,
      cost_rating: post.cost_rating,
      safety_rating: post.safety_rating,
      food_rating: post.food_rating,
      like_count: post.like_count,
      comment_count: post.comment_count,
      photos: post.Photos.map(photo => ({
        id: photo.id,
        image_url: photo.image_url
      }))
    }));

    return apiResponse.SuccessResponseWithData(res, 'City stats fetched successfully', {
      visitCount,
      countriesVisited,
      lastVisit,
      reviewCount,
      posts: formattedPosts,
      allImages,
      filters: {
        keyword,
        view,
        sortBy: finalSortBy,
        sortOrder: finalSortOrder
      }
    });
  } catch (error) {
    console.error('Error in getCityStats:', error);
    return apiResponse.InternalServerError(res, error);
  }
};