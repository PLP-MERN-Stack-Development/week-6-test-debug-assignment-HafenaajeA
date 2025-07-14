import React, { useState, useEffect } from 'react';
import { useBugs } from '../context/BugContext';

const BugForm = ({ bug, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
    tags: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createBug, updateBug, loading } = useBugs();

  // Populate form if editing existing bug
  useEffect(() => {
    if (bug) {
      setFormData({
        title: bug.title || '',
        description: bug.description || '',
        priority: bug.priority || 'medium',
        status: bug.status || 'open',
        assignedTo: bug.assignedTo?._id || '',
        tags: bug.tags ? bug.tags.join(', ') : '',
        stepsToReproduce: bug.stepsToReproduce || '',
        expectedBehavior: bug.expectedBehavior || '',
        actualBehavior: bug.actualBehavior || ''
      });
    }
  }, [bug]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    }

    if (!formData.description.trim()) {
      errors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      errors.description = 'Description must be at least 10 characters';
    }

    if (!formData.priority) {
      errors.priority = 'Priority is required';
    }

    if (!formData.status) {
      errors.status = 'Status is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
      };

      let result;
      if (bug) {
        result = await updateBug(bug._id, submitData);
      } else {
        result = await createBug(submitData);
      }

      if (result.success) {
        if (onSubmit) {
          onSubmit(result.bug);
        }
      }
    } catch (error) {
      console.error('Error submitting bug:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(bug);

  return (
    <div className="bug-form">
      <h2>{isEditing ? 'Edit Bug' : 'Report New Bug'}</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className={`form-control ${validationErrors.title ? 'error' : ''}`}
              placeholder="Brief description of the bug"
              required
              maxLength={200}
            />
            {validationErrors.title && (
              <div className="field-error">{validationErrors.title}</div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group flex-2">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={`form-control ${validationErrors.description ? 'error' : ''}`}
              placeholder="Detailed description of the bug"
              required
              rows={4}
              maxLength={1000}
            />
            {validationErrors.description && (
              <div className="field-error">{validationErrors.description}</div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority *</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className={`form-control ${validationErrors.priority ? 'error' : ''}`}
              required
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            {validationErrors.priority && (
              <div className="field-error">{validationErrors.priority}</div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="status">Status *</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={`form-control ${validationErrors.status ? 'error' : ''}`}
              required
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="reopened">Reopened</option>
            </select>
            {validationErrors.status && (
              <div className="field-error">{validationErrors.status}</div>
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <input
              type="text"
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              className="form-control"
              placeholder="User ID (optional)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="form-control"
              placeholder="Comma-separated tags (e.g., ui, backend, critical)"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="stepsToReproduce">Steps to Reproduce</label>
            <textarea
              id="stepsToReproduce"
              name="stepsToReproduce"
              value={formData.stepsToReproduce}
              onChange={handleChange}
              className="form-control"
              placeholder="1. Go to page X&#10;2. Click on button Y&#10;3. ..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="expectedBehavior">Expected Behavior</label>
            <textarea
              id="expectedBehavior"
              name="expectedBehavior"
              value={formData.expectedBehavior}
              onChange={handleChange}
              className="form-control"
              placeholder="What should happen..."
              rows={2}
              maxLength={300}
            />
          </div>

          <div className="form-group">
            <label htmlFor="actualBehavior">Actual Behavior</label>
            <textarea
              id="actualBehavior"
              name="actualBehavior"
              value={formData.actualBehavior}
              onChange={handleChange}
              className="form-control"
              placeholder="What actually happens..."
              rows={2}
              maxLength={300}
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting || loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Bug' : 'Create Bug')
            }
          </button>
        </div>
      </form>
    </div>
  );
};

export default BugForm;
