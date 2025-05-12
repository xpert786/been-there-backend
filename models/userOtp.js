'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class UserOtp extends Model {
    static associate(models) {
      // Define associations here if needed
      UserOtp.belongsTo(models.User, { foreignKey: 'user_id', targetKey: 'id' });
    }
  }
  
  UserOtp.init({
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users', // This references the table name
        key: 'id'
      }
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    modelName: 'UserOtp',
    timestamps: true,
    hooks: {
      beforeCreate: (instance) => {
        instance.createdAt = moment().valueOf();
        instance.updatedAt = moment().valueOf();
      },
      beforeUpdate: (instance) => {
        instance.updatedAt = moment().valueOf();
      }
    }
  });

  return UserOtp;
};