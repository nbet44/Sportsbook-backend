const { default: axios } = require("axios");
const { uid } = require('uid');
const TokenGenerator = require('uuid-token-generator');
const baseController = require("./baseController");
const { userModel } = require("../models/userModel");
const { paymentHistoryModel } = require('../models/paymentHistoryModel');
const { bwinPrematchModel, bwinInPlayModel, bwinHistoryModel, bwinEventModel, bwinFavoriteModel } = require("../models/bwinSportsModel");
const tokgen = new TokenGenerator();

exports.updateUser = async (req, res, next) => {
    var data = req.body;
    console.log(data);
    var userData = await baseController.BfindOne(userModel, { _id: data.userId })
    if (!userData) {
        return res.json({ status: 300, data: "Invalid User" });
    }
    if (data.delete) {
        var betData = await baseController.Bfind(bwinHistoryModel, { userId: data.userId, status: "pending" })
        if (betData.length === 0) {
            await baseController.BfindOneAndDelete(userModel, { userId: data.userId })
        } else {
            return res.json({ status: 300, data: "pending bets" })
        }
    } else {
        var updatedUser = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { username: data.username, password: data.password, level: data.level, maxBetLimit: data.maxBetLimit })
        if (!updatedUser) {
            return res.json({ status: 300, data: "failed update" })
        }
    }
    var agentUsers = await baseController.Bfind(userModel, { agentId: data.agentId });
    return res.json({ status: 200, data: agentUsers });
}

exports.userManageAgent = async (req, res, next) => {
    var result = [];
    var data = req.body;
    var condition = {
        agentId: data.agentId
    }
    // if(data.filter.status) condition = status : true
    var userData = await baseController.Bfind(userModel, condition);
    for (var i in userData) {
        var history = await bwinHistoryModel.distinct("betId", { userId: userData[i]._id });
        var openBets = 0;
        var closeBets = 0;
        var winBets = 0;
        var loseBets = 0;
        for (var j in history) {
            var betHistory = await baseController.BfindOne(bwinHistoryModel, { userId: userData[i]._id, betId: history[j], created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week)) } });
            if (betHistory.status === "pending") {
                openBets = openBets + parseInt(betHistory.amount) // openBets = openBets + 1
            } else if (betHistory.status === "win") {
                winBets = winBets + parseInt(betHistory.winAmount)
            } else if (betHistory.status === "lose") {
                loseBets = loseBets + parseInt(betHistory.amount)
            } else {
                closeBets = closeBets + parseInt(betHistory.amount) // closeBets = closeBets + 1
            }
        }

        var credit = await baseController.Bfind(paymentHistoryModel, { userId: userData[i]._id, created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week)) } })
        result.push({
            userId: userData[i]._id,
            name: userData[i].username,
            status: 'online',
            credit: credit.length ? credit[0].amount : 0,
            risk: userData[i].maxBetLimit,
            openBets: openBets,
            closeBets: closeBets,
            turnover: winBets - loseBets,
            discount: 0,
            total: winBets - loseBets + userData[i].balance + 0,
            totalNet: winBets - loseBets + userData[i].balance,
            agetnCommiPer: 0,
            platformCommi: 0,
            agetnCommi: 0,
            username: userData[i].username
        })
    }
    res.json({ status: 200, data: result });
    return true;
}

exports.agentInfoLf = async (req, res, next) => {
    var data = req.body;
    var userData = await baseController.Bfind(userModel, { _id: data.agentId });
    var minusBalance = await paymentHistoryModel.aggregate([
        {
            $match: {
                $and: [
                    { agentId: data.agentId },
                    { created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.week)) } }
                ]
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$amount" },
            }
        }
    ])
    if (userData && minusBalance) {
        var rdata = {
            totalBalance: { value: `${userData[0].balance + minusBalance[0].total}  ${userData[0].currency}`, label: 'Total Balance' },
            balanceSpend: { value: `${minusBalance[0].total}  ${userData[0].currency}`, label: 'Balance Spend' },
            currentBalance: { value: `${userData[0].balance}  ${userData[0].currency}`, label: 'Current Balance' },
            sportsCommission: { value: `${0} %`, label: 'Sports Commission' },
            casinoCommission: { value: `${0} %`, label: 'Casino Commission' },
            sportsDiscount: { value: `${0} ${userData[0].currency}`, label: 'Sports Discount' },
            backupCredit: { value: `${0} ${userData[0].currency}`, label: 'Backup Credit' },
            userBackupCredit: { value: `${0} ${userData[0].currency}`, label: 'User Backup Credit' }
        }
        return res.json({ status: 200, data: rdata })
    } else {
        return res.json({ status: 400, data: 'no agent' })
    }
}

exports.agentInfoRg = async (req, res, next) => {
    var data = req.body;
    var turnover = 0
    var userData = await baseController.Bfind(userModel, { agentId: data.agentId });
    for (var i in userData) {
        var totalBalance = await bwinHistoryModel.aggregate([
            {
                $match: {
                    $and: [
                        { userId: userData[i]._id },
                        { created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.week)) } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                }
            }
        ])
        if (totalBalance.length) {
            console.log(totalBalance)
            turnover = turnover + Number(totalBalance[0].total)
        }
    }

    var rdata = {
        turnover: { value: `${turnover} ${userData[0].currency}`, label: 'Turnover' },
        totalDiscount: { value: `${turnover} ${userData[0].currency}`, label: 'Total Discount' },
        agentProfits: { value: `${turnover} %`, label: 'Agent Profits' },
        platformProfits: { value: `${turnover} %`, label: 'Platform profits' },
        platformDebt: { value: `${turnover} ${userData[0].currency}`, label: 'Platform Debt' },
    }
    if (userData) {
        return res.json({ status: 200, data: rdata })
    } else {
        return res.json({ status: 400, data: 'no users' })
    }
}

exports.updatePassword = async (req, res, next) => {
    var data = req.body;
    console.log(data);
    var userData = await baseController.BfindOne(userModel, { _id: data.userId })
    if (!userData) {
        res.json({ status: 300, data: "Invalid User" })
        return false
    }
    if (userData.password != data.before) {
        res.json({ status: 300, data: "Wrong Password" })
        return false
    }
    var updateUser = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { password: data.new })
    if (!updateUser) {
        res.json({ status: 300, data: "Failed Updating" })
        return false
    }
    res.json({ status: 200, data: updateUser })
}

exports.getTokenAction = async (req, res, next) => {
    var data = req.body;
    // var token = uid();
    var token = tokgen.generate();
    var userData = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { token: token });
    res.json({ status: 200, data: token })
}

exports.getTransaction = async (req, res, next) => {
    var data = req.body;
    var result = [];
    var userList = await baseController.Bfind(userModel, { $or: [{ agentId: data.userId }, { pid: data.userId }] });
    var userIdArray = [];
    for (var i in userList) {
        userIdArray.push(userList[i]._id)
    }
    var history = await baseController.BfindSort(paymentHistoryModel, { userId: { $in: userIdArray } }, { created: -1 })
    for (var j in history) {
        var userData = await baseController.BfindOne(userModel, { _id: history[j].userId })
        result.push({
            username: userData.username,
            ...history[j]._doc
        })
    }
    res.json({ status: 200, data: result })
    return true
}

exports.getAgentAction = async (req, res, next) => {
    var data = req.body;
    var agentData = await baseController.Bfind(userModel, { pid: data._id });
    res.json({ status: 200, data: agentData });
    return true;
}

exports.getUsersAction = async (req, res, next) => {
    var result = [];
    var data = req.body;
    var userData = await baseController.Bfind(userModel, { agentId: data._id });
    for (var i in userData) {
        var history = await bwinHistoryModel.distinct("betId", { userId: userData[i]._id });
        var openBets = 0;
        var closeBets = 0;
        for (var j in history) {
            var betHistory = await baseController.BfindOne(bwinHistoryModel, { userId: userData[i]._id, betId: history[j] });
            if (betHistory.status === "pending") {
                openBets = openBets + 1
                // openBets = openBets + parseInt(betHistory.amount)
            } else {
                closeBets = closeBets + 1
                // closeBets = closeBets + parseInt(betHistory.amount)
            }
        }
        result.push({
            ...userData[i]._doc,
            openBets: openBets,
            closeBets: closeBets
        })
    }
    res.json({ status: 200, data: result });
    return true;
}

exports.removeAgentAction = async (req, res, next) => {
    var data = req.body;
    var isCheck = await baseController.BfindOneAndDelete(userModel, { _id: data._id });
    if (!isCheck) {
        res.json({ status: 300, data: "Wrong Something" });
        return false;
    }
    isCheck = await baseController.BfindOneAndDelete(userModel, { $or: [{ pid: data._id }, { agentId: data._id }] });
    if (!isCheck) {
        res.json({ status: 300, data: "Wrong Something" });
        return false;
    }
    var agentData = await baseController.Bfind(userModel, { pid: data.pid });
    res.json({ status: 200, data: agentData });
    return true;
}

exports.updateBalance = async (req, res, next) => {
    var data = req.body;
    delete data._id
    console.log(data)
    if (data.role === "agent") {
        if (data.extraCredit > 0) {
            var parent = await baseController.BfindOne(userModel, { _id: data.pid })
            // if (parent.pid !== "0") {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
            // }
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from adding the user balance" });
                return false;
            }
            saveData = {
                ...data,
                amount: data.extraCredit
            }
            isCheck = await baseController.data_save(saveData, paymentHistoryModel);
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from payment history" });
                return false;
            }
        } else {
            var parent = await baseController.BfindOne(userModel, { _id: data.pid })
            // if (parent.pid !== "0") {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
            // }
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from adding the user balance" });
                return false;
            }
            saveData = {
                ...data,
                amount: data.extraCredit
            }
            isCheck = await baseController.data_save(saveData, paymentHistoryModel);
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from payment history" });
                return false;
            }
        }
        var tableData = await baseController.Bfind(userModel, { pid: data.pid });
        var userData = await baseController.BfindOne(userModel, { _id: data.pid });
        res.json({ status: 200, data: { tableData: tableData, userData: userData } });
        return true;
    } else if (data.role === "user") {
        if (data.extraCredit > 0) {
            var parent = await baseController.BfindOne(userModel, { _id: data.agentId })
            // if (parent.pid !== "0") {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
            // }
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit });
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from adding the user balance" });
                return false;
            }
            saveData = {
                ...data,
                amount: data.extraCredit
            }
            isCheck = await baseController.data_save(saveData, paymentHistoryModel);
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from payment history" });
                return false;
            }
        } else {
            var parent = await baseController.BfindOne(userModel, { _id: data.agentId })
            // if (parent.pid !== "0") {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
            // }
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit });
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from adding the user balance" });
                return false;
            }
            saveData = {
                ...data,
                amount: data.extraCredit
            }
            isCheck = await baseController.data_save(saveData, paymentHistoryModel);
            if (!isCheck) {
                res.json({ status: 300, data: "Wrong something from payment history" });
                return false;
            }
        }
        var tableData = await baseController.Bfind(userModel, { agentId: data.agentId });
        var userData = await baseController.BfindOne(userModel, { _id: data.agentId });
        res.json({ status: 200, data: { tableData: tableData, userData: userData } });
        return true;
    }
}