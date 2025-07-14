// cypress/e2e/bug-management.cy.js - Bug management flow tests

describe('Bug Management', () => {
  beforeEach(() => {
    cy.setupTestUser();
    cy.visit('/dashboard');
  });

  afterEach(() => {
    cy.cleanupTestData();
  });

  describe('Bug Creation', () => {
    it('should allow creating a new bug report', () => {
      const bugData = {
        title: 'Test Bug Report',
        description: 'This is a test bug description',
        severity: 'medium',
        priority: 'high',
        status: 'open',
        category: 'frontend'
      };

      // Navigate to bug creation form
      cy.get('[data-testid="new-bug-button"]').click();
      
      // Fill out the form
      cy.get('[name="title"]').type(bugData.title);
      cy.get('[name="description"]').type(bugData.description);
      cy.get('[name="severity"]').select(bugData.severity);
      cy.get('[name="priority"]').select(bugData.priority);
      cy.get('[name="category"]').select(bugData.category);
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Should show success notification
      cy.checkNotification('Bug created successfully');
      
      // Should redirect to bug list or show the new bug
      cy.contains(bugData.title).should('be.visible');
    });

    it('should show validation errors for incomplete bug report', () => {
      cy.get('[data-testid="new-bug-button"]').click();
      
      // Try to submit empty form
      cy.get('button[type="submit"]').click();
      
      // Should show validation errors
      cy.contains('Title is required').should('be.visible');
      cy.contains('Description is required').should('be.visible');
    });

    it('should allow uploading attachments', () => {
      cy.get('[data-testid="new-bug-button"]').click();
      
      cy.get('[name="title"]').type('Bug with attachment');
      cy.get('[name="description"]').type('Bug with file attachment');
      
      // Upload a file (you would need to have a fixture file)
      const fileName = 'test-image.png';
      cy.fixture(fileName).then(fileContent => {
        cy.get('[data-testid="file-upload"]').selectFile({
          contents: Cypress.Buffer.from(fileContent),
          fileName: fileName,
          mimeType: 'image/png'
        });
      });
      
      cy.get('button[type="submit"]').click();
      
      cy.checkNotification('Bug created successfully');
    });
  });

  describe('Bug Listing and Filtering', () => {
    beforeEach(() => {
      // Create some test bugs
      const testBugs = [
        {
          title: 'High Priority Bug',
          description: 'Critical issue',
          severity: 'high',
          priority: 'high',
          status: 'open',
          category: 'backend'
        },
        {
          title: 'Low Priority Bug',
          description: 'Minor issue',
          severity: 'low',
          priority: 'low',
          status: 'in-progress',
          category: 'frontend'
        }
      ];
      
      testBugs.forEach(bug => {
        cy.createTestBug(bug);
      });
    });

    it('should display all bugs in the list', () => {
      cy.visit('/bugs');
      
      cy.contains('High Priority Bug').should('be.visible');
      cy.contains('Low Priority Bug').should('be.visible');
    });

    it('should filter bugs by status', () => {
      cy.visit('/bugs');
      
      // Filter by open status
      cy.get('[data-testid="status-filter"]').select('open');
      
      cy.contains('High Priority Bug').should('be.visible');
      cy.contains('Low Priority Bug').should('not.exist');
    });

    it('should filter bugs by priority', () => {
      cy.visit('/bugs');
      
      // Filter by high priority
      cy.get('[data-testid="priority-filter"]').select('high');
      
      cy.contains('High Priority Bug').should('be.visible');
      cy.contains('Low Priority Bug').should('not.exist');
    });

    it('should search bugs by title', () => {
      cy.visit('/bugs');
      
      cy.get('[data-testid="search-input"]').type('High Priority');
      
      cy.contains('High Priority Bug').should('be.visible');
      cy.contains('Low Priority Bug').should('not.exist');
    });
  });

  describe('Bug Details and Updates', () => {
    let bugId;

    beforeEach(() => {
      const testBug = {
        title: 'Detailed Bug Report',
        description: 'Bug for testing details view',
        severity: 'medium',
        priority: 'medium',
        status: 'open',
        category: 'backend'
      };
      
      cy.createTestBug(testBug).then((response) => {
        bugId = response.body._id;
      });
    });

    it('should display bug details when clicked', () => {
      cy.visit('/bugs');
      
      cy.contains('Detailed Bug Report').click();
      
      // Should navigate to bug details page
      cy.url().should('include', `/bugs/${bugId}`);
      cy.contains('Detailed Bug Report').should('be.visible');
      cy.contains('Bug for testing details view').should('be.visible');
    });

    it('should allow updating bug status', () => {
      cy.visit(`/bugs/${bugId}`);
      
      cy.get('[data-testid="edit-bug-button"]').click();
      cy.get('[name="status"]').select('in-progress');
      cy.get('button[type="submit"]').click();
      
      cy.checkNotification('Bug updated successfully');
      cy.contains('In Progress').should('be.visible');
    });

    it('should allow adding comments', () => {
      cy.visit(`/bugs/${bugId}`);
      
      const comment = 'This is a test comment';
      cy.get('[data-testid="comment-input"]').type(comment);
      cy.get('[data-testid="add-comment-button"]').click();
      
      cy.contains(comment).should('be.visible');
    });
  });

  describe('Bug Assignment', () => {
    it('should allow assigning bugs to users', () => {
      const testBug = {
        title: 'Assignment Test Bug',
        description: 'Bug for testing assignment',
        severity: 'medium',
        priority: 'medium',
        status: 'open',
        category: 'backend'
      };
      
      cy.createTestBug(testBug).then((response) => {
        const bugId = response.body._id;
        cy.visit(`/bugs/${bugId}`);
        
        cy.get('[data-testid="assign-button"]').click();
        cy.get('[data-testid="assignee-select"]').select('cypressuser');
        cy.get('[data-testid="confirm-assign"]').click();
        
        cy.checkNotification('Bug assigned successfully');
        cy.contains('Assigned to: cypressuser').should('be.visible');
      });
    });
  });

  describe('Bug Deletion', () => {
    it('should allow deleting bugs', () => {
      const testBug = {
        title: 'Bug to Delete',
        description: 'This bug will be deleted',
        severity: 'low',
        priority: 'low',
        status: 'open',
        category: 'frontend'
      };
      
      cy.createTestBug(testBug).then((response) => {
        const bugId = response.body._id;
        cy.visit(`/bugs/${bugId}`);
        
        cy.get('[data-testid="delete-bug-button"]').click();
        cy.get('[data-testid="confirm-delete"]').click();
        
        cy.checkNotification('Bug deleted successfully');
        cy.url().should('include', '/bugs');
        cy.contains('Bug to Delete').should('not.exist');
      });
    });
  });
});
