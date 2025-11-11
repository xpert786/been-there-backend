'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class FollowRequest extends Model {
    static associate(models) {
      FollowRequest.belongsTo(models.User, { foreignKey: 'requester_id', as: 'requester' });
      FollowRequest.belongsTo(models.User, { foreignKey: 'target_user_id', as: 'targetUser' });
    }
  }

  FollowRequest.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requester_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    target_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    createdAt: {
      type: DataTypes.BIGINT,
      defaultValue: moment().valueOf(),
    },
    updatedAt: {
      type: DataTypes.BIGINT,
      defaultValue: moment().valueOf(),
    },
  }, {
    sequelize,
    modelName: 'FollowRequest',
    timestamps: false,
  });

  return FollowRequest;
};


