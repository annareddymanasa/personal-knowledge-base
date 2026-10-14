const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required. Please sign in."
    });
  }

  const token = authorization.slice(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId || decoded.purpose) {
      return res.status(401).json({
        message: "Invalid authentication token."
      });
    }

    req.user = {
      id: decoded.userId
    };

    next();
  } catch {
    return res.status(401).json({
      message: "Your session has expired. Please sign in again."
    });
  }
}

module.exports = authenticateToken;