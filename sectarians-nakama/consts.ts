const DEBUG = true

const TickRate = 1;
const DurationLobby = 600;
const DurationFinalResult = 120; // in seconds
//const DurationBattleEnding = 10;
const MaxPlayers = 5;
const PlayerNotFound = -1;
const PlayerPayment = 2; // participation fee

/* FOR DEBUG */
const DurationFinalTestResult = 60;
const MaxTestPlayers = 2;

const MessagesLogic: { [opCode: number]: (nk: nkruntime.Nakama, message: nkruntime.MatchMessage, state: GameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger) => void } =
{
    2: playerPaid,
    4: playerMoneyChanged
}
