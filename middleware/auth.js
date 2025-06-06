const isAdmin = (req, res, next) => {
    const adminApiKey = process.env.ADMIN_API_KEY;
    const providedKey = req.headers['x-admin-api-key']; 

    if (!adminApiKey) {
        console.error("ADMIN_API_KEY is not set in .env file.");
        return res.status(500).json({ success: false, message: "Server configuration error." });
    }

    if (providedKey && providedKey === adminApiKey) {
        next();
    } else {
        res.status(403).json({ success: false, message: "Forbidden: Admin access required." });
    }
};

module.exports = { isAdmin };
