const express = require('express');
const router = express.Router();
const passportController = require('../controllers/passportController');
const verifyToken = require('../middleware/verifyToken');

router.use(verifyToken);

/**
 * @swagger
 * /passport/countries:
 *   get:
 *     summary: Get all unique countries the user has visited
 *     tags: [Passport]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of unique countries visited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 countries:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 */

router.get('/countries', passportController.getVisitedCountries);

/**
 * @swagger
 * /passport/country/stats:
 *   get:
 *     summary: Get stats for a selected country with keyword search and view-based filtering/sorting
 *     tags: [Passport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         required: true
 *         description: The country name to get stats for
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Search term to filter posts by city or experience content
 *       - in: query
 *         name: view
 *         schema:
 *           type: string
 *           enum: [all, recent, rating]
 *         default: recent
 *         description: Determines filtering and default sorting behavior (all posts, recent posts, posts with rating)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [visit_date, overall_rating, cost_rating, safety_rating, food_rating, like_count, comment_count]
 *         description: Field to sort the results by (overrides default view sorting if provided)
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sort order (ASC or DESC) (overrides default view sorting if provided)
 *     responses:
 *       200:
 *         description: Country stats fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 visitCount:
 *                   type: integer
 *                 citiesVisited:
 *                   type: integer
 *                 lastVisit:
 *                   type: string
 *                   format: date-time
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       city:
 *                         type: string
 *                       visit_date:
 *                         type: string
 *                         format: date-time
 *                       reason_for_visit:
 *                         type: string
 *                       overall_rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       experience:
 *                         type: string
 *                       cost_rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       safety_rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       food_rating:
 *                         type: integer
 *                         minimum: 1
 *                         maximum: 5
 *                       like_count:
 *                         type: integer
 *                       comment_count:
 *                         type: integer
 *                       photos:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             image_url:
 *                               type: string
 *                 allImages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       image_url:
 *                         type: string
 *                       post_id:
 *                         type: string
 *                         format: uuid
 *                 filters:
 *                   type: object
 *                   properties:
 *                     keyword:
 *                       type: string
 *                     view:
 *                       type: string
 *                     sortBy:
 *                       type: string
 *                     sortOrder:
 *                       type: string
 *       400:
 *         description: Country is required
 *       500:
 *         description: Internal server error
 */
router.get('/country/stats', passportController.getCountryStats);

/**
 * @swagger
 * /passport/country/cities:
 *   get:
 *     summary: Get unique cities visited by the user in a specific country with aggregated visit details for map display
 *     tags: [Passport]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         required: true
 *         description: The country name to get visited cities for
 *     responses:
 *       200:
 *         description: Visited cities fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       city:
 *                         type: string
 *                         description: Unique city name
 *                       longitude:
 *                         type: string
 *                         description: Longitude of the city
 *                       latitude:
 *                         type: string
 *                         description: Latitude of the city
 *                       visits:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                               description: Post ID (representing a specific visit)
 *                             visit_date:
 *                               type: string
 *                               format: date-time
 *                               description: Date of the visit
 *                             overall_rating:
 *                               type: integer
 *                               minimum: 1
 *                               maximum: 5
 *                               description: Overall rating of the visit
 *       400:
 *         description: Country is required
 *       500:
 *         description: Internal server error
 */
router.get('/country/cities', passportController.getVisitedCitiesForCountry);

module.exports = router;

