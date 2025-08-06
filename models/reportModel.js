const { createClient } = require('@supabase/supabase-js');
const supabaseConfig = require('../config/supabase');

// Initialize Supabase client
const supabase = createClient(
  supabaseConfig.supabaseUrl,
  supabaseConfig.supabaseKey,
);

const reportModel = {
  // Get all report reasons
  async getReportReasons() {
    try {
      const { data, error } = await supabase
        .from('report_reasons')
        .select('reason_id, reason_text, description')
        .eq('is_active', true)
        .order('reason_id', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting report reasons:', error);
      throw error;
    }
  },

  // Create a new question report
  async createQuestionReport(
    userId,
    testQuestionId,
    reportReasonId,
    additionalComments = null,
  ) {
    try {
      const { data, error } = await supabase
        .from('reported_questions')
        .insert({
          user_id: userId,
          test_question_id: testQuestionId,
          report_reason_id: reportReasonId,
          additional_comments: additionalComments,
          status: 'pending',
        })
        .select(
          `
          report_id,
          user_id,
          test_question_id,
          report_reason_id,
          additional_comments,
          reported_at,
          status,
          report_reasons (
            reason_id,
            reason_text,
            description
          )
        `,
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating question report:', error);
      throw error;
    }
  },

  // Check if user has already reported this question with the same reason
  async hasUserReported(userId, testQuestionId, reportReasonId) {
    try {
      const { data, error } = await supabase
        .from('reported_questions')
        .select('report_id')
        .eq('user_id', userId)
        .eq('test_question_id', testQuestionId)
        .eq('report_reason_id', reportReasonId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (error) {
      console.error('Error checking user report:', error);
      throw error;
    }
  },

  // Get all reports for a specific question
  async getQuestionReports(testQuestionId) {
    try {
      const { data, error } = await supabase
        .from('reported_questions')
        .select(
          `
          report_id,
          user_id,
          test_question_id,
          additional_comments,
          reported_at,
          status,
          admin_response,
          reviewed_by,
          reviewed_at,
          report_reasons (
            reason_id,
            reason_text,
            description
          )
        `,
        )
        .eq('test_question_id', testQuestionId)
        .order('reported_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting question reports:', error);
      throw error;
    }
  },

  // Get all reports (for admin use)
  async getAllReports(page = 1, limit = 20, status = null) {
    try {
      const offset = (page - 1) * limit;
      let query = supabase.from('reported_questions').select(
        `
          report_id,
          user_id,
          test_question_id,
          additional_comments,
          reported_at,
          status,
          admin_response,
          reviewed_by,
          reviewed_at,
          report_reasons (
            reason_id,
            reason_text,
            description
          ),
          test_questions (
            question_id,
            test_id,
            question_text,
            options,
            correct_answer
          )
        `,
        { count: 'exact' },
      );

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('reported_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('Error getting all reports:', error);
      throw error;
    }
  },

  // Get reports by user
  async getUserReports(userId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('reported_questions')
        .select(
          `
          report_id,
          test_question_id,
          additional_comments,
          reported_at,
          status,
          admin_response,
          reviewed_at,
          report_reasons (
            reason_id,
            reason_text,
            description
          ),
          test_questions (
            question_id,
            test_id,
            question_text,
            options,
            correct_answer
          )
        `,
          { count: 'exact' },
        )
        .eq('user_id', userId)
        .order('reported_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit),
        },
      };
    } catch (error) {
      console.error('Error getting user reports:', error);
      throw error;
    }
  },

  // Update report status (for admin use)
  async updateReportStatus(
    reportId,
    status,
    adminResponse = null,
    reviewedBy = null,
  ) {
    try {
      const updateData = {
        status,
        admin_response: adminResponse,
        reviewed_by: reviewedBy,
      };

      const { data, error } = await supabase
        .from('reported_questions')
        .update(updateData)
        .eq('report_id', reportId)
        .select(
          `
          report_id,
          user_id,
          test_question_id,
          additional_comments,
          reported_at,
          status,
          admin_response,
          reviewed_by,
          reviewed_at,
          report_reasons (
            reason_id,
            reason_text,
            description
          )
        `,
        )
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  },

  // Get report by ID
  async getReportById(reportId) {
    try {
      const { data, error } = await supabase
        .from('reported_questions')
        .select(
          `
          report_id,
          user_id,
          test_question_id,
          additional_comments,
          reported_at,
          status,
          admin_response,
          reviewed_by,
          reviewed_at,
          report_reasons (
            reason_id,
            reason_text,
            description
          ),
          test_questions (
            question_id,
            test_id,
            question_text,
            options,
            correct_answer,
            explanation
          )
        `,
        )
        .eq('report_id', reportId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error getting report by ID:', error);
      throw error;
    }
  },

  // Delete report (soft delete by updating status)
  async deleteReport(reportId) {
    try {
      const { data, error } = await supabase
        .from('reported_questions')
        .delete()
        .eq('report_id', reportId)
        .select('report_id')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Get report statistics
  async getReportStats() {
    try {
      // Get total reports count
      const { count: totalReports } = await supabase
        .from('reported_questions')
        .select('report_id', { count: 'exact' });

      // Get reports by status
      const { data: statusData } = await supabase
        .from('reported_questions')
        .select('status')
        .then(({ data }) => {
          const statusCounts = data?.reduce((acc, report) => {
            acc[report.status] = (acc[report.status] || 0) + 1;
            return acc;
          }, {});
          return { data: statusCounts };
        });

      // Get reports by reason
      const { data: reasonData } = await supabase
        .from('reported_questions')
        .select(
          `
          report_reason_id,
          report_reasons (
            reason_text
          )
        `,
        )
        .then(({ data }) => {
          const reasonCounts = data?.reduce((acc, report) => {
            const reasonText = report.report_reasons?.reason_text || 'Unknown';
            acc[reasonText] = (acc[reasonText] || 0) + 1;
            return acc;
          }, {});
          return { data: reasonCounts };
        });

      return {
        totalReports: totalReports || 0,
        statusBreakdown: statusData || {},
        reasonBreakdown: reasonData || {},
      };
    } catch (error) {
      console.error('Error getting report statistics:', error);
      throw error;
    }
  },
};

module.exports = reportModel;
