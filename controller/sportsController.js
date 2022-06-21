const { default: axios } = require("axios");
const baseController = require("./baseController");
const { userModel } = require("../models/userModel");
const { bwinPrematchModel, bwinInPlayModel, bwinHistoryModel, bwinResultModel, bwinEventModel, bwinFavoriteModel } = require("../models/bwinSportsModel");
const { siteSettingModel } = require('../models/siteSettingModel');
const { paymentHistoryModel } = require("../models/paymentHistoryModel");
const { token, db } = require("../config/index");
const uniqid = require('uniqid');
const mongooseMulti = require('mongoose-multi');
// Adding redis cache
const redisCreateClient = require('redis').createClient;
const redisClient = redisCreateClient();
(async () => {
    await redisClient.connect();
})();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

const schemaFile = require('../models/multischemas.js');
const multiDB = mongooseMulti.start({ "betsapi": "mongodb://localhost:27017/betsapi" }, schemaFile);

exports.getAllMarketAction = async (req, res, next) => {
    var data = req.body;
    var historyResult = {}
    var model = bwinPrematchModel;
    if (data.type === "live") {
        model = bwinEventModel;
    }
    var marketData = await baseController.BfindOne(model, { Id: data.MatchId })
    var resultData = await baseController.Bfind(bwinResultModel, { matchId: data.MatchId })
    for (var i in resultData) {
        if (!historyResult[resultData[i].oddsId]) {
            historyResult[resultData[i].oddsId] = resultData[i];
        }
    }
    return res.json({ status: 200, data: { market: marketData, history: historyResult } });
}

exports.getAllMatchAction = async (req, res, next) => {
    var model = bwinPrematchModel;
    var result = []
    var data = req.body;
    if (data.type === "live") {
        model = bwinInPlayModel;
    }
    var matchData = await baseController.Bfind(model, { LeagueId: data.LeagueId })
    for (var i in matchData) {
        var resultData = await baseController.BfindOne(bwinResultModel, { matchId: matchData[i].Id, result: { $ne: null } })
        result.push({
            Id: matchData[i].Id,
            HomeTeam: matchData[i].HomeTeam,
            AwayTeam: matchData[i].AwayTeam,
            Date: matchData[i].Date,
            RegionName: matchData[i].RegionName,
            LeagueName: matchData[i].RegionName,
            result: resultData ? resultData.result : "0 - 0"
        })
    }
    return res.json({ status: 200, data: result });
}

exports.getAllLeagueAction = async (req, res, next) => {
    var model = bwinPrematchModel;
    var result = [];
    var data = req.body;
    if (data.type === "live") {
        model = bwinInPlayModel;
    }
    var leagueIdArray = await model.distinct("LeagueId", { AwayTeam: { $ne: null }, HomeTeam: { $ne: null }, SportId: data.SportId })
    for (var i in leagueIdArray) {
        var leagueData = await baseController.BfindOne(model, { SportId: data.SportId, LeagueId: leagueIdArray[i] })
        if (leagueData.SportId && leagueData.SportName) {
            result.push(leagueData);
        }
    }
    return res.json({ status: 200, data: result });
}

exports.getAllSportAction = async (req, res, next) => {
    var model = bwinPrematchModel;
    var result = [];
    var data = req.body;
    if (data.type === "live") {
        model = bwinInPlayModel;
    }
    var sportIdArray = await model.distinct("SportId");
    for (var i in sportIdArray) {
        var sportData = await baseController.BfindOne(model, { SportId: sportIdArray[i] })
        if (sportData.SportId && sportData.SportName) {
            result.push({
                SportId: sportData.SportId,
                SportName: sportData.SportName
            });
        }
    }
    return res.json({ status: 200, data: result });
}

exports.getTodayMatchAction = async (req, res, next) => {
    var data = req.body;
    if (!data.SportId) {
        res.json({ status: 300, data: "Invalid data" });
        return false;
    }
    var leagueData = {};
    var eventData = {};
    var firstDate = await baseController.get_stand_date_first(Date.now())
    var endDate = await baseController.get_stand_date_end1(Date.now())
    var sportsData = await baseController.Bfind(bwinPrematchModel, { AwayTeam: { $ne: null }, HomeTeam: { $ne: null }, SportId: data.SportId, Date: { $gte: firstDate, $lt: endDate } });
    for (var i in sportsData) {
        if (eventData[sportsData[i].LeagueId]) {
            eventData[sportsData[i].LeagueId].push(sportsData[i])
        } else {
            eventData[sportsData[i].LeagueId] = [sportsData[i]]
            leagueData[sportsData[i].LeagueId] = sportsData[i]
        }
    }
    res.json({ status: 200, data: { leagueData, eventData } });
    return true;
}

exports.getFavoriteAction = async (req, res, next) => {
    var data = req.body
    var result = {}
    if (data.type === 0) {
        var sportIdArray = await bwinFavoriteModel.distinct("SportId")
        for (var i in sportIdArray) {
            result[sportIdArray[i]] = await baseController.Bfind(bwinFavoriteModel, { SportId: sportIdArray[i] })
        }
    } else if (data.type === 1) {
        var sportIdArray = await bwinFavoriteModel.distinct("SportId")
        for (var i in sportIdArray) {
            result[sportIdArray[i]] = await baseController.Bfind(bwinFavoriteModel, { SportId: sportIdArray[i], IsPreMatch: false })
        }
    } else if (data.type === 2) {
        var sportIdArray = await bwinFavoriteModel.distinct("SportId")
        for (var i in sportIdArray) {
            result[sportIdArray[i]] = await baseController.Bfind(bwinFavoriteModel, { SportId: sportIdArray[i], IsPreMatch: true })
        }
    }
    res.json({ status: 200, data: result })
    return true
}

exports.saveFavoriteAction = async (req, res, next) => {
    var data = req.body
    var favorData = await baseController.BfindOne(bwinFavoriteModel, { Id: data.Id })
    var result = "save"
    if (favorData) {
        var deleteData = await baseController.BfindOneAndDelete(bwinFavoriteModel, { Id: data.Id })
        if (!deleteData) {
            res.json({ status: 300, dta: "Failed Remove" })
            return false
        }
        var updateEventData = await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data.Id }, { favor: false })
        result = "remove"
    } else {
        var saveData = await baseController.data_save(data, bwinFavoriteModel)
        if (!saveData) {
            res.json({ status: 300, data: "Failed Save" })
            return false
        }
        var updateEventData = await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data.Id }, { favor: true })
        result = "save"
    }
    res.json({ status: 200, data: result })
    return true
}

exports.setLiveResultAction = async (req, res, next) => {
    var result = [];
    var data = req.body;
    await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: data.matchId }, { Markets: data.market })
    await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data.matchId }, { Markets: data.market })
    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data.matchId })
    if (isCheckHistory.length > 0) {
        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data.matchId }, { result: data.result, status: "lose" })
    }
    for (var j in data.selectedResult) {
        if (data.selectedResult[j].isWin) {
            var history = await baseController.Bfind(bwinHistoryModel, { oddsId: j })
            for (var i in history) {
                var userData = await baseController.BfindOne(userModel, { _id: history[i].userId })
                if (userData) {
                    await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * 1) } })
                    await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * -1) } })
                }
            }
            var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { oddsId: j })
            if (isCheckHistory.length > 0) {
                await baseController.BfindOneAndUpdate(bwinHistoryModel, { oddsId: j }, { result: data.result, status: "win" })
            }
        }
        var saveData = {
            ...data.selectedResult[j],
            result: data.result
        }
        await baseController.BfindOneAndUpdate(bwinResultModel, { oddsId: j }, saveData)
    }
    res.json({ status: 200, data: result })
}

exports.setResultAction = async (req, res, next) => {
    var result = [];
    var data = req.body;
    console.log(data)
    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data.matchId })
    if (isCheckHistory.length > 0) {
        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data.matchId }, { result: data.result, status: "lose" })
    }
    for (var j in data.selectedResult) {
        var history = await baseController.Bfind(bwinHistoryModel, { oddsId: j })
        for (var i in history) {
            var userData = await baseController.BfindOne(userModel, { _id: history[i].userId })
            if (userData) {
                await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * 1) } })
                await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * -1) } })
            }
        }
        var saveData = {
            ...data.selectedResult[j],
            result: data.result
        }
        var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { oddsId: j })
        if (isCheckHistory.length > 0) {
            await baseController.BfindOneAndUpdate(bwinHistoryModel, { oddsId: j }, { result: data.result, status: "win" })
        }
        await baseController.BfindOneAndUpdate(bwinResultModel, { oddsId: j }, saveData)
    }
    res.json({ status: 200, data: result })
}

exports.getResultAction = async (req, res, next) => {
    var data = req.body;
    var result = [];
    history = await bwinHistoryModel.aggregate([
        {
            $sort: { created: -1 }
        },
        {
            $group: {
                "_id": "$oddsId",
                "totalAmount": { $sum: "$amount" },
                "count": { $sum: 1 }
            }
        }
    ])
    for (var i in history) {
        var betsData = await baseController.BfindOne(bwinHistoryModel, { oddsId: history[i]._id })
        result.push({
            ...betsData._doc,
            totalAmount: history[i].totalAmount,
            count: history[i].count
        })
    }
    res.json({ status: 200, data: result })
}

exports.getHistoryAction = async (req, res, next) => {
    var data = req.body;
    var filter = {}
    var result = [];
    var userList = await baseController.Bfind(userModel, { agentId: data.agentId });
    var userIdArray = [];
    for (var i in userList) {
        userIdArray.push(userList[i]._id)
    }
    if (data.filter) {
        filter.created = {
            $gte: new Date(Date.now() - 3600 * 1000 * 24 * 7 * parseInt(data.filter.week)),
        }
        if (!data.filter.userId) {
            filter.userId = {
                $in: userIdArray
            }
        } else {
            filter.userId = {
                $in: [data.filter.userId]
            }
        }
        if (data.filter.status !== "" && data.filter.status !== "all") {
            filter.status = data.filter.status
        }
    }
    console.log(filter)
    if (data.filter && data.filter.sort === "result") {
        var history = await baseController.BfindSort(bwinHistoryModel, filter, { result: 1 })
    } else {
        var history = await baseController.BfindSort(bwinHistoryModel, filter, { created: -1 })
    }
    var multiResult = {}
    let resultUsers = []
    for (var i in history) {
        if (multiResult[history[i]["betId"]]) {
            multiResult[history[i]["betId"]].push(history[i])
        } else {
            multiResult[history[i]["betId"]] = [history[i]]
        }
        resultUsers.push(history[i].userId)
    }
    let userData = await userModel.find({ _id: { $in: resultUsers } })

    let usersObj = {}
    userData.map(e => usersObj[e._id] = e)

    for (var i in multiResult) {
        if (multiResult[i].length > 1) {
            var row = multiResult[i][0]
            var totalOdds = 0
            for (var j in multiResult[i]) {
                totalOdds = totalOdds + parseInt(multiResult[i][j].odds)
            }
            result.push({
                username: usersObj[multiResult[i][0].userId].username,
                userId: usersObj[multiResult[i][0].userId].userId,
                sport: row.sport,
                created: row.created,
                desc: "Parlay " + multiResult[i].length,
                odds: totalOdds,
                winAmount: row.winAmount,
                amount: row.amount,
                result: row.result,
                status: row.status,
                betId: row.betId
            })
        } else {
            var row = multiResult[i][0]
            result.push({
                username: usersObj[multiResult[i][0].userId].username,
                userId: usersObj[multiResult[i][0].userId].userId,
                sport: row.sport,
                created: row.created,
                desc: row.desc,
                odds: row.odds,
                winAmount: row.winAmount,
                amount: row.amount,
                result: row.result,
                status: row.status,
                betId: row.betId
            })
            delete multiResult[i]
        }
    }
    res.json({ status: 200, data: { result, group: multiResult } })
    return true;

    // var history = await baseController.Bfind(bwinHistoryModel, { agentId: data.agentId })
    // for (var i in history) {
    //     result.push({
    //         ...history[i]._doc,
    //         username: usersObj[history[i].userId].username
    //     })
    // }
    // res.json({ status: 200, data: result })
    return true
}

const bet365Odd = async (bet, bet365) => {
    result = {}
    if (bet.period == "RegularTime") {
        switch (bet.marketType) {
            case "3way": {
                let odd = bet365.main.sp.full_time_result.odds
                if (bet.team === '1') result[bet.id] = odd[0].odds
                if (bet.team === 'Draw') result[bet.id] = odd[1].odds
                if (bet.team === '2') result[bet.id] = odd[2].odds
                break
            }
            case "Handicap": {
                let odd = bet365.main.sp.asian_handicap.odds
                if (bet.team === '1') result[bet.id] = odd[0].odds
                if (bet.team === '2') result[bet.id] = odd[1].odds
                break
            }
            case "Over/Under": {
                let odd = bet365.main.sp.goals_over_under.odds
                if (bet.team === '1') result[bet.id] = odd[0].odds
                if (bet.team === '2') result[bet.id] = odd[1].odds
                break
            }
        }
    } else {
        switch (bet.marketType) {
            case "3way": {
                let odd = bet365.half.sp.half_time_result.odds
                if (bet.team === '1') result[bet.id] = odd[0].odds
                if (bet.team === 'Draw') result[bet.id] = odd[1].odds
                if (bet.team === '2') result[bet.id] = odd[2].odds
                break
            }
            case "Handicap": {
                let odd = bet365.half.sp["1st_half_asian_handicap"].odds
                if (bet.team === '1') result[bet.id] = odd[0].odds
                if (bet.team === '2') result[bet.id] = odd[1].odds
                break
            }
            // case "Over/Under": {
            //     let odd = bet365.half.sp.goals_over_under.odds
            //     if (bet.team === '1') result.bet365[bet.id] = odd[0].odds
            //     if (bet.team === '2') result.bet365[bet.id] = odd[1].odds
            // }
        }
    }
    return result
}

const sbobetOdd = async (bet, sbobet) => {
    result = {}
    if (bet.period == "RegularTime") {
        switch (bet.marketType) {
            case "3way": {
                let index = sbobet.markets.findIndex(e => e.display == "1X2")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0]
                    if (bet.team === 'Draw') result[bet.id] = odd[1]
                    if (bet.team === '2') result[bet.id] = odd[2]
                }
                break
            }
            case "Handicap": {
                let index = sbobet.markets.findIndex(e => e.display == "Asian Handicap")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0]
                    if (bet.team === '2') result[bet.id] = odd[1]
                }
                break
            }
            case "Over/Under": {
                let index = sbobet.markets.findIndex(e => e.display == "Over Under")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0]
                    if (bet.team === '2') result[bet.id] = odd[1]
                }
                break
            }
        }
    } else {
        switch (bet.marketType) {
            case "3way": {
                let index = sbobet.markets.findIndex(e => e.display == "First Half 1X2")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0].odds
                    if (bet.team === 'Draw') result[bet.id] = odd[1].odds
                    if (bet.team === '2') result[bet.id] = odd[2].odds
                }
                break
            }
            case "Handicap": {
                let index = sbobet.markets.findIndex(e => e.display == "First Half Asian Handicap")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0].odds
                    if (bet.team === '2') result[bet.id] = odd[1].odds
                }
                break
            }
            case "Over/Under": {
                let index = sbobet.markets.findIndex(e => e.display == "First Half Over Under")
                if (index != -1) {
                    let odd = sbobet.markets[index].odds
                    if (bet.team === '1') result[bet.id] = odd[0].odds
                    if (bet.team === '2') result[bet.id] = odd[1].odds
                }
                break
            }
        }
    }
    return result
}

exports.userBetAction_ = async (req, res, nex) => {
    var data = req.body;
    let oddData = {
        nbet: {},
        bet365: {},
        sbobet: {},
    }
    for (var i in data) {
        if (data[i].our_event_id) {
            let bet = data[i]

            let bet365 = await baseController.BfindOne(multiDB.betsapi.tbl_bet365_preevents, { OurId: bet.our_event_id })
            let sbobet = await baseController.BfindOne(multiDB.betsapi.tbl_sbobet_preevents, { OurId: bet.our_event_id })
            oddData.nbet = { ...oddData.nbet, [bet.id]: bet.odds }
            if (bet365) {
                let re = await bet365Odd(bet, bet365)
                oddData.bet365 = { ...oddData.bet365, ...re }
            }
            if (sbobet) {
                let re = await sbobetOdd(bet, sbobet)
                oddData.sbobet = { ...oddData.sbobet, ...re }
            }
        }
    }
    var userData = await baseController.BfindOne(userModel, { _id: data._id },)
    res.json({ status: 200, data: { userData, result: [], oddData } });
}
exports.userBetAction = async (req, res, next) => {
    var result = [];
    let oddData = {
        nbet44: {},
        bet365: {},
        sbobet: {},
    }
    var data = req.body;
    var betId = uniqid()
    for (var i in data) {
        if (data[i].our_event_id) {
            let bet = data[i]

            let bet365 = await baseController.BfindOne(multiDB.betsapi.tbl_bet365_preevents, { OurId: bet.our_event_id })
            let sbobet = await baseController.BfindOne(multiDB.betsapi.tbl_sbobet_preevents, { OurId: bet.our_event_id })
            oddData.nbet44 = { ...oddData.nbet44, [bet.id]: bet.odds }
            if (bet365) {
                let re = await bet365Odd(bet, bet365)
                oddData.bet365 = { ...oddData.bet365, ...re }
            }
            if (sbobet) {
                let re = await sbobetOdd(bet, sbobet)
                oddData.sbobet = { ...oddData.sbobet, ...re }
            }
        }

        if (data.slipType === "single") {
            betId = uniqid()
        }
        if (data[i]["amount"]) {
            var saveData = {
                ...data[i],
                userId: data._id,
                agentId: data.agentId,
                betId: betId
            }
            var isCheck = await baseController.data_save(saveData, bwinHistoryModel)
            if (!isCheck) {
                res.json({ status: 300, data: "wrong bet: " + i })
                return false
            }
            result.push(saveData)
        }
        if (data[i].IsPreMatch) {
            await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: data[i].matchId }, { $inc: { 'playCount': 1 } });
        } else {
            await baseController.BfindOneAndUpdate(bwinPrematchModel, { Id: data[i].matchId }, { $inc: { 'playCount': 1 } });
        }
    }
    var userData = await baseController.BfindOneAndUpdate(userModel, { _id: data._id }, { $inc: { 'balance': (Math.abs(parseInt(data.totalAmount)) * -1) } });
    var updateAgent = await baseController.BfindOneAndUpdate(userModel, { _id: data.agentId }, { $inc: { 'balance': (Math.abs(parseInt(data.totalAmount)) * 1) } });
    res.json({ status: 200, data: { userData, result, oddData } });
}

exports.getLiveAction = async (req, res, next) => {
    var data = req.body;
    var leagueData = {};
    var eventData = {};
    var firstDate = await baseController.get_stand_date_first(Date.now())
    var endDate = await baseController.get_stand_date_end1(Date.now())
    var apiRequestData = [];
    var sportsData = await baseController.Bfind(bwinInPlayModel, { AwayTeam: { $ne: null }, HomeTeam: { $ne: null }, SportId: data.SportId, Date: { $gte: firstDate, $lt: endDate } });
    for (var i = 0; i < sportsData.length; i++) {
        var eachEvent = await baseController.BfindOne(bwinEventModel, { Id: sportsData[i].Id })
        if (eachEvent && eachEvent.Markets && eachEvent.Markets.length > 0) {
            eventData[eachEvent["Id"]] = eachEvent;
        } else {
            apiRequestData.push(sportsData[i])
        }
    }
    // var eventIds = ""
    // for (var i = 0; i < apiRequestData.length; i++) {
    //     eventIds = eventIds + apiRequestData[i]["Id"] + ",";
    //     if ((i + 1) % 9 === 0 || i + 1 === apiRequestData.length) {
    //         var multiEventData = await getMultiEvent(eventIds)
    //         for (var j in multiEventData) {
    //             eventData[multiEventData[j]["Id"]] = multiEventData[j];
    //         }
    //         eventIds = ""
    //     }
    // }
    var leagueIdArray = await bwinInPlayModel.distinct("LeagueId", { AwayTeam: { $ne: null }, HomeTeam: { $ne: null }, SportId: data.SportId, Date: { $gte: firstDate, $lt: endDate } })
    for (var i in leagueIdArray) {
        var sportsData = await baseController.Bfind(bwinInPlayModel, { LeagueId: leagueIdArray[i] });
        var filteredData = []
        for (var j in sportsData) {
            for (var k in eventData) {
                if (sportsData[j].Id === eventData[k].Id) {
                    filteredData.push(sportsData[j])
                }
            }
        }
        // leagueData[leagueIdArray[i]] = sportsData;
        if (filteredData.length > 0) {
            leagueData[leagueIdArray[i]] = filteredData;
        }
    }

    // get all event data
    // var eventIds = ""
    // for(var i=0; i<sportsData.length; i++) {
    //     eventIds = eventIds + sportsData[i]["Id"] + ",";
    //     if((i+1)%9 === 0 || i+1 === sportsData.length) {
    //         var multiEventData = await getMultiEvent(eventIds)
    //         for(var j in multiEventData) {
    //             eventData.push(multiEventData[j]);
    //         }
    //         eventIds = ""
    //     }
    // }
    // console.log(eventData)
    res.json({ status: 200, data: { leagueData, eventData } });
    return true;
}

exports.getLeagueAction = async (req, res, next) => {

    var data = req.body;
    var result = [];
    var firstDate = await baseController.get_stand_date_first(data.date)
    var endDate = await baseController.get_stand_date_end1(data.date)
    var settingData = { leagueSort: { value: 'RegionName', label: 'A~Z' } };
    //await baseController.BfindOne(siteSettingModel, { siteId: siteId });
    var sortCondition = { [settingData.leagueSort.value]: -1 };
    var leagueIdArray = await bwinPrematchModel.distinct("LeagueId", { AwayTeam: { $ne: null }, HomeTeam: { $ne: null }, Date: { $gte: firstDate, $lt: endDate } })
    for (var i in leagueIdArray) {

        let sportsData = await redisClient.get(`leagueData_${leagueIdArray[i]}`);

        if (!sportsData) {
            console.log('from DB');
            sportsData = await bwinPrematchModel.findOne({ LeagueId: leagueIdArray[i] }).sort(sortCondition);
            await redisClient.set(`leagueData_${leagueIdArray[i]}`, JSON.stringify(sportsData));
        }
        else {
            console.log('form Redis');
            sportsData = JSON.parse(sportsData);
        }

        result.push({
            LeagueId: sportsData.LeagueId,
            IsPreMatch: sportsData.IsPreMatch,
            LeagueName: sportsData.LeagueName,
            RegionId: sportsData.RegionId,
            RegionName: sportsData.RegionName,
            SportId: sportsData.SportId,
            SportName: sportsData.SportName,
            ClickCount: sportsData.clickCount,
            PlayCount: sportsData.playCount,
        });
    }
    res.json({ status: 200, data: result, setting: settingData });
    return true;
}

exports.getUsersAction = async (req, res, next) => {
    var data = req.body;
    var userData = await baseController.Bfind(userModel, { agentId: data.agentId });
    res.json({ status: 200, data: userData });
    return true;
}

exports.removeAgentAction = async (req, res, next) => {
    var data = req.body;
    var isCheck = await baseController.BfindOneAndDelete(userModel, { pid: data.pid, _id: data._id });
    if (!isCheck) {
        res.json({ status: 300, data: "Wrong Something" });
        return false;
    }
    var agentData = await baseController.Bfind(userModel, { pid: data.pid });
    res.json({ status: 200, data: agentData });
    return true;
}

exports.getEventAction = async (req, res, next) => {
    var data = req.body;
    if (!data.eventId) {
        res.json({ status: 300, data: "No Match" });
        return false;
    }
    var event = await baseController.BfindOne(bwinEventModel, { Id: data.eventId });
    if (!event) {
        event = await baseController.BfindOne(bwinPrematchModel, { Id: data.eventId });
        if (!event) {
            const request = {
                method: "get",
                url: "https://api.b365api.com/v1/bwin/event?token=" + token + "&event_id=" + data.eventId,
            }
            const response = await axios(request)
            if (response.data.success === 1) {
                if (response.data.results[0]) {
                    var eventData = response.data.results[0]
                    res.json({ status: 200, data: eventData })
                    return true;
                } else {
                    res.json({ status: 200, data: {} })
                    return true;
                }
            }
        } else {
            res.json({ status: 200, data: event })
            return true;
        }
    }
    return res.json({ status: 200, data: event })
}

async function getMultiEvent(ids) {
    var result = []
    const request = {
        method: "get",
        url: "https://api.b365api.com/v1/bwin/event?token=" + token + "&event_id=" + ids
    }
    const response = await axios(request);
    if (response.data.success === 1) {
        var data = response.data.results;
        for (var i in data) {
            if (data[i] && data[i].Markets.length > 0) {
                data[i].Id = data[i].Id.replace(":", "0");
                data[i].type = "inplay";
                await baseController.data_save(data[i], bwinEventModel)
                result.push(data[i])
            } else {
                data[i].Id = data[i].Id.replace(":", "0");
                await baseController.BfindOneAndDelete(bwinInPlayModel, { Id: data[i].Id })
            }
        }
        return result;
    }
    return false;
}

async function getEventData(matchData) {
    const request = {
        method: "get",
        url: "https://api.b365api.com/v1/bwin/event?token=" + token + "&event_id=" + matchData.Id
    }
    const response = await axios(request);
    if (response.data.success === 1) {
        var data = response.data.results[0]
        if (data) {
            // data.Id = data.Id.split(":")[1];
            data.Id = data.Id.replace(":", "0");
            data.type = "prematch";
            await baseController.data_save(data, bwinEventModel)
        }
        return data;
    }
    return false;
}

exports.getMatchAction = async (req, res, next) => {
    var data = req.body;
    if (!data.LeagueId) {
        res.json({ status: 300, data: "No Match" });
        return false;
    }
    var firstDate = await baseController.get_stand_date_first(Date.now())
    var endDate = await baseController.get_stand_date_end1(Date.now())
    var matchData = await baseController.Bfind(bwinPrematchModel, { LeagueId: data.LeagueId, Date: { $gte: firstDate } });
    var eventData = {};
    for (var i in matchData) {
        var event = await baseController.BfindOne(bwinPrematchModel, { Id: matchData[i].Id });
        if (!event) {
            console.log(matchData[i]["Id"])
            eventData[matchData[i]["Id"]] = await getEventData(matchData[i])
        } else {
            eventData[matchData[i]["Id"]] = event
        }
        if (data.first) {
            await baseController.BfindOneAndUpdate(bwinPrematchModel, { Id: matchData[i].Id }, { $inc: { 'clickCount': 1 } });
        }
    }
    res.json({ status: 200, data: eventData })
    return true;
}