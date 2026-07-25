export type PasswordStrengthLevel = 0 | 1 | 2 | 3;

export type PasswordStrengthResult = {
    level: PasswordStrengthLevel;
    hasMinLength: boolean;
    hasDigit: boolean;
    hasUpper: boolean;
    hasSymbol: boolean;
    varietyCount: number;
};

/** Score 0–3 : longueur + variété (chiffres / majuscules / symboles). */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
    const hasMinLength = password.length >= 8;
    const hasDigit = /\d/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const varietyCount = [hasDigit, hasUpper, hasSymbol].filter(Boolean).length;

    let level: PasswordStrengthLevel = 0;
    if (hasMinLength) {
        if (varietyCount >= 2) level = 3;
        else if (varietyCount >= 1) level = 2;
        else level = 1;
    }

    return { level, hasMinLength, hasDigit, hasUpper, hasSymbol, varietyCount };
}
