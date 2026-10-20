import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_PASSWORD_LENGTH,
  isValidEmail,
  validatePassword,
  validateSignUpInput,
} from './auth-validation.ts';

test('MIN_PASSWORD_LENGTH matches Boutica Cloud Better Auth contract (10)', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 10);
});

test('isValidEmail accepts valid emails and rejects invalid ones', () => {
  assert.equal(isValidEmail('owner@boutica.ci'), true);
  assert.equal(isValidEmail('test.user+tag@domain.com'), true);
  assert.equal(isValidEmail(''), false);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('missing@domain'), false);
  assert.equal(isValidEmail('@nodomain.com'), false);
});

test('validatePassword enforces min 10 chars, letters and numbers', () => {
  // Too short (< 10)
  assert.equal(validatePassword('Pass1').isValid, false);
  assert.equal(validatePassword('Pass12345').isValid, false); // 9 chars

  // Exactly 10 chars with letter and number
  assert.equal(validatePassword('Password10').isValid, true);
  assert.equal(validatePassword('Pass123456').isValid, true); // 10 chars

  // Long enough but numbers only
  assert.equal(validatePassword('12345678901').isValid, false);

  // Long enough but letters only
  assert.equal(validatePassword('abcdefghijk').isValid, false);
});

test('validateSignUpInput checks all fields according to contract', () => {
  const validInput = {
    firstName: 'Ibrahim',
    lastName: 'Kouassi',
    email: 'kouassi@boutica.ci',
    businessName: 'Quincaillerie Moderne',
    password: 'SecurePassword123',
    confirmPassword: 'SecurePassword123',
  };

  assert.equal(validateSignUpInput(validInput).isValid, true);
  assert.equal(validateSignUpInput(validInput).error, null);

  // Missing name
  assert.equal(validateSignUpInput({ ...validInput, firstName: '' }).isValid, false);
  assert.equal(validateSignUpInput({ ...validInput, lastName: '' }).isValid, false);

  // Invalid email
  assert.equal(validateSignUpInput({ ...validInput, email: 'bad-email' }).isValid, false);

  // Missing business name
  assert.equal(validateSignUpInput({ ...validInput, businessName: '   ' }).isValid, false);

  // Password too short (< 10)
  assert.equal(validateSignUpInput({ ...validInput, password: 'Pass1', confirmPassword: 'Pass1' }).isValid, false);

  // Password mismatch
  assert.equal(validateSignUpInput({ ...validInput, confirmPassword: 'DifferentPassword123' }).isValid, false);
});
