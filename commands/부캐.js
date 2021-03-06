const { db } = require("../util/sql.js");
const { globalPrefix, riotapi } = require("../tokens/config.json");
const request = require("request");

module.exports = {
    name: "부캐",
    description: "부계정을 등록하거나 삭제합니다. (닉네임에 띄어쓰기는 생략)",
    aliases: ["부계", "부계정"],
    usage: "[등록/삭제/조회] [본계정] {부계정}",
    cooldown: 2,
    guildOnly: true,
    args: 2,
    execute(message, args) {
        if (args[0] === "등록" || args[0] === "추가") {
            if (args.length < 3) {
                return message.channel.send(`명령어그렇게쓰는거아닌데\n올바른 사용법: \`${globalPrefix}등록 [본계정] [부계정]\``);
            }

            const primaryNickname = args[1];
            const secondaryNickname = args[2];

            //Check if primary account exists
            let url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(primaryNickname)}?api_key=${riotapi}`;
            request(url, { json: true }, (error, response, primaryJson) => {
                if (error) return console.log(error);

                if (!primaryJson.accountId) {
                    return message.reply(`\`${primaryNickname}\`는 누군지몰르겠는거임 똑바로치셈`);
                }

                db.query(`SELECT COUNT(*) FROM lolchang.subaccounts WHERE primary_id = '${primaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, count, fields) => {
                    if (error) return console.log(error);
                    console.log(count[0]["COUNT(*)"]);
                    if (count[0]["COUNT(*)"] >= 5) {
                        return message.reply(`\`${primaryJson.name}\`의 부계정 등록 제한 초과`);
                    }

                    //Check if secondary account exists
                    url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(secondaryNickname)}?api_key=${riotapi}`;
                    request(url, { json: true }, (error, response, secondaryJson) => {
                        if (error) return console.log(error);

                        if (!secondaryJson.accountId) {
                            return message.reply(`\`${secondaryNickname}\`는 누군지몰르겠는거임 똑바로치셈`);
                        }

                        //Queries
                        db.query(`SELECT lol_id FROM lolchang.includes WHERE lol_id = '${primaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, results, fields) => {
                            if (error) return console.log(error);

                            if (!results.length) {
                                return message.reply(`본캐등록부터해야함 띵킹좀하셈`);
                            }

                            db.query(`SELECT primary_id FROM lolchang.subaccounts WHERE primary_id = '${primaryJson.accountId}' AND secondary_id = '${secondaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, results, fields) => {
                                if (error) return console.log(error);

                                if (results.length) {
                                    return message.reply(`이미등록댄거임 띵킹좀하셈`);
                                }

                                db.query(`SELECT lol_id FROM lolchang.accounts WHERE lol_id = '${secondaryJson.accountId}';`, (error, results, fields) => {
                                    if (error) return console.log(error);

                                    if (!results.length) {
                                        db.query(`INSERT INTO lolchang.accounts VALUES ('${secondaryJson.accountId}', '${secondaryJson.name}', ${secondaryJson.summonerLevel});`, (error, results, fields) => {
                                            if (error) return console.log(error);

                                            console.log(`소환사 \'${secondaryJson.name}\' 추가됨`);
                                        });
                                    }

                                    db.query(`INSERT INTO lolchang.subaccounts VALUES ('${primaryJson.accountId}', '${secondaryJson.accountId}', ${message.guild.id});`, (error, results, fields) => {
                                        if (error) return console.log(error);
                                        message.channel.send(`\`${primaryJson.name}\`에 \`${secondaryJson.name}\` 등록 완료`);
                                    });
                                });
                            });
                        });
                    });
                });
            });

        } else if (args[0] === "삭제" || args[0] === "제거") {
            if (args.length < 3) {
                return message.channel.send(`명령어그렇게쓰는거아닌데\n올바른 사용법: \`${globalPrefix}삭제 [본계정] [부계정]\``);
            }

            const primaryNickname = args[1];
            const secondaryNickname = args[2];

            //Check if primary account exists
            let url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(primaryNickname)}?api_key=${riotapi}`;
            request(url, { json: true }, (error, response, primaryJson) => {
                if (error) return console.log(error);

                if (!primaryJson.accountId) {
                    return message.reply(`\`${primaryNickname}\`는 누군지몰르겠는거임 똑바로치셈`);
                }

                //Check if secondary account exists
                url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(secondaryNickname)}?api_key=${riotapi}`;
                request(url, { json: true }, (error, response, secondaryJson) => {
                    if (error) return console.log(error);

                    if (!secondaryJson.accountId) {
                        return message.reply(`\`${secondaryNickname}\`는 누군지몰르겠는거임 똑바로치셈`);
                    }

                    //Queries
                    db.query(`SELECT lol_id FROM lolchang.includes WHERE lol_id = '${primaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, results, fields) => {
                        if (error) return console.log(error);

                        if (!results.length) {
                            return message.reply(`본캐등록부터해야함 띵킹좀하셈`);
                        }

                        db.query(`SELECT primary_id FROM lolchang.subaccounts WHERE primary_id = '${primaryJson.accountId}' AND secondary_id = '${secondaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, results, fields) => {
                            if (error) return console.log(error);

                            if (!results.length) {
                                return message.reply(`없어서삭제몬하겟슴`);
                            }

                            const tempPrimaryNickname = primaryJson.name;
                            const tempSecondaryNickname = secondaryJson.name;

                            db.query(`DELETE FROM lolchang.subaccounts WHERE primary_id = '${primaryJson.accountId}' AND secondary_id = '${secondaryJson.accountId}' AND guild_id = ${message.guild.id};`, (error, results, fields) => {
                                if (error) return console.log(error);
                                message.channel.send(`\`${tempPrimaryNickname}\`에서 \`${tempSecondaryNickname}\` 삭제 완료`);
                            });
                        });
                    });
                });
            });


        } else if (args[0] === "조회" || args[0] === "목록") {
            if (args.length < 2) {
                return message.channel.send(`명령어그렇게쓰는거아닌데\n올바른 사용법: \`${globalPrefix}목록 [본계정]\``);
            }

            const nickname = args[1];

            let url = `https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(nickname)}?api_key=${riotapi}`;
            request(url, { json: true }, (error, response, body) => {
                if (error) return console.log(error);

                if (!body.id) {
                    return message.reply(`\`${nickname}\`는 누군지몰르겠는거임 똑바로치셈`);
                }

                db.query(`SELECT A.nickname FROM lolchang.subaccounts S JOIN lolchang.accounts A ON S.primary_id = '${body.accountId}' AND S.guild_id = ${message.guild.id} AND A.lol_id = S.secondary_id;`, (error, results, fields) => {
                    if (error) return console.log(error);

                    if (!results.length) {
                        return message.reply(`부캐 조회 안됨`);
                    }

                    let reply = `\`\`\`ini\n[${body.name}의 부캐 목록]`;
                    for (const account of results) {
                        reply += `\n- ${account.nickname}`;
                    }
                    reply += "```";

                    message.channel.send(reply);
                });
            });
        }
    },
};