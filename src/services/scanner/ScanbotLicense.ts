// Accept the raw license or the concatenated string example from Scanbot's trial page.
// Parse string literals as JSON; never execute configuration text.
export const normalizeScanbotLicense = (value: string): string => {
  const text = value.trim().replace(/^const\s+LICENSE_KEY\s*=\s*/, '').replace(/;\s*$/, '');
  if (text.startsWith('"')) {
    const chunks = text.match(/"(?:[^"\\]|\\.)*"/g);
    const remainder = text.replace(/"(?:[^"\\]|\\.)*"/g, '').replace(/\s/g, '');
    if (!chunks || remainder !== '+'.repeat(chunks.length - 1)) throw new Error('La licence Scanbot est mal formatée. Vérifiez la configuration.');
    try { return chunks.map(chunk => JSON.parse(chunk) as string).join(''); }
    catch { throw new Error('La licence Scanbot est mal formatée. Vérifiez la configuration.'); }
  }
  return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
};
export const scanbotLicenseError = (status: string): string => {
  if (status === 'FAILURE_EXPIRED') return 'La licence d’essai Scanbot a expiré.';
  if (status === 'FAILURE_APP_ID_MISMATCH') return 'La licence Scanbot ne couvre pas cette adresse.';
  if (status === 'FAILURE_CORRUPTED') return 'La licence Scanbot est mal formatée. Vérifiez la configuration.';
  if (status === 'FAILURE_VERSION') return 'La licence Scanbot ne couvre pas cette version du scanner.';
  if (status === 'FAILURE_SERVER') return 'La vérification de la licence Scanbot est momentanément indisponible.';
  return 'La licence Scanbot n’est pas active. Vérifiez la configuration.';
};
