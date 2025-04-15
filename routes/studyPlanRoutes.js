const express = require('express');
const router = express.Router();
const studyPlanController = require('../controllers/studyPlanController');
const authMiddleware = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Study Plans
 *   description: Study plan management
 */

/**
 * @swagger
 * /api/study-plans:
 *   post:
 *     summary: Create a new study plan
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isCustom:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Study plan created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, studyPlanController.create);

/**
 * @swagger
 * /api/study-plans:
 *   get:
 *     summary: Get user's study plans
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's study plans
 *       401:
 *         description: Unauthorized
 */
router.get('/', authMiddleware, studyPlanController.getUserPlans);

/**
 * @swagger
 * /api/study-plans/{id}:
 *   get:
 *     summary: Get plan by ID with activities
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Study plan with activities
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Study plan not found
 */
router.get('/:id', authMiddleware, studyPlanController.getById);

/**
 * @swagger
 * /api/study-plans/{id}:
 *   put:
 *     summary: Update a study plan
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Study plan updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Study plan not found
 */
router.put('/:id', authMiddleware, studyPlanController.update);

/**
 * @swagger
 * /api/study-plans/{id}:
 *   delete:
 *     summary: Delete a study plan
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     responses:
 *       200:
 *         description: Study plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Study plan not found
 */
router.delete('/:id', authMiddleware, studyPlanController.delete);

/**
 * @swagger
 * /api/study-plans/{id}/activities:
 *   post:
 *     summary: Add activity to a plan
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - scheduledDate
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: integer
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Activity added successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Study plan not found
 */
router.post('/:id/activities', authMiddleware, studyPlanController.addActivity);

/**
 * @swagger
 * /api/study-plans/activities/{activityId}:
 *   put:
 *     summary: Update activity completion status
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isCompleted
 *             properties:
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
router.put(
  '/activities/:activityId',
  authMiddleware,
  studyPlanController.updateActivityStatus,
);

/**
 * @swagger
 * /api/study-plans/activities/{activityId}:
 *   delete:
 *     summary: Delete an activity
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
 *     responses:
 *       200:
 *         description: Activity deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Activity not found
 */
router.delete(
  '/activities/:activityId',
  authMiddleware,
  studyPlanController.deleteActivity,
);

module.exports = router;
