const models = require('../models');
const { Post, User, Photo, Follower } = models;
const { Op } = require('sequelize');
const apiResponse = require('../utils/apiResponse'); // Add this line

const exploreController = {
    searchByLocation: async (req, res) => {
        try {
            const { location } = req.query;
            const user_id = req.user.id;

            // Find all users the current user is following
            const followingRows = await Follower.findAll({
                where: { follower_id: user_id },
                attributes: ['user_id']
            });
            const followingIds = followingRows.map(row => row.user_id);

            // Build location query
            const locationQuery = {
                [Op.or]: [
                    { continent: location },
                    { country: location },
                    { city: location }
                ]
            };

            // Find posts with the specified location
            const posts = await Post.findAll({
                where: locationQuery,
                include: [
                    {
                        model: User,
                        attributes: ['id', 'full_name', 'image']
                    },
                    {
                        model: Photo,
                        attributes: ['id', 'image_url']
                    },
                ]
            });

            // Process the results
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

            // Calculate average overall_rating for follower and public posts
            const followerPosts = processedPosts.filter(post => post.stats.followerCount > 0);
            const publicPosts = processedPosts.filter(post => post.stats.publicCount > 0);

            const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

            const totalFollowerReviews = avg(followerPosts.map(post => post.overall_rating || 0));
            const totalPublicReviews = avg(publicPosts.map(post => post.overall_rating || 0));

            // Aggregate statistics
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

            // Find all users the current user is following
            const followingRows = await Follower.findAll({
                where: { follower_id: user_id },
                attributes: ['user_id']
            });
            const followingIds = followingRows.map(row => row.user_id);

            // Build location query
            const locationQuery = {
                [Op.or]: [
                    { continent: location },
                    { country: location },
                    { city: location }
                ]
            };

            // Build user filter based on followed parameter
            let userFilter = {};
            if (followed === '1') {
                userFilter = { id: { [Op.in]: followingIds } };
            } else if (followed === '0') {
                userFilter = { id: { [Op.notIn]: [...followingIds, user_id] } };
            }

            // Build order clause for recent filter
            const orderClause = recent === '1' ? [['createdAt', 'DESC']] : [];

            // Find posts with the specified location and filters
            const posts = await Post.findAll({
                where: locationQuery,
                include: [
                    {
                        model: User,
                        where: userFilter,
                        attributes: ['id', 'full_name', 'image'],
                        required: true
                    },
                    {
                        model: Photo,
                        attributes: ['id', 'image_url']
                    }
                ],
                order: orderClause
            });

            // Get all photos for the location separately
            const locationPhotos = await Photo.findAll({
                include: [{
                    model: Post,
                    where: locationQuery,
                    required: true,
                    include: [{
                        model: User,
                        where: userFilter,
                        required: true
                    }]
                }]
            });

            // Process the results
            const processedPosts = posts.map(post => {
                const isFollowing = followingIds.includes(post.User.id);
                return {
                    ...post.toJSON(),
                    isFollowing
                };
            });

            return apiResponse.SuccessResponseWithData(res, 'Filtered posts fetched successfully', {
                posts: processedPosts,
                locationPhotos: locationPhotos.map(photo => ({
                    id: photo.id,
                    url: photo.image_url,
                    postId: photo.PostId
                }))
            });

        } catch (error) {
            console.error('Error in searchByLocationFiltered:', error);
            return apiResponse.InternalServerError(res, error);
        }
    }
};

module.exports = exploreController;

