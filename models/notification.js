'use strict';
const { Model } = require('sequelize');
const moment = require('moment'); // Import moment

module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.User, { foreignKey: 'user_id' });

    }
  }
  Notification.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    notification_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "1:new follower,2:message,3:like/comment,4:follow,5:follow request,6:follow request accepted,7:follow request rejected"
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reference_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    modelName: 'Notification',
    timestamps: false
  });
  return Notification;
};
