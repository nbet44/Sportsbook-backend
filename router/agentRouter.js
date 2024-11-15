const express = require('express');
const router = express.Router();
const agentController = require("../controller/agentController");

router.post("/get", agentController.getAgentAction);
router.post("/remove", agentController.removeAgentAction);
router.post("/get-users", agentController.getUsersAction);
router.post("/get-users-all", agentController.getAllUsersAction);
router.post("/get-token", agentController.getTokenAction);
router.post("/get-transaction", agentController.getTransaction);
router.post("/update-password", agentController.updatePassword);
router.post("/update-user", agentController.updateUser);
router.post("/update-balance", agentController.updateBalance);
router.post("/update-user-mange", agentController.updateUserManagement);
router.post("/user-manage-angent", agentController.userManageAgent);
router.post("/agent-info-lf", agentController.agentInfoLf);
router.post("/agent-info-rg", agentController.agentInfoRg);
router.post("/remove-users", agentController.removeUser);

router.post("/get-user-management", agentController.getUserManagement);
router.post("/update-user-management", agentController.updateUserManagement);
router.post("/update-userbalance-management", agentController.updateBalanceManagement);

module.exports = router;