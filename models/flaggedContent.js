'use strict';
const { Model } = require('sequelize');
const moment = require('moment'); // Import moment

module.exports = (sequelize, DataTypes) => {
  class FlaggedContent extends Model {
    static associate(models) {
      // associations
      FlaggedContent.belongsTo(models.User, { foreignKey: 'userId' });
      FlaggedContent.belongsTo(models.Post, { foreignKey: 'postId' });
    }
  }
  FlaggedContent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Posts', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'declined'),
        defaultValue: 'pending',
      },
      adminResponse: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.BIGINT,
        defaultValue: moment().valueOf()
      },
      updatedAt: {
        type: DataTypes.BIGINT,
        defaultValue: moment().valueOf()
      }
    },
    {
      sequelize,
      modelName: 'FlaggedContent',
      timestamps: true,
      tableName: 'FlaggedContents', 
      freezeTableName: true,       
   }
  );
  return FlaggedContent;
}; 
