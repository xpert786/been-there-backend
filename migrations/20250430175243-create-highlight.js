'use strict';
/** @type {import('sequelize-cli').Migration} */

const moment = require('moment');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Highlights', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
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
    await queryInterface.dropTable('Highlights');
  },
};
