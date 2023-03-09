const enum Scene
{
    Home = 0,
    Lobby = 0,
    Battle = 1,
    RoundResults = 2
}

const enum OperationCode
{
    Players = 0,
    PlayerJoined = 1,
    PlayerPaid = 2,
    PlayerInput = 3,
    PlayerMoneyChange = 4,
    PlayerWon = 5,
    ChangeScene = 6,
    CancelMatch = 7
}
