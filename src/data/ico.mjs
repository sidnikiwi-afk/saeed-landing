// Brackstone Digital Limited has paid its ICO data protection fee (Tier 1).
// ICO registration reference confirmed by the ICO on 9 Oct 2026 (application C2053554).
// If this is ever reset to the placeholder, the site shows the mark without any number.
export const ICO_REGISTRATION_PLACEHOLDER = 'ZA_NUMBER_PENDING';
export const ICO_REGISTRATION_NUMBER = 'ZC268817';
export const ICO_REGISTER_URL = 'https://ico.org.uk/ESDWebPages/Search';

export const icoRegistrationNumber =
  ICO_REGISTRATION_NUMBER && ICO_REGISTRATION_NUMBER !== ICO_REGISTRATION_PLACEHOLDER
    ? ICO_REGISTRATION_NUMBER
    : '';
