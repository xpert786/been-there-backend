'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class FcmToken extends Model {
    static associate(models) {
      FcmToken.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  FcmToken.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    device_type: {
      type: DataTypes.STRING,
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
    modelName: 'FcmToken',
    tableName: 'FcmTokens'
  });
  return FcmToken;
};
