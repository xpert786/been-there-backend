'use strict';
/** @type {import('sequelize-cli').Migration} */

const moment = require('moment');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Wishlists', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      destination_id: {
        type: Sequelize.UUID,
        allowNull: false,
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
    await queryInterface.dropTable('Wishlists');
  },
};
