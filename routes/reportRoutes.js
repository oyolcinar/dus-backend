const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authSupabase } = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Question reporting management
 */

/**
 * @swagger
 * /api/reports/reasons:
 *   get:
 *     summary: Get all available report reasons
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: List of report reasons
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   reason_id:
 *                     type: integer
 *                   reason_text:
 *                     type: string
 *                   description:
 *                     type: string
 */
router.get('/reasons', reportController.getReportReasons);

/**
 * @swagger
 * /api/reports/question:
 *   post:
 *     summary: Report a question
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - testQuestionId
 *               - reportReasonId
 *             properties:
 *               testQuestionId:
 *                 type: integer
 *                 description: ID of the test question being reported
 *               reportReasonId:
 *                 type: integer
 *                 description: ID of the report reason
 *               additionalComments:
 *                 type: string
 *                 description: Additional comments from the user
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Question reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 report:
 *                   type: object
 *                   properties:
 *                     report_id:
 *                       type: integer
 *                     user_id:
 *                       type: integer
 *                     test_question_id:
 *                       type: integer
 *                     report_reason_id:
 *                       type: integer
 *                     additional_comments:
 *                       type: string
 *                       nullable: true
 *                     reported_at:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                     report_reasons:
 *                       type: object
 *                       properties:
 *                         reason_id:
 *                           type: integer
 *                         reason_text:
 *                           type: string
 *                         description:
 *                           type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Question not found
 *       409:
 *         description: Already reported with same reason
 */
router.post('/question', authSupabase, reportController.createQuestionReport);

/**
 * @swagger
 * /api/reports/my-reports:
 *   get:
 *     summary: Get current user's reports
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of reports per page
 *     responses:
 *       200:
 *         description: User's reports with pagination
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/my-reports', authSupabase, reportController.getUserReports);

/**
 * @swagger
 * /api/reports/question/{questionId}:
 *   get:
 *     summary: Get all reports for a specific question (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *     responses:
 *       200:
 *         description: List of reports for the question
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Question not found
 */
router.get(
  '/question/:questionId',
  authSupabase,
  authorizePermission('manage_questions'),
  reportController.getQuestionReports,
);

/**
 * @swagger
 * /api/reports/question/{questionId}/check:
 *   get:
 *     summary: Check if user has reported a specific question
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Question ID
 *       - in: query
 *         name: reasonId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report reason ID
 *     responses:
 *       200:
 *         description: Report status check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasReported:
 *                   type: boolean
 *                 userId:
 *                   type: integer
 *                 testQuestionId:
 *                   type: integer
 *                 reportReasonId:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/question/:questionId/check',
  authSupabase,
  reportController.checkUserReport,
);

/**
 * @swagger
 * /api/reports/all:
 *   get:
 *     summary: Get all reports (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of reports per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, resolved, dismissed]
 *         description: Filter by report status
 *     responses:
 *       200:
 *         description: All reports with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  '/all',
  authSupabase,
  authorizePermission('manage_questions'),
  reportController.getAllReports,
);

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - can only view own reports
 *       404:
 *         description: Report not found
 */
router.get('/:id', authSupabase, reportController.getReportById);

/**
 * @swagger
 * /api/reports/{id}/status:
 *   put:
 *     summary: Update report status (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, resolved, dismissed]
 *                 description: New status for the report
 *               adminResponse:
 *                 type: string
 *                 description: Admin response/notes
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Report status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Report not found
 */
router.put(
  '/:id/status',
  authSupabase,
  authorizePermission('manage_questions'),
  reportController.updateReportStatus,
);

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Delete report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - can only delete own reports or admin
 *       404:
 *         description: Report not found
 */
router.delete('/:id', authSupabase, reportController.deleteReport);

/**
 * @swagger
 * /api/reports/stats:
 *   get:
 *     summary: Get report statistics (admin only)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Report statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                 statusBreakdown:
 *                   type: object
 *                 reasonBreakdown:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get(
  '/stats',
  authSupabase,
  authorizePermission('manage_questions'),
  reportController.getReportStats,
);

module.exports = router;
