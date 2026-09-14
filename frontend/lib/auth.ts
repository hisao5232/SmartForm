export const AUTH_KEY = 'smartform_logged_in';

export const checkIsLoggedIn = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'true';
};

export const setLoggedIn = (status: boolean): void => {
  if (typeof window === 'undefined') return;
  if (status) {
    localStorage.setItem(AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
};
