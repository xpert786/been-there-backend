const axios = require('axios');
const FormData = require('form-data');
const apiResponse = require('../utils/apiResponse');
const { User } = require('../models');

exports.syncInstagram = async (req, res) => {
    const { code } = req.body;
    const userId = req.user.id;
    if (!code) return apiResponse.ValidationError(res, 'Missing code');
    if (!userId) return apiResponse.ValidationError(res, 'User not authenticated');

    try {
        // Step 1: Exchange code for short-lived access token
        const form = new FormData();
        form.append('client_id', '1084826773498768');
        form.append('client_secret', '2316bf131bbdcd9b50a5c234c7cf4463');
        form.append('grant_type', 'authorization_code');
        form.append('redirect_uri', 'beenaround://auth/instagram/');
        form.append('code', code);

        const shortTokenResp = await axios.post('https://api.instagram.com/oauth/access_token', form, {
            headers: form.getHeaders()
        });
        const { access_token: shortToken, user_id } = shortTokenResp.data;

        // Step 2: Exchange short-lived token for long-lived token
        const longTokenResp = await axios.get(
            `https://graph.instagram.com/access_token`, {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: '2316bf131bbdcd9b50a5c234c7cf4463',
                    access_token: shortToken
                }
            }
        );
        const { access_token: longToken, expires_in } = longTokenResp.data;

        // Store longToken, user_id, expires_in in User table
        await User.update({
            instagram_access_token: longToken,
            instagram_user_id: user_id,
            instagram_token_expires_in: expires_in,
            instagram_sync: true,
            instagram_token_last_refreshed: Date.now()
        }, {
            where: { id: userId }
        });

        return apiResponse.SuccessResponseWithData(res, 'Instagram long-lived access token fetched successfully', {
            access_token: longToken,
            user_id,
            expires_in
        });
    } catch (err) {
        console.error('syncInstagram error:', err.response?.data || err.message || err);
        // For debugging, you can return the error details (remove in production)
        return apiResponse.InternalServerError(res, err.response?.data || err.message || err);
    }
};

exports.getInstagramPosts = async (req, res) => {
    const userId = req.user && req.user.id;
    if (!userId) return apiResponse.ValidationError(res, 'User not authenticated');

    try {
        // Fetch user from DB
        const user = await User.findByPk(userId);
        if (!user || !user.instagram_access_token) {
            return apiResponse.ValidationError(res, 'Instagram not linked for this user');
        }

        let access_token = user.instagram_access_token;
        let expires_in = user.instagram_token_expires_in;
        let last_refreshed = user.instagram_token_last_refreshed || 0;

        // Check if token is expired or about to expire (less than 2 days left)
        const now = Date.now();
        const expiryTime = last_refreshed + (expires_in * 1000);
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        if (expiryTime - now < twoDays) {
            // Refresh token
            try {
                const refreshResp = await axios.get(
                    `https://graph.instagram.com/refresh_access_token`, {
                        params: {
                            grant_type: 'ig_refresh_token',
                            access_token
                        }
                    }
                );
                access_token = refreshResp.data.access_token;
                expires_in = refreshResp.data.expires_in;
                last_refreshed = now;

                // Update in DB
                await User.update({
                    instagram_access_token: access_token,
                    instagram_token_expires_in: expires_in,
                    instagram_token_last_refreshed: last_refreshed
                }, { where: { id: userId } });
            } catch (refreshErr) {
                console.error('Instagram token refresh error:', refreshErr.response?.data || refreshErr.message || refreshErr);
                return apiResponse.InternalServerError(res, refreshErr.response?.data || refreshErr.message || refreshErr);
            }
        }

        // Fetch posts with valid token
        const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,location';
        const url = `https://graph.instagram.com/v23.0/me/media?fields=${fields}&access_token=${access_token}`;
        const response = await axios.get(url);

        return apiResponse.SuccessResponseWithData(res, 'Instagram posts fetched successfully', response.data);
    } catch (err) {
        console.error('getInstagramPosts error:', err.response?.data || err.message || err);
        return apiResponse.InternalServerError(res, err.response?.data || err.message || err);
    }
};

exports.getInstagramPostDetails = async (req, res) => {
    const userId = req.user && req.user.id;
    const postId = req.params.postId; // Assuming you'll pass the post ID as a parameter

    if (!userId) return apiResponse.ValidationError(res, 'User not authenticated');
    if (!postId) return apiResponse.ValidationError(res, 'Post ID is required');

    try {
        // Fetch user from DB
        const user = await User.findByPk(userId);
        if (!user || !user.instagram_access_token) {
            return apiResponse.ValidationError(res, 'Instagram not linked for this user');
        }

        let access_token = user.instagram_access_token;
        let expires_in = user.instagram_token_expires_in;
        let last_refreshed = user.instagram_token_last_refreshed || 0;

        // Check if token is expired or about to expire (less than 2 days left)
        const now = Date.now();
        const expiryTime = last_refreshed + (expires_in * 1000);
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        if (expiryTime - now < twoDays) {
            // Refresh token
            try {
                const refreshResp = await axios.get(
                    `https://graph.instagram.com/refresh_access_token`, {
                        params: {
                            grant_type: 'ig_refresh_token',
                            access_token
                        }
                    }
                );
                access_token = refreshResp.data.access_token;
                expires_in = refreshResp.data.expires_in;
                last_refreshed = now;

                // Update in DB
                await User.update({
                    instagram_access_token: access_token,
                    instagram_token_expires_in: expires_in,
                    instagram_token_last_refreshed: last_refreshed
                }, { where: { id: userId } });
            } catch (refreshErr) {
                console.error('Instagram token refresh error:', refreshErr.response?.data || refreshErr.message || refreshErr);
                return apiResponse.InternalServerError(res, refreshErr.response?.data || refreshErr.message || refreshErr);
            }
        }

        // Fetch specific post details
        const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,location,permalink,children';
        const url = `https://graph.instagram.com/v23.0/${postId}?fields=${fields}&access_token=${access_token}`;
        const response = await axios.get(url);

        return apiResponse.SuccessResponseWithData(res, 'Instagram post details fetched successfully', response.data);
    } catch (err) {
        console.error('getInstagramPostDetails error:', err.response?.data || err.message || err);
        return apiResponse.InternalServerError(res, err.response?.data || err.message || err);
    }
};

exports.instagramAuth = (req, res) => {
    // Completely empty endpoint - just returns success
    return res.status(200).json({ 
        status: 'success', 
        message: 'Empty Instagram auth endpoint' 
    });
};
