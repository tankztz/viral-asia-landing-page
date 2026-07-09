const explicitEnvironment = import.meta.env.PUBLIC_SITE_ENV?.trim();
const cloudflareBranch = process.env.CF_PAGES_BRANCH?.trim();

export const siteEnvironment =
  cloudflareBranch || explicitEnvironment || "production";

export const isProduction =
  siteEnvironment === "production" || siteEnvironment === "main";
