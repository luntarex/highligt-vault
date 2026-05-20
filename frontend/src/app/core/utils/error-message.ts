export function getSafeErrorMessage(error: any, fallback = 'Something went wrong. Please try again.'): string {
  const status = error?.status;
  const backendMessage = typeof error?.error?.message === 'string' ? error.error.message : undefined;
  const backendError = typeof error?.error?.error === 'string' ? error.error.error : undefined;
  const rawMessage = backendMessage || backendError || error?.message || '';
  const message = rawMessage.toString();

  if (status === 413 || message.includes('413') || message.toLowerCase().includes('request entity too large')) {
    return 'This file is too large. Please upload a smaller file.';
  }
  if (status === 415) {
    return 'This file type is not supported.';
  }
  if (status === 0) {
    return 'Could not connect to the server. Please check your connection and try again.';
  }
  if (message.includes('<html') || message.includes('<!DOCTYPE') || message.includes('PreparedStatementCallback')) {
    return fallback;
  }
  if (backendMessage && backendMessage.length < 160) {
    return backendMessage;
  }
  if (backendError && backendError.length < 160) {
    return backendError;
  }
  return fallback;
}
