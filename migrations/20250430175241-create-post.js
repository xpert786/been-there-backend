'use strict';
/** @type {import('sequelize-cli').Migration} */

const moment = require('moment');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Posts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      country: Sequelize.STRING,
      city: Sequelize.STRING,
      visit_date: Sequelize.DATE,
      reason_for_visit: Sequelize.TEXT,
      overall_rating: {
        type: Sequelize.INTEGER,
        validate: { min: 1, max: 5 }
      },
      experience: Sequelize.TEXT,
      cost_rating: {
        type: Sequelize.INTEGER,
        validate: { min: 1, max: 5 }
      },
      safety_rating: {
        type: Sequelize.INTEGER,
        validate: { min: 1, max: 5 }
      },
      food_rating: {
        type: Sequelize.INTEGER,
        validate: { min: 1, max: 5 }
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
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
    await queryInterface.dropTable('Posts');
  }
};
