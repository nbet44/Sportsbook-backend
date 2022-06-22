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
    const setScoreFinished = async () => {
        var data = await baseController.Bfind(bwinEventModel, { 'Scoreboard.period': 'Finished' })
        for (var i in data) {
            let config = {
                method: 'get',
                url: "https://api.b365api.com/v1/bwin/result?token=" + token + "&event_id=" + data[i].Id,
            };
            var response = await axios(config);
            if (response.data.results.length > 0 && response.data.success) {
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
            if (response.data.success === 1) {
                let data = response.data.results
                let sendEventIds = []
                let pages = Math.ceil(data.length / 10)
                for (let i = 0; i < pages; i++) {
                    let tempEventIds = ""
                    for (let j = i * 10; j < (i + 1) * 10; j++) {
                        if (data[j]) {
                            var saveData = data[j];
                            saveData.type = "inplay";
                            saveData.Id = saveData.Id.replace(":", "0");
                            await baseController.BfindOneAndDelete(bwinPrematchModel, { Id: saveData.Id });
                            var isCheck = await baseController.BfindOneAndUpdate(
                                bwinInPlayModel,
                                { Id: saveData.Id },
                                saveData
                            );
                            tempEventIds += saveData.Id
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
            console.log('get live data error')
        }
    }

    const getRealtimeLiveMarket = async (ids) => {
        let data = await getMarketsById(ids)
        for (let i in data) {
            data[i].Id = data[i].Id.replace(":", "0");
            if (data[i].Markets.length > 0) {
                await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data[i].Id }, data[i])
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
            for (let i = 0; i <= 4; i++) {
                await getPreDataPage(moment().add(i, 'days').format('yyMMDD'), sportList[i])
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
        console.log("refresh");
        await preMatchBwin()
        await liveMatchBwin()
        await removeOldMatchs()
    }, 1000 * 60 * 5);

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