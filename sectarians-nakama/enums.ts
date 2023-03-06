const enum Scene
{
    Initializer = 0,
    Splash = 1,
    Home = 2,
    Lobby = 3,
    Battle = 4,
    RoundResults = 5,
    FinalResults = 6
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
