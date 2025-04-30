/**
 * Controller for user administration
 */
const userModel = require('../models/userModel');
const db = require('../config/db');

const userAdminController = {
  // Get all users (admin only)
  async getAllUsers(req, res) {
    try {
      const query = `
        SELECT user_id, username, email, date_registered, 
               role, subscription_type, auth_id
        FROM users
        ORDER BY user_id
      `;
      
      const result = await db.query(query);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ message: 'Failed to get users' });
    }
  },
  
  // Update user role (admin only)
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!userId || !role) {
        return res.status(400).json({ message: 'User ID and role are required' });
      }
      
      // Validate role
      const validRoles = ['admin', 'instructor', 'student'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      
      const updatedUser = await userModel.updateUserRole(userId, role);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        message: 'User role updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ message: 'Failed to update user role' });
    }
  },
  
  // Get all roles and their permissions
  async getRolesAndPermissions(req, res) {
    try {
      const query = `
        SELECT rp.role, json_agg(json_build_object('id', p.permission_id, 'name', p.name, 'description', p.description)) AS permissions
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.permission_id
        GROUP BY rp.role
      `;
      
      const result = await db.query(query);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Get roles error:', error);
      res.status(500).json({ message: 'Failed to get roles and permissions' });
    }
  }
};

module.exports = userAdminController;