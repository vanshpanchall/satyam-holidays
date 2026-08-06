let adminAuthCache = { checked: false, authenticated: false };

export const resetAdminAuthCache = () => {
  adminAuthCache = { checked: false, authenticated: false };
};

export const markAdminAuthenticated = () => {
  adminAuthCache = { checked: true, authenticated: true };
};

export const getAdminAuthCache = () => adminAuthCache;

export const setAdminAuthCache = (checked, authenticated) => {
  adminAuthCache = { checked, authenticated };
};
