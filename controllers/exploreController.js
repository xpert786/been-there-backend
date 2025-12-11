const models = require('../models');
const { Post, User, Photo, Follower } = models;
const { Op } = require('sequelize');
const apiResponse = require('../utils/apiResponse'); // Add this line

const exploreController = {
    searchByLocation: async (req, res) => {
        try {
            const { location } = req.query;
            const user_id = req.user.id;

            // Validate location parameter
            if (!location || !location.trim()) {
                return apiResponse.ValidationError(res, 'Location parameter is required');
            }

            // Find all users the current user is following
            const followingRows = await Follower.findAll({
                where: { follower_id: user_id },
                attributes: ['user_id']
            });
            const followingIds = followingRows.map(row => row.user_id);

            // Parse location - handle comma-separated format (e.g., "miami" or "miami,US")
            let cityName = '';
            let countryName = '';
            
            // Split by comma and trim each part
            const parts = location.split(',').map(part => part.trim()).filter(Boolean);
            
            if (parts.length > 0) {
                cityName = parts[0].toLowerCase();
                // If multiple parts, last part is country (e.g., "miami,FL,US" -> country is "US")
                if (parts.length > 1) {
                    countryName = parts[parts.length - 1].toLowerCase();
                }
            }

            // Build location query - only match posts where users actually visited this location
            let locationQuery = {};
            
            if (cityName && countryName) {
                // Both city and country provided - match BOTH conditions (more precise)
                locationQuery = {
                    [Op.and]: [
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.city')),
                            { [Op.like]: `%${cityName}%` }
                        ),
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.country')),
                            { [Op.like]: `%${countryName}%` }
                        )
                    ]
                };
            } else if (cityName) {
                // Only city provided - search by city only
                locationQuery = {
                    [Op.and]: [
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.city')),
                            { [Op.like]: `%${cityName}%` }
                        )
                    ]
                };
            } else {
                return apiResponse.ValidationError(res, 'Invalid location format');
            }

            // Find posts ONLY from users who actually visited this location
            const posts = await Post.findAll({
                where: locationQuery,
                include: [
                    {
                        model: User,
                        required: true,
                        attributes: ['id', 'full_name', 'image']
                    },
                    {
                        model: Photo,
                        attributes: ['id', 'image_url']
                    },
                ]
            });

            // If no posts found, return empty result
            if (posts.length === 0) {
                return apiResponse.SuccessResponseWithData(res, 'No posts found for this location', {
                    posts: [],
                    statistics: {
                        totalFollowerPosts: 0,
                        totalPublicPosts: 0,
                        totalFollowerReviews: 0,
                        totalPublicReviews: 0
                    }
                });
            }

            // Process the results - only include posts from users who visited the location
            const processedPosts = posts.map(post => {
                const isFollowing = followingIds.includes(post.User.id);
                const reviews = post.Reviews || [];

                // Calculate average rating
                const averageRating = reviews.length > 0
                    ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
                    : 0;

                return {
                    ...post.toJSON(),
                    stats: {
                        followerCount: isFollowing ? 1 : 0,
                        publicCount: isFollowing ? 0 : 1,
                        averageRating,
                        overallRating: post.overall_rating || 0
                    }
                };
            });

            // Filter posts by follower/public status
            const followerPosts = processedPosts.filter(post => post.stats.followerCount > 0);
            const publicPosts = processedPosts.filter(post => post.stats.publicCount > 0);

            // Calculate average overall_rating for follower and public posts
            const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

            const totalFollowerReviews = avg(followerPosts.map(post => post.overall_rating || 0));
            const totalPublicReviews = avg(publicPosts.map(post => post.overall_rating || 0));

            // Aggregate statistics - only for users who actually visited the location
            const totalStats = {
                totalFollowerPosts: followerPosts.length,
                totalPublicPosts: publicPosts.length,
                totalFollowerReviews,
                totalPublicReviews
            };

            return apiResponse.SuccessResponseWithData(res, 'Posts fetched successfully', {
                posts: processedPosts,
                statistics: totalStats
            });

        } catch (error) {
            console.error('Error in searchByLocation:', error);
            return apiResponse.InternalServerError(res, error);
        }
    },

    searchByLocationFiltered: async (req, res) => {
        try {
            const { location, followed, recent } = req.query;
            const user_id = req.user.id;

            // Following user IDs
            const followingRows = await Follower.findAll({
                where: { follower_id: user_id },
                attributes: ['user_id']
            });
            const followingIds = followingRows.map(row => row.user_id);

            // Parse location - handle comma-separated format (e.g., "miami" or "miami,US")
            let cityName = '';
            let countryName = '';
            
            if (location) {
                // Split by comma and trim each part
                const parts = location.split(',').map(part => part.trim()).filter(Boolean);
                
                if (parts.length > 0) {
                    cityName = parts[0].toLowerCase();
                    // If multiple parts, last part is country (e.g., "miami,FL,US" -> country is "US")
                    if (parts.length > 1) {
                        countryName = parts[parts.length - 1].toLowerCase();
                    }
                }
            }

            // If no location provided, return empty results
            if (!location || !cityName) {
                return apiResponse.SuccessResponseWithData(
                    res,
                    "Filtered posts fetched successfully",
                    {
                        posts: [],
                        locationPhotos: []
                    }
                );
            }

            // Build location query based on what's provided
            let locationQuery = {};
            
            if (cityName && countryName) {
                // Both city and country provided - match BOTH conditions
                locationQuery = {
                    [Op.and]: [
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.city')),
                            { [Op.like]: `%${cityName}%` }
                        ),
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.country')),
                            { [Op.like]: `%${countryName}%` }
                        )
                    ]
                };
            } else if (cityName) {
                // Only city provided - search by city only
                locationQuery = {
                    [Op.and]: [
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('Post.city')),
                            { [Op.like]: `%${cityName}%` }
                        )
                    ]
                };
            }

            // Build query with additional filters (recent, followed)
            let postWhere = { ...locationQuery };

            // If recent=1 -> show ONLY last 24 hours posts
            if (recent === "1") {
                const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
                postWhere = {
                    ...postWhere,
                    createdAt: { [Op.gte]: oneDayAgoMs }
                };
            }

            // Followed filter
            let userFilter = undefined;
            if (followed === "1") {
                userFilter = {
                    id: { [Op.in]: followingIds }
                };
            }

            // Order
            const orderClause = recent === "1" ? [["createdAt", "DESC"]] : [];

            // Build user include conditionally
            const userInclude = {
                model: User,
                required: true,
                attributes: ['id', 'full_name', 'image']
            };
            if (userFilter) {
                userInclude.where = userFilter;
            }

            // Fetch posts
            const posts = await Post.findAll({
                where: postWhere,
                include: [
                    userInclude,
                    {
                        model: Photo,
                        attributes: ['id', 'image_url']
                    }
                ],
                order: orderClause
            });

            // Fetch location photos with same filters
            const postInclude = {
                model: Post,
                where: postWhere,
                required: true,
                include: [userInclude]
            };

            const locationPhotos = await Photo.findAll({
                include: [postInclude]
            });

            // If no results found, return not found message
            if (posts.length === 0 && locationPhotos.length === 0) {
                return apiResponse.NotFound(
                    res,
                    "No posts found for the specified location"
                );
            }

            // Process and return results
            const processedPosts = posts.map(post => ({
                ...post.toJSON(),
                isFollowing: followingIds.includes(post.User.id)
            }));

            return apiResponse.SuccessResponseWithData(
                res,
                "Filtered posts fetched successfully",
                {
                    posts: processedPosts,
                    locationPhotos: locationPhotos.map(photo => ({
                        id: photo.id,
                        url: photo.image_url,
                        postId: photo.Post.id
                    }))
                }
            );

        } catch (error) {
            console.error("Error in searchByLocationFiltered:", error);
            return apiResponse.InternalServerError(res, error);
        }
    }

};

module.exports = exploreController;

