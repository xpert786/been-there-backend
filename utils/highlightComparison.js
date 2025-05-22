const { Highlight } = require('../models');
const { Op, fn, col } = require('sequelize');

// Step 1: Get how many unique continents/countries/cities this user has
async function getUserHighlightCounts(userId) {
  const highlights = await Highlight.findAll({
    where: { user_id: userId },
    attributes: [
      'type',
      [fn('COUNT', fn('DISTINCT', col('value'))), 'count']
    ],
    group: ['type']
  });

  const counts = { continent: 0, country: 0, city: 0 };
  highlights.forEach(row => {
    counts[row.type] = parseInt(row.get('count'), 10);
  });

  return counts;
}

// Step 2: Get how many other users have how many of each
async function getAllUserHighlightCounts(userId) {
  const highlights = await Highlight.findAll({
    where: {
      user_id: { [Op.ne]: userId }
    },
    attributes: [
      'user_id',
      'type',
      [fn('COUNT', fn('DISTINCT', col('value'))), 'count']
    ],
    group: ['user_id', 'type']
  });

  const userCounts = {}; // { user1: { continent: x, country: y, city: z }, ... }

  highlights.forEach(row => {
    const uid = row.user_id;
    const type = row.type;
    const count = parseInt(row.get('count'), 10);
    if (!userCounts[uid]) userCounts[uid] = { continent: 0, country: 0, city: 0 };
    userCounts[uid][type] = count;
  });

  return userCounts;
}

function calculatePercentile(current, othersArray) {
  const below = othersArray.filter(count => count < current).length;
  return othersArray.length > 0 ? Math.round((below / othersArray.length) * 100) : 0;
}

async function getComparisonPercentages(userId) {
  const userCounts = await getUserHighlightCounts(userId);
  const allCounts = await getAllUserHighlightCounts(userId);

  const compareData = {};
  ['continent', 'country', 'city'].forEach(type => {
    const current = userCounts[type] || 0;
    const others = Object.values(allCounts).map(c => c[type] || 0);
    compareData[type] = calculatePercentile(current, others);
  });

  return compareData;
}

module.exports = {
  getComparisonPercentages
};
