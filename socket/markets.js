    //Football markets
    exports.get3way = (h_score, a_score, oddType) => {
        if (h_score == a_score && oddType === "Draw") return "Win"
        if (h_score > a_score && oddType === "1") return "Win"
        if (h_score < a_score && oddType === "2") return "Win"
        else return "Lost"
    }

    exports.getDoubleChance = (h_score, a_score, oddType) => {
        if ((h_score > a_score || h_score == a_score) && oddType === "1") return "Win"
        if ((h_score < a_score || h_score == a_score) && oddType === "2") return "Win"
        if (h_score != a_score && oddType === "both") return "Win"
        else return "Lost"
    }

    exports.getOddEven = (h_score, a_score, oddType) => {
        let flag = (h_score + a_score) % 2
        if (flag == 1 && oddType == 'Odd') return "Win"
        if (flag == 0 && oddType == 'Even') return "Win"
        else return "Lost"
    }

    exports.getBTTSAndEitherTeamWin = (h_score, a_score, oddType) => {
        if (h_score > 0 && a_score > 0 && h_score != a_score && oddType == "Yes") return "Win"
        if (h_score == 0 && a_score == 0 && oddType == "No") return "Win"
        else "Lost"
    }

    exports.getBTTS = (h_score, a_score, oddType) => {
        if (h_score > 0 && a_score > 0 && oddType == "Yes") return "Win"
        if (h_score == 0 && a_score == 0 && oddType == "No") return "Win"
        else "Lost"
    }

    exports.BTTSAndOverUnder = (h_score, a_score, oddType, name) => {
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

    exports.getCorrectScore = (h_score, a_score, oddType) => {
        let first = oddType.split(":")[0]
        let second = oddType.split(":")[1]
        if (Number(first) == h_score && Number(second) == a_score) return "Win"
        else return "Lost"
    }

    exports.getOverUnder = (h_score, a_score, oddType, name) => {
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

    exports.getMultipleCorrectScore = async (h_score, a_score, oddType) => {
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
    exports.whoWin = async (score, winner) => {
        var home = score.split('-')[0];
        var away = score.split('-')[1];

        if (Number(home) > Number(away) && winner == '1') return "Win"
        else if (Number(home) < Number(away) && winner == '2') return "Win"
        else return "Lost"
    }

    exports.setBet = async (score, value) => {
        var home = Number(score.split('-')[0]);
        var away = Number(score.split('-')[1]);
        var vHome = Number(value.split('-')[0]);
        var vAway = Number(value.split('-')[1]);

        if (home == vHome && away == vAway) return "Win"
        else return "Lost"
    }

    exports.totalPointHandicap = async (scores, hcp, winner) => {
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

    exports.whoWinSecond = async (scores, winner) => {
        if (!scores && !scores['2']) return 'refun';
        var home = scores['2'].home;
        var away = scores['2'].away;

        if (Number(home) > Number(away) && winner == '1') return "Win"
        else if (Number(home) < Number(away) && winner == '2') return "Win"
        else return "Lost"
    }

    exports.howPoints = async (scores, period, point, team) => {
        var total = 0, over = 1, cPoint = 0

        if (point.startsWith("Over")) {
            over = 1;
            cPoint = Number(point.split(',')[0].slice(-3));
        } else if (point.startsWith("Under")) {
            over = -1;
            cPoint = Number(point.split(',')[0].slice(-3));
        } else if (point.startsWith('Exactly')) {
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

        if (period == 'RegularTime') {
            for (const val in scores) {
                total += Number(scores[val][team]);
            }
        } else {
            if (scores[period]) {
                total += Number(scores[period][team]);
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

    exports.howPointsTotal = async (scores, period, point) => {
        var total = 0, over = 1, cPoint = 0
        if (point.startsWith("Over")) {
            over = 1;
            cPoint = Number(point.split(',')[0].slice(-3));
        } else if (point.startsWith("Under")) {
            over = -1;
            cPoint = Number(point.split(',')[0].slice(-3));
        } else if (point.startsWith('Exactly')) {
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

        if (period == 'RegularTime') {
            for (const val in scores) {
                total += Number(scores[val].home);
                total += Number(scores[val].away);
            }
        } else {
            if (scores[period]) {
                total += Number(scores[period].home);
                total += Number(scores[period].away);
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

    exports.whichTeamScoreSet = async (scores, period, name, winner) => {
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

    exports.correctScore = async (scores, period, value) => {
        var home = Number(scores[period].home);
        var away = Number(scores[period].away);
        var vHome = Number(value.split(':')[0]);
        var vAway = Number(value.split(':')[1]);
        if (home == vHome && away == vAway) return "Win"
        else return "Lost"
    }

    exports.numberOfPoints = async (scores, period, point) => {
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

    exports.setWinner = async (scores, period, winner) => {
        var home = Number(scores[period].home);
        var away = Number(scores[period].away);

        if (home > away && winner == '1') return "Win";
        else if (home < away && winner == '2') return "Win";
        else return 'Lost';
    }

    exports.setHandicap = async (scores, period, hcp, winner) => {
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

    //Basketball markets
    exports.getTotal = async (score, val) => {
        let total = Number(score.split('-')[0]) + Number(score.split('-')[1])
        let ou = true
        if (val.startsWith("Over")) ou = true
        else if (val.startsWith("Under")) ou = false
        val = Number(val.split(',')[0].slice(-3))

        if (ou) {
            if (total > val) return 'Win'
            else return 'Lost'
        } else {
            if (total < val) return 'Win'
            else return 'Lost'
        }
    }

    exports.getQuarterTotal = async (scores, period, val) => {
        if (!scores[period]) return 'refun'
        let total = Number(scores[period].home) + Number(scores[period].away)
        let ou = true
        if (val.startsWith("Over")) ou = true
        else if (val.startsWith("Under")) ou = false
        val = Number(val.split(',')[0].slice(-3))

        if (ou) {
            if (total > val) return 'Win'
            else return 'Lost'
        } else {
            if (total < val) return 'Win'
            else return 'Lost'
        }
    }

    exports.getMoneyLine = async (score, team) => {
        const home = Number(score.split('-')[0])
        const away = Number(score.split('-')[1])

        if (home > away && team == '1') return 'Win'
        else if (away > home && team == '2') return 'Win'
        else return 'Lost'
    }

    exports.getFstMoneyLine = async (scores, team) => {
        const home = Number(scores['1'].home)
        const away = Number(scores['1'].away)

        if (home > away && team == '1') return 'Win'
        else if (away > home && team == '2') return 'Win'
        else return 'Lost'
    }

    exports.getBasketHdp = async (score, hdp, team, period) => {
        let home, away, pre;
        if (period == 'regularTime') {
            home = Number(score.split('-')[0])
            away = Number(score.split('-')[1])
        } else if (period == '1st') {
            home = Number(score['1'].home)
            away = Number(score['1'].away)
        }
        pre = Number(hdp.split(',')[0].slice(-2))

        if (team == '1') {
            if ((home + pre) > away) return 'Win'
            else return 'Lost'
        } else if (team == '2') {
            if ((away + pre) > home) return 'Win'
            else return 'Lost'
        }
    }

    exports.firstOddEven = (scores, val) => {
        let total = Number(scores['1'].home) + Number(scores['1'].away)
        if ((total % 2 == 0) && val == 'Even') return 'Win'
        else if ((total % 2 == 1) && val == 'Odd') return 'Win'
        else return 'Lost'
    }

    exports.getBasketOddEven = (scores, val) => {
        let total = Number(scores.split('-')[0]) + Number(scores.split('-')[1])
        if ((total % 2 == 0) && val == 'Even') return 'Win'
        else if ((total % 2 == 1) && val == 'Odd') return 'Win'
        else return 'Lost'
    }

    exports.getThreeWay = async (score, team, period) => {
        let home, away
        if (period == 'regularTime') {
            home = Number(score.split('-')[0])
            away = Number(score.split('-')[1])
        } else {
            home = Number(scores['1'].home)
            away = Number(scores['1'].away)
        }

        if (home > away && team == '1') return 'Win'
        else if (away > home && team == '2') return 'Win'
        else if (home == away && team == 'x') return 'Win'
        else return 'Lost'
    }
    //Basketball markets

    //Tennis
    //Tennis