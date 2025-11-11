'use strict';
const { Model } = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Highlight, { foreignKey: 'user_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      User.hasMany(models.TopDestination, { foreignKey: 'user_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      User.hasMany(models.Wishlist, { foreignKey: 'user_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      User.hasMany(models.Follower, { foreignKey: 'user_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      User.hasMany(models.Follower, { foreignKey: 'follower_id', onUpdate: 'CASCADE', onDelete: 'CASCADE' });
      User.hasMany(models.Post, { foreignKey: 'user_id', onDelete: 'CASCADE' });
      
      // Following relationship
      User.belongsToMany(models.User, {
        through: models.Follower,
        as: 'following',
        foreignKey: 'user_id',
        otherKey: 'follower_id'
      });
      
      // Followers relationship
      User.belongsToMany(models.User, {
        through: models.Follower,
        as: 'followers',
        foreignKey: 'follower_id',
        otherKey: 'user_id'
      });
      
      // Blocked users (who I have blocked)
      User.belongsToMany(models.User, {
        through: models.UserBlock,
        as: 'blockedUsers',
        foreignKey: 'user_id',
        otherKey: 'target_user_id'
      });
      // Users who blocked me
      User.belongsToMany(models.User, {
        through: models.UserBlock,
        as: 'blockedByUsers',
        foreignKey: 'target_user_id',
        otherKey: 'user_id'
      });
    }
  }
  User.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    full_name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    phone: DataTypes.STRING,
    image: DataTypes.STRING,
    address: DataTypes.STRING,
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    block: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    instagram_sync: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    contact_sync: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    notification_type:{
      type:DataTypes.STRING,
      defaultValue:'0',
      comment:"0:all,1:new follower,2:message,3:like/comment,4:follow,5:follow request,6:follow request accepted,7:follow request rejected"
    },
    public_profile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    message_request: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    location_sharing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    account_type: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: moment().valueOf()
    },
    updatedAt: {
      type: DataTypes.BIGINT,
      defaultValue: moment().valueOf()
    },
    instagram_access_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    instagram_token_expires_in: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    instagram_user_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    instagram_token_last_refreshed: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    terms_accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    terms_accepted_at: {
      type: DataTypes.BIGINT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true
  });
  return User;
};