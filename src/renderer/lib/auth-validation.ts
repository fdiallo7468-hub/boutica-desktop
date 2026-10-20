/**
 * Auth & Sign-up validation rules according to Boutica Cloud / Better Auth contract.
 * minPasswordLength = 10, required fields: name, email, password, businessName.
 */

export const MIN_PASSWORD_LENGTH = 10;

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePassword(password: string): {
  isValid: boolean;
  isLongEnough: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
} {
  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  return {
    isValid: isLongEnough && hasLetter && hasNumber,
    isLongEnough,
    hasLetter,
    hasNumber,
  };
}

export function validateSignUpInput(input: {
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  password: string;
  confirmPassword: string;
}): { isValid: boolean; error: string | null } {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { isValid: false, error: 'Veuillez renseigner votre prénom et votre nom.' };
  }
  if (!isValidEmail(input.email)) {
    return { isValid: false, error: 'Veuillez renseigner une adresse e-mail valide.' };
  }
  if (!input.businessName.trim()) {
    return { isValid: false, error: 'Le nom de votre boutique ou entreprise est obligatoire.' };
  }
  const pwdCheck = validatePassword(input.password);
  if (!pwdCheck.isValid) {
    return {
      isValid: false,
      error: `Le mot de passe doit comporter au moins ${MIN_PASSWORD_LENGTH} caractères, dont une lettre et un chiffre.`,
    };
  }
  if (input.password !== input.confirmPassword) {
    return { isValid: false, error: 'Les deux mots de passe ne correspondent pas.' };
  }
  return { isValid: true, error: null };
}
