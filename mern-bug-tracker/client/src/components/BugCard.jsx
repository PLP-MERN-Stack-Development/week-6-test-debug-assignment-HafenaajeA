import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BugCard = ({ bug, onEdit, onDelete, onAssign, onComment, onStatusChange }) => {
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const { user } = useAuth();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setIsAddingComment(true);
    try {
      await onComment(bug._id, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleStatusChange = (newStatus) => {
    onStatusChange(bug._id, newStatus);
    setShowActions(false);
  };

  const canEdit = user && (user._id === bug.reportedBy._id || user.role === 'admin' || user.role === 'manager');
  const canDelete = user && (user._id === bug.reportedBy._id || user.role === 'admin');
  const canAssign = user && (user.role === 'admin' || user.role === 'manager');

  return (
    <div className={`bug-card ${getStatusClass(bug.status)}`}>
      <div className="bug-card-header">
        <div className="bug-title-section">
          <h3 className="bug-title">{bug.title}</h3>
          <div className="bug-meta">
            <span className={`priority-badge ${getPriorityClass(bug.priority)}`}>
              {bug.priority.toUpperCase()}
            </span>
            <span className={`status-badge ${getStatusClass(bug.status)}`}>
              {bug.status.replace('-', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        
        <div className="bug-actions">
          {(canEdit || canDelete || canAssign) && (
            <div className="actions-dropdown">
              <button
                className="actions-toggle"
                onClick={() => setShowActions(!showActions)}
                aria-label="Bug actions"
              >
                ⋮
              </button>
              
              {showActions && (
                <div className="actions-menu">
                  {canEdit && (
                    <button onClick={() => onEdit(bug)} className="action-item">
                      Edit
                    </button>
                  )}
                  
                  {canAssign && (
                    <button onClick={() => onAssign(bug)} className="action-item">
                      Assign
                    </button>
                  )}
                  
                  <div className="action-submenu">
                    <span className="submenu-label">Change Status</span>
                    <button 
                      onClick={() => handleStatusChange('open')}
                      className="action-item"
                      disabled={bug.status === 'open'}
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => handleStatusChange('in-progress')}
                      className="action-item"
                      disabled={bug.status === 'in-progress'}
                    >
                      In Progress
                    </button>
                    <button 
                      onClick={() => handleStatusChange('resolved')}
                      className="action-item"
                      disabled={bug.status === 'resolved'}
                    >
                      Resolved
                    </button>
                    <button 
                      onClick={() => handleStatusChange('closed')}
                      className="action-item"
                      disabled={bug.status === 'closed'}
                    >
                      Closed
                    </button>
                  </div>
                  
                  {canDelete && (
                    <button 
                      onClick={() => onDelete(bug._id)}
                      className="action-item delete"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bug-card-body">
        <p className="bug-description">{bug.description}</p>
        
        {(bug.stepsToReproduce || bug.expectedBehavior || bug.actualBehavior) && (
          <div className="bug-details">
            {bug.stepsToReproduce && (
              <div className="detail-section">
                <strong>Steps to Reproduce:</strong>
                <p>{bug.stepsToReproduce}</p>
              </div>
            )}
            
            {bug.expectedBehavior && (
              <div className="detail-section">
                <strong>Expected:</strong>
                <p>{bug.expectedBehavior}</p>
              </div>
            )}
            
            {bug.actualBehavior && (
              <div className="detail-section">
                <strong>Actual:</strong>
                <p>{bug.actualBehavior}</p>
              </div>
            )}
          </div>
        )}

        {bug.tags && bug.tags.length > 0 && (
          <div className="bug-tags">
            {bug.tags.map((tag, index) => (
              <span key={index} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bug-card-footer">
        <div className="bug-info">
          <div className="reporter-info">
            <span className="label">Reported by:</span>
            <span className="value">{bug.reportedBy.name}</span>
          </div>
          
          {bug.assignedTo && (
            <div className="assignee-info">
              <span className="label">Assigned to:</span>
              <span className="value">{bug.assignedTo.name}</span>
            </div>
          )}
          
          <div className="date-info">
            <span className="label">Created:</span>
            <span className="value">{formatDate(bug.createdAt)}</span>
          </div>
          
          {bug.updatedAt !== bug.createdAt && (
            <div className="date-info">
              <span className="label">Updated:</span>
              <span className="value">{formatDate(bug.updatedAt)}</span>
            </div>
          )}
        </div>

        <div className="bug-actions-footer">
          <button
            className="btn btn-link"
            onClick={() => setShowComments(!showComments)}
          >
            Comments ({bug.comments ? bug.comments.length : 0})
          </button>
        </div>
      </div>

      {showComments && (
        <div className="bug-comments">
          <div className="comments-header">
            <h4>Comments</h4>
          </div>
          
          <div className="comments-list">
            {bug.comments && bug.comments.length > 0 ? (
              bug.comments.map((comment, index) => (
                <div key={index} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author?.name || 'Unknown'}</span>
                    <span className="comment-date">{formatDate(comment.createdAt)}</span>
                  </div>
                  <div className="comment-text">{comment.comment}</div>
                </div>
              ))
            ) : (
              <p className="no-comments">No comments yet.</p>
            )}
          </div>
          
          <div className="add-comment">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="comment-input"
              rows={3}
              disabled={isAddingComment}
            />
            <div className="comment-actions">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim() || isAddingComment}
                className="btn btn-primary btn-small"
              >
                {isAddingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugCard;
