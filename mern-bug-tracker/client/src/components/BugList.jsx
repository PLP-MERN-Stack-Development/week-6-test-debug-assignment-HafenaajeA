import React, { useState, useEffect } from 'react';
import { useBugs } from '../context/BugContext';
import { useAuth } from '../context/AuthContext';
import BugCard from './BugCard';
import BugForm from './BugForm';

const BugList = () => {
  const [showBugForm, setShowBugForm] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const {
    bugs,
    loading,
    error,
    filters,
    sort,
    pagination,
    loadBugs,
    deleteBug,
    addComment,
    updateBug,
    setFilter,
    setSort,
    clearError
  } = useBugs();

  const { user } = useAuth();

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      await loadBugs();
      setIsLoading(false);
    };

    initializeData();
  }, []);

  const handleCreateBug = () => {
    setEditingBug(null);
    setShowBugForm(true);
  };

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setShowBugForm(true);
  };

  const handleFormSubmit = (bug) => {
    setShowBugForm(false);
    setEditingBug(null);
    // Bug list will automatically update via context
  };

  const handleFormCancel = () => {
    setShowBugForm(false);
    setEditingBug(null);
  };

  const handleDeleteBug = async (bugId) => {
    if (window.confirm('Are you sure you want to delete this bug?')) {
      await deleteBug(bugId);
    }
  };

  const handleAddComment = async (bugId, comment) => {
    await addComment(bugId, comment);
  };

  const handleStatusChange = async (bugId, newStatus) => {
    await updateBug(bugId, { status: newStatus });
  };

  const handleAssign = async (bug) => {
    const assignedTo = prompt('Enter user ID to assign this bug to:');
    if (assignedTo && assignedTo.trim()) {
      await updateBug(bug._id, { assignedTo: assignedTo.trim() });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilter({ [field]: value });
  };

  const handleSortChange = (field) => {
    const newOrder = sort.field === field && sort.order === 'desc' ? 'asc' : 'desc';
    setSort(field, newOrder);
  };

  const handleLoadMore = () => {
    loadBugs(pagination.page + 1);
  };

  if (showBugForm) {
    return (
      <div className="bug-list-container">
        <BugForm
          bug={editingBug}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }

  return (
    <div className="bug-list-container">
      <div className="bug-list-header">
        <div className="header-title">
          <h1>Bug Reports</h1>
          <p className="subtitle">
            Manage and track bugs across your projects
          </p>
        </div>
        
        <div className="header-actions">
          <button
            onClick={handleCreateBug}
            className="btn btn-primary"
          >
            Report New Bug
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="alert-close"
            aria-label="Close error"
          >
            ×
          </button>
        </div>
      )}

      <div className="bug-list-filters">
        <div className="filters-row">
          <div className="filter-group">
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="priority-filter">Priority</label>
            <select
              id="priority-filter"
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="filter-select"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="assignee-filter">Assigned To</label>
            <select
              id="assignee-filter"
              value={filters.assignedTo}
              onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
              className="filter-select"
            >
              <option value="">All Assignees</option>
              <option value="me">My Bugs</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="reporter-filter">Reported By</label>
            <select
              id="reporter-filter"
              value={filters.reportedBy}
              onChange={(e) => handleFilterChange('reportedBy', e.target.value)}
              className="filter-select"
            >
              <option value="">All Reporters</option>
              <option value="me">Reported by Me</option>
            </select>
          </div>
        </div>

        <div className="sort-controls">
          <span className="sort-label">Sort by:</span>
          <button
            onClick={() => handleSortChange('createdAt')}
            className={`sort-button ${sort.field === 'createdAt' ? 'active' : ''}`}
          >
            Date Created
            {sort.field === 'createdAt' && (
              <span className="sort-arrow">
                {sort.order === 'desc' ? '↓' : '↑'}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSortChange('priority')}
            className={`sort-button ${sort.field === 'priority' ? 'active' : ''}`}
          >
            Priority
            {sort.field === 'priority' && (
              <span className="sort-arrow">
                {sort.order === 'desc' ? '↓' : '↑'}
              </span>
            )}
          </button>
          <button
            onClick={() => handleSortChange('status')}
            className={`sort-button ${sort.field === 'status' ? 'active' : ''}`}
          >
            Status
            {sort.field === 'status' && (
              <span className="sort-arrow">
                {sort.order === 'desc' ? '↓' : '↑'}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="bug-list-content">
        {isLoading || loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading bugs...</p>
          </div>
        ) : bugs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐛</div>
            <h3>No bugs found</h3>
            <p>
              {Object.values(filters).some(filter => filter) 
                ? 'No bugs match your current filters. Try adjusting your search criteria.'
                : 'No bugs have been reported yet. Click "Report New Bug" to get started.'
              }
            </p>
            {!Object.values(filters).some(filter => filter) && (
              <button
                onClick={handleCreateBug}
                className="btn btn-primary"
              >
                Report Your First Bug
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="bugs-grid">
              {bugs.map((bug) => (
                <BugCard
                  key={bug._id}
                  bug={bug}
                  onEdit={handleEditBug}
                  onDelete={handleDeleteBug}
                  onAssign={handleAssign}
                  onComment={handleAddComment}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>

            {pagination.page < pagination.pages && (
              <div className="load-more">
                <button
                  onClick={handleLoadMore}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}

            <div className="pagination-info">
              <p>
                Showing {bugs.length} of {pagination.total} bugs
                {pagination.pages > 1 && (
                  <span> (Page {pagination.page} of {pagination.pages})</span>
                )}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BugList;
