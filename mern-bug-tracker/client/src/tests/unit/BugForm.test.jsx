import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BugForm from '../BugForm';
import { BugProvider } from '../../context/BugContext';
import { AuthProvider } from '../../context/AuthContext';

// Mock the useBugs hook
const mockCreateBug = vi.fn();
const mockUpdateBug = vi.fn();

vi.mock('../../context/BugContext', async () => {
  const actual = await vi.importActual('../../context/BugContext');
  return {
    ...actual,
    useBugs: () => ({
      createBug: mockCreateBug,
      updateBug: mockUpdateBug,
      loading: false
    })
  };
});

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: { _id: 'user1', name: 'Test User' },
      token: 'test-token'
    })
  };
});

const mockBug = {
  _id: 'bug1',
  title: 'Existing Bug',
  description: 'Existing description',
  priority: 'high',
  status: 'open',
  assignedTo: { _id: 'user2', name: 'Assigned User' },
  tags: ['frontend', 'ui'],
  stepsToReproduce: 'Step 1\nStep 2',
  expectedBehavior: 'Should work',
  actualBehavior: 'Does not work'
};

const defaultProps = {
  onSubmit: vi.fn(),
  onCancel: vi.fn()
};

const renderBugForm = (props = {}) => {
  return render(
    <AuthProvider>
      <BugProvider>
        <BugForm {...defaultProps} {...props} />
      </BugProvider>
    </AuthProvider>
  );
};

describe('BugForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form when no bug is provided', () => {
    renderBugForm();

    expect(screen.getByRole('heading', { name: /report new bug/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create bug/i })).toBeInTheDocument();
  });

  it('renders edit form when bug is provided', () => {
    renderBugForm({ bug: mockBug });

    expect(screen.getByRole('heading', { name: /edit bug/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update bug/i })).toBeInTheDocument();
  });

  it('populates form fields when editing existing bug', () => {
    renderBugForm({ bug: mockBug });

    expect(screen.getByDisplayValue('Existing Bug')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('high')).toBeInTheDocument();
    expect(screen.getByDisplayValue('open')).toBeInTheDocument();
    expect(screen.getByDisplayValue('frontend, ui')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Step 1\nStep 2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Should work')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Does not work')).toBeInTheDocument();
  });

  it('shows validation errors for required fields', async () => {
    renderBugForm();

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
      expect(screen.getByText('Description is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for short title', async () => {
    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Hi' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 5 characters')).toBeInTheDocument();
    });
  });

  it('shows validation error for short description', async () => {
    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    fireEvent.change(titleInput, { target: { value: 'Valid title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Short' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();
    });
  });

  it('clears validation errors when user fixes input', async () => {
    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const submitButton = screen.getByRole('button', { name: /create bug/i });

    // Trigger validation error
    fireEvent.click(submitButton);
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    // Fix the input
    fireEvent.change(titleInput, { target: { value: 'Valid title' } });

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });

  it('calls createBug when submitting new bug', async () => {
    mockCreateBug.mockResolvedValue({ success: true, bug: mockBug });
    const onSubmit = vi.fn();

    renderBugForm({ onSubmit });

    // Fill required fields
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    fireEvent.change(titleInput, { target: { value: 'New Bug Title' } });
    fireEvent.change(descriptionInput, { target: { value: 'New bug description' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBug).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Bug Title',
          description: 'New bug description',
          priority: 'medium',
          status: 'open',
          tags: []
        })
      );
      expect(onSubmit).toHaveBeenCalledWith(mockBug);
    });
  });

  it('calls updateBug when submitting existing bug', async () => {
    mockUpdateBug.mockResolvedValue({ success: true, bug: mockBug });
    const onSubmit = vi.fn();

    renderBugForm({ bug: mockBug, onSubmit });

    const titleInput = screen.getByDisplayValue('Existing Bug');
    fireEvent.change(titleInput, { target: { value: 'Updated Bug Title' } });

    const submitButton = screen.getByRole('button', { name: /update bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateBug).toHaveBeenCalledWith(
        mockBug._id,
        expect.objectContaining({
          title: 'Updated Bug Title'
        })
      );
      expect(onSubmit).toHaveBeenCalledWith(mockBug);
    });
  });

  it('processes tags correctly', async () => {
    mockCreateBug.mockResolvedValue({ success: true, bug: mockBug });

    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    fireEvent.change(titleInput, { target: { value: 'Bug with tags' } });
    fireEvent.change(descriptionInput, { target: { value: 'Description with tags' } });
    fireEvent.change(tagsInput, { target: { value: 'frontend, backend, critical' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBug).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['frontend', 'backend', 'critical']
        })
      );
    });
  });

  it('handles empty tags correctly', async () => {
    mockCreateBug.mockResolvedValue({ success: true, bug: mockBug });

    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    fireEvent.change(titleInput, { target: { value: 'Bug without tags' } });
    fireEvent.change(descriptionInput, { target: { value: 'Description without tags' } });
    fireEvent.change(tagsInput, { target: { value: '' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreateBug).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: []
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    renderBugForm({ onCancel });

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    mockCreateBug.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ success: true, bug: mockBug }), 100))
    );

    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    fireEvent.change(titleInput, { target: { value: 'Valid title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Valid description' } });

    const submitButton = screen.getByRole('button', { name: /create bug/i });
    fireEvent.click(submitButton);

    // Button should be disabled while submitting
    expect(screen.getByRole('button', { name: /creating.../i })).toBeDisabled();

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockCreateBug).toHaveBeenCalled();
    });
  });

  it('respects maxLength attributes', () => {
    renderBugForm();

    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);

    expect(titleInput).toHaveAttribute('maxLength', '200');
    expect(descriptionInput).toHaveAttribute('maxLength', '1000');
  });

  it('has correct form layout with proper grouping', () => {
    renderBugForm();

    // Check that priority and status are in the same row
    const priorityInput = screen.getByLabelText(/priority/i);
    const statusInput = screen.getByLabelText(/status/i);

    expect(priorityInput.closest('.form-row')).toBe(statusInput.closest('.form-row'));

    // Check that assigned to and tags are in the same row
    const assignedToInput = screen.getByLabelText(/assigned to/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    expect(assignedToInput.closest('.form-row')).toBe(tagsInput.closest('.form-row'));
  });
});
