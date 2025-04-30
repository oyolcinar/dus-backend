const db = require('../config/db');

// Middleware to check if user has a specific role
const authorize = (requiredRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // If no specific roles are required, allow all authenticated users
      if (requiredRoles.length === 0) {
        return next();
      }

      const userRole = req.user.role;

      // Check if user's role is in the list of required roles
      if (!requiredRoles.includes(userRole)) {
        return res.status(403).json({
          message: 'You do not have permission to access this resource',
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ message: 'Authorization failed' });
    }
  };
};

// Middleware to check if user has a specific permission
const authorizePermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const userRole = req.user.role;

      // Execute the has_permission function to check if the user has the required permission
      const query = `
        SELECT has_permission($1, $2) AS has_permission
      `;

      const result = await db.query(query, [userRole, requiredPermission]);

      if (!result.rows[0].has_permission) {
        return res.status(403).json({
          message: `You don't have the '${requiredPermission}' permission required for this action`,
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      return res
        .status(500)
        .json({ message: 'Permission verification failed' });
    }
  };
};

module.exports = {
  authorize,
  authorizePermission,
};
