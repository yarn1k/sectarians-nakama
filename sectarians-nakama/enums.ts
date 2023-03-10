const enum Scene
{
    Home = 0,
    Lobby = 0,
    Loading = 1,
    Battle = 2,
    FinalResult = 3 // logic scene
}

const enum OperationCode
{
    Players = 0,
    PlayerJoined = 1,
    PlayerPaid = 2,
    PlayerInput = 3,
    PlayerMoneyChanged = 4,
    PlayerWon = 5,
    Draw = 6,
    CancelMatch = 7,
    ChangeScene = 8
}
