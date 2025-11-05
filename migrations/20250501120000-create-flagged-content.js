'use strict';

const moment = require('moment');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FlaggedContents', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      postId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Posts', key: 'id' },
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      reason: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'declined'),
        defaultValue: 'pending',
      },
      adminResponse: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.BIGINT,
        defaultValue: moment().valueOf(),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.BIGINT,
        defaultValue: moment().valueOf(),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FlaggedContents');
  },
}; 