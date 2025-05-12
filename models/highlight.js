'use strict';
const { Model } = require('sequelize');
const moment = require('moment'); // Import moment

module.exports = (sequelize, DataTypes) => {
  class Highlight extends Model {
    static associate(models) {
      Highlight.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  Highlight.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    type: {
      type: DataTypes.STRING, // e.g., "continent", "country", "city"
      allowNull: false
    },
    value: {
      type: DataTypes.STRING, // e.g., "North America", "USA", "San Francisco"
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
    modelName: 'Highlight',
    timestamps: false
  });
  return Highlight;
};
