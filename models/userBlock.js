'use strict';
const { Model } = require('sequelize');
const moment = require('moment');

module.exports = (sequelize, DataTypes) => {
  class UserBlock extends Model {
    static associate(models) {
      UserBlock.belongsTo(models.User, { as: 'blocker', foreignKey: 'user_id' });
      UserBlock.belongsTo(models.User, { as: 'blocked', foreignKey: 'target_user_id' });
    }
  }
  UserBlock.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
    },
    target_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'Users', key: 'id' }
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
    modelName: 'UserBlock',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['user_id', 'target_user_id'] }
    ]
  });
  return UserBlock;
};
