'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    static associate(models) {
      Like.belongsTo(models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
      Like.belongsTo(models.Post, { foreignKey: 'post_id', as: 'Post' });
    }
  }
  Like.init({
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
    modelName: 'Like',
    timestamps: true
  });
  return Like;
};
