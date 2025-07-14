import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBugs } from '../context/BugContext';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalBugs: 0,
    openBugs: 0,
    inProgressBugs: 0,
    resolvedBugs: 0,
    myBugs: 0,
    assignedToMe: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, token } = useAuth();
  const { bugs } = useBugs();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        
        // Fetch statistics from API
        const response = await fetch('/api/bugs/statistics', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          // Fallback to client-side calculation if API is not available
          calculateStatsFromBugs();
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        // Fallback to client-side calculation
        calculateStatsFromBugs();
      } finally {
        setLoading(false);
      }
    };

    const calculateStatsFromBugs = () => {
      if (!bugs || !user) return;

      const totalBugs = bugs.length;
      const openBugs = bugs.filter(bug => bug.status === 'open').length;
      const inProgressBugs = bugs.filter(bug => bug.status === 'in-progress').length;
      const resolvedBugs = bugs.filter(bug => bug.status === 'resolved').length;
      const myBugs = bugs.filter(bug => bug.reportedBy._id === user._id).length;
      const assignedToMe = bugs.filter(bug => bug.assignedTo?._id === user._id).length;

      // Get recent activity (last 5 bugs)
      const recentActivity = bugs
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
        .map(bug => ({
          id: bug._id,
          title: bug.title,
          status: bug.status,
          priority: bug.priority,
          updatedAt: bug.updatedAt,
          type: 'bug_updated'
        }));

      setStats({
        totalBugs,
        openBugs,
        inProgressBugs,
        resolvedBugs,
        myBugs,
        assignedToMe,
        recentActivity
      });
    };

    fetchDashboardData();
  }, [token, bugs, user]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityClass = (priority) => {
    const classes = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical'
    };
    return classes[priority] || 'priority-medium';
  };

  const getStatusClass = (status) => {
    const classes = {
      open: 'status-open',
      'in-progress': 'status-in-progress',
      resolved: 'status-resolved',
      closed: 'status-closed',
      reopened: 'status-reopened'
    };
    return classes[status] || 'status-open';
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-state">
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="welcome-message">
          Welcome back, {user?.name}! Here's an overview of your bug tracking activity.
        </p>
      </div>

      <div className="dashboard-stats">
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">🐛</div>
            <div className="stat-content">
              <h3>{stats.totalBugs}</h3>
              <p>Total Bugs</p>
            </div>
          </div>

          <div className="stat-card open">
            <div className="stat-icon">🚨</div>
            <div className="stat-content">
              <h3>{stats.openBugs}</h3>
              <p>Open Bugs</p>
            </div>
          </div>

          <div className="stat-card in-progress">
            <div className="stat-icon">⚡</div>
            <div className="stat-content">
              <h3>{stats.inProgressBugs}</h3>
              <p>In Progress</p>
            </div>
          </div>

          <div className="stat-card resolved">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{stats.resolvedBugs}</h3>
              <p>Resolved</p>
            </div>
          </div>

          <div className="stat-card my-bugs">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>{stats.myBugs}</h3>
              <p>Reported by Me</p>
            </div>
          </div>

          <div className="stat-card assigned">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>{stats.assignedToMe}</h3>
              <p>Assigned to Me</p>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="recent-activity">
            {stats.recentActivity.length > 0 ? (
              <div className="activity-list">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.type === 'bug_updated' ? '🔄' : '🐛'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">{activity.title}</div>
                      <div className="activity-meta">
                        <span className={`priority-badge ${getPriorityClass(activity.priority)}`}>
                          {activity.priority}
                        </span>
                        <span className={`status-badge ${getStatusClass(activity.status)}`}>
                          {activity.status.replace('-', ' ')}
                        </span>
                        <span className="activity-date">
                          {formatDate(activity.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-activity">
                <p>No recent activity to show.</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <div className="action-card">
              <h3>Report a Bug</h3>
              <p>Found a new issue? Report it quickly and efficiently.</p>
              <a href="/bugs/new" className="btn btn-primary">
                Report Bug
              </a>
            </div>

            <div className="action-card">
              <h3>View All Bugs</h3>
              <p>Browse and manage all bugs in the system.</p>
              <a href="/bugs" className="btn btn-secondary">
                View Bugs
              </a>
            </div>

            <div className="action-card">
              <h3>My Assignments</h3>
              <p>See bugs that are currently assigned to you.</p>
              <a href="/bugs?assignedTo=me" className="btn btn-secondary">
                My Tasks
              </a>
            </div>

            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div className="action-card">
                <h3>Admin Panel</h3>
                <p>Manage users and system settings.</p>
                <a href="/admin" className="btn btn-outline">
                  Admin Panel
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Chart (Simple) */}
        <div className="dashboard-section">
          <h2>Bug Status Distribution</h2>
          <div className="status-chart">
            <div className="chart-bars">
              <div className="chart-bar">
                <div 
                  className="bar open" 
                  style={{ 
                    height: `${stats.totalBugs > 0 ? (stats.openBugs / stats.totalBugs) * 100 : 0}%`,
                    minHeight: stats.openBugs > 0 ? '10px' : '0'
                  }}
                ></div>
                <label>Open ({stats.openBugs})</label>
              </div>
              <div className="chart-bar">
                <div 
                  className="bar in-progress" 
                  style={{ 
                    height: `${stats.totalBugs > 0 ? (stats.inProgressBugs / stats.totalBugs) * 100 : 0}%`,
                    minHeight: stats.inProgressBugs > 0 ? '10px' : '0'
                  }}
                ></div>
                <label>In Progress ({stats.inProgressBugs})</label>
              </div>
              <div className="chart-bar">
                <div 
                  className="bar resolved" 
                  style={{ 
                    height: `${stats.totalBugs > 0 ? (stats.resolvedBugs / stats.totalBugs) * 100 : 0}%`,
                    minHeight: stats.resolvedBugs > 0 ? '10px' : '0'
                  }}
                ></div>
                <label>Resolved ({stats.resolvedBugs})</label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
