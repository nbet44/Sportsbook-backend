const { default: axios } = require("axios");
const getUuid = require('uuid-by-string')
const fs = require('fs');
const baseController = require("../controller/baseController");
const { token, sportList, } = require("../config/index");
const { paymentHistoryModel } = require('../models/paymentHistoryModel');
const { userModel } = require("../models/userModel");
const { leagueTeamModel } = require("../models/leagueTeamModel");
const moment = require('moment');
const {
    bwinPrematchModel,
    bwinInPlayModel,
    bwinEventModel,
    bwinHistoryModel
} = require("../models/bwinSportsModel");
var prematchTeamNameData = "";
var liveTeamNameData = "";
var onlineUsers = {}

module.exports = async (io) => {
    const get3way = (h_score, a_score, oddType) => {
        if (h_score == a_score && oddType === "Draw") return "Win"
        if (h_score > a_score && oddType === "1") return "Win"
        if (h_score < a_score && oddType === "2") return "Win"
        else return "Lost"
    }

    const getDoubleChance = (h_score, a_score, oddType) => {
        if ((h_score > a_score || h_score == a_score) && oddType === "1") return "Win"
        if ((h_score < a_score || h_score == a_score) && oddType === "2") return "Win"
        if (h_score != a_score && oddType === "both") return "Win"
        else return "Lost"
    }

    const getOddEven = (h_score, a_score, oddType) => {
        let flag = (h_score + a_score) % 2
        if (flag == 1 && oddType == 'Odd') return "Win"
        if (flag == 0 && oddType == 'Even') return "Win"
        else return "Lost"
    }

    const getBTTSAndEitherTeamWin = (h_score, a_score, oddType) => {
        if (h_score > 0 && a_score > 0 && h_score != a_score && oddType == "Yes") return "Win"
        if (h_score == 0 && a_score == 0 && oddType == "No") return "Win"
        else "Lost"
    }

    const getBTTS = (h_score, a_score, oddType) => {
        if (h_score > 0 && a_score > 0 && oddType == "Yes") return "Win"
        if (h_score == 0 && a_score == 0 && oddType == "No") return "Win"
        else "Lost"
    }

    const BTTSAndOverUnder = (h_score, a_score, oddType, name) => {
        if (oddType == "Over") {
            let values = name.split("Yes and over ")
            values = values[1].split(" goals")[0]
            let first = values.split(",")[0]
            let second = values.split(",")[1]
            if (Number(first) > h_score && Number(second) > a_score) return "Win"
            else return "Lost"
        }
        if (oddType == "Under") {
            let values = name.split("Yes and under ")
            values = values[1].split(" goals")[0]
            let first = values.split(",")[0]
            let second = values.split(",")[1]
            if (Number(first) < h_score && Number(second) < a_score) return "Win"
            else return "Lost"
        }
    }

    const getCorrectScore = (h_score, a_score, oddType) => {
        let first = oddType.split(":")[0]
        let second = oddType.split(":")[1]
        if (Number(first) == h_score && Number(second) == a_score) return "Win"
        else return "Lost"
    }

    const getOverUnder = (h_score, a_score, oddType, name) => {
        let values = name.split(",")
        let home = values[0].replace(oddType + " ", "")
        let away = values[1]

        if (type == "Over") {
            if (h_score > Number(home) && a_score > Number(away)) return "Win"
            else return "Lost"
        }
        if (type == "Under") {
            if (h_score < Number(home) && a_score < Number(away)) return "Win"
            else return "Lost"
        }
    }

    const getMultipleCorrectScore = async (h_score, a_score, oddType) => {
        let first = oddType.split(" or ")
        let values = first[0].split(", ")
        values.push(first[1])
        let flag = false
        for (let i = 0; i < values.length; i++) {
            if (await getCorrectScore(h_score, a_score, values[i]) == "Win") {
                flag = true
                break
            }
        }
        if (flag) return "Win"
        else return "Lost"
    }


    const setScoreFinished = async () => {
        var data = await baseController.Bfind(bwinEventModel, { 'Scoreboard.period': 'Finished' })
        for (var i in data) {
            let config = {
                method: 'get',
                url: "https://api.b365api.com/v1/bwin/result?token=" + token + "&event_id=" + data[i].Id,
            };
            var response = await axios(config);
            if (response.data.results.length > 0 && response.data.success) {
                if (data[i].SportId === 4) {
                    var result = response.data.results[0]
                    var scores = result.scores && Object.keys(result.scores).length > 0 ? result.scores : null
                    if (scores) {
                        var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, isMain: true })
                        var result = ""
                        var home = scores['2'].home
                        var away = scores['2'].away
                        var home1 = scores['1'].home
                        var away1 = scores['1'].away
                        var home2 = Nmber(scores['2'].home) - Number(scores['1'].home)
                        var away2 = Nmber(scores['2'].away) - Number(scores['1'].away)

                        switch (history.marketType) {
                            case "3way":
                                if (history.period == "RegularTime") result = await get3way(home, away, history.team)
                                if (history.period == "FirstHalf") result = await get3way(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await get3way(home2, away2, history.team)
                                break;
                            case "BTTS":
                                if (history.period == "RegularTime") result = await getBTTS(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getBTTS(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getBTTS(home2, away2, history.team)
                                break;
                            case "DoubleChance":
                                if (history.period == "RegularTime") result = await getDoubleChance(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getDoubleChance(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getDoubleChance(home2, away2, history.team)
                                break;
                            case "Odd/Even":
                                if (history.period == "RegularTime") result = await getOddEven(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getOddEven(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getOddEven(home2, away2, history.team)
                                break;
                            case "Over/Under":
                                if (history.period == "RegularTime") result = await getOverUnder(home, away, history.team, history.name)
                                if (history.period == "FirstHalf") result = await getOverUnder(home1, away1, history.team, history.name)
                                if (history.period == "SecondHalf") result = await getOverUnder(home2, away2, history.team, history.name)
                                break;
                            case "BTTSAndEitherTeamToWin":
                                if (history.period == "RegularTime") result = await getBTTSAndEitherTeamWin(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getBTTSAndEitherTeamWin(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getBTTSAndEitherTeamWin(home2, away2, history.team)
                                break;
                            case "BTTSAndOver/Under":
                                if (history.period == "RegularTime") result = await BTTSAndOverUnder(home, away, history.team, history.name)
                                if (history.period == "FirstHalf") result = await BTTSAndOverUnder(home1, away1, history.team, history.name)
                                if (history.period == "SecondHalf") result = await BTTSAndOverUnder(home2, away2, history.team, history.name)
                                break;
                            case "CorrectScore":
                                if (history.period == "RegularTime") result = await getCorrectScore(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getCorrectScore(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getCorrectScore(home2, away2, history.team)
                                break;
                            case "MultipleCorrectScore":
                                if (history.period == "RegularTime") result = await getMultipleCorrectScore(home, away, history.team)
                                if (history.period == "FirstHalf") result = await getMultipleCorrectScore(home1, away1, history.team)
                                if (history.period == "SecondHalf") result = await getMultipleCorrectScore(home2, away2, history.team)
                                break;
                            default:
                                result = "Cancel"
                                break;
                        }

                        var userData = await baseController.BfindOne(userModel, { _id: history[i].userId })
                        if (userData) {
                            if (history.type == "single") {
                                if (result == 'Win') {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "win" })
                                    await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * 1) } })
                                    await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * -1) } })
                                } else if (result == "Lost") {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "lose" })
                                } else if (result == "Cancel") {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "refun" })
                                    await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount)) * -1) } })
                                    await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount)) * 1) } })
                                }
                            } else {
                                if (result == 'Win') {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "win" })
                                } else if (result == "Lost") {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "lose" })
                                } else if (result == "Cancel") {
                                    await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, }, { result: scores[0] + "-" + scores[1], status: "refun" })
                                }
                                let oneBet = baseController.BfindOne(bwinHistoryModel, { matchId: data[i].id })
                                let mixBets = baseController.Bfind(bwinHistoryModel, { betId: oneBet.betId })
                                let flag = true
                                let winCount = 0, winOdds = 1
                                for (let j in mixBets) {
                                    if (mixBets[j].status == 'pendding') {
                                        flag = false
                                        if (mixBets[j].status == 'win') {
                                            winCount++
                                        }
                                    }
                                }
                                if (flag) {
                                    if (winCount == mixBets) {
                                        await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].winAmount)) * 1) } })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].winAmount)) * -1) } })
                                    }
                                }
                            }
                        }
                    }
                }
                else if (data[i].SportId === 5) {
                    var result = response.data.results[0]
                    var scores = result.ss

                } else {
                    var result = response.data.results[0]
                    var scores = result.scores && result.scores[Object.keys(result.scores)[Object.keys(result.scores).length - 1]] ? result.scores[Object.keys(result.scores)[Object.keys(result.scores).length - 1]] : "";
                    if (data[i].SportId === 4 || data[i].SportId === 12 || data[i].SportId === 16) {
                        var index = scores && scores.home < scores.away ? 2 : 0;
                    } else {
                        var index = scores && scores.home < scores.away ? 1 : 0;
                    }
                    var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, isMain: true, index: index })
                    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].id })
                    if (isCheckHistory.length > 0) {
                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id }, { result: scores[0] + "-" + scores[1], status: "lose" })
                    }
                    for (var i in history) {
                        var userData = await baseController.BfindOne(userModel, { _id: history[i].userId })
                        if (userData) {
                            await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * 1) } })
                            await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * -1) } })
                        }
                    }
                    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].id, isMain: true, index: index })
                    if (isCheckHistory.length > 0) {
                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].id, isMain: true, index: index }, { result: scores[0] + "-" + scores[1], status: "win" })
                    }
                }

                // await baseController.BfindOneAndDelete(bwinEventModel, { Id: data[i].Id });
                // await baseController.BfindOneAndDelete(bwinInPlayModel, { Id: data[i].Id });
                // var saveData = {
                //   ...data.selectedResult[j],
                //   result: data.result
                // }
                // await baseController.BfindOneAndUpdate(bwinResultModel, { matchId: data[i].id, isMain: true }, saveData)
            }
        }
    }

    const removeOldMatchs = async () => {
        const currentDate = new Date(new Date().valueOf() - (1000 * 300)).toJSON()
        await setScoreFinished()
        // await bwinInPlayModel.deleteMany({ $or: [{ 'Scoreboard.period': 'Finished' }, { updatedAt: { $lte: currentDate } }] })
        // await bwinEventModel.deleteMany({ $or: [{ 'Scoreboard.period': 'Finished' }, { updatedAt: { $lte: currentDate } }] })
    }

    const makeWeeklyCredit = async () => {
        var registeredHours = 3;
        var todayDay = new Date().getDay()
        var agentData = await baseController.Bfind(userModel, { role: "agent" });
        for (var i in agentData) {
            if (agentData[i].weeklyCreditResetState && agentData[i].weeklyCreditResetState.value === "true") {
                var autoWeeklyCredit = agentData[i].autoWeeklyCredit
                if (todayDay === parseInt(agentData[i].weeklyCreditResetDay.value)) {
                    console.log("--- match weekly credit day ---");
                    if (registeredHours === new Date().getHours()) {
                        console.log("--- match weekly credit hour ---");
                        var parentData = await baseController.BfindOne(userModel, { _id: agentData[i].pid });
                        if (parseInt(parentData.balance) < parseInt(autoWeeklyCredit)) {
                            console.log("--- parent balance isn't enough for auto weekly credit ---")
                            return false;
                        }
                        await baseController.BfindOneAndUpdate(userModel, { _id: agentData[i]._id }, { $inc: { 'balance': (Math.abs(parseInt(autoWeeklyCredit)) * 1) } });
                        await baseController.BfindOneAndUpdate(userModel, { _id: parentData._id }, { $inc: { 'balance': (Math.abs(parseInt(autoWeeklyCredit)) * -1) } });
                        saveData = {
                            userId: agentData[i]._id,
                            currency: agentData[i].currency,
                            role: agentData[i].role,
                            pid: parentData._id,
                            agentId: parentData._id,
                            amount: autoWeeklyCredit
                        }
                        await baseController.data_save(saveData, paymentHistoryModel);
                    } else {
                        await baseController.BfindOneAndUpdate(userModel, { _id: agentData[i]._id }, { weeklyCreditProceed: false });
                    }
                }
            }
        }
    }

    //manage file start
    async function writePrematchTeamNameData(data) {
        var nameType = { 0: "league", 1: "country", 2: "team", 3: "team" }
        for (var i in data) {
            var isCheck = await baseController.BfindOne(leagueTeamModel, { name: data[i] })
            // var isCheck = await baseController.BfindOneAndUpdate(leagueTeamModel, { name: data[i] }, { name: data[i] })
            if (!isCheck) {
                var saveData = {
                    name: data[i],
                    nameType: nameType[i],
                    country: data[1],
                }
                await baseController.data_save(saveData, leagueTeamModel)
                prematchTeamNameData = prematchTeamNameData + "\n" + data[i];
            }
        }
    }

    async function writeLiveTeamNameData(data) {
        var nameType = { 0: "league", 1: "country", 2: "team", 3: "team" }
        for (var i in data) {
            var isCheck = await baseController.BfindOne(leagueTeamModel, { name: data[i] })
            // var isCheck = await baseController.BfindOneAndUpdate(leagueTeamModel, { name: data[i] }, { name: data[i] })
            if (!isCheck) {
                var saveData = {
                    name: data[i],
                    nameType: nameType[i],
                    country: data[1],
                }
                await baseController.data_save(saveData, leagueTeamModel)
                liveTeamNameData = liveTeamNameData + "\n" + data[i];
            }
        }
    }

    function putFileData(name, data) {
        fs.appendFile(name, data, 'utf8',
            function (err) {
                if (err) throw err;
            });
        // fs.writeFile(name, data, function (err) {
        //   if (err) return console.log(err);
        //   console.log('have done team_names.txt');
        // });
    }
    //manage file end

    //get live macth start 
    const liveMatchBwin = async () => {
        for (let i = 0; i < sportList.length; i++) {
            await getLiveDataMatch(sportList[i])
        }
    }

    const getLiveDataMatch = async (sport_id = 4) => {
        request = {
            method: "get",
            url: "https://api.b365api.com/v1/bwin/inplay?token=" + token + "&sport_id=" + sport_id,
        };
        try {
            response = await axios(request);
            if (sport_id == 4) {
                console.log(response.data.results)
            }
            if (response.data.success === 1) {
                let data = response.data.results
                let sendEventIds = []
                let pages = Math.ceil(data.length / 10)
                for (let i = 0; i < pages; i++) {
                    let tempEventIds = ""
                    for (let j = i * 10; j < (i + 1) * 10; j++) {
                        if (data[j]) {
                            var isCheck
                            var saveData = data[j];
                            saveData.type = "inplay";
                            saveData.Id = saveData.Id.replace(":", "0");
                            await baseController.BfindOneAndDelete(bwinPrematchModel, { Id: saveData.Id });
                            if (data[j].Scoreboard.period == 'Finished') {
                                var isFinish = await baseController.BfindOne(bwinInPlayModel, { Id: saveData.Id })
                                if (isFinish) {
                                    isCheck = await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: saveData.Id }, saveData
                                    );
                                }
                                let isThere = await baseController.BfindOne(bwinEventModel, { Id: saveData.Id })
                                if (isThere) {
                                    tempEventIds += saveData.Id
                                }
                            } else {
                                isCheck = await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: saveData.Id }, saveData);
                                tempEventIds += saveData.Id
                            }
                            if (!isCheck) {
                                console.log("---Didn't save this match on Inplay : " + saveData.Id + "---");
                            }
                            if (j + 1 != (i + 1) * 10) {
                                tempEventIds += ","
                            }
                        }
                    }
                    sendEventIds.push(tempEventIds)
                }
                let funcs = []
                for (let i in sendEventIds) {
                    funcs.push(getRealtimeLiveMarket(sendEventIds[i]))
                }
                Promise.all(funcs)
            }
        } catch (error) {
            console.log('get live data error' + error.message)
        }
    }

    const getRealtimeLiveMarket = async (ids) => {
        let data = await getMarketsById(ids)
        for (let i in data) {
            data[i].Id = data[i].Id.replace(":", "0");
            if (data[i].Markets.length > 0) {
                await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data[i].Id }, data[i])
                await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: data[i].Id }, { our_event_id: data[i].our_event_id })
            } else if (data[i].optionMarkets.length > 0) {
                let markets = []
                for (var j in data[i].optionMarkets) {
                    let convertData = {}
                    let optionMarkets = data[i].optionMarkets[j]
                    convertData.id = optionMarkets.id
                    convertData.name = optionMarkets.name
                    convertData.isMain = optionMarkets.isMain
                    convertData.visibility = optionMarkets.status
                    for (var k in optionMarkets.parameters) {
                        convertData[optionMarkets.parameters[k].key] = optionMarkets.parameters[k].value
                    }
                    convertData.attr = optionMarkets.grouping.parameters && optionMarkets.grouping.parameters.attr ? Math.abs(parseFloat(optionMarkets.grouping.parameters.attr)) : ""
                    convertData.results = []
                    for (var k in optionMarkets.options) {
                        convertData.results.push({
                            odds: optionMarkets.options[k].price.odds,
                            visibility: optionMarkets.options[k].status,
                            americanOdds: optionMarkets.options[k].price.americanOdds,
                            id: optionMarkets.options[k].id,
                            name: optionMarkets.options[k].name
                        })
                    }
                    markets.push(convertData)
                }
                data[i].Markets = markets
                await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data[i].Id }, data[i])
                await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: data[i].Id }, { our_event_id: data[i].our_event_id })
            } else {
                await baseController.BfindOneAndDelete(bwinInPlayModel, { Id: data[i].Id })
            }
        }
    }

    const getMarketsById = async (ids) => {
        return new Promise(async function (resolve, reject) {
            const request = {
                method: "get",
                url: "https://api.b365api.com/v1/bwin/event?token=" + token + "&event_id=" + ids
            }
            axios(request).then(async function (response) {
                if (response.data && response.data.success) {
                    if (response.data.results && response.data.results.length) {
                        resolve(response.data.results)
                    } else {
                        resolve([])
                    }
                }
            })
                .catch(function (error) {
                    resolve([])
                });
        })
    }
    //get live macth end

    //get premacth start
    const preMatchBwin = async () => {
        for (let i = 0; i < sportList.length; i++) {
            for (let j = 0; j <= 4; j++) {
                await getPreDataPage(moment().add(j, 'days').format('yyMMDD'), sportList[i])
            }
        }
    }

    const getPreDataPage = async (day, sport_id) => {
        let config = {
            method: 'get',
            url: "https://api.b365api.com/v1/bwin/prematch",
            headers: {},
            data: {
                token,
                sport_id,
                day,
                page: 1,
                skip_markets: 1
            }
        };
        axios(config).then(async (response) => {
            let pager = response.data.pager
            let page = Math.ceil(pager.total / pager.per_page)
            let funcs = []
            for (let i = 1; i <= page; i++) {
                funcs.push(getRealtimePreData(i, sport_id))
            }
            Promise.all(funcs);
        })
            .catch((error) => {
                console.log('get page function error ' + error.message)
            });
    }

    const getRealtimePreData = async (page, sport_id) => {
        let config = {
            method: 'get',
            url: "https://api.b365api.com/v1/bwin/prematch",
            headers: {},
            data: {
                token,
                sport_id,
                page
            }
        };
        axios(config).then(async (response) => {
            if (response.data && response.data.success) {
                let data = response.data.results
                for (let i in data) {
                    let saveData = data[i];
                    // saveData.Id = saveData.Id.replace(":", "0");
                    saveData.type = "prematch";
                    if (saveData.Markets && saveData.Markets.length > 0) {
                        var isCheck = await baseController.BfindOneAndUpdate(
                            bwinPrematchModel,
                            { Id: saveData.Id },
                            saveData
                        );
                        if (!isCheck) {
                            console.log("---" + saveData.Id + "---");
                        }
                    } else if (saveData.optionMarkets.length > 0) {
                        let markets = []
                        for (var j in saveData.optionMarkets) {
                            let convertData = {}
                            let optionMarkets = saveData.optionMarkets[j]
                            convertData.id = optionMarkets.id
                            convertData.name = optionMarkets.name
                            convertData.isMain = optionMarkets.isMain
                            convertData.visibility = optionMarkets.status
                            for (var k in optionMarkets.parameters) {
                                convertData[optionMarkets.parameters[k].key] = optionMarkets.parameters[k].value
                            }
                            convertData.attr = optionMarkets.grouping.parameters && optionMarkets.grouping.parameters.attr ? Math.abs(parseFloat(optionMarkets.grouping.parameters.attr)) : ""
                            convertData.results = []
                            for (var k in optionMarkets.options) {
                                convertData.results.push({
                                    odds: optionMarkets.options[k].price.odds,
                                    visibility: optionMarkets.options[k].status,
                                    americanOdds: optionMarkets.options[k].price.americanOdds,
                                    id: optionMarkets.options[k].id,
                                    name: optionMarkets.options[k].name
                                })
                            }
                            markets.push(convertData)
                        }
                        saveData.Markets = markets
                        await baseController.BfindOneAndUpdate(bwinPrematchModel, { Id: saveData.Id }, saveData)
                    }
                }
            }
        })
            .catch((error) => {
                console.log('get premacth data error' + error.message)
            });
    }
    //get premacth end

    const initial = async () => {
        await makeWeeklyCredit()
        await removeOldMatchs()
        await liveMatchBwin()
        await preMatchBwin()

        let userData = await baseController.BfindOne(userModel, { userId: "admin" });
        if (!userData) {
            let isCheck = await baseController.data_save({
                username: "admin",
                password: "12345678",
                userId: "admin",
                currency: "TRY",
                role: "admin",
                pid: "0",
                balance: 1000,
                permission: {
                    agent: true,
                    player: true
                }
            }, userModel);
            if (isCheck) {
                console.log("Admin account created!")
            }
        }
    }
    initial()

    setInterval(async function () {
        await liveMatchBwin()
        console.log('refresh live macth')
    }, 1000 * 30)

    setInterval(async function () {
        console.log("refresh premacth");
        await preMatchBwin()
        await removeOldMatchs()
    }, 1000 * 60 * 20);

    //Socket connnect part
    io.on("connection", async (socket) => {
        var query = socket.handshake.query;
        var roomName = query.roomName;
        if (roomName && roomName != 'null') {
            onlineUsers[socket.id] = roomName;
            var user = await userModel.findOneAndUpdate({ _id: roomName, isOnline: { $ne: 'BLOCK' } }, { isOnline: 'ON' }, { upsert: true, })
            socket.join(roomName);
            console.log(user.userId + ' ON');
        }

        socket.on('disconnect', async function () {
            if (onlineUsers[socket.id]) {
                var user = await userModel.findOneAndUpdate({ _id: onlineUsers[socket.id] }, { isOnline: 'OFF' }, { upsert: true, });
                console.log(user.userId + " OFF")
            }
            delete onlineUsers[socket.id];
        });
    });
};