const jwt = require("jsonwebtoken");

const middlewareController = {
    verifyToken: (req, res, next) => {
        const authHeader = req.headers.token;
        if (!authHeader) {
            return res.status(401).json({
                message: "You are not authenticated",
                status: "error"
            });
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({
                message: "No token provided",
                status: "error"
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (err) {
            console.error("Token verification failed:", err);
            return res.status(403).json({
                message: "Invalid token",
                status: "error"
            });
        }
    },

    verifyTokenAndAdminAuth: (req, res, next) => {
        middlewareController.verifyToken(req, res, () => {
            if (req.user && req.user.role === "admin") {
                next();
            } else {
                res.status(403).json({
                    message: "You are not authorized to perform this action",
                    status: "error"
                });
            }
        });
    }
};

module.exports = middlewareController;