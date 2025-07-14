// cypress/support/commands.js - Custom Cypress commands

// Add custom commands here

// Command to wait for React to load
Cypress.Commands.add('waitForReact', (timeout = 10000) => {
  cy.window({ timeout }).should('have.property', 'React');
});

// Command to get element by data-testid
Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

// Command to fill form fields
Cypress.Commands.add('fillForm', (formData) => {
  Object.keys(formData).forEach(field => {
    cy.get(`[name="${field}"]`).clear().type(formData[field]);
  });
});

// Command to check notification
Cypress.Commands.add('checkNotification', (message, type = 'success') => {
  cy.get('.toast').should('be.visible').and('contain', message);
  if (type === 'error') {
    cy.get('.toast').should('have.class', 'toast-error');
  } else {
    cy.get('.toast').should('have.class', 'toast-success');
  }
});

// Command to setup test user
Cypress.Commands.add('setupTestUser', () => {
  const testUser = {
    username: 'cypressuser',
    email: 'cypress@example.com',
    password: 'password123',
    role: 'developer'
  };

  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/register`,
    body: testUser,
    failOnStatusCode: false
  }).then((response) => {
    if (response.status === 201) {
      return cy.login(testUser.email, testUser.password);
    }
    // User might already exist, try to login
    return cy.login(testUser.email, testUser.password);
  });
});
