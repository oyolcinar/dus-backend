const express = require('express');
const router = express.Router();
const studyPlanController = require('../controllers/studyPlanController');
// Replace the old auth middleware with the new ones
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Study Plans
 *   description: Study plan management
 */

/**
 * @swagger
 * /api/studyPlans:
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
 *                 default: true
 *     responses:
 *       201:
 *         description: Study plan created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', 
  authSupabase, 
  studyPlanController.create
);

/**
 * @swagger
 * /api/studyPlans/templates:
 *   post:
 *     summary: Create a study plan template (admin only)
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
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - insufficient permissions
 */
router.post('/templates', 
  authSupabase, 
  authorizePermission('manage_study_plans'), 
  studyPlanController.createTemplate
);

/**
 * @swagger
 * /api/studyPlans/user:
 *   get:
 *     summary: Get current user's study plans
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's study plans
 *       401:
 *         description: Unauthorized
 */
router.get('/user', 
  authSupabase, 
  studyPlanController.getUserPlans
);

/**
 * @swagger
 * /api/studyPlans/templates:
 *   get:
 *     summary: Get study plan templates
 *     tags: [Study Plans]
 *     responses:
 *       200:
 *         description: List of study plan templates
 */
router.get('/templates', studyPlanController.getTemplates);

/**
 * @swagger
 * /api/studyPlans/{id}:
 *   get:
 *     summary: Get study plan by ID
 *     tags: [Study Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Study plan ID
 *     responses:
 *       200:
 *         description: Study plan details
 *       404:
 *         description: Study plan not found
 */
router.get('/:id', studyPlanController.getById);

/**
 * @swagger
 * /api/studyPlans/{id}:
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
 *         description: Study plan ID
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
 *       403:
 *         description: Forbidden - you can only update your own plans unless admin
 *       404:
 *         description: Study plan not found
 */
router.put('/:id', 
  authSupabase, 
  studyPlanController.update
);

/**
 * @swagger
 * /api/studyPlans/{id}:
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
 *         description: Study plan ID
 *     responses:
 *       200:
 *         description: Study plan deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you can only delete your own plans unless admin
 *       404:
 *         description: Study plan not found
 */
router.delete('/:id', 
  authSupabase, 
  studyPlanController.delete
);

/**
 * @swagger
 * /api/studyPlans/{id}/activities:
 *   post:
 *     summary: Add an activity to a study plan
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Study plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               subtopicId:
 *                 type: integer
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
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
 *       403:
 *         description: Forbidden - you can only add activities to your own plans unless admin
 *       404:
 *         description: Study plan not found
 */
router.post('/:id/activities', 
  authSupabase, 
  studyPlanController.addActivity
);

/**
 * @swagger
 * /api/studyPlans/{planId}/activities/{activityId}:
 *   put:
 *     summary: Update a study plan activity
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Study plan ID
 *       - in: path
 *         name: activityId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Activity ID
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
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               isCompleted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - you can only update activities in your own plans unless admin
 *       404:
 *         description: Study plan or activity not found
 */
router.put('/:planId/activities/:activityId', 
  authSupabase, 
  studyPlanController.updateActivity
);

/**
 * @swagger
 * /api/studyPlans/{planId}/activities/{activityId}:
 *   delete:
 *     summary: Delete a study plan activity
 *     tags: [Study Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Study plan ID
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
 *       403:
 *         description: Forbidden - you can only delete activities in your own plans unless admin
 *       404:
 *         description: Study plan or activity not found
 */
router.delete('/:planId/activities/:activityId', 
  authSupabase, 
  studyPlanController.deleteActivity
);

module.exports = router;