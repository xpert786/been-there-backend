'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Posts', 'place_type', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'tags' // This will add the column after the tags column
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Posts', 'place_type');
  }
};