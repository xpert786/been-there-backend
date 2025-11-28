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

        // Following user IDs
        const followingRows = await Follower.findAll({
            where: { follower_id: user_id },
            attributes: ['user_id']
        });
        const followingIds = followingRows.map(row => row.user_id);

        // Split keywords
        const keywords = location ? location.split(" ").filter(Boolean) : [];

        // Location filters
        const locationQuery = keywords.length > 0 ? {
            [Op.or]: keywords.map(keyword => ({
                [Op.or]: [
                    models.sequelize.where(
                        models.sequelize.fn('LOWER', models.sequelize.col('Post.continent')),
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
        } : {};

        // MAIN WHERE
        let postWhere = { ...locationQuery };

        // If recent=1 -> show ONLY last 24 hours posts
        if (recent === "1") {
            const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;

            postWhere = {
                ...postWhere,
                createdAt: { [Op.gte]: oneDayAgoMs }   // Using MS directly
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

        // Fetch posts
        const posts = await Post.findAll({
            where: postWhere,
            include: [
                {
                    model: User,
                    where: userFilter,
                    required: true,
                    attributes: ['id', 'full_name', 'image']
                },
                {
                    model: Photo,
                    attributes: ['id', 'image_url']
                }
            ],
            order: orderClause
        });

        // Fetch location photos with same filters
        const locationPhotos = await Photo.findAll({
            include: [{
                model: Post,
                where: postWhere,
                required: true,
                include: [{
                    model: User,
                    where: userFilter,
                    required: true
                }]
            }]
        });

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

