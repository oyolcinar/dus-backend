/**
 * Routes for user administration
 */
const express = require('express');
const router = express.Router();
const userAdminController = require('../controllers/userAdminController');
const authSupabase = require('../middleware/authSupabase');
const { authorize, authorizePermission } = require('../middleware/authorize');

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/users', 
  authSupabase, 
  authorize(['admin']), 
  userAdminController.getAllUsers
);

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Update a user's role (admin only)
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, instructor, student]
 *     responses:
 *       200:
 *         description: User role updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put('/users/:userId/role', 
  authSupabase, 
  authorize(['admin']), 
  userAdminController.updateUserRole
);

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     summary: Get all roles and their permissions
 *     tags: [Administration]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all roles and permissions
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized
 *       500:
 *         description: Server error
 */
router.get('/roles', 
  authSupabase, 
  authorize(['admin']), 
  userAdminController.getRolesAndPermissions
);

module.exports = router;