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
        type: DataTypes.INTEGER, // Change to INTEGER for type consistency
        allowNull: false,
      comment:"1:new follower,2:message,3:like and comment,4:email"
    },
    message: {
      type: DataTypes.STRING,
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
    modelName: 'Notification',
    timestamps: false
  });
  return Notification;
};
