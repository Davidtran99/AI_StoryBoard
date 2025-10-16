/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { vi } from './vi';

export const translations = {
  vi,
};

export type Language = 'vi';
export type TranslationKey = keyof typeof vi;

const langTranslations = translations.vi;

const translator = (key: TranslationKey, replacements?: Record<string, string | number>): any => {
    let translation = langTranslations.hasOwnProperty(key) ? langTranslations[key] : key;

    if (typeof translation === 'string' && replacements) {
        for (const rKey of Object.keys(replacements)) {
            const regex = new RegExp(`\\{${rKey}\\}`, 'g');
            translation = translation.replace(regex, String(replacements[rKey]));
        }
    }
    return translation;
};

// The lang parameter is kept for type consistency but is unused as the app is now single-language.
export const getTranslator = (lang: Language = 'vi') => {
    return translator;
};