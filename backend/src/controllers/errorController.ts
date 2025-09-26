import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface ErrorReport {
  type: 'javascript_error' | 'unhandled_promise' | 'console_error' | 'react_error';
  message: string;
  stack?: string;
  userAgent: string;
  url: string;
  timestamp: string;
  userId?: string;
  deviceInfo: {
    isMobile: boolean;
    platform: string;
    browser: string;
    screenSize: string;
    viewportSize: string;
  };
  additionalInfo?: any;
}

// Create errors table if it doesn't exist
const ensureErrorsTable = async () => {
  try {
    // Check if the table exists by trying to select from it
    const { error } = await supabase.from('error_reports').select('id').limit(1);

    if (error && error.code === 'PGRST106') {
      // Table doesn't exist, create it
      console.log('Creating error_reports table...');

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS error_reports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          type TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          user_agent TEXT NOT NULL,
          url TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          user_id UUID REFERENCES auth.users(id),
          device_info JSONB NOT NULL,
          additional_info JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_error_reports_type ON error_reports(type);
        CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_error_reports_timestamp ON error_reports(timestamp);
        CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON error_reports(created_at);

        -- Enable RLS
        ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;

        -- Allow service role to do everything
        CREATE POLICY IF NOT EXISTS "Allow service role full access" ON error_reports
          FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);

        -- Allow users to insert their own errors
        CREATE POLICY IF NOT EXISTS "Allow users to insert their own errors" ON error_reports
          FOR INSERT
          TO authenticated
          WITH CHECK (user_id = auth.uid());

        -- Allow users to view their own errors
        CREATE POLICY IF NOT EXISTS "Allow users to view their own errors" ON error_reports
          FOR SELECT
          TO authenticated
          USING (user_id = auth.uid());
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableQuery
      });

      if (createError) {
        console.error('Error creating error_reports table:', createError);
      } else {
        console.log('error_reports table created successfully');
      }
    }
  } catch (error) {
    console.error('Error ensuring error_reports table exists:', error);
  }
};

// Initialize table on startup
ensureErrorsTable();

export const reportError = async (req: Request, res: Response): Promise<void> => {
  try {
    const errorReport: ErrorReport = req.body;

    // Validate required fields
    if (!errorReport.type || !errorReport.message || !errorReport.userAgent || !errorReport.url || !errorReport.timestamp || !errorReport.deviceInfo) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields in error report'
      });
      return;
    }

    // Insert error report into database
    const { data, error } = await supabase
      .from('error_reports')
      .insert({
        type: errorReport.type,
        message: errorReport.message,
        stack: errorReport.stack,
        user_agent: errorReport.userAgent,
        url: errorReport.url,
        timestamp: errorReport.timestamp,
        user_id: errorReport.userId || null,
        device_info: errorReport.deviceInfo,
        additional_info: errorReport.additionalInfo || null
      })
      .select();

    if (error) {
      console.error('Error saving error report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save error report',
        error: error.message
      });
      return;
    }

    // Log to console for immediate debugging
    console.error('🚨 CLIENT ERROR REPORTED:', {
      type: errorReport.type,
      message: errorReport.message,
      userId: errorReport.userId,
      device: errorReport.deviceInfo,
      url: errorReport.url,
      timestamp: errorReport.timestamp,
      stack: errorReport.stack?.substring(0, 200) + '...' // Truncate stack for readability
    });

    res.status(200).json({
      success: true,
      message: 'Error report saved successfully',
      reportId: data?.[0]?.id
    });

  } catch (error) {
    console.error('Error in reportError controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while saving error report'
    });
  }
};

export const getErrorReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, type, userId } = req.query;

    let query = supabase
      .from('error_reports')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    // Apply pagination
    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching error reports:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch error reports',
        error: error.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit))
      }
    });

  } catch (error) {
    console.error('Error in getErrorReports controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching error reports'
    });
  }
};

export const getErrorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get error counts by type
    const { data: typeStats, error: typeError } = await supabase
      .from('error_reports')
      .select('type')
      .then(({ data, error }) => {
        if (error) return { data: null, error };

        const stats = data?.reduce((acc: Record<string, number>, report) => {
          acc[report.type] = (acc[report.type] || 0) + 1;
          return acc;
        }, {});

        return { data: stats, error: null };
      });

    if (typeError) {
      console.error('Error fetching error type stats:', typeError);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch error statistics',
        error: typeError.message
      });
      return;
    }

    // Get recent error count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: recentError } = await supabase
      .from('error_reports')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    if (recentError) {
      console.error('Error fetching recent error count:', recentError);
    }

    res.status(200).json({
      success: true,
      data: {
        typeStats: typeStats || {},
        recentCount: recentCount || 0,
        period: '24h'
      }
    });

  } catch (error) {
    console.error('Error in getErrorStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching error statistics'
    });
  }
};