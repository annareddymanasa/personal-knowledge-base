const fs = require("fs");
const path = require("path");
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

function getFirebaseAdmin() {
  const existingApp = getApps().find(
    (app) => app.name === "[DEFAULT]"
  );

  if (existingApp) {
    return {
      auth: () => getAuth(existingApp),
      apps: getApps()
    };
  }

  const configuredFile =
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE ||
    "firebase-service-account.json";

  const serviceAccountPath = path.isAbsolute(configuredFile)
    ? configuredFile
    : path.resolve(__dirname, "..", configuredFile);

  if (!fs.existsSync(serviceAccountPath)) {
    const error = new Error(
      "Firebase service-account file was not found."
    );

    error.statusCode = 503;
    throw error;
  }

  let serviceAccount;

  try {
    serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );
  } catch {
    const error = new Error(
      "Firebase service-account file is not valid JSON."
    );

    error.statusCode = 503;
    throw error;
  }

  if (
    !serviceAccount.project_id ||
    !serviceAccount.client_email ||
    !serviceAccount.private_key
  ) {
    const error = new Error(
      "Firebase service-account configuration is incomplete."
    );

    error.statusCode = 503;
    throw error;
  }

  const app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id
  });

  return {
    auth: () => getAuth(app),
    apps: getApps()
  };
}

module.exports = getFirebaseAdmin;