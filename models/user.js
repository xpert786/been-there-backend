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
      comment:"1:new follower,2:message,3:like and comment,4:email"
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
    }
  }, {
    sequelize,
    modelName: 'User',
    timestamps: true
  });
  return User;
};