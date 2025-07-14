// cypress/support/e2e.js - Cypress E2E support file

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configure Cypress
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});

// Add custom commands for authentication
Cypress.Commands.add('login', (email = 'test@example.com', password = 'password123') => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email,
      password
    }
  }).then((response) => {
    window.localStorage.setItem('token', response.body.token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('user');
});

// Custom command to create a test bug
Cypress.Commands.add('createTestBug', (bugData) => {
  const token = window.localStorage.getItem('token');
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/bugs`,
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: bugData
  });
});

// Custom command to clean up test data
Cypress.Commands.add('cleanupTestData', () => {
  const token = window.localStorage.getItem('token');
  if (token) {
    cy.request({
      method: 'DELETE',
      url: `${Cypress.env('apiUrl')}/test/cleanup`,
      headers: {
        Authorization: `Bearer ${token}`
      },
      failOnStatusCode: false
    });
  }
});
