'use strict';
const { Model } = require('sequelize');
const moment = require('moment'); // Import moment

module.exports = (sequelize, DataTypes) => {
  class Follower extends Model {
    static associate(models) {
      Follower.belongsTo(models.User, { foreignKey: 'user_id' });
      Follower.belongsTo(models.User, { foreignKey: 'follower_id' });

    }
  }
  Follower.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    follower_id: {
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
    modelName: 'Follower',
    timestamps: false
  });
  return Follower;
};
