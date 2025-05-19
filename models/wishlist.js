'use strict';
const { Model } = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class Wishlist extends Model {
    static associate(models) {
      // Wishlist belongs to User
      Wishlist.belongsTo(models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
      // Wishlist belongs to Post
      Wishlist.belongsTo(models.Post, { foreignKey: 'post_id', onDelete: 'CASCADE' });
    }
  }
  Wishlist.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    destination: {
      type: DataTypes.STRING, // Store as "city,country"
      allowNull: true
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
    modelName: 'Wishlist',
    timestamps: true
  });
  return Wishlist;
};
