import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BugCard from '../BugCard';
import { AuthProvider } from '../../context/AuthContext';

// Mock useAuth hook
const mockUser = {
  _id: 'user1',
  name: 'Test User',
  role: 'developer'
};

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser
    })
  };
});

const mockBug = {
  _id: 'bug1',
  title: 'Test Bug Title',
  description: 'This is a test bug description',
  priority: 'high',
  status: 'open',
  reportedBy: {
    _id: 'user1',
    name: 'Test User'
  },
  assignedTo: {
    _id: 'user2',
    name: 'Another User'
  },
  tags: ['frontend', 'ui'],
  stepsToReproduce: '1. Step one\n2. Step two',
  expectedBehavior: 'Should work correctly',
  actualBehavior: 'Does not work',
  comments: [
    {
      comment: 'Test comment',
      author: { name: 'Comment Author' },
      createdAt: '2024-01-01T00:00:00.000Z'
    }
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z'
};

const defaultProps = {
  bug: mockBug,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onAssign: vi.fn(),
  onComment: vi.fn(),
  onStatusChange: vi.fn()
};

const renderBugCard = (props = {}) => {
  return render(
    <AuthProvider>
      <BugCard {...defaultProps} {...props} />
    </AuthProvider>
  );
};

describe('BugCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bug information correctly', () => {
    renderBugCard();

    expect(screen.getByText('Test Bug Title')).toBeInTheDocument();
    expect(screen.getByText('This is a test bug description')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('OPEN')).toBeInTheDocument();
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Another User')).toBeInTheDocument();
  });

  it('displays priority and status with correct classes', () => {
    renderBugCard();

    const priorityBadge = screen.getByText('HIGH');
    const statusBadge = screen.getByText('OPEN');

    expect(priorityBadge).toHaveClass('priority-high');
    expect(statusBadge).toHaveClass('status-open');
  });

  it('shows tags when present', () => {
    renderBugCard();

    expect(screen.getByText('frontend')).toBeInTheDocument();
    expect(screen.getByText('ui')).toBeInTheDocument();
  });

  it('displays bug details when present', () => {
    renderBugCard();

    expect(screen.getByText('Steps to Reproduce:')).toBeInTheDocument();
    expect(screen.getByText('1. Step one\n2. Step two')).toBeInTheDocument();
    expect(screen.getByText('Expected:')).toBeInTheDocument();
    expect(screen.getByText('Should work correctly')).toBeInTheDocument();
    expect(screen.getByText('Actual:')).toBeInTheDocument();
    expect(screen.getByText('Does not work')).toBeInTheDocument();
  });

  it('shows actions dropdown when user has permissions', () => {
    renderBugCard();

    const actionsButton = screen.getByRole('button', { name: /bug actions/i });
    fireEvent.click(actionsButton);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const onEdit = vi.fn();
    renderBugCard({ onEdit });

    const actionsButton = screen.getByRole('button', { name: /bug actions/i });
    fireEvent.click(actionsButton);

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockBug);
  });

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn();
    renderBugCard({ onDelete });

    const actionsButton = screen.getByRole('button', { name: /bug actions/i });
    fireEvent.click(actionsButton);

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith(mockBug._id);
  });

  it('calls onStatusChange when status change button is clicked', () => {
    const onStatusChange = vi.fn();
    renderBugCard({ onStatusChange });

    const actionsButton = screen.getByRole('button', { name: /bug actions/i });
    fireEvent.click(actionsButton);

    const resolvedButton = screen.getByText('Resolved');
    fireEvent.click(resolvedButton);

    expect(onStatusChange).toHaveBeenCalledWith(mockBug._id, 'resolved');
  });

  it('toggles comments section when comments button is clicked', () => {
    renderBugCard();

    const commentsButton = screen.getByRole('button', { name: /comments \(1\)/i });
    
    // Comments should not be visible initially
    expect(screen.queryByText('Test comment')).not.toBeInTheDocument();

    fireEvent.click(commentsButton);

    // Comments should be visible after clicking
    expect(screen.getByText('Test comment')).toBeInTheDocument();
    expect(screen.getByText('Comment Author')).toBeInTheDocument();
  });

  it('adds new comment when comment form is submitted', async () => {
    const onComment = vi.fn().mockResolvedValue();
    renderBugCard({ onComment });

    // Open comments section
    const commentsButton = screen.getByRole('button', { name: /comments \(1\)/i });
    fireEvent.click(commentsButton);

    // Add new comment
    const commentInput = screen.getByPlaceholderText('Add a comment...');
    const addButton = screen.getByRole('button', { name: /add comment/i });

    fireEvent.change(commentInput, { target: { value: 'New test comment' } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(onComment).toHaveBeenCalledWith(mockBug._id, 'New test comment');
    });
  });

  it('disables add comment button when input is empty', () => {
    renderBugCard();

    // Open comments section
    const commentsButton = screen.getByRole('button', { name: /comments \(1\)/i });
    fireEvent.click(commentsButton);

    const addButton = screen.getByRole('button', { name: /add comment/i });
    expect(addButton).toBeDisabled();
  });

  it('enables add comment button when input has text', () => {
    renderBugCard();

    // Open comments section
    const commentsButton = screen.getByRole('button', { name: /comments \(1\)/i });
    fireEvent.click(commentsButton);

    const commentInput = screen.getByPlaceholderText('Add a comment...');
    const addButton = screen.getByRole('button', { name: /add comment/i });

    fireEvent.change(commentInput, { target: { value: 'New comment' } });
    expect(addButton).not.toBeDisabled();
  });

  it('formats dates correctly', () => {
    renderBugCard();

    // Check that date is formatted (exact format may vary by locale)
    expect(screen.getByText(/Jan 1, 2024/)).toBeInTheDocument();
  });

  it('shows no comments message when bug has no comments', () => {
    const bugWithoutComments = {
      ...mockBug,
      comments: []
    };

    renderBugCard({ bug: bugWithoutComments });

    // Open comments section
    const commentsButton = screen.getByRole('button', { name: /comments \(0\)/i });
    fireEvent.click(commentsButton);

    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('does not show actions dropdown for users without permissions', () => {
    const otherUser = {
      _id: 'otherUser',
      name: 'Other User',
      role: 'tester'
    };

    // Mock different user
    vi.mocked(require('../../context/AuthContext').useAuth).mockReturnValue({
      user: otherUser
    });

    renderBugCard();

    expect(screen.queryByRole('button', { name: /bug actions/i })).not.toBeInTheDocument();
  });
});
