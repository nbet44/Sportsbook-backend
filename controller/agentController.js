const TokenGenerator = require('uuid-token-generator');
const baseController = require("./baseController");
const { userModel } = require("../models/userModel");
const { paymentHistoryModel } = require('../models/paymentHistoryModel');
// bwinPrematchModel, bwinInPlayModel, bwinEventModel, bwinFavoriteModel
const { bwinHistoryModel } = require("../models/bwinSportsModel");
const tokgen = new TokenGenerator();

// user data management part
const getUserData = async (data) => {
    var agent = []
    var user = {}
    var agentData = []
    if (data.filter.role === 'agent') {
        agentData = await baseController.Bfind(userModel, { role: 'agent', _id: data.filter.agentId });
    } else {
        agentData = await baseController.Bfind(userModel, { role: 'agent' });
    }
    for (var h in agentData) {
        agent.push(agentData[h])

        var condition = { role: 'user', agentId: agentData[h]._id }
        if (data.filter.status) condition['isOnline'] = 'Online'
        var userData = await baseController.Bfind(userModel, condition);
        var result = [];
        for (var i in userData) {
            var history = await bwinHistoryModel.distinct("betId", { userId: userData[i]._id });
            var openBets = 0;
            var closeBets = 0;
            var winBets = 0;
            var loseBets = 0;
            for (var j in history) {
                var betHistory = await baseController.BfindOne(bwinHistoryModel, { userId: userData[i]._id, betId: history[j], created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week.value)) } });
                if (betHistory.status === "pending") {
                    openBets = openBets + parseInt(betHistory.amount)
                } else if (betHistory.status === "win") {
                    winBets = winBets + parseInt(betHistory.winAmount)
                    closeBets = closeBets + parseInt(betHistory.amount)
                } else if (betHistory.status === "lose") {
                    loseBets = loseBets + parseInt(betHistory.amount)
                    closeBets = closeBets + parseInt(betHistory.amount)
                }
            }

            var credit = await baseController.Bfind(paymentHistoryModel, { userId: userData[i]._id, created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week.value)) } })
            var discount = userData[i].extraCredit ? userData[i].extraCredit : 0
            var agentCommiPer = userData[i].agentCommission ? userData[i].agentCommission : 0
            var platformCommission = userData[i].platformCommission ? userData[i].platformCommission : 0
            result.push({
                ...userData[i]._doc,
                credit: credit.length ? credit[0].amount : 0,
                risk: userData[i].maxBetLimit,
                openBets: openBets,
                closeBets: closeBets,
                turnover: winBets - loseBets,
                discount: discount,
                total: winBets - loseBets + userData[i].balance,
                totalNet: winBets - loseBets + userData[i].balance - discount,
                agentCommiPer: agentCommiPer,
                platformCommi: platformCommission * userData[i].balance * 0.01,
                agetnCommi: userData[i].balance * agentCommiPer * 0.01,
            })
        }
        user[agentData[h]._id] = result
    }
    return { agent, user }
}

exports.getUserManagement = async (req, res, next) => {
    var data = req.body
    var rdata = await getUserData(data)
    return res.json({ status: 200, data: rdata });
}

exports.updateUserManagement = async (req, res, next) => {
    var data = req.body;
    var userData = await baseController.BfindOne(userModel, { _id: data.update._id })
    if (!userData) {
        return res.json({ status: 300, data: "Invalid User" });
    }
    if (data.delete) {
        var betData = await baseController.Bfind(bwinHistoryModel, { userId: data.update._id, status: "pending" })
        if (betData.length === 0) {
            await baseController.BfindOneAndUpdate(userModel, { _id: data.update._id }, { isOnline: 'Blocked' })
        } else {
            return res.json({ status: 300, data: "pending bets" })
        }
    } else {
        await baseController.BfindOneAndUpdate(userModel, { _id: data.update._id, isOnline: { $ne: 'Online' } }, { isOnline: 'Offline' })
    }
    var update = {
        level: data.level,
        maxBetLimit: data.update.maxBetLimit,
        prematchSpread: data.update.prematchSpread,
        liveSpread: data.update.liveSpread,
        mixSpread: data.update.mixSpread,
        ratio: data.update.ratio,
        ratioLive: data.update.ratioLive,
        ratioSpacial: data.update.ratioSpacial,
        setting: data.setting
    }

    if (data.update.username) update['username'] = data.update.username
    if (data.update.password) update['password'] = data.update.password
    var updatedUser = await baseController.BfindOneAndUpdate(userModel, { _id: data.update._id }, update)
    if (!updatedUser) {
        return res.json({ status: 300, data: "failed update" })
    }
    var pdata = {
        filter: data.filter
    }
    var result = await getUserData(pdata)
    return res.json({ status: 200, data: result });
}

exports.updateBalanceManagement = async (req, res, next) => {
    var data = req.body;
    var userData
    delete data._id
    if (data.role === "agent") {
        if (data.extraCredit > 0) {
            var parent = await baseController.BfindOne(userModel, { _id: data.pid })
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
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

        if (data.platformCommission || data.platformCommission == 0 || data.sportsCommission || data.sportsCommission == 0 || data.casinoCommission || data.casinoCommission == 0) {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { platformCommission: data.platformCommission, sportsCommission: data.sportsCommission, casinoCommission: data.casinoCommission })
            var users = await baseController.Bfind(userModel, { agentId: data.userId })
            for (let i in users) {
                await baseController.BfindOneAndUpdate(userModel, { _id: users[i]._id }, { platformCommission: data.platformCommission, sportsCommission: data.sportsCommission, casinoCommission: data.casinoCommission })
            }
        }
        userData = await baseController.BfindOne(userModel, { _id: data.pid });
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
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, agentCommission: data.agentCommission, sportsDiscount: data.sportsDiscount, casinoDiscount: data.casinoDiscount });
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
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, agentCommission: data.agentCommission, sportsDiscount: data.sportsDiscount, casinoDiscount: data.casinoDiscount });
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
        userData = await baseController.BfindOne(userModel, { _id: data.agentId });
    }
    var rdata = await getUserData({ filter: data.filter })
    res.json({ status: 200, data: { ...rdata, userData } })
}


exports.updateUser = async (req, res, next) => {
    var data = req.body;
    var userData = await baseController.BfindOne(userModel, { _id: data.userId })
    if (!userData) {
        return res.json({ status: 300, data: "Invalid User" });
    }
    if (data.delete) {
        var betData = await baseController.Bfind(bwinHistoryModel, { userId: data.userId, status: "pending" })
        if (betData.length === 0) {
            await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { isOnline: 'Blocked' })
        } else {
            return res.json({ status: 300, data: "pending bets" })
        }
    } else {
        await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { isOnline: 'Offline' })
    }
    var updatedUser = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { username: data.username, password: data.password, level: data.level, maxBetLimit: data.maxBetLimit, setting: { showRule: data.showRule } })
    if (!updatedUser) {
        return res.json({ status: 300, data: "failed update" })
    }

    var result = await getUserData(data)
    return res.json({ status: 200, data: result });
}

exports.userManageAgent = async (req, res, next) => {
    var data = req.body
    var agent = []
    var user = {}
    var agentData = await baseController.Bfind(userModel, { role: 'agent' });
    for (var h in agentData) {
        agent.push(agentData[h])

        var condition = { role: 'user', agentId: agentData[h]._id }
        if (data.filter.status) condition['isOnline'] = 'Online'
        var userData = await baseController.Bfind(userModel, condition);
        var result = [];
        for (var i in userData) {
            var history = await bwinHistoryModel.distinct("betId", { userId: userData[i]._id });
            var openBets = 0;
            var closeBets = 0;
            var winBets = 0;
            var loseBets = 0;
            for (var j in history) {
                var betHistory = await baseController.BfindOne(bwinHistoryModel, { userId: userData[i]._id, betId: history[j], created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week.value)) } });
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

            var credit = await baseController.Bfind(paymentHistoryModel, { userId: userData[i]._id, created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week.value)) } })
            var discount = userData[i].extraCredit ? userData[i].extraCredit : 0
            var agentCommiPer = userData[i].agentCommission ? userData[i].agentCommission : 0
            var platformCommission = userData[i].platformCommission ? userData[i].platformCommission : 0
            result.push({
                ...userData[i]._doc,
                credit: credit.length ? credit[0].amount : 0,
                risk: userData[i].maxBetLimit,
                openBets: openBets,
                closeBets: closeBets,
                turnover: winBets - loseBets,
                discount: discount,
                total: winBets - loseBets + userData[i].balance,
                totalNet: winBets - loseBets + userData[i].balance - discount,
                agentCommiPer: agentCommiPer,
                platformCommi: platformCommission,
                agetnCommi: userData[i].balance * agentCommiPer * 0.01,
            })
        }
        user[agentData[h]._id] = result
    }
    return res.json({ status: 200, data: { agent, user } });

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
    var rdata = {
        totalBalance: { value: 0, label: 'Total Balance' },
        balanceSpend: { value: 0, label: 'Balance Spend' },
        currentBalance: { value: 0, label: 'Current Balance' },
        sportsCommission: { value: 0, label: 'Sports Commission' },
        casinoCommission: { value: 0, label: 'Casino Commission' },
        sportsDiscount: { value: 0, label: 'Sports Discount' },
        backupCredit: { value: 0, label: 'Backup Credit' },
        userBackupCredit: { value: 0, label: 'User Backup Credit' },
    }
    if (userData.length) {
        rdata.currentBalance.value = `${userData[0].balance}  ${userData[0].currency}`
        rdata.sportsCommission.value = `${0} %`
        rdata.casinoCommission.value = `${0} %`
        rdata.sportsDiscount.value = `${0} ${userData[0].currency}`
        rdata.backupCredit.value = `${0} ${userData[0].currency}`
        rdata.userBackupCredit.value = `${0} ${userData[0].currency}`
    }

    if (minusBalance.length) {
        rdata.totalBalance = { value: `${userData[0].balance + minusBalance[0].total}  ${userData[0].currency}`, label: 'Total Balance' }
        rdata.balanceSpend = { value: `${minusBalance[0].total}  ${userData[0].currency}`, label: 'Balance Spend' }
    }

    return res.json({ status: 200, data: rdata })
}

exports.agentInfoRg = async (req, res, next) => {
    var data = req.body;
    var turnover = 0
    var winBets = 0;
    var agentData = await baseController.BfindOne(userModel, { _id: data.agentId });
    var userData = await baseController.Bfind(userModel, { agentId: data.agentId });
    if (userData.length) {
        for (var i in userData) {

            var history = await bwinHistoryModel.distinct("betId", { userId: userData[i]._id });
            var openBets = 0;
            var closeBets = 0;
            var loseBets = 0;
            for (var j in history) {
                var betHistory = await baseController.BfindOne(bwinHistoryModel, { userId: userData[i]._id, betId: history[j], created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.week.value)) } });
                if (betHistory.status === "pending") {
                    openBets = openBets + parseInt(betHistory.amount)
                } else if (betHistory.status === "win") {
                    winBets = winBets + parseInt(betHistory.winAmount)
                    closeBets = closeBets + parseInt(betHistory.amount)
                    turnover = turnover + parseInt(betHistory.amount)
                } else if (betHistory.status === "lose") {
                    loseBets = loseBets + parseInt(betHistory.amount)
                    closeBets = closeBets + parseInt(betHistory.amount)
                    turnover = turnover + parseInt(betHistory.amount)
                }
            }

            // var credit = await baseController.Bfind(paymentHistoryModel, { userId: userData[i]._id, created: { $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week.value)) } })
            // var discount = userData[i].extraCredit ? userData[i].extraCredit : 0
            // var agentCommiPer = userData[i].agentCommission ? userData[i].agentCommission : 0
            // var platformCommission = userData[i].platformCommission ? userData[i].platformCommission : 0

        }
    }

    var rdata = {
        turnover: { value: 0, label: 'Turnover' },
        totalDiscount: { value: 0, label: 'Total Discount' },
        agentProfits: { value: 0, label: 'Agent Profits' },
        platformProfits: { value: 0, label: 'Platform profits' },
        platformDebt: { value: 0, label: 'Platform Debt' },
    }


    var platformDebt = turnover - winBets
    if (userData.length) {
        rdata.turnover.value = `${turnover} ${userData[0].currency}`
        rdata.totalDiscount.value = `${0} ${userData[0].currency}`
        rdata.agentProfits.value = `${agentData.agentShare} %`
        rdata.platformProfits.value = `${100 - agentData.agentShare} %`
        rdata.platformDebt.value = `${platformDebt < 0 ? platformDebt : 0} ${userData[0].currency}`
    }
    return res.json({ status: 200, data: rdata })
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

exports.getAllUsersAction = async (req, res, next) => {
    var result = [];
    var data = req.body;
    var userData = await baseController.Bfind(userModel, { role: 'user' });
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
    if (data.role === "agent") {
        if (data.extraCredit > 0) {
            var parent = await baseController.BfindOne(userModel, { _id: data.pid })
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: parent._id }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, weeklyCreditResetState: data.weeklyCreditResetState, weeklyCreditResetDay: data.weeklyCreditResetDay });
            if (!isCheck) {
                res.json({ status: 300, data: "Something wrong from parent agent" })
                return false
            }
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

        if (data.platformCommission || data.platformCommission == 0 || data.sportsCommission || data.sportsCommission == 0 || data.casinoCommission || data.casinoCommission == 0) {
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { platformCommission: data.platformCommission, sportsCommission: data.sportsCommission, casinoCommission: data.casinoCommission })
            var users = await baseController.Bfind(userModel, { agentId: data.userId })
            for (let i in users) {
                await baseController.BfindOneAndUpdate(userModel, { _id: users[i]._id }, { platformCommission: data.platformCommission, sportsCommission: data.sportsCommission, casinoCommission: data.casinoCommission })
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
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * 1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * 1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, agentCommission: data.agentCommission });
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
            var isCheck = await baseController.BfindOneAndUpdate(userModel, { _id: data.userId }, { $inc: { 'balance': (Math.abs(parseInt(data.extraCredit)) * -1), 'extraCredit': (Math.abs(parseInt(data.extraCredit)) * -1) }, withdrawalCredit: data.withdrawalCredit, autoWeeklyCredit: data.autoWeeklyCredit, agentCommission: data.agentCommission });
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