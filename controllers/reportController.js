const reportModel = require('../models/reportModel');
const questionModel = require('../models/questionModel');

const reportController = {
  // Get all report reasons
  async getReportReasons(req, res) {
    try {
      const reasons = await reportModel.getReportReasons();
      res.json(reasons);
    } catch (error) {
      console.error('Get report reasons error:', error);
      res.status(500).json({ message: 'Failed to retrieve report reasons' });
    }
  },

  // Create a new question report
  async createQuestionReport(req, res) {
    try {
      const { testQuestionId, reportReasonId, additionalComments } = req.body;
      const userId = req.user.userId;

      // Validate input
      if (!testQuestionId || !reportReasonId) {
        return res.status(400).json({
          message: 'Test question ID and report reason ID are required',
        });
      }

      // Check if question exists
      const question = await questionModel.getById(testQuestionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Check if user has already reported this question with the same reason
      const hasReported = await reportModel.hasUserReported(
        userId,
        testQuestionId,
        reportReasonId,
      );

      if (hasReported) {
        return res.status(409).json({
          message:
            'You have already reported this question with the same reason',
        });
      }

      // Create the report
      const newReport = await reportModel.createQuestionReport(
        userId,
        testQuestionId,
        reportReasonId,
        additionalComments || null,
      );

      res.status(201).json({
        message: 'Question reported successfully',
        report: newReport,
      });
    } catch (error) {
      console.error('Create question report error:', error);

      // Handle unique constraint violation
      if (error.code === '23505') {
        return res.status(409).json({
          message:
            'You have already reported this question with the same reason',
        });
      }

      res.status(500).json({ message: 'Failed to create question report' });
    }
  },

  // Get reports for a specific question
  async getQuestionReports(req, res) {
    try {
      const testQuestionId = parseInt(req.params.questionId);

      // Check if question exists
      const question = await questionModel.getById(testQuestionId);
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      const reports = await reportModel.getQuestionReports(testQuestionId);
      res.json(reports);
    } catch (error) {
      console.error('Get question reports error:', error);
      res.status(500).json({ message: 'Failed to retrieve question reports' });
    }
  },

  // Get all reports (admin only)
  async getAllReports(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status || null;

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only administrators can view all reports',
        });
      }

      const result = await reportModel.getAllReports(page, limit, status);
      res.json(result);
    } catch (error) {
      console.error('Get all reports error:', error);
      res.status(500).json({ message: 'Failed to retrieve reports' });
    }
  },

  // Get reports by current user
  async getUserReports(req, res) {
    try {
      const userId = req.user.userId;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await reportModel.getUserReports(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error('Get user reports error:', error);
      res.status(500).json({ message: 'Failed to retrieve your reports' });
    }
  },

  // Get report by ID
  async getReportById(req, res) {
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user.userId;
      const userRole = req.user.role;

      const report = await reportModel.getReportById(reportId);
      if (!report) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check permissions: user can only see their own reports, admins can see all
      if (userRole !== 'admin' && report.user_id !== userId) {
        return res.status(403).json({
          message: 'You can only view your own reports',
        });
      }

      res.json(report);
    } catch (error) {
      console.error('Get report by ID error:', error);
      res.status(500).json({ message: 'Failed to retrieve report' });
    }
  },

  // Update report status (admin only)
  async updateReportStatus(req, res) {
    try {
      const reportId = parseInt(req.params.id);
      const { status, adminResponse } = req.body;
      const reviewedBy = req.user.userId;

      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only administrators can update report status',
        });
      }

      // Validate status
      const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        });
      }

      // Check if report exists
      const existingReport = await reportModel.getReportById(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: 'Report not found' });
      }

      const updatedReport = await reportModel.updateReportStatus(
        reportId,
        status,
        adminResponse || null,
        reviewedBy,
      );

      res.json({
        message: 'Report status updated successfully',
        report: updatedReport,
      });
    } catch (error) {
      console.error('Update report status error:', error);
      res.status(500).json({ message: 'Failed to update report status' });
    }
  },

  // Delete report (admin only or report owner)
  async deleteReport(req, res) {
    try {
      const reportId = parseInt(req.params.id);
      const userId = req.user.userId;
      const userRole = req.user.role;

      // Check if report exists
      const existingReport = await reportModel.getReportById(reportId);
      if (!existingReport) {
        return res.status(404).json({ message: 'Report not found' });
      }

      // Check permissions: user can delete their own reports, admins can delete any
      if (userRole !== 'admin' && existingReport.user_id !== userId) {
        return res.status(403).json({
          message: 'You can only delete your own reports',
        });
      }

      await reportModel.deleteReport(reportId);
      res.json({ message: 'Report deleted successfully' });
    } catch (error) {
      console.error('Delete report error:', error);
      res.status(500).json({ message: 'Failed to delete report' });
    }
  },

  // Get report statistics (admin only)
  async getReportStats(req, res) {
    try {
      // Check if user has admin permissions
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Only administrators can view report statistics',
        });
      }

      const stats = await reportModel.getReportStats();
      res.json(stats);
    } catch (error) {
      console.error('Get report statistics error:', error);
      res.status(500).json({ message: 'Failed to retrieve report statistics' });
    }
  },

  // Check if user has reported a specific question
  async checkUserReport(req, res) {
    try {
      const testQuestionId = parseInt(req.params.questionId);
      const reportReasonId = parseInt(req.query.reasonId);
      const userId = req.user.userId;

      if (!reportReasonId) {
        return res.status(400).json({
          message: 'Report reason ID is required as query parameter',
        });
      }

      const hasReported = await reportModel.hasUserReported(
        userId,
        testQuestionId,
        reportReasonId,
      );

      res.json({
        hasReported,
        userId,
        testQuestionId,
        reportReasonId,
      });
    } catch (error) {
      console.error('Check user report error:', error);
      res.status(500).json({ message: 'Failed to check user report status' });
    }
  },
};

module.exports = reportController;
