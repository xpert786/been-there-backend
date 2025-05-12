'use strict';
const { Model } = require('sequelize');
const moment = require('moment');
module.exports = (sequelize, DataTypes) => {
  class TopDestination extends Model {
    static associate(models) {
      TopDestination.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  TopDestination.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING, // e.g., "Niagara Falls"
      allowNull: false
    },
    image: DataTypes.STRING, // URL of the destination image
    rating: {
      type: DataTypes.FLOAT, // e.g., 4.5
      defaultValue: 0
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
    modelName: 'TopDestination',
    timestamps: false
  });
  return TopDestination;
};
