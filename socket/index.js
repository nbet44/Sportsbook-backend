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

    //Football markets
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
    //Football markets

    //TableTennis markets
    const whoWin = async (score, winner) => {
        var home = score.split('-')[0];
        var away = score.split('-')[1];

        if (Number(home) > Number(away) && winner == '1') return "Win"
        else if (Number(home) < Number(away) && winner == '2') return "Win"
        else return "Lost"
    }

    const setBet = async (score, value) => {
        var home = Number(score.split('-')[0]);
        var away = Number(score.split('-')[1]);
        var vHome = Number(value.split('-')[0]);
        var vAway = Number(value.split('-')[1]);

        if (home == vHome && away == vAway) return "Win"
        else return "Lost"
    }

    const totalPointHandicap = async (scores, hcp, winner) => {
        var home = 0, away = 0;
        for (const val in scores) {
            home += Number(scores[val].home);
            away += Number(scores[val].away);
        }

        var handicap = hcp.split(',')[0];
        handicap = handicap.slice(-3);
        handicap = Number(handicap);

        if (winner == '1') {
            if ((home + handicap) > away) return "Win";
            else return "Lost";
        } else if (winner == '2') {
            if ((away + handicap) > home) return "Win";
            else return "Lost";
        } else {
            return 'refun'
        }
    }

    const whoWinSecond = async (scores, winner) => {
        if (!scores && !scores['2']) return 'refun';
        var home = scores['2'].home;
        var away = scores['2'].away;

        if (Number(home) > Number(away) && winner == '1') return "Win"
        else if (Number(home) < Number(away) && winner == '2') return "Win"
        else return "Lost"
    }

    const howPoints = async (scores, period, point, team) => {
        var total = 0, over = 1, cPoint = 0
        console.log(over, total, cPoint, '=========')

        if (period == 'RegularTime') {
            for (const val in scores) {
                total += Number(scores[val][team]);
            }

            cPoint = Number(point.split(',')[0].slice(-3));

            if (point.startsWith("Over")) over = 1
            else if (point.startsWith("Under")) over = -1
        } else {
            if (scores[period]) {
                total += Number(scores[period][team]);

                if (point.startsWith('Exactly')) {
                    over = 0;
                    cPoint = Number(point.split('Exactly')[1]);
                } else if (point.indexOf('or less') != -1) {
                    over = -1;
                    cPoint = Number(point.slice(0, 3));
                } else if (point.indexOf('or more') != -1) {
                    over = 1;
                    cPoint = Number(point.slice(0, 3));
                } else {
                    return 'refun';
                }
            } else {
                return 'refun';
            }
        }

        if (over == 1) {
            if (total >= cPoint) return 'Win';
            else return 'Lost';
        } else if (over == 0) {
            if (total == cPoint) return 'Win';
            else return 'Lost';
        } else if (over == -1) {
            if (total <= cPoint) return 'Win';
            else return 'Lost';
        }
    }

    const howPointsTotal = async (scores, period, point) => {
        var total = 0, over = 1, cPoint = 0

        if (period == 'RegularTime') {
            for (const val in scores) {
                total += Number(scores[val].home);
                total += Number(scores[val].away);
            }

            cPoint = Number(point.split(',')[0].slice(-3));

            if (point.startsWith("Over")) over = 1
            else if (point.startsWith("Under")) over = -1
        } else {
            if (scores[period]) {
                total += Number(scores[period].home);
                total += Number(scores[period].away);

                if (point.startsWith('Exactly')) {
                    over = 0;
                    cPoint = Number(point.split('Exactly')[1]);
                } else if (point.indexOf('or less') != -1) {
                    over = -1;
                    cPoint = Number(point.slice(0, 3));
                } else if (point.indexOf('or more') != -1) {
                    over = 1;
                    cPoint = Number(point.slice(0, 3));
                } else {
                    return 'refun';
                }
            } else {
                return 'refun';
            }
        }
        if (over == 1) {
            if (total >= cPoint) return 'Win';
            else return 'Lost';
        } else if (over == 0) {
            if (total == cPoint) return 'Win';
            else return 'Lost';
        } else if (over == -1) {
            if (total <= cPoint) return 'Win';
            else return 'Lost';
        }
    }

    const whichTeamScoreSet = async (scores, period, name, winner) => {
        var score = 0, goal;
        if (!period || !scores[period]) return 'refun';
        if (winner == '1') {
            score = scores[period].home;
        } else {
            score = scores[period].away;
        }
        goal = name.split('Which Team/Player will score the ')[1];
        goal = Number(goal.slice(2));

        if (goal == score) return 'Win';
        else return 'Lost';
    }

    const correctScore = async (scores, period, value) => {
        var home = Number(scores[period].home);
        var away = Number(scores[period].away);
        var vHome = Number(value.split(':')[0]);
        var vAway = Number(value.split(':')[1]);
        if (home == vHome && away == vAway) return "Win"
        else return "Lost"
    }

    const numberOfPoints = async (scores, period, point) => {
        var total = 0, over = 1, cPoint = 0

        if (scores[period]) {
            total += Number(scores[period].home);
            total += Number(scores[period].away);

            if (point.startsWith("Over")) over = 1
            else if (point.startsWith("Under")) over = -1
        } else {
            return 'refun';
        }

        if (over == 1) {
            if (total >= cPoint) return 'Win';
            else return 'Lost';
        } else if (over == -1) {
            if (total <= cPoint) return 'Win';
            else return 'Lost';
        }
    }

    const setWinner = async (scores, period, winner) => {
        var home = Number(scores[period].home);
        var away = Number(scores[period].away);

        if (home > away && winner == '1') return "Win";
        else if (home < away && winner == '2') return "Win";
        else return 'Lost';
    }

    const setHandicap = (scores, period, hcp, winner) => {
        var home = 0, away = 0;
        home += Number(scores[period].home);
        away += Number(scores[period].away);

        var handicap = hcp.split(',')[0];
        handicap = handicap.slice(-3);
        handicap = Number(handicap);

        if (winner == '1') {
            if ((home + handicap) > away) return "Win";
            else return "Lost";
        } else if (winner == '2') {
            if ((away + handicap) > home) return "Win";
            else return "Lost";
        } else {
            return 'refun'
        }
    }
    //TableTennis markets

    const setScoreFinished = async () => {
        var data = await baseController.Bfind(bwinEventModel, { 'Scoreboard.period': 'Finished' })
        for (var i in data) {
            let config = {
                method: 'get',
                url: "https://api.b365api.com/v1/bwin/result?token=" + token + "&event_id=" + data[i].Id,
            };
            var response = await axios(config);
            if (response.data.results.length > 0 && response.data.success) {
                var rdata = response.data.results[0]

                if (data[i].SportId == 4) {                                                                                     //Football
                    var scores = rdata.scores && Object.keys(rdata.scores).length > 0 ? rdata.scores : null
                    var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, status: "pending" })
                    var result, home, away, home1, away1, home2, away2
                    if (scores) {
                        result = ""
                        home = Number(scores['2'].home)
                        away = Number(scores['2'].away)
                        home1 = Number(scores['1'].home)
                        away1 = Number(scores['1'].away)
                        home2 = Number(scores['2'].home) - Number(scores['1'].home)
                        away2 = Number(scores['2'].away) - Number(scores['1'].away)
                    }
                    for (let j in history) {
                        if (scores) {
                            let pHome, pAway;
                            if (history[j].period == "RegularTime") {
                                pHome = home;
                                pAway = away;
                            } else if (history[j].period == "FirstHalf") {
                                pHome = home1;
                                pAway = away1;
                            } else if (history[j].period == "SecondHalf") {
                                pHome = home2;
                                pAway = away2;
                            }

                            switch (history[j].marketType) {
                                case "3way":
                                    result = await get3way(pHome, pAway, history[j].team)
                                    break;
                                case "BTTS":
                                    result = await getBTTS(pHome, pAway, history[j].team)
                                    break;
                                case "DoubleChance":
                                    result = await getDoubleChance(pHome, pAway, history[j].team)
                                    break;
                                case "Odd/Even":
                                    result = await getOddEven(pHome, pAway, history[j].team)
                                    break;
                                case "Over/Under":
                                    result = await getOverUnder(pHome, pAway, history[j].team, history.name)
                                    break;
                                case "BTTSAndEitherTeamToWin":
                                    result = await getBTTSAndEitherTeamWin(pHome, pAway, history[j].team)
                                    break;
                                case "BTTSAndOver/Under":
                                    result = await BTTSAndOverUnder(pHome, pAway, history[j].team, history.name)
                                    break;
                                case "CorrectScore":
                                    result = await getCorrectScore(pHome, pAway, history[j].team)
                                    break;
                                case "MultipleCorrectScore":
                                    result = await getMultipleCorrectScore(pHome, pAway, history[j].team)
                                    break;
                                default:
                                    result = "Cancel"
                            }
                            var userData = await baseController.BfindOne(userModel, { _id: history[j].userId })
                            if (userData) {
                                if (history[j].type == "single") {
                                    if (result == 'Win') {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "win" })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount * Number(history[j].odds))) * 1) } })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount * Number(history[j].odds))) * -1) } })
                                    } else if (result == "Lost") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "lose" })
                                    } else if (result == "Cancel") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "refun" })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * -1) } })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * 1) } })
                                    }
                                } else {
                                    if (result == 'Win') {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "win" })
                                    } else if (result == "Lost") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "lose" })
                                    } else if (result == "Cancel") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: home + "-" + away, status: "refun" })
                                    }
                                    let oneBet = baseController.BfindOne(bwinHistoryModel, { _id: history[j]._id })
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
                                            await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].winAmount)) * 1) } })
                                            await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].winAmount)) * -1) } })
                                        }
                                    }
                                }
                            }
                        } else {
                            await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: 'No result', status: "refun" })
                            await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * 1) } })
                            await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * -1) } })
                        }
                    }

                } else if (data[i].SportId == 56) {                                                                             //Table Tennis
                    var scores = rdata.scores && Object.keys(rdata.scores).length > 0 ? rdata.scores : null;
                    var score = rdata.ss;
                    var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, status: "pending" })
console.log(history)
                    if (scores && score) {
                        for (let j in history) {

                            if (history[j].marketType == "2Way - Who will win?") {
                                result = await whoWin(score, history[j].team)
                            } else if (history[j].marketType == "Set Bet") {
                                result = await setBet(score, history[j].team)
                            } else if (history[j].marketType == "Total Points Handicap") {
                                result = await totalPointHandicap(scores, history[j].name, history[j].team)
                            } else if (history[j].marketType == "Who will win second set?") {
                                result = await whoWinSecond(scores, history[j].team)
                            } else if (history[j].marketType.startsWith("How many points will player/team 1 score in the")) {
                                result = await howPoints(scores, history[j].period, history[j].team, 'home')
                                console.log(result, '++++++++++++++')
                            } else if (history[j].marketType.startsWith("How many points will player/team 2 score in the")) {
                                result = await howPoints(scores, history[j].period, history[j].team, 'away')
                            } else if (history[j].marketType.startsWith('Which Team/Player will score the ') && history[j].marketType.search('point in the')) {
                                result = await whichTeamScoreSet(scores, history[j].period, history[j].name, history[j].team)
                            } else if (history[j].marketType.startsWith('First team/player to reach ') && history[j].marketType.search('points')) {
                                result = 'refun'
                            } else if (history[j].marketType.startsWith('Correct Score')) {
                                result = await correctScore(scores, history[j].period, history[j].team)
                            } else if (history[j].marketType.startsWith("How many points will be scored in the")) {
                                result = await howPointsTotal(scores, history[j].period, history[j].team)
                            } else if (history[j].marketType.startsWith("Number of points scored in")) {
                                result = await numberOfPoints(scores, history[j].period, history[j].team)
                            } else if (history[j].marketType.startsWith('Winning Margin Set ')) {
                                result = 'refun'
                            } else if ((history[j].marketType.startsWith('Set') && history[j].marketType.search('Winner') >= 6)) {
                                result = await setWinner(scores, history[j].period, history[j].team)
                            } else if (history[j].marketType.startsWith('Which team/player will be the first to reach ')) {
                                result = 'refun'
                            } else if (history[j].marketType.startsWith('Who will be the first team/player to reach ')) {
                                result = 'refun'
                            } else if (history[j].marketType.indexOf('set handicap')) {
                                result = await setHandicap(scores, history[j].period, history[j].name, history[j].team)
                            }

                            var userData = await baseController.BfindOne(userModel, { _id: history[j].userId })
                            if (userData) {
                                if (history[j].type == "single") {
                                    if (result == 'Win') {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "win" })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount * Number(history[j].odds))) * 1) } })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount * Number(history[j].odds))) * -1) } })
                                    } else if (result == "Lost") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "lose" })
                                    } else if (result == "Cancel") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "refun" })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * -1) } })
                                        await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].amount)) * 1) } })
                                    }
                                } else {
                                    if (result == 'Win') {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "win" })
                                    } else if (result == "Lost") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "lose" })
                                    } else if (result == "Cancel") {
                                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { _id: history[j]._id }, { result: score, status: "refun" })
                                    }
                                    let oneBet = baseController.BfindOne(bwinHistoryModel, { _id: history[j]._id })
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
                                            await baseController.BfindOneAndUpdate(userModel, { _id: history[j].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].winAmount)) * 1) } })
                                            await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[j].winAmount)) * -1) } })
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else if (data[i].SportId == 7) {                                                                              //Basketball
                    var scores = result.ss ? result.ss : "";
                    var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, status: "pending" })
                    var home, away;
                    if (scores) {
                        home = Number(scores.split('-')[0])
                        away = Number(scores.split('-')[1])
                    }
                    for (let j in history) {
                        if (scores) {

                        }
                    }
                } else {
                    var result = response.data.results[0]
                    var scores = result.scores && result.scores[Object.keys(result.scores)[Object.keys(result.scores).length - 1]] ? result.scores[Object.keys(result.scores)[Object.keys(result.scores).length - 1]] : "";
                    if (data[i].SportId === 4 || data[i].SportId === 12 || data[i].SportId === 16) {
                        var index = scores && scores.home < scores.away ? 2 : 0;
                    } else {
                        var index = scores && scores.home < scores.away ? 1 : 0;
                    }
                    var history = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, index: index })
                    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id })
                    if (isCheckHistory.length > 0) {
                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].Id }, { result: home + "-" + away, status: "lose" })
                    }
                    for (var i in history) {
                        var userData = await baseController.BfindOne(userModel, { _id: history[i].userId })
                        if (userData) {
                            await baseController.BfindOneAndUpdate(userModel, { _id: history[i].userId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * 1) } })
                            await baseController.BfindOneAndUpdate(userModel, { _id: userData.agentId }, { $inc: { 'balance': (Math.abs(parseInt(history[i].amount * history[i].odds)) * -1) } })
                        }
                    }
                    var isCheckHistory = await baseController.Bfind(bwinHistoryModel, { matchId: data[i].Id, index: index })
                    if (isCheckHistory.length > 0) {
                        await baseController.BfindOneAndUpdate(bwinHistoryModel, { matchId: data[i].Id, index: index }, { result: home + "-" + away, status: "win" })
                    }
                }

                // await baseController.BfindOneAndDelete(bwinEventModel, { Id: data[i].Id });
                // await baseController.BfindOneAndDelete(bwinInPlayModel, { Id: data[i].Id });
                // var saveData = {
                //   ...data.selectedResult[j],
                //   result: data.result
                // }
                // await baseController.BfindOneAndUpdate(bwinResultModel, { matchId: data[i].Id, isMain: true }, saveData)
            }
        }
    }

    const removeOldMatchs = async () => {
        const currentDate = new Date(new Date().valueOf() - (1000 * 300)).toJSON()
        await setScoreFinished()
        await finishInplay()
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
                    if (registeredHours === new Date().getHours()) {
                        var parentData = await baseController.BfindOne(userModel, { _id: agentData[i].pid });
                        if (parseInt(parentData.balance) < parseInt(autoWeeklyCredit)) {
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
        const request = {
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
                            var isCheck
                            var saveData = data[j];
                            saveData.type = "inplay";
                            saveData.Id = saveData.Id.replace(":", "0");
                            await baseController.BfindOneAndDelete(bwinPrematchModel, { Id: saveData.Id });
                            if (saveData.Scoreboard.period == 'Finished') {

                                console.log('-Finished-', saveData.Id)

                                var isFinish = await baseController.BfindOne(bwinInPlayModel, { Id: saveData.Id })

                                if (isFinish) {
                                    console.log('there is in Inplay')
                                    isCheck = await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: saveData.Id }, saveData);
                                }
                                let isThere = await baseController.BfindOne(bwinEventModel, { Id: saveData.Id })
                                if (isThere) {
                                    console.log('there is in Event', saveData.Id)
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
                    funcs.push(getRealtimeLiveMarket(sendEventIds[i], sport_id))
                }
                Promise.all(funcs)
            }
        } catch (error) {
            console.log('get live data error' + error.message)
        }
    }

    const getRealtimeLiveMarket = async (ids, sport_id) => {
        let data = await getMarketsById(ids)
        for (let i in data) {
            data[i].Id = data[i].Id.replace(":", "0");
            data[i].SportId = sport_id;
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
                if (data[i].Scoreboard.period == 'Finished') {
                    await baseController.BfindOneAndUpdate(bwinEventModel, { Id: data[i].Id }, { "Scoreboard.period": "Finished" })
                }
                // await baseController.BfindOneAndDelete(bwinInPlayModel, { Id: data[i].Id })
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

    const finishInplay = async () => {
        try {
            const halfMatch = await baseController.Bfind(bwinInPlayModel, { "Scoreboard.period": "2H", SportId: 4 });
            for (let i in halfMatch) {
                if (Number(halfMatch[i].Scoreboard.timer.seconds / 60) >= 90) {
                    const requestFinish = {
                        method: "get",
                        url: "https://api.b365api.com/v1/bwin/result?token=" + token + "&event_id=" + halfMatch[i].Id,
                    };
                    const finishResponse = await axios(requestFinish);
                    if (finishResponse.data.success === 1 && finishResponse.data.results[0].time_status == '3') {
                        console.log('soccer finish ' + halfMatch[i].Id)
                        await baseController.BfindOneAndUpdate(bwinInPlayModel, { Id: halfMatch[i].Id }, { "Scoreboard.period": "Finished" });
                        await baseController.BfindOneAndUpdate(bwinEventModel, { Id: halfMatch[i].Id }, { "Scoreboard.period": "Finished" });
                    }
                }
            }
        } catch (error) {
            console.log("finish inplay 2H match")
        }
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
                        await baseController.BfindOneAndUpdate(
                            bwinPrematchModel,
                            { Id: saveData.Id },
                            saveData
                        );
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
        console.log('live')
        await liveMatchBwin()
    }, 1000 * 10)

    setInterval(async function () {
        console.log("refresh premacth");
        await preMatchBwin()
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