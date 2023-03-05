
const TickRate = 16;
const DurationLobby = 10;
const DurationRoundResults = 120; // in seconds
const DurationBattleEnding = 3;
const MinimumPlayers = 5;
const MaxPlayers = 5;
const PlayerNotFound = -1;
const CollectionUser = "User";
const KeyTrophies = "Trophies";

const MessagesLogic: { [opCode: number]: (message: nkruntime.MatchMessage, state: GameState, dispatcher: nkruntime.MatchDispatcher) => void } =
{
    3: playerChangeMoney,
    4: playerWon
}
