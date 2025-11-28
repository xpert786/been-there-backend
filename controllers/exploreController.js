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

            // Split location into keywords and build LIKE queries (MariaDB: use LOWER + LIKE)
            const keywords = location ? location.split(' ').filter(Boolean) : [];
            const locationQuery = {
                [Op.or]: keywords.map(keyword => ({
                    [Op.or]: [
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('continent')),
                            { [Op.like]: `%${keyword.toLowerCase()}%` }
                        ),
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('country')),
                            { [Op.like]: `%${keyword.toLowerCase()}%` }
                        ),
                        models.sequelize.where(
                            models.sequelize.fn('LOWER', models.sequelize.col('city')),
                            { [Op.like]: `%${keyword.toLowerCase()}%` }
                        )
                    ]
                }))
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

        // Split location into keywords and build LIKE queries (MariaDB: use LOWER + LIKE)
        const keywords = location ? location.split(' ').filter(Boolean) : [];
        
        // Define the base location query (Required for all searches)
        const locationQuery = {
            [Op.or]: keywords.map(keyword => ({
                [Op.or]: [
                    models.sequelize.where(
                        models.sequelize.fn('LOWER', models.sequelize.col('Post.continent')), // Use Post.continent for clarity
                        { [Op.like]: `%${keyword.toLowerCase()}%` }
                    ),
                    models.sequelize.where(
                        models.sequelize.fn('LOWER', models.sequelize.col('Post.country')),
                        { [Op.like]: `%${keyword.toLowerCase()}%` }
                    ),
                    models.sequelize.where(
                        models.sequelize.fn('LOWER', models.sequelize.col('Post.city')),
                        { [Op.like]: `%${keyword.toLowerCase()}%` }
                    )
                ]
            }))
        };

        // 1. Build the Post WHERE clause (Location + Recent Time)
        let postWhere = locationQuery;
        if (recent === '1') {
            // FIX: Calculate 24 hours ago in milliseconds (number) 
            // and compare against the numeric createdAt field in the DB.
            const twentyFourHoursAgoMs = Date.now() - (24 * 60 * 60 * 1000); 
            
            postWhere = {
                ...postWhere,
                // Use the millisecond timestamp for a direct numeric comparison
                createdAt: { [Op.gte]: twentyFourHoursAgoMs } 
            };
        }

        // 2. Build the User WHERE clause (Followed filter)
        let userFilter = undefined;
        if (followed === '1') {
            // If followed=1, show only posts from users the current user is following
            userFilter = { id: { [Op.in]: followingIds } };
        }
        // If followed=0, we leave userFilter as undefined, showing all users.

        // 3. Build the Order Clause
        // We order by 'createdAt' descending if either recent=1 or followed=1 for a consistent feed flow.
        // I've kept the original logic for order: only order if recent is explicitly 1.
        const orderClause = recent === '1' ? [['createdAt', 'DESC']] : [];


        // Find posts with the specified location and filters
        const posts = await Post.findAll({
            where: postWhere, // Includes location and optional 24h time filter
            include: [
                {
                    model: User,
                    where: userFilter, // Only applied if followed=1
                    attributes: ['id', 'full_name', 'image'],
                    required: true // Ensures only posts with users are returned
                },
                {
                    model: Photo,
                    attributes: ['id', 'image_url']
                }
            ],
            order: orderClause
        });

        // Get all photos for the location separately (applying the same filters for consistency)
        const locationPhotos = await Photo.findAll({
            include: [{
                model: Post,
                where: postWhere, // Use the same post filters
                required: true,
                include: [{
                    model: User,
                    where: userFilter, // Use the same user filters
                    required: true
                }]
            }]
        });

        // Process the results
        const processedPosts = posts.map(post => {
            const isFollowing = followingIds.includes(post.User.id);
            // NOTE: If you standardized the createdAt/updatedAt format on the client, 
            // you might want to format them here if they are still numbers.
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
                postId: photo.Post.id // Access Post ID from the included Post model
            }))
        });

    } catch (error) {
        console.error('Error in searchByLocationFiltered:', error);
        return apiResponse.InternalServerError(res, error);
    }
}
};

module.exports = exploreController;

