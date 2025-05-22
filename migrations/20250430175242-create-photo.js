'use strict';
/** @type {import('sequelize-cli').Migration} */

const moment = require('moment');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Photos', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      post_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Posts', key: 'id' },
        onDelete: 'CASCADE'
      },
      image_url: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.BIGINT,
      defaultValue: moment().valueOf()
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.BIGINT,
      defaultValue: moment().valueOf()
        
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Photos');
  }
};
