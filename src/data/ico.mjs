// Brackstone Digital Limited has paid its ICO data protection fee (Tier 1).
// The registration number is still pending the ICO confirmation email.
// Replace the placeholder with the real number (for example 'ZA123456') once it arrives.
// While it is the placeholder, the site shows the mark without any number.
export const ICO_REGISTRATION_PLACEHOLDER = 'ZA_NUMBER_PENDING';
export const ICO_REGISTRATION_NUMBER = 'ZA_NUMBER_PENDING';
export const ICO_REGISTER_URL = 'https://ico.org.uk/ESDWebPages/Search';

export const icoRegistrationNumber =
  ICO_REGISTRATION_NUMBER && ICO_REGISTRATION_NUMBER !== ICO_REGISTRATION_PLACEHOLDER
    ? ICO_REGISTRATION_NUMBER
    : '';
