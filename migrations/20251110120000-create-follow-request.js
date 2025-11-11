'use strict';

const moment = require('moment');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FollowRequests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      requester_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      target_user_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'accepted', 'rejected', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
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
    await queryInterface.addConstraint('FollowRequests', {
      fields: ['requester_id', 'target_user_id'],
      type: 'unique',
      name: 'uniq_follow_request_pair',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('FollowRequests', 'uniq_follow_request_pair');
    await queryInterface.dropTable('FollowRequests');
  },
};


