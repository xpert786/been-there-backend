'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Highlight extends Model {
    static associate(models) {
      Highlight.belongsTo(models.User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
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
      type: DataTypes.ENUM('continent', 'country', 'city'),
      allowNull: false
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false
    },
    count: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'Highlight',
    timestamps: true
  });
  return Highlight;
};
