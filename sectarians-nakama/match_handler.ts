let matchInit: nkruntime.MatchInitFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, params: { [key: string]: string })
{
    var label: MatchLabel = { open: true }
    var gameState: GameState =
    {
        players: [],
        playersMoney: [],
        checkChangeMoney: {},
        roundDeclaredWins: [[]],
        scene: Scene.Lobby,
        countdown: DurationLobby * TickRate,
        endMatch: false
    }

    return {
        state: gameState,
        tickRate: TickRate,
        label: JSON.stringify(label),
    }
}

let matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: { [key: string]: any })
{
    let gameState = state as GameState;
    return {
        state: gameState,
        accept: gameState.scene == Scene.Lobby,
    }
}

let matchJoin: nkruntime.MatchJoinFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[])
{
    let gameState = state as GameState;
    if (gameState.scene != Scene.Lobby)
        return { state: gameState };

    let presencesOnMatch: nkruntime.Presence[] = [];
    gameState.players.forEach(player => { if (player != undefined) presencesOnMatch.push(player.presence); });
    for (let presence of presences)
    {
        var account: nkruntime.Account = nakama.accountGetId(presence.userId);
        let player: Player =
        {
            presence: presence,
            displayName: account.user.displayName,
            isPaid: true // for test
        }

        let nextPlayerNumber: number = getNextPlayerNumber(gameState.players);
        gameState.players[nextPlayerNumber] = player;
        gameState.playersMoney[nextPlayerNumber] = 0;
        dispatcher.broadcastMessage(OperationCode.PlayerJoined, JSON.stringify(player), presencesOnMatch);
        presencesOnMatch.push(presence);
    }

    dispatcher.broadcastMessage(OperationCode.Players, JSON.stringify(gameState.players), presences);
    gameState.countdown = DurationLobby * TickRate;
    return { state: gameState };
}

let matchLoop: nkruntime.MatchLoopFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[])
{
    let gameState = state as GameState;
    processMessages(nakama, messages, gameState, dispatcher, logger);
    processMatchLoop(gameState, nakama, dispatcher, logger);
    return gameState.endMatch ? null : { state: gameState };
}

let matchLeave: nkruntime.MatchLeaveFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[])
{
    let gameState = state as GameState;
    for (let presence of presences)
    {
        let playerNumber: number = getPlayerNumber(gameState.players, presence.sessionId);
        delete gameState.players[playerNumber];
    }

    if (getPlayersCount(gameState.players) == 0)
        return null;

    return { state: gameState };
}

let matchSignal: nkruntime.MatchSignalFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, data: string) : { state: nkruntime.MatchState, data?: string } | null 
{
    logger.debug('Lobby match signal received: ' + data);
  
    return {
        state,
        data: "Lobby match signal received: " + data
    };
}

let matchTerminate: nkruntime.MatchTerminateFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, graceSeconds: number)
{
    return { state };
}

function processMessages(nakama: nkruntime.Nakama, messages: nkruntime.MatchMessage[], gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    for (let message of messages)
    {
        let opCode: number = message.opCode;
        if (MessagesLogic.hasOwnProperty(opCode))
            MessagesLogic[opCode](nakama, message, gameState, dispatcher, logger);
        else
            messagesDefaultLogic(message, gameState, dispatcher);
    }
}

function messagesDefaultLogic(message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher): void
{
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}

function processMatchLoop(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    switch (gameState.scene)
    {
        case Scene.Lobby: matchLoopLobby(gameState, nakama, dispatcher, logger); break;
        case Scene.Battle: matchLoopBattle(gameState, nakama, dispatcher, logger); break;
        case Scene.RoundResults: matchLoopRoundResult(gameState, nakama, dispatcher, logger); break;
    }
}

function matchLoopLobby(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    if (gameState.countdown > 0 && getPlayersCount(gameState.players) == MaxTestPlayers)
    {
        gameState.countdown--;
        logger.info("LobbyCountdown="+String(gameState.countdown));
        if (isAllPlayersPaid(gameState.players)) {
            gameState.countdown = DurationRoundResultTest * TickRate;
            gameState.scene = Scene.Battle;
            dispatcher.broadcastMessage(OperationCode.ChangeScene, JSON.stringify(gameState.scene));
            dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
        }
        if (gameState.countdown == 0)
        {
            dispatcher.broadcastMessage(OperationCode.CancelMatch, JSON.stringify(gameState.players));
        }
    }
}

function matchLoopBattle(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    if (gameState.countdown > 0)
    {
        gameState.countdown--;
        logger.info("BattleCountdown="+String(gameState.countdown));
        if (gameState.countdown == 0)
        {
            gameState.checkChangeMoney = {};
            gameState.roundDeclaredWins = [];
            gameState.countdown = DurationBattleEnding * TickRate;
            logger.info("Before"+String(gameState.scene));
            gameState.scene = Scene.RoundResults;
            logger.info("After"+String(gameState.scene));
            //dispatcher.broadcastMessage(OperationCode.ChangeScene, JSON.stringify(gameState.scene));
        }
    }
}

function matchLoopRoundResult(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    if (gameState.countdown > 0)
    {
        gameState.countdown--;
        logger.info("RoundResultCountdown="+String(gameState.countdown));
        if (gameState.countdown == 0)
        {
            var winner = getWinner(gameState.playersMoney, gameState.players);
            logger.info("Winner="+String(winner));
            if (winner != null)
            {
                let storageReadRequests: nkruntime.StorageReadRequest[] = [{
                    collection: CollectionUser,
                    key: KeyTrophies,
                    userId: winner.presence.userId
                }];

                let result: nkruntime.StorageObject[] = nakama.storageRead(storageReadRequests);
                var trophiesData: TrophiesData = { amount: 0 };
                for (let storageObject of result)
                {
                    trophiesData = <TrophiesData>storageObject.value;
                    break;
                }

                trophiesData.amount++;
                let storageWriteRequests: nkruntime.StorageWriteRequest[] = [{
                    collection: CollectionUser,
                    key: KeyTrophies,
                    userId: winner.presence.userId,
                    value: trophiesData
                }];

                nakama.storageWrite(storageWriteRequests);
                gameState.endMatch = true;
                gameState.scene = Scene.Home;
            }
            else
            {
                gameState.scene = Scene.Battle;
            }

            dispatcher.broadcastMessage(OperationCode.ChangeScene, JSON.stringify(gameState.scene));
        }
    }
}

function isAllPlayersPaid(players: Player[]): boolean
{
    var count: number = 0;
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)  // change to MaxPlayers
        if (players[playerNumber].isPaid)
            count++;

    if (count == MaxTestPlayers)
        return true;

    return false;
}

function playerPaid(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{

    let data: Player = JSON.parse(nk.binaryToString(message.data));
    let playerNumber: number = getPlayerNumber(gameState.players, data.presence.sessionId);
    gameState.players[playerNumber].isPaid = true;
}

function playerChangeMoney(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void 
{
    if (gameState.scene != Scene.Battle)
        return;

    let data: PlayerMoneyData = JSON.parse(nk.binaryToString(message.data));
    let tick: number = data.tick;
    let playerNumber: number = data.playerNumber;
    let currentMoney: number = data.money;
    let key = String(tick) + String(playerNumber) + String(currentMoney);
    logger.info("ChangeMoneyKey"+key);

    if (!gameState.checkChangeMoney[key])
        gameState.checkChangeMoney[key] = 0;

    gameState.checkChangeMoney[key]++;
    logger.info("ChangeMoneyCount"+gameState.checkChangeMoney[key]);
    if (gameState.checkChangeMoney[key] < getPlayersCount(gameState.players))
        return;

    logger.info("Player="+String(playerNumber)+" money="+currentMoney);
    gameState.playersMoney[playerNumber] = currentMoney;
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}

function playerWon(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void 
{
    if (gameState.scene != Scene.Battle || gameState.countdown > 0)
        return;

    let data: PlayerWonData = JSON.parse(nk.binaryToString(message.data));
    let tick: number = data.tick;
    let playerNumber: number = data.playerNumber;
    if (gameState.roundDeclaredWins[tick] == undefined)
        gameState.roundDeclaredWins[tick] = [];

    if (gameState.roundDeclaredWins[tick][playerNumber] == undefined)
        gameState.roundDeclaredWins[tick][playerNumber] = 0;

    gameState.roundDeclaredWins[tick][playerNumber]++;
    logger.info("succeses="+String(gameState.roundDeclaredWins[tick][playerNumber]));
    if (gameState.roundDeclaredWins[tick][playerNumber] < getPlayersCount(gameState.players))
        return;

    logger.info("winner="+String(playerNumber));
    gameState.countdown = DurationBattleEnding * TickRate;
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}

function cancelMatch(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void 
{
    console.log("cancelMatch");
}

function getPlayersCount(players: Player[]): number
{
    var count: number = 0;
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)
        if (players[playerNumber] != undefined)
            count++;

    return count;
}

/*
function playerObtainedNecessaryWins(playersWins: number[]): boolean
{
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)
        if (playersWins[playerNumber] == NecessaryWins)
            return true;

    return false;
}
*/

function getWinner(playersMoney: number[], players: Player[]): Player | null
{
    let result = 0;
    let winner = null;
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++) {
        if (playersMoney[playerNumber] > result) {
            result = playersMoney[playerNumber];
            winner = players[playerNumber];
        }
    }

    return winner;
}

function getPlayerNumber(players: Player[], sessionId: string): number
{
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)
        if (players[playerNumber] != undefined && players[playerNumber].presence.sessionId == sessionId)
            return playerNumber;

    return PlayerNotFound;
}

function getNextPlayerNumber(players: Player[]): number
{
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)
        if (!playerNumberIsUsed(players, playerNumber))
            return playerNumber;

    return PlayerNotFound;
}

function playerNumberIsUsed(players: Player[], playerNumber: number): boolean
{
    return players[playerNumber] != undefined;
}
