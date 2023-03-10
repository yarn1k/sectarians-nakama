let matchInit: nkruntime.MatchInitFunction = function (context: nkruntime.Context, logger: nkruntime.Logger, nakama: nkruntime.Nakama, params: { [key: string]: string })
{
    var label: MatchLabel = { open: true }
    var gameState: GameState =
    {
        players: [],
        playersMoney: [],
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
            isPaid: false
        }

        if (DEBUG)
            player.isPaid = true;

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
    let label = JSON.parse(state["label"]);
    if (label.open) {
        for (let presence of presences)
        {
            let playerNumber: number = getPlayerNumber(gameState.players, presence.sessionId);
            delete gameState.players[playerNumber];
        }

        if (getPlayersCount(gameState.players) == 0)
            return null;
    }

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
        case Scene.FinalResult: matchLoopFinalResult(gameState, nakama, dispatcher, logger); break;
    }
}

function matchLoopLobby(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    if (gameState.countdown > 0 && getPlayersCount(gameState.players) == MaxTestPlayers)
    {
        gameState.countdown--;
        if (isAllPlayersPaid(gameState.players)) {
            if (DEBUG)
                gameState.countdown = DurationFinalTestResult * TickRate;
            else
                gameState.countdown = DurationFinalResult * TickRate;
            gameState.scene = Scene.Battle;
            dispatcher.broadcastMessage(OperationCode.ChangeScene, JSON.stringify(gameState.scene));
            dispatcher.matchLabelUpdate(JSON.stringify({ open: false }));
        }
        if (gameState.countdown == 0)
        {
            dispatcher.broadcastMessage(OperationCode.CancelMatch, null);
        }
    }
}

function matchLoopBattle(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    if (gameState.countdown > 0)
    {
        gameState.countdown--;
        if (gameState.countdown == 0)
        {
            //gameState.countdown = DurationBattleEnding * TickRate;
            gameState.scene = Scene.FinalResult;
        }
    }
}

function matchLoopFinalResult(gameState: GameState, nakama: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    var winner = getWinner(gameState.playersMoney, gameState.players);
    if (winner != null) {
        if (winner == DrawResult) {
            dispatcher.broadcastMessage(OperationCode.Draw, null);
        } 
        else 
        {
            let data: PlayerWonData = {
                tick: TickRate,
                playerNumber: getPlayerNumber(gameState.players, winner.presence.sessionId)
            };
            dispatcher.broadcastMessage(OperationCode.PlayerWon, JSON.stringify(data));
        }

        gameState.endMatch = true;
        gameState.scene = Scene.Home;
    }
    else
    {
        dispatcher.broadcastMessage(OperationCode.CancelMatch, null);
    }
}

function playerPaid(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void
{
    let data: Player = JSON.parse(nk.binaryToString(message.data));
    let playerNumber: number = getPlayerNumber(gameState.players, data.presence.sessionId);
    gameState.players[playerNumber].isPaid = true;
}

function playerMoneyChanged(nk: nkruntime.Nakama, message: nkruntime.MatchMessage, gameState: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void 
{
    if (gameState.scene != Scene.Battle)
        return;

    let data: PlayerMoneyData = JSON.parse(nk.binaryToString(message.data));
    let tick: number = data.tick;
    let playerNumber: number = data.playerNumber;
    let addMoney: number = data.amount;
    gameState.playersMoney[playerNumber] += addMoney;
    dispatcher.broadcastMessage(message.opCode, message.data, null, message.sender);
}

function isAllPlayersPaid(players: Player[]): boolean
{
    var count: number = 0;
    var maxPlayers: number = MaxPlayers;

    if (DEBUG)
        maxPlayers = MaxTestPlayers;

    for (let playerNumber = 0; playerNumber < maxPlayers; playerNumber++)
        if (players[playerNumber].isPaid)
            count++;

    if (count == maxPlayers)
        return true;

    return false;
}

function getPlayersCount(players: Player[]): number
{
    var count: number = 0;
    for (let playerNumber = 0; playerNumber < MaxTestPlayers; playerNumber++)
        if (players[playerNumber] != undefined)
            count++;

    return count;
}

function getWinner(playersMoney: number[], players: Player[]): Player | null
{
    var maxPlayers: number = MaxPlayers;

    if (DEBUG)
        maxPlayers = MaxTestPlayers;

    let result = 0;
    let winner = null;

    for (let playerNumber = 0; playerNumber < maxPlayers; playerNumber++) {

        if (playerNumber > 0 && playersMoney[playerNumber] == result)
            return DrawResult;

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
