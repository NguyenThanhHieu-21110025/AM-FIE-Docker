const userController = require("../Controller/userController");
const authController = require("../Controller/authController");
const middlewareController = require("../middleware/middleware");

const router = require("express").Router();

router.post("/create", middlewareController.verifyTokenAndAdminAuth, userController.createUser);
router.get("/", middlewareController.verifyToken, userController.getAllUsers );
router.get("/:id", middlewareController.verifyToken, userController.getUserById);
router.put("/active/:id", middlewareController.verifyTokenAndAdminAuth, userController.isActive);
router.put("/:id", middlewareController.verifyToken, userController.updateUser);  
router.delete("/:id", middlewareController.verifyTokenAndAdminAuth, userController.deleteUser);
router.post("/request-password-reset", userController.requestPasswordReset);
router.post("/verify-reset-code", userController.verifyResetCode);
router.post("/reset-password", userController.resetPassword);


module.exports = router;