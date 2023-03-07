const enum Scene
{
    Initializer = 0,
    Splash = 0,
    Home = 0,
    Lobby = 0,
    Battle = 1,
    RoundResults = 1,
    FinalResults = 0
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
