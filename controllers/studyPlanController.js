const studyPlanModel = require('../models/studyPlanModel');

const studyPlanController = {
  // Create a new study plan
  async create(req, res) {
    try {
      const userId = req.user.userId;
      const { title, description, startDate, endDate, isCustom } = req.body;

      // Validate input
      if (!title || !startDate || !endDate) {
        return res
          .status(400)
          .json({ message: 'Title, start date, and end date are required' });
      }

      // Create plan
      const newPlan = await studyPlanModel.create(
        userId,
        title,
        description || null,
        startDate,
        endDate,
        isCustom || false,
      );

      res.status(201).json({
        message: 'Study plan created successfully',
        plan: newPlan,
      });
    } catch (error) {
      console.error('Study plan creation error:', error);
      res.status(500).json({ message: 'Failed to create study plan' });
    }
  },

  // Get user's study plans
  async getUserPlans(req, res) {
    try {
      const userId = req.user.userId;

      const plans = await studyPlanModel.getUserPlans(userId);
      res.json(plans);
    } catch (error) {
      console.error('Get plans error:', error);
      res.status(500).json({ message: 'Failed to retrieve study plans' });
    }
  },

  // Get plan by ID
  async getById(req, res) {
    try {
      const planId = req.params.id;

      const plan = await studyPlanModel.getById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Study plan not found' });
      }

      const activities = await studyPlanModel.getPlanActivities(planId);

      res.json({
        ...plan,
        activities,
      });
    } catch (error) {
      console.error('Get plan error:', error);
      res.status(500).json({ message: 'Failed to retrieve study plan' });
    }
  },

  // Update plan
  async update(req, res) {
    try {
      const planId = req.params.id;
      const { title, description, startDate, endDate } = req.body;

      // Check if plan exists
      const existingPlan = await studyPlanModel.getById(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: 'Study plan not found' });
      }

      // Update plan
      const updatedPlan = await studyPlanModel.update(
        planId,
        title || existingPlan.title,
        description !== undefined ? description : existingPlan.description,
        startDate || existingPlan.start_date,
        endDate || existingPlan.end_date,
      );

      res.json({
        message: 'Study plan updated successfully',
        plan: updatedPlan,
      });
    } catch (error) {
      console.error('Update plan error:', error);
      res.status(500).json({ message: 'Failed to update study plan' });
    }
  },

  // Delete plan
  async delete(req, res) {
    try {
      const planId = req.params.id;

      // Check if plan exists
      const existingPlan = await studyPlanModel.getById(planId);
      if (!existingPlan) {
        return res.status(404).json({ message: 'Study plan not found' });
      }

      // Delete plan
      await studyPlanModel.delete(planId);

      res.json({ message: 'Study plan deleted successfully' });
    } catch (error) {
      console.error('Delete plan error:', error);
      res.status(500).json({ message: 'Failed to delete study plan' });
    }
  },

  // Add activity to plan
  async addActivity(req, res) {
    try {
      const planId = req.params.id;
      const { subtopicId, title, description, duration, scheduledDate } =
        req.body;

      // Validate input
      if (!title || !scheduledDate) {
        return res
          .status(400)
          .json({ message: 'Title and scheduled date are required' });
      }

      // Check if plan exists
      const plan = await studyPlanModel.getById(planId);
      if (!plan) {
        return res.status(404).json({ message: 'Study plan not found' });
      }

      // Add activity
      const activity = await studyPlanModel.addActivity(
        planId,
        subtopicId || null,
        title,
        description || null,
        duration || null,
        scheduledDate,
      );

      res.status(201).json({
        message: 'Activity added successfully',
        activity,
      });
    } catch (error) {
      console.error('Add activity error:', error);
      res.status(500).json({ message: 'Failed to add activity' });
    }
  },

  // Update activity status
  async updateActivityStatus(req, res) {
    try {
      const activityId = req.params.activityId;
      const { isCompleted } = req.body;

      // Validate input
      if (isCompleted === undefined) {
        return res
          .status(400)
          .json({ message: 'Completion status is required' });
      }

      // Update activity
      const activity = await studyPlanModel.updateActivityStatus(
        activityId,
        isCompleted,
      );
      if (!activity) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      res.json({
        message: 'Activity updated successfully',
        activity,
      });
    } catch (error) {
      console.error('Update activity error:', error);
      res.status(500).json({ message: 'Failed to update activity' });
    }
  },

  // Delete activity
  async deleteActivity(req, res) {
    try {
      const activityId = req.params.activityId;

      const result = await studyPlanModel.deleteActivity(activityId);
      if (!result) {
        return res.status(404).json({ message: 'Activity not found' });
      }

      res.json({ message: 'Activity deleted successfully' });
    } catch (error) {
      console.error('Delete activity error:', error);
      res.status(500).json({ message: 'Failed to delete activity' });
    }
  },
};

module.exports = studyPlanController;
